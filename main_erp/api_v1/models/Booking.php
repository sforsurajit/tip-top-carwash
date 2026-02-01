<?php
require_once 'config/database.php';

class Booking {
    private $db;
    private $errorLogDir = __DIR__ . "/../logs/errors/";
    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in Booking model: " . $e->getMessage());
            throw $e;
        }
    }
    
    private function logError($message) {
        try {
            if (!is_dir($this->errorLogDir)) {
                mkdir($this->errorLogDir, 0755, true);
            }

            $logFile = $this->errorLogDir . "error_" . date("Y-m-d") . ".log";
            $timestamp = date("Y-m-d H:i:s");

            $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
            $class = $backtrace[1]['class'] ?? 'unknown';
            $function = $backtrace[1]['function'] ?? 'unknown';
            $line = $backtrace[0]['line'] ?? 'unknown';

            $logMessage = "[{$timestamp}] Class: {$class}, Method: {$function}, Line: {$line}, Message: {$message}\n";

            file_put_contents($logFile, $logMessage, FILE_APPEND);
        } catch (Exception $e) {
            error_log("Logging failed: " . $e->getMessage());
        }
    }

    // Get all bookings with filters
    public function getAll($filters = [], $limit = 10, $offset = 0) {
        try {
            $sql = "SELECT b.*, 
                           c.name as customer_name, 
                           c.email as customer_email,
                           c.phone as customer_phone,
                           w.name as washer_name,
                           w.email as washer_email,
                           w.phone as washer_phone,
                           v.make as vehicle_make,
                           v.model as vehicle_model,
                           v.license_plate as vehicle_plate
                    FROM bookings b
                    LEFT JOIN usersnew c ON b.customer_id = c.id
                    LEFT JOIN usersnew w ON b.washer_id = w.id
                    LEFT JOIN vehicles v ON b.vehicle_id = v.id
                    WHERE 1=1";
            
            $params = [];
            
            // Apply filters
            if (!empty($filters['customer_id'])) {
                $sql .= " AND b.customer_id = ?";
                $params[] = $filters['customer_id'];
            }
            
            if (!empty($filters['washer_id'])) {
                $sql .= " AND b.washer_id = ?";
                $params[] = $filters['washer_id'];
            }
            
            if (!empty($filters['status'])) {
                $sql .= " AND b.status = ?";
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['payment_status'])) {
                $sql .= " AND b.payment_status = ?";
                $params[] = $filters['payment_status'];
            }
            
            if (!empty($filters['date_from'])) {
                $sql .= " AND DATE(b.booking_date) >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $sql .= " AND DATE(b.booking_date) <= ?";
                $params[] = $filters['date_to'];
            }
            
            $sql .= " ORDER BY b.booking_date DESC, b.start_time DESC
                     LIMIT ? OFFSET ?";
            
            $params[] = (int)$limit;
            $params[] = (int)$offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Booking getAll error: " . $e->getMessage());
            return false;
        }
    }

    public function insertBookingHistory($data) {
            try {
                $sql = "INSERT INTO booking_history 
                        (booking_id, before_images, after_images, under_signed,completed_at) 
                        VALUES (?, ?, ?, ?, ?)";
                
                $stmt = $this->db->prepare($sql);
                $result = $stmt->execute([
                    $data['booking_id'],
                    $data['before_images'],
                    $data['after_images'],
                    $data['under_signed'],
                    $data['completed_at']
                ]);
                
                if ($result) {
                    return $this->db->lastInsertId();
                }
                return false;
            } catch (Exception $e) {
                error_log("Insert booking history error: " . $e->getMessage());
                return false;
            }
        }
    // Get booking by ID
    public function findById($id) {
        try {
            $sql = "SELECT b.*, 
                           c.name as customer_name, 
                           c.email as customer_email,
                           c.phone as customer_phone,
                           w.name as washer_name,
                           w.email as washer_email,
                           w.phone as washer_phone,
                           v.make as vehicle_make,
                           v.model as vehicle_model,
                           v.year as vehicle_year,
                           v.color as vehicle_color,
                           v.license_plate as vehicle_plate,
                           v.type as vehicle_type
                    FROM bookings b
                    LEFT JOIN usersnew c ON b.customer_id = c.id
                    LEFT JOIN usersnew w ON b.washer_id = w.id
                    LEFT JOIN vehicles v ON b.vehicle_id = v.id
                    WHERE b.id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Booking findById error: " . $e->getMessage());
            return false;
        }
    }

  // Check if vehicle belongs to customer
    public function belongsToCustomer($vehicleId, $customerId) {
        try {
            $sql = "SELECT COUNT(*) as count FROM vehicles WHERE id = ? AND customer_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$vehicleId, $customerId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log("belongsToCustomer error: " . $e->getMessage());
            return false;
        }
    }
    
    // Create new booking
    public function create($data) {
        try {
            $sql = "INSERT INTO bookings (
                customer_id, washer_id, vehicle_id, service_ids, booking_date, 
                start_time, end_time, address, latitude, longitude, status, 
                total_price, payment_status, payment_method, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['customer_id'],
                $data['washer_id'] ?? null, // Null by default
                $data['vehicle_id'],
                isset($data['service_ids']) ? json_encode($data['service_ids']) : null,
                $data['booking_date'],
                $data['start_time'],
                $data['end_time'],
                $data['address'],
                $data['latitude'],
                $data['longitude'],
                $data['status'] ?? 'pending', // Default status
                $data['total_price'],
                $data['payment_status'] ?? 'pending', // Default payment status
                $data['payment_method'] ?? 'pending', // Default payment method
                $data['notes'] ?? null // Null by default
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (Exception $e) {
            error_log("Booking create error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get services by IDs
    public function getServicesByIds($serviceIds) {
        try {
            if (empty($serviceIds)) {
                return [];
            }
            
            $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
            $sql = "SELECT id, title, description, price, duration_minutes FROM services WHERE id IN ($placeholders)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($serviceIds);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("getServicesByIds error: " . $e->getMessage());
            return [];
        }
    }

    // Update booking
    public function update($id, $data) {
        try {
            $sql = "UPDATE bookings SET 
                    washer_id = ?, vehicle_id = ?, service_ids = ?, booking_date = ?,
                    start_time = ?, end_time = ?, address = ?, latitude = ?, longitude = ?,
                    status = ?, total_price = ?, payment_status = ?, payment_method = ?,
                    notes = ?, updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                $data['washer_id'] ?? null,
                $data['vehicle_id'] ?? null,
                isset($data['service_ids']) ? json_encode($data['service_ids']) : null,
                $data['booking_date'] ?? null,
                $data['start_time'] ?? null,
                $data['end_time'] ?? null,
                $data['address'] ?? null,
                $data['latitude'] ?? null,
                $data['longitude'] ?? null,
                $data['status'] ?? null,
                $data['total_price'] ?? null,
                $data['payment_status'] ?? null,
                $data['payment_method'] ?? null,
                $data['notes'] ?? null,
                $id
            ]);
        } catch (Exception $e) {
            error_log("Booking update error: " . $e->getMessage());
            return false;
        }
    }
    
        public function allocateToWasher($id, $washerId) {
            try {
                error_log("allocateToWasher called with: booking_id = {$id}, washer_id = {$washerId}");
                $this->logError("Allocating booking {$id} to washer {$washerId}");
                
                // First check if booking is already allocated
                $checkSql = "SELECT washer_id, status FROM bookings WHERE id = ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->execute([$id]);
                $booking = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$booking) {
                    error_log("Booking with ID {$id} not found");
                    return false;
                }
                
                $currentWasherId = $booking['washer_id'];
                $currentStatus = $booking['status'];
                
                error_log("Current status: {$currentStatus}, Current washer_id: {$currentWasherId}");
                
                // If already allocated to this washer, return true (idempotent)
                if ($currentWasherId == $washerId && $currentStatus == 'allocated') {
                    error_log("Booking already allocated to this washer");
                    return true;
                }
                
                // If allocated to someone else, return false
                if ($currentWasherId != null && $currentWasherId != $washerId) {
                    error_log("Booking already allocated to washer: {$currentWasherId}");
                    return false;
                }
                
                // Only allocate if status is pending or confirmed
                $allowedStatuses = ['pending', 'confirmed'];
                if (!in_array($currentStatus, $allowedStatuses)) {
                    error_log("Cannot allocate booking with status: {$currentStatus}");
                    return false;
                }
                
                // Perform the allocation
                $sql = "UPDATE bookings SET 
                        washer_id = ?, 
                        status = 'allocated', 
                        updated_at = NOW()
                        WHERE id = ? AND status IN ('pending', 'confirmed')";
                
                $stmt = $this->db->prepare($sql);
                $result = $stmt->execute([$washerId, $id]);
                
                if ($result) {
                    $affectedRows = $stmt->rowCount();
                    error_log("Allocation successful. Affected rows: {$affectedRows}");
                    return $affectedRows > 0;
                }
                
                return false;
                
            } catch (Exception $e) {
                error_log("allocateToWasher error: " . $e->getMessage());
                return false;
            }
        }

    // Delete booking
    public function delete($id) {
        try {
            $sql = "DELETE FROM bookings WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            error_log("Booking delete error: " . $e->getMessage());
            return false;
        }
    }

    // Update booking status
    public function updateStatus($id, $status) {
        try {
            $sql = "UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $id]);
        } catch (Exception $e) {
            error_log("Booking updateStatus error: " . $e->getMessage());
            return false;
        }
    }
    
    //updatecancel
     public function updatecustomerStatus($id, $status) {
    try {
        // Don't update if current status is 'allocated'
        $sql = "UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ? AND status != 'allocated'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$status, $id]);
        
        // Check if any rows were affected
        return $stmt->rowCount() > 0;
        
        } catch (Exception $e) {
            error_log("Booking updateStatus error: " . $e->getMessage());
            return false;
        }
    }

    // Update payment status
    public function updatePaymentStatus($id, $paymentStatus, $paymentMethod = null) {
        try {
            $sql = "UPDATE bookings SET payment_status = ?, payment_method = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$paymentStatus, $paymentMethod, $id]);
        } catch (Exception $e) {
            error_log("Booking updatePaymentStatus error: " . $e->getMessage());
            return false;
        }
    }

    // Assign washer to booking
    public function assignWasher($id, $washerId) {
        try {
            $sql = "UPDATE bookings SET washer_id = ?, status = 'assigned', updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$washerId, $id]);
        } catch (Exception $e) {
            error_log("Booking assignWasher error: " . $e->getMessage());
            return false;
        }
    }

    // Get bookings by date range
    public function getByDateRange($startDate, $endDate, $washerId = null) {
        try {
            $sql = "SELECT b.*, 
                           c.name as customer_name,
                           v.make as vehicle_make,
                           v.model as vehicle_model
                    FROM bookings b
                    LEFT JOIN usersnew c ON b.customer_id = c.id
                    LEFT JOIN vehicles v ON b.vehicle_id = v.id
                    WHERE DATE(b.booking_date) BETWEEN ? AND ?";
            
            $params = [$startDate, $endDate];
            
            if ($washerId) {
                $sql .= " AND b.washer_id = ?";
                $params[] = $washerId;
            }
            
            $sql .= " ORDER BY b.booking_date, b.start_time";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Booking getByDateRange error: " . $e->getMessage());
            return false;
        }
    }

    // Get available washers for a time slot
    public function getAvailableWashers($date, $startTime, $endTime) {
        try {
            $sql = "SELECT u.* 
                    FROM usersnew u
                    WHERE u.user_type = 'washer' 
                    AND u.status = 'active'
                    AND NOT EXISTS (
                        SELECT 1 FROM bookings b
                        WHERE b.washer_id = u.id
                        AND b.booking_date = ?
                        AND (
                            (b.start_time < ? AND b.end_time > ?) OR
                            (b.start_time < ? AND b.end_time > ?) OR
                            (b.start_time >= ? AND b.end_time <= ?)
                        )
                        AND b.status NOT IN ('cancelled', 'completed')
                    )";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$date, $endTime, $startTime, $startTime, $endTime, $startTime, $endTime]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Booking getAvailableWashers error: " . $e->getMessage());
            return false;
        }
    }

    // Get booking statistics
    public function getStatistics($filters = []) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_bookings,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_bookings,
                        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_bookings,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_bookings,
                        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
                        SUM(total_price) as total_revenue,
                        SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as collected_revenue
                    FROM bookings
                    WHERE 1=1";
            
            $params = [];
            
            // Apply filters
            if (!empty($filters['washer_id'])) {
                $sql .= " AND washer_id = ?";
                $params[] = $filters['washer_id'];
            }
            
            if (!empty($filters['customer_id'])) {
                $sql .= " AND customer_id = ?";
                $params[] = $filters['customer_id'];
            }
            
            if (!empty($filters['date_from'])) {
                $sql .= " AND DATE(booking_date) >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $sql .= " AND DATE(booking_date) <= ?";
                $params[] = $filters['date_to'];
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Booking statistics error: " . $e->getMessage());
            return false;
        }
    }

    // Check time slot availability
    public function isTimeSlotAvailable($date, $startTime, $endTime, $excludeBookingId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM bookings 
                    WHERE booking_date = ? 
                    AND (
                        (start_time < ? AND end_time > ?) OR
                        (start_time < ? AND end_time > ?) OR
                        (start_time >= ? AND end_time <= ?)
                    )
                    AND status NOT IN ('cancelled', 'completed')";
            
            $params = [$date, $endTime, $startTime, $startTime, $endTime, $startTime, $endTime];
            
            if ($excludeBookingId) {
                $sql .= " AND id != ?";
                $params[] = $excludeBookingId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] == 0;
        } catch (Exception $e) {
            error_log("isTimeSlotAvailable error: " . $e->getMessage());
            return false;
        }
    }

    // Get upcoming bookings
  public function getUpcomingBookings($limit = 10) {
   try {
        $sql = "SELECT 
                    b.*,
                    c.name AS customer_name,
                    c.phone AS customer_phone,
                    v.make AS vehicle_make,
                    v.model AS vehicle_model,
                    v.license_plate AS vehicle_plate,
                    GROUP_CONCAT(DISTINCT s.title ORDER BY s.id SEPARATOR ', ') AS service_titles
                FROM bookings b
                LEFT JOIN users c ON b.customer_id = c.id
                LEFT JOIN vehicles v ON b.vehicle_id = v.id
                LEFT JOIN services s ON 
                    FIND_IN_SET(
                        s.id,
                        REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                    ) > 0
                WHERE b.booking_date >= CURDATE()
                  AND b.status NOT IN ('completed', 'cancelled')
                GROUP BY b.id
                ORDER BY b.booking_date, b.start_time";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            error_log("getUpcomingBookings error: " . $e->getMessage());
            return false;
        }

    }

    // Get bookings by customer with optional date filter
    public function getBookingsByCustomer($customerId, $date = null) {
        try {
            $sql = "SELECT 
                        b.*,
                        c.name AS customer_name,
                        c.phone AS customer_phone,
                        v.make AS vehicle_make,
                        v.model AS vehicle_model,
                        v.license_plate AS vehicle_plate,
                        GROUP_CONCAT(DISTINCT s.title ORDER BY s.id SEPARATOR ', ') AS service_titles
                    FROM bookings b
                    LEFT JOIN usersnew c ON b.customer_id = c.id
                    LEFT JOIN vehicles v ON b.vehicle_id = v.id
                    LEFT JOIN services s ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                    WHERE b.customer_id = ?";
            
            $params = [$customerId];
            
            // Add date filter if provided
            if ($date) {
                $sql .= " AND DATE(b.booking_date) = ?";
                $params[] = $date;
            }
            
            $sql .= " GROUP BY b.id
                    ORDER BY b.booking_date DESC, b.start_time DESC";
    
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
    
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
    
        } catch (Exception $e) {
            error_log("getBookingsByCustomer error: " . $e->getMessage());
            return false;
        }
    }

  // Get ALL bookings for specific washer (no limit)
    public function getBookingsForWasher($washerId, $filters = []) {
        try {
            $sql = "SELECT b.*, 
                           c.name as customer_name, 
                           c.email as customer_email,
                           c.phone as customer_phone,
                           v.make as vehicle_make,
                           v.model as vehicle_model,
                           v.license_plate as vehicle_plate,
                           v.color as vehicle_color,
                           v.year as vehicle_year
                    FROM bookings b
                    LEFT JOIN usersnew c ON b.customer_id = c.id
                    LEFT JOIN vehicles v ON b.vehicle_id = v.id
                    WHERE b.washer_id = ?";
            
            $params = [$washerId];
            
            // Apply additional filters
            if (!empty($filters['status'])) {
                $sql .= " AND b.status = ?";
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['date_from'])) {
                $sql .= " AND DATE(b.booking_date) >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $sql .= " AND DATE(b.booking_date) <= ?";
                $params[] = $filters['date_to'];
            }
            
            // Order by most recent bookings first
            $sql .= " ORDER BY b.booking_date DESC, b.start_time DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("getBookingsForWasher error: " . $e->getMessage());
            return false;
        }
    }

    // Get today's bookings for a washer
    public function getTodayBookingsForWasher($washerId) {
        try {
        // Get current date in Asia/Kolkata timezone
        $today = new DateTime('now', new DateTimeZone('Asia/Kolkata'));
        $todayDate = $today->format('Y-m-d');
        
        $sql = "SELECT 
                    b.*, 
                    c.name as customer_name,
                    c.phone as customer_phone,
                    v.make as vehicle_make,
                    v.model as vehicle_model,
                    v.license_plate as vehicle_plate,
                    w.name as washer_name 
                FROM bookings b
                LEFT JOIN users c ON b.customer_id = c.id
                LEFT JOIN users w ON b.washer_id = w.id  -- Join to get washer's name
                LEFT JOIN vehicles v ON b.vehicle_id = v.id
                WHERE DATE(b.booking_date) = ?
                AND b.status NOT IN ('completed', 'cancelled')
                ORDER BY b.start_time";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$todayDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        } catch (Exception $e) {
            error_log("getTodayBookings error: " . $e->getMessage());
            return false;
        }

    }
    
    // Get admin dashboard statistics
    public function getAdminDashboardStats($dateFrom, $dateTo) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_bookings,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
                        COUNT(CASE WHEN status = 'allocated' THEN 1 END) as total_allocated,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as total_confirmed,
                        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as total_in_progress,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as total_cancelled,
                        
                        -- Today's stats
                        COUNT(CASE WHEN DATE(booking_date) = CURDATE() THEN 1 END) as todays_total,
                        COUNT(CASE WHEN DATE(booking_date) = CURDATE() AND status = 'completed' THEN 1 END) as todays_completed,
                        COUNT(CASE WHEN DATE(booking_date) = CURDATE() AND status = 'cancelled' THEN 1 END) as todays_cancelled,
                        
                        -- Weekly stats
                        COUNT(CASE WHEN booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as weekly_total,
                        COUNT(CASE WHEN booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status = 'completed' THEN 1 END) as weekly_completed,
                        
                        -- Monthly stats
                        COUNT(CASE WHEN MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURDATE()) THEN 1 END) as monthly_total,
                        COUNT(CASE WHEN MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURDATE()) AND status = 'completed' THEN 1 END) as monthly_completed,
                        
                        -- Active washers count
                        (SELECT COUNT(DISTINCT washer_id) FROM bookings 
                         WHERE washer_id IS NOT NULL 
                         AND booking_date BETWEEN ? AND ?) as active_washers_count,
                        
                        -- Active customers count
                        (SELECT COUNT(DISTINCT customer_id) FROM bookings 
                         WHERE booking_date BETWEEN ? AND ?) as active_customers_count
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo, $dateFrom, $dateTo, $dateFrom, $dateTo]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("getAdminDashboardStats error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get today's bookings with full details
    public function getTodaysBookingsDetails($today) {
        try {
            $sql = "SELECT 
                        b.id,
                        b.booking_date,
                        b.start_time,
                        b.end_time,
                        b.status,
                        b.total_price,
                        b.payment_status,
                        b.address as booking_address,
                        
                        -- Customer details
                        c.id as customer_id,
                        c.name as customer_name,
                        c.phone as customer_phone,
                        c.email as customer_email,
                        
                        -- Washer details
                        w.id as washer_id,
                        w.name as washer_name,
                        w.phone as washer_phone,
                        
                        -- Vehicle details
                        v.make as vehicle_make,
                        v.model as vehicle_model,
                        v.license_plate as vehicle_plate,
                        v.type as vehicle_type,
                        
                        -- Service details
                        GROUP_CONCAT(DISTINCT s.title SEPARATOR ', ') as service_names,
                        GROUP_CONCAT(DISTINCT s.price SEPARATOR ', ') as service_prices
                    FROM bookings b
                    LEFT JOIN usersnew c ON b.customer_id = c.id
                    LEFT JOIN usersnew w ON b.washer_id = w.id
                    LEFT JOIN vehicles v ON b.vehicle_id = v.id
                    LEFT JOIN services s ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                    WHERE DATE(b.booking_date) = ?
                    GROUP BY b.id
                    ORDER BY b.start_time";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$today]);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format the data
            foreach ($bookings as &$booking) {
                // Format time
                $booking['start_time_formatted'] = date('h:i A', strtotime($booking['start_time']));
                $booking['end_time_formatted'] = date('h:i A', strtotime($booking['end_time']));
                
                // Parse service prices
                if (!empty($booking['service_prices'])) {
                    $prices = explode(', ', $booking['service_prices']);
                    $booking['total_services_price'] = array_sum(array_map('floatval', $prices));
                }
                
                // Add status color for UI
                $booking['status_color'] = $this->getStatusColor($booking['status']);
            }
            
            return $bookings;
            
        } catch (Exception $e) {
            error_log("getTodaysBookingsDetails error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get washer performance data
    public function getWasherPerformance($dateFrom, $dateTo) {
        try {
            $sql = "SELECT 
                        w.id,
                        w.name as washer_name,
                        w.phone as washer_phone,
                        w.email as washer_email,
                        w.created_at as washer_since,
                        
                        -- Booking counts
                        COUNT(b.id) as total_tasks,
                        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as tasks_completed,
                        COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as tasks_in_progress,
                        COUNT(CASE WHEN b.status = 'allocated' THEN 1 END) as tasks_allocated,
                        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as tasks_cancelled,
                        
                        -- Revenue generated
                        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END), 0) as revenue_generated,
                        
                        -- Average rating (if you have ratings table)
                        COALESCE((SELECT AVG(rating) FROM ratings WHERE washer_id = w.id), 0) as avg_rating,
                        
                        -- Average completion time (if you have completion timestamps)
                        AVG(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)) as avg_completion_time_minutes,
                        
                        -- Last activity
                        MAX(b.updated_at) as last_activity
                    FROM usersnew w
                    LEFT JOIN bookings b ON w.id = b.washer_id 
                        AND b.booking_date BETWEEN ? AND ?
                    WHERE w.user_type = 'washer'
                    GROUP BY w.id
                    ORDER BY tasks_completed DESC, revenue_generated DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo]);
            $washers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate completion rate
            foreach ($washers as &$washer) {
                $washer['completion_rate'] = ($washer['total_tasks'] > 0) 
                    ? round(($washer['tasks_completed'] / $washer['total_tasks']) * 100, 2) 
                    : 0;
                
                // Format dates
                if ($washer['last_activity']) {
                    $washer['last_activity_formatted'] = date('d M Y, h:i A', strtotime($washer['last_activity']));
                }
                
                if ($washer['washer_since']) {
                    $washer['washer_since_formatted'] = date('d M Y', strtotime($washer['washer_since']));
                }
            }
            
            return $washers;
            
        } catch (Exception $e) {
            error_log("getWasherPerformance error: " . $e->getMessage());
            return false;
        }
    }
    
    public function getPerformanceMetrics($startDate, $endDate) {
    try {
        $sql = "SELECT 
                    -- Booking Volume
                    COUNT(*) as total_bookings,
                    COUNT(DISTINCT customer_id) as unique_customers,
                    COUNT(DISTINCT washer_id) as active_washers,
                    
                    -- Completion Metrics
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_bookings,
                    
                    -- Time Metrics
                    AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_service_duration_minutes,
                    
                    -- Revenue Metrics
                    COALESCE(SUM(total_price), 0) as total_revenue,
                    COALESCE(AVG(total_price), 0) as avg_booking_value,
                    
                    -- Payment Metrics
                    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_bookings,
                    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
                    
                    -- Efficiency Metrics
                    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate_percentage,
                    ROUND(COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) * 100.0 / COUNT(*), 2) as payment_success_rate,
                    
                    -- Customer Metrics
                    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT customer_id), 2) as avg_bookings_per_customer,
                    
                    -- Washer Metrics
                    ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT washer_id), 0), 2) as avg_bookings_per_washer
                FROM bookings
                WHERE booking_date BETWEEN ? AND ?
                AND status != 'pending'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Calculate derived metrics
        $metrics['cancellation_rate_percentage'] = ($metrics['total_bookings'] > 0) 
            ? round(($metrics['cancelled_bookings'] / $metrics['total_bookings']) * 100, 2) 
            : 0;
        
        $metrics['daily_avg_bookings'] = round($metrics['total_bookings'] / 
            max(1, floor((strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24)) + 1), 2);
        
        $metrics['daily_avg_revenue'] = round($metrics['total_revenue'] / 
            max(1, floor((strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24)) + 1), 2);
        
        return $metrics;
        
    } catch (Exception $e) {
        error_log("getPerformanceMetrics error: " . $e->getMessage());
        return false;
    }
}

    // Get revenue analytics
    public function getRevenueAnalytics($startDate, $endDate, $period = 'month') {
        try {
            // Determine grouping based on period
            $groupBy = "DATE(booking_date)";
            if ($period == 'year') {
                $groupBy = "CONCAT(YEAR(booking_date), '-', LPAD(MONTH(booking_date), 2, '0'))";
            } elseif ($period == 'quarter') {
                $groupBy = "CONCAT(YEAR(booking_date), '-Q', QUARTER(booking_date))";
            } elseif ($period == 'month') {
                $groupBy = "CONCAT(YEAR(booking_date), '-', LPAD(MONTH(booking_date), 2, '0'))";
            } elseif ($period == 'week') {
                $groupBy = "CONCAT(YEAR(booking_date), '-W', LPAD(WEEK(booking_date), 2, '0'))";
            }
            
            $sql = "SELECT 
                        $groupBy as period_label,
                        DATE(booking_date) as date,
                        COUNT(*) as booking_count,
                        COALESCE(SUM(total_price), 0) as revenue,
                        COALESCE(AVG(total_price), 0) as avg_order_value,
                        COUNT(DISTINCT customer_id) as unique_customers,
                        
                        -- Revenue by status
                        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as completed_revenue,
                        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_price ELSE 0 END), 0) as cancelled_revenue,
                        
                        -- Revenue by payment method
                        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_price ELSE 0 END), 0) as cash_revenue,
                        COALESCE(SUM(CASE WHEN payment_method = 'online' THEN total_price ELSE 0 END), 0) as online_revenue,
                        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_price ELSE 0 END), 0) as card_revenue,
                        
                        -- Top performing day of week
                        DAYNAME(booking_date) as day_name
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    GROUP BY $groupBy, DAYNAME(booking_date)
                    ORDER BY date";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $revenueData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate growth and trends
            $previousRevenue = 0;
            foreach ($revenueData as &$data) {
                // Calculate growth percentage
                if ($previousRevenue > 0) {
                    $data['revenue_growth_percentage'] = round((($data['revenue'] - $previousRevenue) / $previousRevenue) * 100, 2);
                } else {
                    $data['revenue_growth_percentage'] = 0;
                }
                $previousRevenue = $data['revenue'];
                
                // Calculate conversion rate
                $data['conversion_rate'] = ($data['booking_count'] > 0) 
                    ? round(($data['completed_revenue'] / $data['revenue']) * 100, 2) 
                    : 0;
            }
            
            return $revenueData;
            
        } catch (Exception $e) {
            error_log("getRevenueAnalytics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get customer analytics
    public function getCustomerAnalytics($startDate, $endDate) {
        try {
            // Top customers by revenue
            $sql = "SELECT 
                        c.id,
                        c.name,
                        c.email,
                        c.phone,
                        c.created_at as join_date,
                        
                        -- Booking stats
                        COUNT(b.id) as total_bookings,
                        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
                        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                        
                        -- Revenue stats
                        COALESCE(SUM(b.total_price), 0) as total_spent,
                        COALESCE(AVG(b.total_price), 0) as avg_order_value,
                        COALESCE(MAX(b.total_price), 0) as highest_order_value,
                        
                        -- Frequency
                        ROUND(DATEDIFF(?, MIN(b.booking_date)) / COUNT(b.id), 2) as avg_days_between_orders,
                        
                        -- Recency
                        DATEDIFF(?, MAX(b.booking_date)) as days_since_last_order,
                        
                        -- Preferred services
                        GROUP_CONCAT(DISTINCT s.title SEPARATOR ', ') as favorite_services
                    FROM usersnew c
                    LEFT JOIN bookings b ON c.id = b.customer_id 
                        AND b.booking_date BETWEEN ? AND ?
                    LEFT JOIN services s ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                    WHERE c.user_type = 'customer'
                    GROUP BY c.id
                    HAVING total_bookings > 0
                    ORDER BY total_spent DESC
                    LIMIT 20";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$endDate, $endDate, $startDate, $endDate]);
            $topCustomers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Customer segmentation
            $segmentationSql = "SELECT 
                        CASE 
                            WHEN total_spent >= 1000 THEN 'VIP'
                            WHEN total_spent >= 500 THEN 'Loyal'
                            WHEN total_spent >= 100 THEN 'Regular'
                            ELSE 'New'
                        END as segment,
                        COUNT(*) as customer_count,
                        SUM(total_spent) as segment_revenue,
                        AVG(total_bookings) as avg_bookings_per_customer,
                        AVG(total_spent) as avg_spent_per_customer
                    FROM (
                        SELECT 
                            c.id,
                            COUNT(b.id) as total_bookings,
                            COALESCE(SUM(b.total_price), 0) as total_spent
                        FROM usersnew c
                        LEFT JOIN bookings b ON c.id = b.customer_id 
                            AND b.booking_date BETWEEN ? AND ?
                        WHERE c.user_type = 'customer'
                        GROUP BY c.id
                    ) as customer_stats
                    GROUP BY segment
                    ORDER BY segment_revenue DESC";
            
            $stmt = $this->db->prepare($segmentationSql);
            $stmt->execute([$startDate, $endDate]);
            $segmentation = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // New vs returning customers
            $customerTypeSql = "SELECT 
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM bookings b2 
                                WHERE b2.customer_id = b.customer_id 
                                AND b2.booking_date < DATE_SUB(b.booking_date, INTERVAL 30 DAY)
                            ) THEN 'Returning'
                            ELSE 'New'
                        END as customer_type,
                        COUNT(DISTINCT b.customer_id) as customer_count,
                        COUNT(*) as booking_count,
                        COALESCE(SUM(b.total_price), 0) as revenue
                    FROM bookings b
                    WHERE b.booking_date BETWEEN ? AND ?
                    GROUP BY customer_type";
            
            $stmt = $this->db->prepare($customerTypeSql);
            $stmt->execute([$startDate, $endDate]);
            $customerTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'top_customers' => $topCustomers,
                'segmentation' => $segmentation,
                'customer_types' => $customerTypes,
                'total_customers' => count($topCustomers)
            ];
            
        } catch (Exception $e) {
            error_log("getCustomerAnalytics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get washer analytics
    public function getWasherAnalytics($startDate, $endDate)
    {
        try {
    
            /* ================================
               TOP PERFORMING WASHERS
            ================================= */
            $sql = "
                SELECT 
                    w.id,
                    w.name,
                    w.email,
                    w.phone,
                    w.created_at AS join_date,
    
                    COUNT(b.id) AS total_assignments,
                    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS completed_assignments,
                    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS cancelled_assignments,
    
                    COALESCE(SUM(b.total_price), 0) AS revenue_generated,
                    COALESCE(AVG(b.total_price), 0) AS avg_order_value,
    
                    ROUND(
                        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) * 100.0
                        / NULLIF(COUNT(b.id), 0),
                        2
                    ) AS completion_rate,
    
                    AVG(
                        TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)
                    ) AS avg_service_time_minutes,
    
                    COALESCE(
                        (SELECT AVG(r.rating) FROM ratings r WHERE r.washer_id = w.id),
                        0
                    ) AS avg_rating,
    
                    COALESCE(
                        (SELECT COUNT(*) FROM ratings r WHERE r.washer_id = w.id),
                        0
                    ) AS total_ratings,
    
                    GROUP_CONCAT(DISTINCT s.title SEPARATOR ', ') AS common_services
    
                FROM usersnew w
                LEFT JOIN bookings b 
                    ON w.id = b.washer_id
                   AND b.booking_date BETWEEN ? AND ?
    
                LEFT JOIN services s 
                    ON FIND_IN_SET(
                        s.id,
                        REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                    ) > 0
    
                WHERE w.user_type = 'driver'
                GROUP BY w.id
                HAVING total_assignments > 0
                ORDER BY revenue_generated DESC
            ";
    
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $topWashers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    
            /* ================================
               WASHER AVAILABILITY PATTERNS
            ================================= */
            $availabilitySql = "
                SELECT 
                    DAYNAME(booking_date) AS day_of_week,
                    HOUR(start_time) AS hour_of_day,
                    COUNT(*) AS booking_count,
                    COUNT(DISTINCT washer_id) AS active_washers,
                    AVG(
                        TIMESTAMPDIFF(MINUTE, start_time, end_time)
                    ) AS avg_duration
                FROM bookings
                WHERE booking_date BETWEEN ? AND ?
                  AND washer_id IS NOT NULL
                GROUP BY DAYNAME(booking_date), HOUR(start_time)
                ORDER BY booking_count DESC
                LIMIT 20
            ";
    
            $stmt = $this->db->prepare($availabilitySql);
            $stmt->execute([$startDate, $endDate]);
            $availability = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    
            /* ================================
               PERFORMANCE TIERS
            ================================= */
            $tierSql = "
                SELECT 
                    CASE 
                        WHEN completion_rate >= 90 THEN 'Elite'
                        WHEN completion_rate >= 80 THEN 'Advanced'
                        WHEN completion_rate >= 70 THEN 'Intermediate'
                        ELSE 'Beginner'
                    END AS performance_tier,
    
                    COUNT(*) AS washer_count,
                    AVG(completion_rate) AS avg_completion_rate,
                    SUM(revenue_generated) AS total_revenue
    
                FROM (
                    SELECT 
                        w.id,
    
                        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) * 100.0
                        / NULLIF(COUNT(b.id), 0) AS completion_rate,
    
                        COALESCE(SUM(b.total_price), 0) AS revenue_generated
    
                    FROM usersnew w
                    LEFT JOIN bookings b 
                        ON w.id = b.washer_id
                       AND b.booking_date BETWEEN ? AND ?
    
                    WHERE w.user_type = 'driver'
                    GROUP BY w.id
                    HAVING COUNT(b.id) > 0
                ) AS washer_stats
    
                GROUP BY performance_tier
            ";
    
            $stmt = $this->db->prepare($tierSql);
            $stmt->execute([$startDate, $endDate]);
            $performanceTiers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    
            /* ================================
               FINAL RESPONSE
            ================================= */
            return [
                'top_washers'          => $topWashers,
                'availability_patterns'=> $availability,
                'performance_tiers'    => $performanceTiers,
                'total_active_washers' => count($topWashers)
            ];
    
        } catch (Exception $e) {
            error_log('getWasherAnalytics error: ' . $e->getMessage());
            return false;
        }
    }

    
    // Get service analytics
    public function getServiceAnalytics($startDate, $endDate)
    {
        try {
    
            /* ================================
               SERVICE PERFORMANCE
            ================================= */
            $sql = "
                SELECT 
                    s.id,
                    s.title,
                    s.description,
                    s.price,
                    s.duration,
    
                    COUNT(b.id) AS times_booked,
                    COUNT(DISTINCT b.customer_id) AS unique_customers,
    
                    COALESCE(SUM(b.total_price), 0) AS total_revenue,
    
                    ROUND(
                        COALESCE(SUM(b.total_price), 0)
                        / NULLIF(COUNT(b.id), 0),
                        2
                    ) AS avg_revenue_per_booking,
    
                    AVG(
                        TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)
                    ) AS avg_service_time_minutes,
    
                    GROUP_CONCAT(DISTINCT s2.title SEPARATOR ' + ') AS frequently_paired_with
    
                FROM services s
    
                LEFT JOIN bookings b
                    ON FIND_IN_SET(
                        s.id,
                        REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                    ) > 0
                   AND b.booking_date BETWEEN ? AND ?
    
                LEFT JOIN bookings b2
                    ON FIND_IN_SET(
                        s.id,
                        REPLACE(REPLACE(b2.service_ids, '[', ''), ']', '')
                    ) > 0
                   AND b2.booking_date BETWEEN ? AND ?
    
                LEFT JOIN services s2
                    ON s2.id != s.id
                   AND FIND_IN_SET(
                        s2.id,
                        REPLACE(REPLACE(b2.service_ids, '[', ''), ']', '')
                   ) > 0
    
                GROUP BY s.id
                HAVING times_booked > 0
                ORDER BY times_booked DESC, total_revenue DESC
            ";
    
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $startDate, $endDate,
                $startDate, $endDate
            ]);
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    
            /* ================================
               SERVICE BUNDLES
            ================================= */
            $bundlesSql = "
                SELECT 
                    REPLACE(REPLACE(b.service_ids, '[', ''), ']', '') AS service_ids,
    
                    COUNT(*) AS bundle_count,
                    AVG(b.total_price) AS avg_bundle_price,
                    COUNT(DISTINCT b.customer_id) AS unique_customers,
    
                    GROUP_CONCAT(
                        DISTINCT s.title
                        ORDER BY s.id
                        SEPARATOR ' + '
                    ) AS bundle_name
    
                FROM bookings b
    
                LEFT JOIN services s
                    ON FIND_IN_SET(
                        s.id,
                        REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                    ) > 0
    
                WHERE b.booking_date BETWEEN ? AND ?
                  AND LENGTH(b.service_ids) > 2
    
                GROUP BY service_ids
                HAVING bundle_count > 1
                ORDER BY bundle_count DESC
                LIMIT 10
            ";
    
            $stmt = $this->db->prepare($bundlesSql);
            $stmt->execute([$startDate, $endDate]);
            $serviceBundles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    
            /* ================================
               FINAL RESPONSE
            ================================= */
            return [
                'service_performance'     => $services,
                'service_bundles'         => $serviceBundles,
                'total_services_analyzed' => count($services)
            ];
    
        } catch (Exception $e) {
            error_log('getServiceAnalytics error: ' . $e->getMessage());
            return false;
        }
    }

    
    // Get time-based trends
    public function getTimeBasedTrends($startDate, $endDate, $period = 'month') {
        try {
            $trends = [];
            
            // Daily trends
            $dailySql = "SELECT 
                            DATE(booking_date) as date,
                            DAYNAME(booking_date) as day_name,
                            COUNT(*) as booking_count,
                            COALESCE(SUM(total_price), 0) as daily_revenue,
                            COUNT(DISTINCT customer_id) as daily_customers,
                            AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_service_duration
                        FROM bookings
                        WHERE booking_date BETWEEN ? AND ?
                        GROUP BY DATE(booking_date)
                        ORDER BY date";
            
            $stmt = $this->db->prepare($dailySql);
            $stmt->execute([$startDate, $endDate]);
            $trends['daily_trends'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Weekly trends
            $weeklySql = "SELECT 
                            CONCAT(YEAR(booking_date), '-W', LPAD(WEEK(booking_date), 2, '0')) as week,
                            MIN(DATE(booking_date)) as week_start,
                            MAX(DATE(booking_date)) as week_end,
                            COUNT(*) as booking_count,
                            COALESCE(SUM(total_price), 0) as weekly_revenue,
                            COUNT(DISTINCT customer_id) as weekly_customers
                        FROM bookings
                        WHERE booking_date BETWEEN ? AND ?
                        GROUP BY YEAR(booking_date), WEEK(booking_date)
                        ORDER BY week";
            
            $stmt = $this->db->prepare($weeklySql);
            $stmt->execute([$startDate, $endDate]);
            $trends['weekly_trends'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Monthly trends
            $monthlySql = "SELECT 
                            CONCAT(YEAR(booking_date), '-', LPAD(MONTH(booking_date), 2, '0')) as month,
                            COUNT(*) as booking_count,
                            COALESCE(SUM(total_price), 0) as monthly_revenue,
                            COUNT(DISTINCT customer_id) as monthly_customers,
                            MONTHNAME(booking_date) as month_name
                        FROM bookings
                        WHERE booking_date BETWEEN ? AND ?
                        GROUP BY YEAR(booking_date), MONTH(booking_date)
                        ORDER BY month";
            
            $stmt = $this->db->prepare($monthlySql);
            $stmt->execute([$startDate, $endDate]);
            $trends['monthly_trends'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Day of week analysis
            $dowSql = "SELECT 
                            DAYNAME(booking_date) as day_of_week,
                            COUNT(*) as booking_count,
                            COALESCE(SUM(total_price), 0) as day_revenue,
                            COUNT(DISTINCT customer_id) as day_customers,
                            AVG(total_price) as avg_day_revenue,
                            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage_of_total
                        FROM bookings
                        WHERE booking_date BETWEEN ? AND ?
                        GROUP BY DAYNAME(booking_date)
                        ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')";
            
            $stmt = $this->db->prepare($dowSql);
            $stmt->execute([$startDate, $endDate, $startDate, $endDate]);
            $trends['day_of_week_analysis'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Time of day analysis
            $todSql = "SELECT 
                            HOUR(start_time) as hour_of_day,
                            COUNT(*) as booking_count,
                            COALESCE(SUM(total_price), 0) as hour_revenue,
                            COUNT(DISTINCT customer_id) as hour_customers,
                            CASE 
                                WHEN HOUR(start_time) BETWEEN 6 AND 11 THEN 'Morning'
                                WHEN HOUR(start_time) BETWEEN 12 AND 16 THEN 'Afternoon'
                                WHEN HOUR(start_time) BETWEEN 17 AND 21 THEN 'Evening'
                                ELSE 'Night'
                            END as time_slot
                        FROM bookings
                        WHERE booking_date BETWEEN ? AND ?
                        GROUP BY HOUR(start_time)
                        ORDER BY hour_of_day";
            
            $stmt = $this->db->prepare($todSql);
            $stmt->execute([$startDate, $endDate]);
            $trends['time_of_day_analysis'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $trends;
            
        } catch (Exception $e) {
            error_log("getTimeBasedTrends error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get geographic analytics
    public function getGeographicAnalytics($startDate, $endDate) {
        try {
            // Area-wise distribution
            $sql = "SELECT 
                        -- Extract area/zone from address (adjust based on your address format)
                        SUBSTRING_INDEX(SUBSTRING_INDEX(address, ',', -2), ',', 1) as area,
                        COUNT(*) as booking_count,
                        COUNT(DISTINCT customer_id) as customers_in_area,
                        COALESCE(SUM(total_price), 0) as area_revenue,
                        AVG(total_price) as avg_booking_value_area,
                        
                        -- Popular services in area
                        GROUP_CONCAT(DISTINCT s.title ORDER BY s.title SEPARATOR ', ') as popular_services
                    FROM bookings b
                    LEFT JOIN services s ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                    WHERE b.booking_date BETWEEN ? AND ?
                    AND b.address IS NOT NULL
                    AND b.address != ''
                    GROUP BY area
                    HAVING area IS NOT NULL
                    AND area != ''
                    ORDER BY booking_count DESC
                    LIMIT 20";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $geographicData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Distance analysis (if latitude/longitude available)
            $distanceSql = "SELECT 
                                ROUND(111.045 * DEGREES(ACOS(LEAST(1.0, COS(RADIANS(?))
                                    * COS(RADIANS(latitude))
                                    * COS(RADIANS(longitude) - RADIANS(?))
                                    + SIN(RADIANS(?))
                                    * SIN(RADIANS(latitude))))), 2) as distance_km,
                                COUNT(*) as booking_count,
                                AVG(total_price) as avg_price
                            FROM bookings
                            WHERE booking_date BETWEEN ? AND ?
                            AND latitude IS NOT NULL
                            AND longitude IS NOT NULL
                            GROUP BY ROUND(distance_km)
                            ORDER BY distance_km";
            
            // Note: You need to provide base coordinates (e.g., your business location)
            $baseLat = 0; // Replace with your business latitude
            $baseLng = 0; // Replace with your business longitude
            
            $stmt = $this->db->prepare($distanceSql);
            $stmt->execute([$baseLat, $baseLng, $baseLat, $startDate, $endDate]);
            $distanceAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'area_distribution' => $geographicData,
                'distance_analysis' => $distanceAnalysis,
                'top_areas' => array_slice($geographicData, 0, 5)
            ];
            
        } catch (Exception $e) {
            error_log("getGeographicAnalytics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get peak hours analysis
    public function getPeakHoursAnalysis($startDate, $endDate) {
        try {
            // Peak booking hours
            $sql = "SELECT 
                        HOUR(start_time) as hour,
                        COUNT(*) as booking_count,
                        COALESCE(SUM(total_price), 0) as hour_revenue,
                        COUNT(DISTINCT customer_id) as unique_customers,
                        AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_duration_minutes,
                        DAYNAME(booking_date) as peak_day_for_hour,
                        
                        -- Busiest days for this hour
                        GROUP_CONCAT(DISTINCT DAYNAME(booking_date) ORDER BY COUNT(*) DESC SEPARATOR ', ') as busy_days
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    GROUP BY HOUR(start_time), DAYNAME(booking_date)
                    ORDER BY booking_count DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $peakHours = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Identify peak periods
            $peakPeriods = [];
            $currentHour = null;
            $periodStart = null;
            $periodCount = 0;
            
            foreach ($peakHours as $hourData) {
                if ($currentHour === null || $hourData['hour'] != $currentHour + 1) {
                    if ($currentHour !== null && $periodCount > 0) {
                        $peakPeriods[] = [
                            'start_hour' => $periodStart,
                            'end_hour' => $currentHour,
                            'total_bookings' => $periodCount,
                            'peak_hours' => "$periodStart:00 - $currentHour:00"
                        ];
                    }
                    $periodStart = $hourData['hour'];
                    $periodCount = $hourData['booking_count'];
                } else {
                    $periodCount += $hourData['booking_count'];
                }
                $currentHour = $hourData['hour'];
            }
            
            // Add last period
            if ($currentHour !== null && $periodCount > 0) {
                $peakPeriods[] = [
                    'start_hour' => $periodStart,
                    'end_hour' => $currentHour,
                    'total_bookings' => $periodCount,
                    'peak_hours' => "$periodStart:00 - $currentHour:00"
                ];
            }
            
            // Sort peak periods by total bookings
            usort($peakPeriods, function($a, $b) {
                return $b['total_bookings'] - $a['total_bookings'];
            });
            
            return [
                'hourly_distribution' => $peakHours,
                'peak_periods' => $peakPeriods,
                'busiest_hour' => !empty($peakHours) ? $peakHours[0] : null,
                'quietest_hour' => !empty($peakHours) ? end($peakHours) : null
            ];
            
        } catch (Exception $e) {
            error_log("getPeakHoursAnalysis error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get cancellation analysis
    public function getCancellationAnalysis($startDate, $endDate) {
        try {
            // Cancellation reasons and patterns
            $sql = "SELECT 
                        -- Time-based patterns
                        HOUR(updated_at) as cancellation_hour,
                        DAYNAME(booking_date) as cancellation_day,
                        DATEDIFF(booking_date, updated_at) as days_before_booking,
                        
                        -- Stats
                        COUNT(*) as cancellation_count,
                        COALESCE(SUM(total_price), 0) as lost_revenue,
                        AVG(total_price) as avg_lost_value,
                        
                        -- Customer behavior
                        COUNT(DISTINCT customer_id) as unique_customers_cancelling,
                        
                        -- Service patterns
                        GROUP_CONCAT(DISTINCT s.title SEPARATOR ', ') as cancelled_services,
                        
                        -- Washer patterns
                        COUNT(DISTINCT washer_id) as affected_washers
                    FROM bookings b
                    LEFT JOIN services s ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                    WHERE b.status = 'cancelled'
                    AND b.booking_date BETWEEN ? AND ?
                    AND b.updated_at BETWEEN ? AND ?
                    GROUP BY HOUR(updated_at), DAYNAME(booking_date), DATEDIFF(booking_date, updated_at)
                    ORDER BY cancellation_count DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$startDate, $endDate, $startDate, $endDate]);
            $cancellationPatterns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Customer cancellation history
            $customerSql = "SELECT 
                                c.id,
                                c.name,
                                c.phone,
                                COUNT(b.id) as total_cancellations,
                                COUNT(CASE WHEN b.status != 'cancelled' THEN 1 END) as successful_bookings,
                                COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN b.total_price ELSE 0 END), 0) as total_lost_revenue,
                                ROUND(COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / COUNT(b.id), 2) as cancellation_rate_percentage
                            FROM usersnew c
                            LEFT JOIN bookings b ON c.id = b.customer_id 
                                AND b.booking_date BETWEEN ? AND ?
                            WHERE c.user_type = 'customer'
                            GROUP BY c.id
                            HAVING total_cancellations > 0
                            ORDER BY total_cancellations DESC
                            LIMIT 20";
            
            $stmt = $this->db->prepare($customerSql);
            $stmt->execute([$startDate, $endDate]);
            $frequentCancellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Service-wise cancellation rate
            $serviceSql = "SELECT 
                                s.id,
                                s.title,
                                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_count,
                                COUNT(b.id) as total_booked,
                                ROUND(COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / COUNT(b.id), 2) as cancellation_rate,
                                COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN b.total_price ELSE 0 END), 0) as lost_revenue
                            FROM services s
                            LEFT JOIN bookings b ON 
                                FIND_IN_SET(
                                    s.id,
                                    REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                                ) > 0
                                AND b.booking_date BETWEEN ? AND ?
                            GROUP BY s.id
                            HAVING total_booked > 0
                            ORDER BY cancellation_rate DESC
                            LIMIT 10";
            
            $stmt = $this->db->prepare($serviceSql);
            $stmt->execute([$startDate, $endDate]);
            $serviceCancellation = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'cancellation_patterns' => $cancellationPatterns,
                'frequent_cancellers' => $frequentCancellers,
                'service_cancellation_rates' => $serviceCancellation,
                'total_cancellations' => array_sum(array_column($cancellationPatterns, 'cancellation_count')),
                'total_lost_revenue' => array_sum(array_column($cancellationPatterns, 'lost_revenue'))
            ];
            
        } catch (Exception $e) {
            error_log("getCancellationAnalysis error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get conversion funnel
    public function getConversionFunnel($startDate, $endDate) {
        try {
            $sql = "SELECT 
                        -- Stage 1: Total bookings created
                        'Bookings Created' as stage,
                        COUNT(*) as count,
                        100.0 as percentage
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    
                    UNION ALL
                    
                    -- Stage 2: Confirmed bookings
                    SELECT 
                        'Confirmed' as stage,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    AND status IN ('confirmed', 'allocated', 'in_progress', 'completed')
                    
                    UNION ALL
                    
                    -- Stage 3: Washer allocated
                    SELECT 
                        'Washer Allocated' as stage,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    AND status IN ('allocated', 'in_progress', 'completed')
                    AND washer_id IS NOT NULL
                    
                    UNION ALL
                    
                    -- Stage 4: In progress
                    SELECT 
                        'In Progress' as stage,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    AND status = 'in_progress'
                    
                    UNION ALL
                    
                    -- Stage 5: Completed
                    SELECT 
                        'Completed' as stage,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    AND status = 'completed'
                    
                    UNION ALL
                    
                    -- Stage 6: Paid
                    SELECT 
                        'Paid' as stage,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    AND payment_status = 'paid'";
            
            $stmt = $this->db->prepare($sql);
            $params = array_merge(
                [$startDate, $endDate],
                [$startDate, $endDate, $startDate, $endDate],
                [$startDate, $endDate, $startDate, $endDate],
                [$startDate, $endDate, $startDate, $endDate],
                [$startDate, $endDate, $startDate, $endDate],
                [$startDate, $endDate, $startDate, $endDate]
            );
            $stmt->execute($params);
            $funnelStages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate drop-off rates
            $previousCount = 0;
            foreach ($funnelStages as &$stage) {
                if ($previousCount > 0) {
                    $stage['drop_off'] = $previousCount - $stage['count'];
                    $stage['drop_off_percentage'] = round((($previousCount - $stage['count']) / $previousCount) * 100, 2);
                } else {
                    $stage['drop_off'] = 0;
                    $stage['drop_off_percentage'] = 0;
                }
                $previousCount = $stage['count'];
            }
            
            // Time to conversion analysis
            $conversionTimeSql = "SELECT 
                                    DATEDIFF(MAX(updated_at), MIN(created_at)) as avg_days_to_completion,
                                    AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours_to_completion,
                                    MIN(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as min_hours_to_completion,
                                    MAX(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as max_hours_to_completion
                                FROM bookings
                                WHERE booking_date BETWEEN ? AND ?
                                AND status = 'completed'";
            
            $stmt = $this->db->prepare($conversionTimeSql);
            $stmt->execute([$startDate, $endDate]);
            $conversionTime = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'funnel_stages' => $funnelStages,
                'conversion_time' => $conversionTime,
                'overall_conversion_rate' => end($funnelStages)['percentage'] ?? 0
            ];
            
        } catch (Exception $e) {
            error_log("getConversionFunnel error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get retention analysis
    public function getRetentionAnalysis($startDate, $endDate) {
        try {
            // Customer retention cohorts
            $cohortSql = "SELECT 
                            DATE_FORMAT(first_booking, '%Y-%m') as cohort_month,
                            COUNT(DISTINCT customer_id) as cohort_size,
                            
                            -- Retention by month
                            COUNT(DISTINCT CASE WHEN booking_month = DATE_FORMAT(first_booking, '%Y-%m') THEN customer_id END) as month_0,
                            COUNT(DISTINCT CASE WHEN booking_month = DATE_ADD(first_booking, INTERVAL 1 MONTH) THEN customer_id END) as month_1,
                            COUNT(DISTINCT CASE WHEN booking_month = DATE_ADD(first_booking, INTERVAL 2 MONTH) THEN customer_id END) as month_2,
                            COUNT(DISTINCT CASE WHEN booking_month = DATE_ADD(first_booking, INTERVAL 3 MONTH) THEN customer_id END) as month_3,
                            COUNT(DISTINCT CASE WHEN booking_month = DATE_ADD(first_booking, INTERVAL 6 MONTH) THEN customer_id END) as month_6,
                            
                            -- Revenue per cohort
                            COALESCE(SUM(total_price), 0) as cohort_revenue,
                            ROUND(COALESCE(SUM(total_price), 0) / COUNT(DISTINCT customer_id), 2) as avg_revenue_per_customer
                        FROM (
                            SELECT 
                                customer_id,
                                MIN(DATE(booking_date)) as first_booking,
                                DATE_FORMAT(booking_date, '%Y-%m') as booking_month,
                                total_price
                            FROM bookings
                            WHERE booking_date BETWEEN DATE_SUB(?, INTERVAL 12 MONTH) AND ?
                            AND status = 'completed'
                            GROUP BY customer_id, DATE_FORMAT(booking_date, '%Y-%m'), total_price
                        ) as customer_cohorts
                        GROUP BY DATE_FORMAT(first_booking, '%Y-%m')
                        ORDER BY cohort_month DESC";
            
            $stmt = $this->db->prepare($cohortSql);
            $stmt->execute([$endDate, $endDate]);
            $cohorts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate retention percentages
            foreach ($cohorts as &$cohort) {
                if ($cohort['cohort_size'] > 0) {
                    $cohort['month_0_pct'] = round(($cohort['month_0'] / $cohort['cohort_size']) * 100, 2);
                    $cohort['month_1_pct'] = round(($cohort['month_1'] / $cohort['cohort_size']) * 100, 2);
                    $cohort['month_2_pct'] = round(($cohort['month_2'] / $cohort['cohort_size']) * 100, 2);
                    $cohort['month_3_pct'] = round(($cohort['month_3'] / $cohort['cohort_size']) * 100, 2);
                    $cohort['month_6_pct'] = round(($cohort['month_6'] / $cohort['cohort_size']) * 100, 2);
                } else {
                    $cohort['month_0_pct'] = $cohort['month_1_pct'] = $cohort['month_2_pct'] = 
                    $cohort['month_3_pct'] = $cohort['month_6_pct'] = 0;
                }
            }
            
            // Repeat customer analysis
            $repeatSql = "SELECT 
                            total_orders,
                            COUNT(*) as customer_count,
                            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT customer_id) FROM bookings WHERE booking_date BETWEEN ? AND ?), 2) as percentage_of_total
                        FROM (
                            SELECT 
                                customer_id,
                                COUNT(*) as total_orders
                            FROM bookings
                            WHERE booking_date BETWEEN ? AND ?
                            AND status = 'completed'
                            GROUP BY customer_id
                        ) as customer_orders
                        GROUP BY total_orders
                        ORDER BY total_orders";
            
            $stmt = $this->db->prepare($repeatSql);
            $stmt->execute([$startDate, $endDate, $startDate, $endDate]);
            $repeatCustomers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Lifetime value (LTV) analysis
            $ltvSql = "SELECT 
                            customer_id,
                            c.name,
                            COUNT(*) as total_bookings,
                            COALESCE(SUM(total_price), 0) as lifetime_value,
                            DATEDIFF(MAX(booking_date), MIN(booking_date)) as customer_lifetime_days,
                            ROUND(COALESCE(SUM(total_price), 0) / COUNT(*), 2) as avg_order_value,
                            ROUND(COALESCE(SUM(total_price), 0) / NULLIF(DATEDIFF(MAX(booking_date), MIN(booking_date)), 0) * 30, 2) as monthly_value
                        FROM bookings b
                        LEFT JOIN usersnew c ON b.customer_id = c.id
                        WHERE b.booking_date BETWEEN ? AND ?
                        AND b.status = 'completed'
                        GROUP BY customer_id
                        HAVING total_bookings > 1
                        ORDER BY lifetime_value DESC
                        LIMIT 20";
            
            $stmt = $this->db->prepare($ltvSql);
            $stmt->execute([$startDate, $endDate]);
            $ltvAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'retention_cohorts' => $cohorts,
                'repeat_customer_analysis' => $repeatCustomers,
                'lifetime_value_analysis' => $ltvAnalysis,
                'avg_customer_lifetime_days' => !empty($ltvAnalysis) ? round(array_sum(array_column($ltvAnalysis, 'customer_lifetime_days')) / count($ltvAnalysis), 2) : 0,
                'avg_lifetime_value' => !empty($ltvAnalysis) ? round(array_sum(array_column($ltvAnalysis, 'lifetime_value')) / count($ltvAnalysis), 2) : 0
            ];
            
        } catch (Exception $e) {
            error_log("getRetentionAnalysis error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get vehicle analytics
    public function getVehicleAnalytics($startDate, $endDate) {
        try {
            // Vehicle type analysis
            $sql = "SELECT 
                        v.type as vehicle_type,
                        COUNT(b.id) as total_bookings,
                        COUNT(DISTINCT b.customer_id) as unique_customers,
                        COALESCE(SUM(b.total_price), 0) as total_revenue,
                        AVG(b.total_price) as avg_booking_value,
                        
                        -- Popular services for vehicle type
                        GROUP_CONCAT(DISTINCT s.title ORDER BY s.title SEPARATOR ', ') as popular_services,
                        
                        -- Frequency
                        ROUND(COUNT(b.id) * 1.0 / COUNT(DISTINCT v.id), 2) as avg_bookings_per_vehicle,
                        
                        -- Most booked make/model
                        CONCAT(v.make, ' ', v.model) as top_make_model,
                        
                        -- Cancellation rate for vehicle type
                        ROUND(COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / COUNT(b.id), 2) as cancellation_rate
                    FROM vehicles v
                    LEFT JOIN bookings b ON v.id = b.vehicle_id 
                        AND b.booking_date BETWEEN ? AND ?
                    LEFT JOIN services s ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                    WHERE v.type IS NOT NULL
                    GROUP BY v.type
                    ORDER BY total_bookings DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $vehicleTypeAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Make/model analysis
            $makeModelSql = "SELECT 
                                v.make,
                                v.model,
                                COUNT(b.id) as booking_count,
                                COUNT(DISTINCT b.customer_id) as customer_count,
                                COALESCE(SUM(b.total_price), 0) as total_revenue,
                                AVG(b.total_price) as avg_service_cost,
                                GROUP_CONCAT(DISTINCT s.title SEPARATOR ', ') as common_services
                            FROM vehicles v
                            LEFT JOIN bookings b ON v.id = b.vehicle_id 
                                AND b.booking_date BETWEEN ? AND ?
                            LEFT JOIN services s ON 
                                FIND_IN_SET(
                                    s.id,
                                    REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                                ) > 0
                            WHERE v.make IS NOT NULL
                            AND v.model IS NOT NULL
                            GROUP BY v.make, v.model
                            HAVING booking_count > 0
                            ORDER BY booking_count DESC
                            LIMIT 20";
            
            $stmt = $this->db->prepare($makeModelSql);
            $stmt->execute([$startDate, $endDate]);
            $makeModelAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Vehicle age analysis
            $ageSql = "SELECT 
                            CASE 
                                WHEN YEAR(CURDATE()) - v.year <= 2 THEN '0-2 years'
                                WHEN YEAR(CURDATE()) - v.year <= 5 THEN '3-5 years'
                                WHEN YEAR(CURDATE()) - v.year <= 10 THEN '6-10 years'
                                ELSE '10+ years'
                            END as vehicle_age_group,
                            COUNT(b.id) as booking_count,
                            AVG(b.total_price) as avg_service_cost,
                            GROUP_CONCAT(DISTINCT s.title SEPARATOR ', ') as common_services
                        FROM vehicles v
                        LEFT JOIN bookings b ON v.id = b.vehicle_id 
                            AND b.booking_date BETWEEN ? AND ?
                        LEFT JOIN services s ON 
                            FIND_IN_SET(
                                s.id,
                                REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                            ) > 0
                        WHERE v.year IS NOT NULL
                        GROUP BY vehicle_age_group
                        ORDER BY booking_count DESC";
            
            $stmt = $this->db->prepare($ageSql);
            $stmt->execute([$startDate, $endDate]);
            $ageAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'vehicle_type_analysis' => $vehicleTypeAnalysis,
                'make_model_analysis' => $makeModelAnalysis,
                'vehicle_age_analysis' => $ageAnalysis,
                'most_popular_vehicle_type' => !empty($vehicleTypeAnalysis) ? $vehicleTypeAnalysis[0] : null,
                'total_vehicles_serviced' => array_sum(array_column($vehicleTypeAnalysis, 'total_bookings'))
            ];
            
        } catch (Exception $e) {
            error_log("getVehicleAnalytics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get period comparison
    public function getPeriodComparison($currentStart, $currentEnd, $previousStart, $previousEnd) {
        try {
            // Current period stats
            $currentSql = "SELECT 
                            COUNT(*) as booking_count,
                            COALESCE(SUM(total_price), 0) as revenue,
                            COUNT(DISTINCT customer_id) as customer_count,
                            AVG(total_price) as avg_order_value
                        FROM bookings
                        WHERE booking_date BETWEEN ? AND ?";
            
            $stmt = $this->db->prepare($currentSql);
            $stmt->execute([$currentStart, $currentEnd]);
            $currentStats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Previous period stats
            $stmt->execute([$previousStart, $previousEnd]);
            $previousStats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Calculate changes
            $comparison = [
                'bookings' => [
                    'current' => $currentStats['booking_count'] ?? 0,
                    'previous' => $previousStats['booking_count'] ?? 0,
                    'change' => ($currentStats['booking_count'] ?? 0) - ($previousStats['booking_count'] ?? 0),
                    'change_percentage' => ($previousStats['booking_count'] ?? 0) > 0 
                        ? round((($currentStats['booking_count'] ?? 0) - ($previousStats['booking_count'] ?? 0)) / ($previousStats['booking_count'] ?? 0) * 100, 2)
                        : 0
                ],
                'revenue' => [
                    'current' => $currentStats['revenue'] ?? 0,
                    'previous' => $previousStats['revenue'] ?? 0,
                    'change' => ($currentStats['revenue'] ?? 0) - ($previousStats['revenue'] ?? 0),
                    'change_percentage' => ($previousStats['revenue'] ?? 0) > 0 
                        ? round((($currentStats['revenue'] ?? 0) - ($previousStats['revenue'] ?? 0)) / ($previousStats['revenue'] ?? 0) * 100, 2)
                        : 0
                ],
                'customers' => [
                    'current' => $currentStats['customer_count'] ?? 0,
                    'previous' => $previousStats['customer_count'] ?? 0,
                    'change' => ($currentStats['customer_count'] ?? 0) - ($previousStats['customer_count'] ?? 0),
                    'change_percentage' => ($previousStats['customer_count'] ?? 0) > 0 
                        ? round((($currentStats['customer_count'] ?? 0) - ($previousStats['customer_count'] ?? 0)) / ($previousStats['customer_count'] ?? 0) * 100, 2)
                        : 0
                ],
                'avg_order_value' => [
                    'current' => $currentStats['avg_order_value'] ?? 0,
                    'previous' => $previousStats['avg_order_value'] ?? 0,
                    'change' => ($currentStats['avg_order_value'] ?? 0) - ($previousStats['avg_order_value'] ?? 0),
                    'change_percentage' => ($previousStats['avg_order_value'] ?? 0) > 0 
                        ? round((($currentStats['avg_order_value'] ?? 0) - ($previousStats['avg_order_value'] ?? 0)) / ($previousStats['avg_order_value'] ?? 0) * 100, 2)
                        : 0
                ]
            ];
            
            return $comparison;
            
        } catch (Exception $e) {
            error_log("getPeriodComparison error: " . $e->getMessage());
            return false;
        }
    }

    // Get revenue statistics
    public function getRevenueStatistics($dateFrom, $dateTo) {
        try {
            $sql = "SELECT 
                        -- Total revenue
                        COALESCE(SUM(total_price), 0) as total_revenue,
                        
                        -- Revenue by payment status
                        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END), 0) as revenue_paid,
                        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_price ELSE 0 END), 0) as revenue_pending,
                        COALESCE(SUM(CASE WHEN payment_status = 'failed' THEN total_price ELSE 0 END), 0) as revenue_failed,
                        
                        -- Revenue by booking status
                        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as revenue_completed,
                        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_price ELSE 0 END), 0) as revenue_cancelled,
                        
                        -- Revenue by payment method
                        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_price ELSE 0 END), 0) as revenue_cash,
                        COALESCE(SUM(CASE WHEN payment_method = 'online' THEN total_price ELSE 0 END), 0) as revenue_online,
                        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_price ELSE 0 END), 0) as revenue_card,
                        
                        -- Average booking value
                        COALESCE(AVG(total_price), 0) as avg_booking_value,
                        
                        -- Highest booking value
                        COALESCE(MAX(total_price), 0) as highest_booking_value,
                        
                        -- Today's revenue
                        COALESCE(SUM(CASE WHEN DATE(booking_date) = CURDATE() THEN total_price ELSE 0 END), 0) as todays_revenue,
                        
                        -- This week's revenue
                        COALESCE(SUM(CASE WHEN booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN total_price ELSE 0 END), 0) as weekly_revenue,
                        
                        -- This month's revenue
                        COALESCE(SUM(CASE WHEN MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURDATE()) THEN total_price ELSE 0 END), 0) as monthly_revenue
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("getRevenueStatistics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get service statistics
    public function getServiceStatistics($dateFrom, $dateTo) {
        try {
            $sql = "SELECT 
                        s.id,
                        s.title as service_name,
                        s.price as service_price,
                        s.duration_minutes,
                        s.description,
                        
                        -- Booking counts
                        COUNT(b.id) as times_booked,
                        
                        -- Revenue from this service
                        COALESCE(SUM(b.total_price), 0) as service_revenue,
                        
                        -- Popular combinations (if any)
                        GROUP_CONCAT(DISTINCT s2.title SEPARATOR ' + ') as frequently_paired_with
                    FROM services s
                    LEFT JOIN bookings b ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b.service_ids, '[', ''), ']', '')
                        ) > 0
                        AND b.booking_date BETWEEN ? AND ?
                    LEFT JOIN bookings b2 ON 
                        FIND_IN_SET(
                            s.id,
                            REPLACE(REPLACE(b2.service_ids, '[', ''), ']', '')
                        ) > 0
                    LEFT JOIN services s2 ON 
                        s2.id != s.id AND
                        FIND_IN_SET(
                            s2.id,
                            REPLACE(REPLACE(b2.service_ids, '[', ''), ']', '')
                        ) > 0
                    GROUP BY s.id
                    ORDER BY times_booked DESC, service_revenue DESC
                    LIMIT 10";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("getServiceStatistics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get booking trends (daily)
    public function getBookingTrends($dateFrom, $dateTo) {
        try {
            $sql = "SELECT 
                        DATE(booking_date) as date,
                        COUNT(*) as total_bookings,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                        COALESCE(SUM(total_price), 0) as daily_revenue,
                        AVG(total_price) as avg_booking_value
                    FROM bookings
                    WHERE booking_date BETWEEN ? AND ?
                    GROUP BY DATE(booking_date)
                    ORDER BY date";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo]);
            $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format dates and add day names
            foreach ($trends as &$trend) {
                $trend['date_formatted'] = date('d M Y', strtotime($trend['date']));
                $trend['day_name'] = date('D', strtotime($trend['date']));
            }
            
            return $trends;
            
        } catch (Exception $e) {
            error_log("getBookingTrends error: " . $e->getMessage());
            return false;
        }
    }
    
    // Get vehicle type statistics
    public function getVehicleTypeStatistics($dateFrom, $dateTo) {
        try {
            $sql = "SELECT 
                        v.type as vehicle_type,
                        COUNT(b.id) as total_bookings,
                        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
                        COALESCE(AVG(b.total_price), 0) as avg_booking_value,
                        COALESCE(SUM(b.total_price), 0) as total_revenue,
                        
                        -- Most popular service for this vehicle type
                        (SELECT s.title FROM services s
                         JOIN bookings b2 ON FIND_IN_SET(s.id, REPLACE(REPLACE(b2.service_ids, '[', ''), ']', '')) > 0
                         WHERE b2.vehicle_id = v.id
                         GROUP BY s.id
                         ORDER BY COUNT(*) DESC
                         LIMIT 1) as most_popular_service
                    FROM vehicles v
                    LEFT JOIN bookings b ON v.id = b.vehicle_id 
                        AND b.booking_date BETWEEN ? AND ?
                    WHERE v.type IS NOT NULL
                    GROUP BY v.type
                    ORDER BY total_bookings DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("getVehicleTypeStatistics error: " . $e->getMessage());
            return false;
        }
    }
    
    // Helper method to get status color for UI
    private function getStatusColor($status) {
        $colors = [
            'pending' => '#ffc107',    // Yellow
            'confirmed' => '#17a2b8',  // Cyan
            'allocated' => '#007bff',  // Blue
            'in_progress' => '#fd7e14', // Orange
            'completed' => '#28a745',  // Green
            'cancelled' => '#dc3545'   // Red
        ];
        
        return $colors[$status] ?? '#6c757d'; // Default gray
    }
}
?>