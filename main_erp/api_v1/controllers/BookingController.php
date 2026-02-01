<?php
require_once 'models/Booking.php';
require_once 'models/Vehicle.php';
require_once 'utils/Validator.php';
require_once 'utils/Response.php';

class BookingController {
    private $bookingModel;
    private $vehicleModel;

    public function __construct() {
        $this->bookingModel = new Booking();
        $this->vehicleModel = new Vehicle();
    }

    // Get all bookings with filters
    public function getAll() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Get query parameters
            $limit = $_GET['limit'] ?? 10;
            $offset = $_GET['offset'] ?? 0;
            
            $filters = [];
            
            // Apply filters based on user role
            if ($currentUser['user_type'] === 'customer') {
                $filters['customer_id'] = $currentUser['id'];
            } elseif ($currentUser['user_type'] === 'washer') {
                $filters['washer_id'] = $currentUser['id'];
            }
            
            // Add other filters
            if (!empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            if (!empty($_GET['payment_status'])) {
                $filters['payment_status'] = $_GET['payment_status'];
            }
            
            if (!empty($_GET['date_from'])) {
                $filters['date_from'] = $_GET['date_from'];
            }
            
            if (!empty($_GET['date_to'])) {
                $filters['date_to'] = $_GET['date_to'];
            }

            $bookings = $this->bookingModel->getAll($filters, $limit, $offset);
            
            if ($bookings === false) {
                Response::error('Failed to retrieve bookings', 500);
                return;
            }

            // Parse service_ids from JSON
            foreach ($bookings as &$booking) {
                if (!empty($booking['service_ids'])) {
                    $booking['service_ids'] = json_decode($booking['service_ids'], true);
                }
            }

            Response::success([
                'bookings' => $bookings,
                'total' => count($bookings),
                'limit' => $limit,
                'offset' => $offset
            ], 'Bookings retrieved successfully');

        } catch (Exception $e) {
            error_log("Get all bookings error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get booking by ID
    public function getById($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $booking = $this->bookingModel->findById($id);
            
            if (!$booking) {
                Response::error('Booking not found', 404);
                return;
            }

            // Check permissions
            if ($currentUser['user_type'] === 'customer' && $booking['customer_id'] != $currentUser['id']) {
                Response::error('Access denied', 403);
                return;
            }
            
            if ($currentUser['user_type'] === 'washer' && $booking['washer_id'] != $currentUser['id']) {
                Response::error('Access denied', 403);
                return;
            }

            // Parse service_ids from JSON
            if (!empty($booking['service_ids'])) {
                $booking['service_ids'] = json_decode($booking['service_ids'], true);
            }

            Response::success($booking, 'Booking retrieved successfully');

        } catch (Exception $e) {
            error_log("Get booking by ID error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Complete booking with photos and signature
    public function completeWithPhotos($id) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        $booking = $this->bookingModel->findById($id);
        if (!$booking) {
            Response::error('Booking not found', 404);
            return;
        }

        // Check if booking is in progress
        // if ($booking['status'] !== 'allocated' && $booking['status'] !== 'confirmed' && $booking['status'] !== 'in_progress') {
        //     Response::error('Only allocated, confirmed, or in progress bookings can be completed', 400);
        //     return;
        // }

        // Log the incoming request for debugging
        error_log("Complete booking request received for ID: " . $id);
        error_log("Files received: " . print_r($_FILES, true));
        error_log("POST data: " . print_r($_POST, true));

        // Create upload directory dynamically
        $uploadBaseDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadBaseDir)) {
            mkdir($uploadBaseDir, 0777, true);
        }

        $uploadDir = $uploadBaseDir . 'bookings/' . $id . '/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        // Handle file uploads
        $beforeImages = [];
        $afterImages = [];
        $signaturePath = null;

        // Process before images
        if (!empty($_FILES['before_images']) && is_array($_FILES['before_images']['name'])) {
            $beforeDir = $uploadDir . 'before/';
            if (!is_dir($beforeDir)) {
                mkdir($beforeDir, 0777, true);
            }
            $beforeImages = $this->uploadMultipleFiles($_FILES['before_images'], $beforeDir);
            error_log("Before images uploaded: " . count($beforeImages));
        }

        // Process after images
        if (!empty($_FILES['after_images']) && is_array($_FILES['after_images']['name'])) {
            $afterDir = $uploadDir . 'after/';
            if (!is_dir($afterDir)) {
                mkdir($afterDir, 0777, true);
            }
            $afterImages = $this->uploadMultipleFiles($_FILES['after_images'], $afterDir);
            error_log("After images uploaded: " . count($afterImages));
        }

        // Process signature
        if (!empty($_FILES['under_signed']) && $_FILES['under_signed']['error'] === UPLOAD_ERR_OK) {
            $signatureFile = $_FILES['under_signed'];
            $signaturePath = $this->uploadSingleFile($signatureFile, $uploadDir, 'signature_');
            error_log("Signature uploaded: " . ($signaturePath ? 'Yes' : 'No'));
        }

        // Store relative paths in database
        $baseUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/uploads/bookings/' . $id . '/';
        
        $relativeBeforeImages = [];
        foreach ($beforeImages as $imagePath) {
            $relativeBeforeImages[] = str_replace($uploadBaseDir, '', $imagePath);
        }
        
        $relativeAfterImages = [];
        foreach ($afterImages as $imagePath) {
            $relativeAfterImages[] = str_replace($uploadBaseDir, '', $imagePath);
        }
        
        $relativeSignaturePath = $signaturePath ? str_replace($uploadBaseDir, '', $signaturePath) : null;

        // Create booking history record
        $historyData = [
            'booking_id' => $id,
            'before_images' => json_encode($relativeBeforeImages),
            'after_images' => json_encode($relativeAfterImages),
            'under_signed' => $relativeSignaturePath,
            'completed_by' => $currentUser['id'],
            'completed_at' => date('Y-m-d H:i:s')
        ];

        error_log("History data to insert: " . print_r($historyData, true));

        // Insert into booking_history table
        $historyId = $this->bookingModel->insertBookingHistory($historyData);

        if (!$historyId) {
            Response::error('Failed to save booking history', 500);
            return;
        }

        // Update booking status to completed
        $result = $this->bookingModel->updateStatus($id, 'completed');

        if ($result) {
            Response::success([
                'booking_id' => $id,
                'history_id' => $historyId,
                'before_images_count' => count($beforeImages),
                'after_images_count' => count($afterImages),
                'signature_uploaded' => !empty($signaturePath),
                'before_images' => $relativeBeforeImages,
                'after_images' => $relativeAfterImages,
                'signature_path' => $relativeSignaturePath,
                'message' => 'Booking completed successfully with documentation'
            ], 'Booking completed successfully');
        } else {
            Response::error('Failed to update booking status', 500);
        }

        } catch (Exception $e) {
            error_log("Complete booking with photos error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred: ' . $e->getMessage(), 500);
        }
    }
    private function uploadMultipleFiles($files, $targetDir) {
        $uploadedFiles = [];
        
        // Create directory if it doesn't exist
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
    
        // Check if files array is properly structured
        if (!isset($files['name']) || !is_array($files['name'])) {
            error_log("Invalid files array structure in uploadMultipleFiles");
            return $uploadedFiles;
        }
    
        $fileCount = count($files['name']);
        error_log("Processing " . $fileCount . " files");
    
        for ($i = 0; $i < $fileCount; $i++) {
            // Skip if there's an error (except for no file uploaded)
            if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                error_log("File upload error at index $i: " . $files['error'][$i]);
                continue;
            }
    
            // Check file size (optional, but good practice)
            if ($files['size'][$i] == 0) {
                error_log("File at index $i is empty");
                continue;
            }
    
            // Generate unique filename
            $originalName = $files['name'][$i];
            $extension = pathinfo($originalName, PATHINFO_EXTENSION);
            $fileName = uniqid() . '_' . time() . '.' . $extension;
            $targetFile = $targetDir . $fileName;
    
            // Validate file is an actual image
            $check = getimagesize($files['tmp_name'][$i]);
            if ($check === false) {
                error_log("File at index $i is not a valid image");
                continue;
            }
    
            error_log("Moving file from " . $files['tmp_name'][$i] . " to " . $targetFile);
    
            // Move uploaded file
            if (move_uploaded_file($files['tmp_name'][$i], $targetFile)) {
                $uploadedFiles[] = $targetFile;
                error_log("Successfully uploaded file: " . $fileName);
            } else {
                error_log("Failed to move uploaded file at index $i");
                error_log("Upload error: " . print_r(error_get_last(), true));
            }
        }
        
        error_log("Total files uploaded: " . count($uploadedFiles));
        return $uploadedFiles;
    }
    
    private function uploadSingleFile($file, $targetDir, $prefix = '') {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error_log("File upload error: " . $file['error']);
            return null;
        }
    
        if ($file['size'] == 0) {
            error_log("File is empty");
            return null;
        }
    
        // Create directory if it doesn't exist
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
    
        // Generate unique filename
        $originalName = $file['name'];
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $fileName = $prefix . uniqid() . '_' . time() . '.' . $extension;
        $targetFile = $targetDir . $fileName;
    
        // Validate file
        $check = getimagesize($file['tmp_name']);
        if ($check === false && $extension !== 'png') {
            error_log("File is not a valid image");
            return null;
        }
    
        error_log("Moving signature file from " . $file['tmp_name'] . " to " . $targetFile);
    
        if (move_uploaded_file($file['tmp_name'], $targetFile)) {
            error_log("Signature uploaded successfully: " . $targetFile);
            return $targetFile;
        } else {
            error_log("Failed to upload signature file");
            error_log("Upload error: " . print_r(error_get_last(), true));
            return null;
        }
    }


    private function uploadFiles($files, $targetDir) {
        $uploadedFiles = [];
        
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
    
        // Handle multiple files
        if (is_array($files['name'])) {
            $fileCount = count($files['name']);
            for ($i = 0; $i < $fileCount; $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $fileName = uniqid() . '_' . basename($files['name'][$i]);
                    $targetFile = $targetDir . $fileName;
                    
                    if (move_uploaded_file($files['tmp_name'][$i], $targetFile)) {
                        $uploadedFiles[] = $targetFile;
                    }
                }
            }
        }
        
        return $uploadedFiles;
    }
    
    private function uploadFile($file, $targetDir, $prefix = '') {
        if ($file['error'] === UPLOAD_ERR_OK) {
            $fileName = $prefix . uniqid() . '_' . basename($file['name']);
            $targetFile = $targetDir . $fileName;
            
            if (move_uploaded_file($file['tmp_name'], $targetFile)) {
                return $targetFile;
            }
        }
        return null;
    }


    // Get admin dashboard statistics and data
    public function adminDashboard() {
        try {
            $currentUser = getCurrentUser();
            // if (!$currentUser || !in_array($currentUser['user_type'], ['admin', 'superadmin'])) {
            //     Response::error('Admin access required', 403);
            //     return;
            // }
    
            $dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
            $dateTo = $_GET['date_to'] ?? date('Y-m-d');
            
            // Validate date range
            if (strtotime($dateFrom) > strtotime($dateTo)) {
                Response::error('Start date cannot be after end date', 400);
                return;
            }
    
            // Get today's date for today's bookings
            $today = date('Y-m-d');
            
            // Get all dashboard data
            $dashboardData = [
                // Overall statistics
                'overall_stats' => $this->bookingModel->getAdminDashboardStats($dateFrom, $dateTo),
                
                // Today's bookings
                'todays_bookings' => $this->bookingModel->getTodaysBookingsDetails($today),
                
                // Washer performance
                'washer_performance' => $this->bookingModel->getWasherPerformance($dateFrom, $dateTo),
                
                // Revenue statistics
                'revenue_stats' => $this->bookingModel->getRevenueStatistics($dateFrom, $dateTo),
                
                // Service statistics
                'service_stats' => $this->bookingModel->getServiceStatistics($dateFrom, $dateTo),
                
                // Booking trends (daily for the selected period)
                'booking_trends' => $this->bookingModel->getBookingTrends($dateFrom, $dateTo),
                
                // Vehicle type statistics
                'vehicle_stats' => $this->bookingModel->getVehicleTypeStatistics($dateFrom, $dateTo),
                
                // Date range for the data
                'date_range' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                    'today' => $today
                ]
            ];
    
            Response::success($dashboardData, 'Admin dashboard data retrieved successfully');
    
        } catch (Exception $e) {
            error_log("Admin dashboard error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    // Create new booking
   public function create() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }
    
            $input = json_decode(file_get_contents('php://input'), true);
    
            // Validate required fields
            $requiredFields = ['vehicle_id', 'service_ids', 'booking_date', 'start_time', 'end_time', 'address', 'latitude', 'longitude', 'total_price'];
            // Check if vehicle belongs to customer
            if (!$this->bookingModel->belongsToCustomer($input['vehicle_id'], $input['customer_id'])) {
                Response::error('Vehicle not found or does not belong to you', 400);
                return;
            }
    
            // Validate service_ids is an array
            if (!is_array($input['service_ids']) || empty($input['service_ids'])) {
                Response::error('Service IDs must be a non-empty array', 400);
                return;
            }
    
            // Prepare booking data with defaults as per requirements
            $bookingData = [
                'customer_id' => $input['customer_id'],
                'washer_id' => null, // Will be null by default
                'vehicle_id' => $input['vehicle_id'],
                'service_ids' => $input['service_ids'],
                'booking_date' => $input['booking_date'],
                'start_time' => $input['start_time'],
                'end_time' => $input['end_time'],
                'address' => $input['address'],
                'latitude' => $input['latitude'],
                'longitude' => $input['longitude'],
                'status' => 'pending', // Default status as per requirement
                'total_price' => $input['total_price'],
                'payment_status' => 'pending', // Default payment status
                'payment_method' => 'pending', // Default payment method
                'notes' => null // Notes will be null by default
            ];
    
            // Optional notes if provided
            if (!empty($input['notes'])) {
                $bookingData['notes'] = $input['notes'];
            }
    
            $bookingId = $this->bookingModel->create($bookingData);
    
            if ($bookingId) {
                // Get the created booking with details
                // $newBooking = $this->bookingModel->findById($bookingId);
                
                if (!empty($newBooking['service_ids'])) {
                    $newBooking['service_ids'] = json_decode($newBooking['service_ids'], true);
                    $newBooking['services'] = $this->bookingModel->getServicesByIds($newBooking['service_ids']);
                }
                
                // Format timestamps
                if (!empty($newBooking['created_at'])) {
                    $newBooking['created_at_formatted'] = date('d M Y, h:i A', strtotime($newBooking['created_at']));
                }
                
                // Format booking date and time
                // $newBooking['booking_date_formatted'] = date('d M Y', strtotime($newBooking['booking_date']));
                // $newBooking['start_time_formatted'] = date('h:i A', strtotime($newBooking['start_time']));
                // $newBooking['end_time_formatted'] = date('h:i A', strtotime($newBooking['end_time']));
    
                Response::success([
                    'message' => 'Booking created successfully'
                ], 'Booking created successfully', 201);
            } else {
                Response::error('Failed to create booking', 500);
            }
    
        } catch (Exception $e) {
            error_log("Create booking error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get comprehensive analytics data
    public function analytics() {
        try {
            $currentUser = getCurrentUser();
            // if (!$currentUser || !in_array($currentUser['user_type'], ['admin', 'superadmin'])) {
            //     Response::error('Admin access required', 403);
            //     return;
            // }
    
            // Get time period from query parameters
            $period = $_GET['period'] ?? 'month'; // day, week, month, quarter, year
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;
            
            // Set date range based on period
            $dateRange = $this->getDateRangeForPeriod($period, $startDate, $endDate);
            
            // Get all analytics data
            $analyticsData = [
                // Date range info
                'date_range' => [
                    'period' => $period,
                    'start_date' => $dateRange['start_date'],
                    'end_date' => $dateRange['end_date'],
                    'days_count' => $dateRange['days_count']
                ],
                
                // Performance Metrics
                'performance_metrics' => $this->bookingModel->getPerformanceMetrics($dateRange['start_date'], $dateRange['end_date']),
                
                // Revenue Analytics
                'revenue_analytics' => $this->bookingModel->getRevenueAnalytics($dateRange['start_date'], $dateRange['end_date'], $period),
                
                // Customer Analytics
                'customer_analytics' => $this->bookingModel->getCustomerAnalytics($dateRange['start_date'], $dateRange['end_date']),
                
                // Washer Analytics
                'washer_analytics' => $this->bookingModel->getWasherAnalytics($dateRange['start_date'], $dateRange['end_date']),
                
                // Service Analytics
                'service_analytics' => $this->bookingModel->getServiceAnalytics($dateRange['start_date'], $dateRange['end_date']),
                
                // Time-based Trends
                'time_trends' => $this->bookingModel->getTimeBasedTrends($dateRange['start_date'], $dateRange['end_date'], $period),
                
                // Geographic Analytics
                'geographic_analytics' => $this->bookingModel->getGeographicAnalytics($dateRange['start_date'], $dateRange['end_date']),
                
                // Peak Hours Analysis
                'peak_hours_analysis' => $this->bookingModel->getPeakHoursAnalysis($dateRange['start_date'], $dateRange['end_date']),
                
                // Cancellation Analysis
                'cancellation_analysis' => $this->bookingModel->getCancellationAnalysis($dateRange['start_date'], $dateRange['end_date']),
                
                // Conversion Funnel
                'conversion_funnel' => $this->bookingModel->getConversionFunnel($dateRange['start_date'], $dateRange['end_date']),
                
                // Retention Analysis
                'retention_analysis' => $this->bookingModel->getRetentionAnalysis($dateRange['start_date'], $dateRange['end_date']),
                
                // Vehicle Analytics
                'vehicle_analytics' => $this->bookingModel->getVehicleAnalytics($dateRange['start_date'], $dateRange['end_date'])
            ];
    
            Response::success($analyticsData, 'Analytics data retrieved successfully');
    
        } catch (Exception $e) {
            error_log("Analytics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Helper method to calculate date range
    private function getDateRangeForPeriod($period, $startDate = null, $endDate = null) {
        if ($startDate && $endDate) {
            $daysCount = floor((strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24)) + 1;
            return [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days_count' => $daysCount
            ];
        }
        
        $today = date('Y-m-d');
        
        switch ($period) {
            case 'day':
                $startDate = $today;
                $endDate = $today;
                $daysCount = 1;
                break;
                
            case 'week':
                $startDate = date('Y-m-d', strtotime('-7 days'));
                $endDate = $today;
                $daysCount = 7;
                break;
                
            case 'month':
                $startDate = date('Y-m-d', strtotime('-30 days'));
                $endDate = $today;
                $daysCount = 30;
                break;
                
            case 'quarter':
                $startDate = date('Y-m-d', strtotime('-90 days'));
                $endDate = $today;
                $daysCount = 90;
                break;
                
            case 'year':
                $startDate = date('Y-m-d', strtotime('-365 days'));
                $endDate = $today;
                $daysCount = 365;
                break;
                
            default:
                $startDate = date('Y-m-d', strtotime('-30 days'));
                $endDate = $today;
                $daysCount = 30;
        }
        
        return [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days_count' => $daysCount
        ];
    }

    // Get comparative analytics (compare with previous period)
    public function comparativeAnalytics() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !in_array($currentUser['user_type'], ['admin', 'superadmin'])) {
                Response::error('Admin access required', 403);
                return;
            }
    
            $period = $_GET['period'] ?? 'month';
            
            // Current period
            $currentRange = $this->getDateRangeForPeriod($period);
            
            // Previous period
            $previousStartDate = date('Y-m-d', strtotime($currentRange['start_date'] . " -{$currentRange['days_count']} days"));
            $previousEndDate = date('Y-m-d', strtotime($currentRange['start_date'] . " -1 day"));
            
            $comparativeData = [
                'current_period' => [
                    'range' => $currentRange,
                    'analytics' => $this->bookingModel->getPerformanceMetrics($currentRange['start_date'], $currentRange['end_date'])
                ],
                'previous_period' => [
                    'range' => [
                        'start_date' => $previousStartDate,
                        'end_date' => $previousEndDate,
                        'days_count' => $currentRange['days_count']
                    ],
                    'analytics' => $this->bookingModel->getPerformanceMetrics($previousStartDate, $previousEndDate)
                ],
                'comparison' => $this->bookingModel->getPeriodComparison(
                    $currentRange['start_date'], 
                    $currentRange['end_date'],
                    $previousStartDate,
                    $previousEndDate
                )
            ];
    
            Response::success($comparativeData, 'Comparative analytics retrieved successfully');
    
        } catch (Exception $e) {
            error_log("Comparative analytics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
// Accept booking (called when washer clicks "Accept Job")
          // Accept booking (when washer accepts from app)
        public function acceptBooking($id) {
            try {
                $currentUser = getCurrentUser();
                if (!$currentUser) {
                    Response::error('Authentication required', 401);
                    return;
                }
        
                $input = json_decode(file_get_contents('php://input'), true);
                
                // Validate that washer_id is provided
                if (empty($input['washer_id'])) {
                    Response::error('Washer ID is required', 400);
                    return;
                }
        
                $booking = $this->bookingModel->findById($id);
                if (!$booking) {
                    Response::error('Booking not found', 404);
                    return;
                }
        
                // Check if booking is already accepted by another washer
                if ($booking['washer_id'] !== null && $booking['washer_id'] != $input['washer_id']) {
                    Response::error('Booking already accepted by another washer', 409);
                    return;
                }
        
                // Check if booking is in pending or confirmed status
                if (!in_array($booking['status'], ['pending', 'confirmed'])) {
                    Response::error('Cannot accept booking with status: ' . $booking['status'], 400);
                    return;
                }
        
                // Use the new allocateToWasher method
                $result = $this->bookingModel->allocateToWasher($id, $input['washer_id']);
        
                if ($result) {
                    Response::success([
                        'booking_id' => $id,
                        'washer_id' => $input['washer_id'],
                        'status' => 'allocated',
                        'message' => 'Booking accepted successfully'
                    ], 'Booking accepted successfully');
                } else {
                    Response::error('Failed to accept booking', 500);
                }
        
            } catch (Exception $e) {
                error_log("Accept booking error: " . $e->getMessage());
                Response::error('Server error occurred', 500);
            }
        }
    // Update booking
    public function update($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $booking = $this->bookingModel->findById($id);
            if (!$booking) {
                Response::error('Booking not found', 404);
                return;
            }

            // Check permissions (only customer who created booking or admin can update)
            if ($currentUser['user_type'] === 'customer' && $booking['customer_id'] != $currentUser['id']) {
                Response::error('Access denied', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Check if status is being changed to 'cancelled'
            if (isset($input['status']) && $input['status'] === 'cancelled') {
                // Only allow cancellation if booking is not already completed or cancelled
                if (in_array($booking['status'], ['completed', 'cancelled'])) {
                    Response::error('Cannot cancel a booking that is already ' . $booking['status'], 400);
                    return;
                }
                
                // Update only the status to cancelled
                $result = $this->bookingModel->updateStatus($id, 'cancelled');
                
                if ($result) {
                    Response::success(null, 'Booking cancelled successfully');
                } else {
                    Response::error('Failed to cancel booking', 500);
                }
                return;
            }

            // For other updates, check if vehicle belongs to customer
            if (isset($input['vehicle_id']) && !$this->vehicleModel->belongsToCustomer($input['vehicle_id'], $currentUser['id'])) {
                Response::error('Vehicle not found or does not belong to you', 400);
                return;
            }

            // Check time slot availability if time is being changed
            if (isset($input['booking_date']) || isset($input['start_time']) || isset($input['end_time'])) {
                $bookingDate = $input['booking_date'] ?? $booking['booking_date'];
                $startTime = $input['start_time'] ?? $booking['start_time'];
                $endTime = $input['end_time'] ?? $booking['end_time'];
                
                if (!$this->bookingModel->isTimeSlotAvailable($bookingDate, $startTime, $endTime, $id)) {
                    Response::error('Selected time slot is not available', 409);
                    return;
                }
            }

            $result = $this->bookingModel->update($id, $input);

            if ($result) {
                Response::success(null, 'Booking updated successfully');
            } else {
                Response::error('Failed to update booking', 500);
            }

        } catch (Exception $e) {
            error_log("Update booking error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Delete booking
    public function delete($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $booking = $this->bookingModel->findById($id);
            if (!$booking) {
                Response::error('Booking not found', 404);
                return;
            }

            // Check permissions
            if ($currentUser['user_type'] === 'customer' && $booking['customer_id'] != $currentUser['id']) {
                Response::error('Access denied', 403);
                return;
            }

            // Only allow deletion if booking is not completed
            if ($booking['status'] === 'completed') {
                Response::error('Cannot delete a completed booking', 400);
                return;
            }

            $result = $this->bookingModel->delete($id);

            if ($result) {
                Response::success(null, 'Booking deleted successfully');
            } else {
                Response::error('Failed to delete booking', 500);
            }

        } catch (Exception $e) {
            error_log("Delete booking error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Assign washer to booking (admin/manager only)
    public function assignWasher($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !in_array($currentUser['user_type'], ['admin', 'superadmin'])) {
                Response::error('Only admin can assign washers', 403);
                return;
            }

            $booking = $this->bookingModel->findById($id);
            if (!$booking) {
                Response::error('Booking not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['washer_id'])) {
                Response::error('Washer ID is required', 400);
                return;
            }

            // Check if washer is available for this time slot
            $availableWashers = $this->bookingModel->getAvailableWashers(
                $booking['booking_date'], 
                $booking['start_time'], 
                $booking['end_time']
            );

            $washerAvailable = false;
            foreach ($availableWashers as $washer) {
                if ($washer['id'] == $input['washer_id']) {
                    $washerAvailable = true;
                    break;
                }
            }

            if (!$washerAvailable) {
                Response::error('Selected washer is not available for this time slot', 409);
                return;
            }

            $result = $this->bookingModel->assignWasher($id, $input['washer_id']);

            if ($result) {
                Response::success(null, 'Washer assigned successfully');
            } else {
                Response::error('Failed to assign washer', 500);
            }

        } catch (Exception $e) {
            error_log("Assign washer error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Update booking status
    public function updateStatus($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $booking = $this->bookingModel->findById($id);
            if (!$booking) {
                Response::error('Booking not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['status'])) {
                Response::error('Status is required', 400);
                return;
            }

            $validStatuses = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
            if (!in_array($input['status'], $validStatuses)) {
                Response::error('Invalid status. Must be: ' . implode(', ', $validStatuses), 400);
                return;
            }

            // Check permissions based on user type
            if ($currentUser['user_type'] === 'customer') {
                // Customers can only cancel their own bookings
                if ($input['status'] !== 'cancelled' || $booking['customer_id'] != $currentUser['id']) {
                    Response::error('You can only cancel your own bookings', 403);
                    return;
                }
            } elseif ($currentUser['user_type'] === 'washer') {
                // Washers can only update status of their assigned bookings
                if ($booking['washer_id'] != $currentUser['id']) {
                    Response::error('You can only update bookings assigned to you', 403);
                    return;
                }
                
                // Washers can only change to in_progress or completed
                if (!in_array($input['status'], ['in_progress', 'completed'])) {
                    Response::error('Washers can only change status to in_progress or completed', 403);
                    return;
                }
            }

            $result = $this->bookingModel->updateStatus($id, $input['status']);

            if ($result) {
                Response::success(null, 'Booking status updated successfully');
            } else {
                Response::error('Failed to update booking status', 500);
            }

        } catch (Exception $e) {
            error_log("Update booking status error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    
    
     public function UpdateCustomer($id) {
      try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        $booking = $this->bookingModel->findById($id);
        if (!$booking) {
            Response::error('Booking not found', 404);
            return;
        }

        // Check if booking is already allocated - don't update if it is
        if ($booking['status'] === 'allocated') {
            Response::error('Cannot update status for allocated bookings', 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['status'])) {
            Response::error('Status is required', 400);
            return;
        }

        $validStatuses = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($input['status'], $validStatuses)) {
            Response::error('Invalid status. Must be: ' . implode(', ', $validStatuses), 400);
            return;
        }

        $result = $this->bookingModel->updatecustomerStatus($id, $input['status']);

                if ($result) {
                    Response::success(null, 'Booking status updated successfully');
                } else {
                    Response::error('status already allocated you are not allowed to cancel', 500);
                }

            } catch (Exception $e) {
                error_log("Update booking status error: " . $e->getMessage());
                Response::error('Server error occurred', 500);
            }
        }
    // Update payment status
    public function updatePaymentStatus($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !in_array($currentUser['user_type'], ['admin', 'superadmin', 'washer'])) {
                Response::error('Only admin or washer can update payment status', 403);
                return;
            }

            $booking = $this->bookingModel->findById($id);
            if (!$booking) {
                Response::error('Booking not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['payment_status'])) {
                Response::error('Payment status is required', 400);
                return;
            }

            $validStatuses = ['pending', 'paid', 'failed', 'refunded'];
            if (!in_array($input['payment_status'], $validStatuses)) {
                Response::error('Invalid payment status', 400);
                return;
            }

            $result = $this->bookingModel->updatePaymentStatus(
                $id, 
                $input['payment_status'],
                $input['payment_method'] ?? null
            );

            if ($result) {
                Response::success(null, 'Payment status updated successfully');
            } else {
                Response::error('Failed to update payment status', 500);
            }

        } catch (Exception $e) {
            error_log("Update payment status error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get booking statistics
    public function getStatistics() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $filters = [];
            
            // Apply filters based on user role
            if ($currentUser['user_type'] === 'customer') {
                $filters['customer_id'] = $currentUser['id'];
            } elseif ($currentUser['user_type'] === 'washer') {
                $filters['washer_id'] = $currentUser['id'];
            }
            
            // Add date filters if provided
            if (!empty($_GET['date_from'])) {
                $filters['date_from'] = $_GET['date_from'];
            }
            
            if (!empty($_GET['date_to'])) {
                $filters['date_to'] = $_GET['date_to'];
            }

            $stats = $this->bookingModel->getStatistics($filters);

            if ($stats === false) {
                Response::error('Failed to retrieve statistics', 500);
                return;
            }

            Response::success([
                'statistics' => $stats
            ], 'Statistics retrieved successfully');

        } catch (Exception $e) {
            error_log("Get booking statistics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    
    // Get bookings for specific customer
    public function getCustomerBookings() {
        try {
            // Get customer_id from request body
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['customer_id'])) {
                Response::error('customer_id is required in request body', 400);
                return;
            }
    
            $customerId = (int)$input['customer_id'];
            
            // Get date filter from query parameters
            $dateFilter = $_GET['date'] ?? null;
            
            // Validate date if provided
            if ($dateFilter && !Validator::isValidDate($dateFilter)) {
                Response::error('Invalid date format. Use YYYY-MM-DD', 400);
                return;
            }
    
            // Get bookings from model
            $bookings = $this->bookingModel->getBookingsByCustomer($customerId, $dateFilter);
            
            if ($bookings === false) {
                Response::error('Failed to retrieve bookings', 500);
                return;
            }
    
            // Process bookings
            foreach ($bookings as &$booking) {
                // Parse service_ids from JSON
                if (!empty($booking['service_ids'])) {
                    $serviceIds = json_decode($booking['service_ids'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $booking['service_ids'] = $serviceIds;
                    } else {
                        $booking['service_ids'] = [];
                    }
                }
                
                // Add formatted dates
                if (!empty($booking['booking_date'])) {
                    $booking['booking_date_formatted'] = date('d M Y', strtotime($booking['booking_date']));
                }
                if (!empty($booking['start_time'])) {
                    $booking['start_time_formatted'] = date('h:i A', strtotime($booking['start_time']));
                }
                if (!empty($booking['end_time'])) {
                    $booking['end_time_formatted'] = date('h:i A', strtotime($booking['end_time']));
                }
                if (!empty($booking['created_at'])) {
                    $booking['created_at_formatted'] = date('d M Y, h:i A', strtotime($booking['created_at']));
                }
            }
    
            Response::success([
                'bookings' => $bookings,
                'total' => count($bookings),
                'customer_id' => $customerId,
                'filter_date' => $dateFilter
            ], 'Customer bookings retrieved successfully');
    
        } catch (Exception $e) {
            error_log("BookingController::getCustomerBookings - Exception: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    // Get ALL bookings for current washer (no limit)
  public function getMyBookings() {
    try {
        // Get washer_id from request body instead of current user
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['washer_id'])) {
            error_log("BookingController::getMyBookings - washer_id is required in request body");
            Response::error('washer_id is required in request body', 400);
            return;
        }

        $washerId = (int)$input['washer_id'];
        
        // Log access for monitoring
        error_log("BookingController::getMyBookings - Fetching bookings for washer ID: " . $washerId);

        $filters = [];
        $filters['washer_id'] = $washerId;
        
        // Add status filter if provided in query params
        if (!empty($_GET['status'])) {
            $status = $_GET['status'];
            // Validate status parameter
            $validStatuses = ['pending', 'confirmed', 'allocated', 'in_progress', 'completed', 'cancelled'];
            if (!in_array($status, $validStatuses)) {
                error_log("BookingController::getMyBookings - Invalid status filter provided: " . $status . " for washer ID: " . $washerId);
                Response::error('Invalid status. Must be: ' . implode(', ', $validStatuses), 400);
                return;
            }
            $filters['status'] = $status;
            error_log("BookingController::getMyBookings - Filtering by status: " . $status);
        }
        
        // Add date filters if provided in query params
        if (!empty($_GET['date_from'])) {
            $dateFrom = $_GET['date_from'];
            if (!Validator::isValidDate($dateFrom)) {
                error_log("BookingController::getMyBookings - Invalid date_from format: " . $dateFrom);
                Response::error('Invalid date_from format. Use YYYY-MM-DD', 400);
                return;
            }
            $filters['date_from'] = $dateFrom;
        }
        
        if (!empty($_GET['date_to'])) {
            $dateTo = $_GET['date_to'];
            if (!Validator::isValidDate($dateTo)) {
                error_log("BookingController::getMyBookings - Invalid date_to format: " . $dateTo);
                Response::error('Invalid date_to format. Use YYYY-MM-DD', 400);
                return;
            }
            $filters['date_to'] = $dateTo;
        }
        
        // Validate date range if both dates provided
        if (!empty($filters['date_from']) && !empty($filters['date_to'])) {
            if (strtotime($filters['date_from']) > strtotime($filters['date_to'])) {
                error_log("BookingController::getMyBookings - Invalid date range. date_from > date_to: " . $filters['date_from'] . " > " . $filters['date_to']);
                Response::error('Start date cannot be after end date', 400);
                return;
            }
        }

        // Get bookings for the washer
        error_log("BookingController::getMyBookings - Fetching bookings for washer ID: " . $washerId . " with filters: " . json_encode($filters));
        $bookings = $this->bookingModel->getBookingsForWasher($washerId, $filters);
        
        if ($bookings === false) {
            error_log("BookingController::getMyBookings - Database error while fetching bookings for washer ID: " . $washerId);
            Response::error('Failed to retrieve bookings', 500);
            return;
        }

        // Log successful data retrieval
        error_log("BookingController::getMyBookings - Successfully retrieved " . count($bookings) . " bookings for washer ID: " . $washerId);

        // Parse service_ids from JSON
        $processedBookings = 0;
        $jsonParseErrors = 0;
        
        foreach ($bookings as &$booking) {
            try {
                if (!empty($booking['service_ids'])) {
                    $serviceIds = json_decode($booking['service_ids'], true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        error_log("BookingController::getMyBookings - JSON decode error for booking ID: " . $booking['id'] . " - Error: " . json_last_error_msg());
                        $jsonParseErrors++;
                        $booking['service_ids'] = [];
                    } else {
                        $booking['service_ids'] = $serviceIds;
                    }
                }
                
                // Add formatted date/time
                if (!empty($booking['booking_date'])) {
                    $booking['booking_date_formatted'] = date('d M Y', strtotime($booking['booking_date']));
                }
                if (!empty($booking['start_time'])) {
                    $booking['start_time_formatted'] = date('h:i A', strtotime($booking['start_time']));
                }
                if (!empty($booking['end_time'])) {
                    $booking['end_time_formatted'] = date('h:i A', strtotime($booking['end_time']));
                }
                if (!empty($booking['created_at'])) {
                    $booking['created_at_formatted'] = date('d M Y, h:i A', strtotime($booking['created_at']));
                }
                
                $processedBookings++;
                
            } catch (Exception $e) {
                error_log("BookingController::getMyBookings - Error processing booking ID: " . ($booking['id'] ?? 'unknown') . " - " . $e->getMessage());
                // Continue processing other bookings
            }
        }

        // Log processing summary
        if ($jsonParseErrors > 0) {
            error_log("BookingController::getMyBookings - JSON parse errors: " . $jsonParseErrors . " out of " . count($bookings) . " bookings");
        }

        // Get washer name from database if available
        $washerName = 'Washer ' . $washerId;
        // You might want to fetch washer details from database here
        
        Response::success([
            'bookings' => $bookings,
            'total' => count($bookings),
            'washer_id' => $washerId,
            'washer_name' => $washerName,
            'processing_summary' => [
                'total_processed' => $processedBookings,
                'json_parse_errors' => $jsonParseErrors
            ]
        ], 'Bookings retrieved successfully');

        } catch (Exception $e) {
            // Log the complete exception with stack trace
            error_log("BookingController::getMyBookings - Unhandled exception: " . $e->getMessage() . 
                      " - Stack trace: " . $e->getTraceAsString() . 
                      " - File: " . $e->getFile() . 
                      " - Line: " . $e->getLine());
            Response::error('Server error occurred', 500);
        }
    }
    // Get available time slots
    public function getAvailableTimeSlots() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $date = $_GET['date'] ?? date('Y-m-d');
            $duration = $_GET['duration'] ?? 60; // in minutes
            
            // Define working hours
            $workingHours = [
                'start' => '08:00:00',
                'end' => '20:00:00'
            ];
            
            // Generate time slots
            $startTime = strtotime($workingHours['start']);
            $endTime = strtotime($workingHours['end']);
            $slotDuration = $duration * 60; // Convert to seconds
            
            $availableSlots = [];
            
            for ($time = $startTime; $time + $slotDuration <= $endTime; $time += 1800) { // 30-minute intervals
                $slotStart = date('H:i:s', $time);
                $slotEnd = date('H:i:s', $time + $slotDuration);
                
                // Check if this time slot is available
                $isAvailable = $this->bookingModel->isTimeSlotAvailable($date, $slotStart, $slotEnd);
                
                if ($isAvailable) {
                    $availableSlots[] = [
                        'start_time' => $slotStart,
                        'end_time' => $slotEnd,
                        'display' => date('g:i A', strtotime($slotStart)) . ' - ' . date('g:i A', strtotime($slotEnd))
                    ];
                }
            }

            Response::success([
                'date' => $date,
                'duration_minutes' => $duration,
                'available_slots' => $availableSlots,
                'total_slots' => count($availableSlots)
            ], 'Available time slots retrieved successfully');

        } catch (Exception $e) {
            error_log("Get available time slots error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get bookings by date range
    public function getByDateRange() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $startDate = $_GET['start_date'] ?? date('Y-m-d');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            
            // Validate dates
            if (strtotime($startDate) > strtotime($endDate)) {
                Response::error('Start date cannot be after end date', 400);
                return;
            }

            $bookings = $this->bookingModel->getByDateRange(
                $startDate, 
                $endDate,
                $currentUser['user_type'] === 'washer' ? $currentUser['id'] : null
            );

            if ($bookings === false) {
                Response::error('Failed to retrieve bookings', 500);
                return;
            }

            // Parse service_ids from JSON
            foreach ($bookings as &$booking) {
                if (!empty($booking['service_ids'])) {
                    $booking['service_ids'] = json_decode($booking['service_ids'], true);
                }
            }

            Response::success([
                'bookings' => $bookings,
                'total' => count($bookings),
                'start_date' => $startDate,
                'end_date' => $endDate
            ], 'Bookings retrieved successfully');

        } catch (Exception $e) {
            error_log("Get bookings by date range error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get upcoming bookings
    public function getUpcomingBookings() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $limit = $_GET['limit'] ?? 10;
            
            $bookings = $this->bookingModel->getUpcomingBookings($limit);

            if ($bookings === false) {
                Response::error('Failed to retrieve upcoming bookings', 500);
                return;
            }

            // Parse service_ids from JSON
            foreach ($bookings as &$booking) {
                if (!empty($booking['service_ids'])) {
                    $booking['service_ids'] = json_decode($booking['service_ids'], true);
                }
            }

            Response::success([
                'bookings' => $bookings,
                'total' => count($bookings)
            ], 'Upcoming bookings retrieved successfully');

        } catch (Exception $e) {
            error_log("Get upcoming bookings error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get today's bookings for washer
    public function getTodayBookings() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || $currentUser['user_type'] !== 'driver') {
                Response::error('Only washers can access today\'s bookings', 403);
                return;
            }

            $bookings = $this->bookingModel->getTodayBookingsForWasher($currentUser['id']);

            if ($bookings === false) {
                Response::error('Failed to retrieve today\'s bookings', 500);
                return;
            }

            // Parse service_ids from JSON
            foreach ($bookings as &$booking) {
                if (!empty($booking['service_ids'])) {
                    $booking['service_ids'] = json_decode($booking['service_ids'], true);
                }
            }

            Response::success([
                'bookings' => $bookings,
                'total' => count($bookings),
                'date' => date('Y-m-d')
            ], 'Today\'s bookings retrieved successfully');

        } catch (Exception $e) {
            error_log("Get today\'s bookings error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get available washers for a time slot
    public function getAvailableWashers() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $date = $_GET['date'] ?? date('Y-m-d');
            $startTime = $_GET['start_time'] ?? '09:00:00';
            $endTime = $_GET['end_time'] ?? '10:00:00';

            // Validate time format
            if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}:\d{2}$/', $endTime)) {
                Response::error('Invalid time format. Use HH:MM:SS', 400);
                return;
            }

            $washers = $this->bookingModel->getAvailableWashers($date, $startTime, $endTime);

            Response::success([
                'washers' => $washers,
                'total' => count($washers),
                'date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime
            ], 'Available washers retrieved successfully');

        } catch (Exception $e) {
            error_log("Get available washers error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
}
?>