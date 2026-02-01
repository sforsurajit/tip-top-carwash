<?php
/**
 * Customer Controller
 * Handles all customer-related API endpoints
 * 
 * @package TipTop Car Wash
 * @version 1.0
 */

require_once __DIR__ . '/../models/Customer.php';
require_once __DIR__ . '/../utils/Response.php';

class CustomerController {
    private $customer;

    public function __construct() {
        $this->customer = new Customer();
    }

    /**
     * Check if phone number exists
     * GET /api/customers/check-phone?phone=+919876543210
     */
    public function checkPhone() {
        try {
            $phone = $_GET['phone'] ?? null;

            if (!$phone) {
                return Response::error('Phone number is required', 400);
            }

            // Validate phone format
            if (!$this->validatePhone($phone)) {
                return Response::error('Invalid phone number format', 400);
            }

            $customerData = $this->customer->checkPhone($phone);

            if ($customerData) {
                // Returning customer
                return Response::success([
                    'is_returning' => true,
                    'customer' => [
                        'id' => $customerData['id'],
                        'phone' => $customerData['phone'],
                        'name' => $customerData['name'],
                        'email' => $customerData['email'],
                        'total_bookings' => (int)$customerData['total_bookings'],
                        'last_booking_at' => $customerData['last_booking_at'],
                        'member_since' => $customerData['created_at']
                    ]
                ]);
            } else {
                // New customer
                return Response::success([
                    'is_returning' => false,
                    'message' => 'New customer'
                ]);
            }
        } catch (Exception $e) {
            error_log("checkPhone error: " . $e->getMessage());
            return Response::error('Failed to check phone number', 500);
        }
    }

    /**
     * Get customer profile
     * GET /api/customers/{id}
     */
    public function getProfile($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $customerData = $this->customer->findById($id);

            if (!$customerData) {
                return Response::error('Customer not found', 404);
            }

            // Get additional stats
            $stats = $this->customer->getStatistics($id);

            return Response::success([
                'customer' => [
                    'id' => $customerData['id'],
                    'phone' => $customerData['phone'],
                    'name' => $customerData['name'],
                    'email' => $customerData['email'],
                    'total_bookings' => (int)$customerData['total_bookings'],
                    'last_booking_at' => $customerData['last_booking_at'],
                    'member_since' => $customerData['created_at'],
                    'saved_vehicles' => (int)($stats['saved_vehicles'] ?? 0),
                    'saved_locations' => (int)($stats['saved_locations'] ?? 0)
                ]
            ]);
        } catch (Exception $e) {
            error_log("getProfile error: " . $e->getMessage());
            return Response::error('Failed to get customer profile', 500);
        }
    }

    /**
     * Create new customer
     * POST /api/customers
     * Body: { "phone": "+919876543210", "name": "John Doe", "email": "john@example.com" }
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['phone'])) {
                return Response::error('Phone number is required', 400);
            }

            // Validate phone format
            if (!$this->validatePhone($data['phone'])) {
                return Response::error('Invalid phone number format', 400);
            }

            // Check if phone already exists
            $existing = $this->customer->checkPhone($data['phone']);
            if ($existing) {
                return Response::error('Phone number already registered', 409);
            }

            $customerData = $this->customer->create($data);

            return Response::success([
                'message' => 'Customer created successfully',
                'customer' => $customerData
            ], 201);
        } catch (Exception $e) {
            error_log("create customer error: " . $e->getMessage());
            return Response::error('Failed to create customer: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update customer profile
     * PUT /api/customers/{id}
     * Body: { "name": "John Doe", "email": "john@example.com" }
     */
    public function update($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data)) {
                return Response::error('No data provided', 400);
            }

            $success = $this->customer->update($id, $data);

            if ($success) {
                $customerData = $this->customer->findById($id);
                return Response::success([
                    'message' => 'Customer updated successfully',
                    'customer' => $customerData
                ]);
            } else {
                return Response::error('Failed to update customer', 500);
            }
        } catch (Exception $e) {
            error_log("update customer error: " . $e->getMessage());
            return Response::error('Failed to update customer', 500);
        }
    }

    /**
     * Get customer's last booking
     * GET /api/customers/{id}/last-booking
     */
    public function getLastBooking($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $booking = $this->customer->getLastBooking($id);

            if (!$booking) {
                return Response::error('No bookings found', 404);
            }

            return Response::success([
                'booking' => $booking
            ]);
        } catch (Exception $e) {
            error_log("getLastBooking error: " . $e->getMessage());
            return Response::error('Failed to get last booking', 500);
        }
    }

    /**
     * Get customer's booking history
     * GET /api/customers/{id}/bookings?limit=10
     */
    public function getBookings($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $limit = min($limit, 50); // Max 50 bookings

            $bookings = $this->customer->getBookings($id, $limit);

            return Response::success([
                'bookings' => $bookings,
                'count' => count($bookings)
            ]);
        } catch (Exception $e) {
            error_log("getBookings error: " . $e->getMessage());
            return Response::error('Failed to get bookings', 500);
        }
    }

    /**
     * Get customer's saved vehicles
     * GET /api/customers/{id}/vehicles
     */
    public function getVehicles($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $vehicles = $this->customer->getVehicles($id);

            return Response::success([
                'vehicles' => $vehicles,
                'count' => count($vehicles)
            ]);
        } catch (Exception $e) {
            error_log("getVehicles error: " . $e->getMessage());
            return Response::error('Failed to get vehicles', 500);
        }
    }

    /**
     * Save a vehicle for customer
     * POST /api/customers/{id}/vehicles
     * Body: { "vehicle_type": "sedan", "vehicle_model": "Honda City", "is_primary": true }
     */
    public function saveVehicle($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['vehicle_type'])) {
                return Response::error('Vehicle type is required', 400);
            }

            $vehicleId = $this->customer->saveVehicle($id, $data);

            if ($vehicleId) {
                return Response::success([
                    'message' => 'Vehicle saved successfully',
                    'vehicle_id' => $vehicleId
                ], 201);
            } else {
                return Response::error('Failed to save vehicle', 500);
            }
        } catch (Exception $e) {
            error_log("saveVehicle error: " . $e->getMessage());
            return Response::error('Failed to save vehicle', 500);
        }
    }

    /**
     * Get customer's saved locations
     * GET /api/customers/{id}/locations
     */
    public function getLocations($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $locations = $this->customer->getLocations($id);

            return Response::success([
                'locations' => $locations,
                'count' => count($locations)
            ]);
        } catch (Exception $e) {
            error_log("getLocations error: " . $e->getMessage());
            return Response::error('Failed to get locations', 500);
        }
    }

    /**
     * Save a location for customer
     * POST /api/customers/{id}/locations
     * Body: { "label": "Home", "address": "123 Main St", "lat": 26.4012, "lng": 90.2696, "is_primary": true }
     */
    public function saveLocation($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['address']) && (empty($data['lat']) || empty($data['lng']))) {
                return Response::error('Address or coordinates are required', 400);
            }

            $locationId = $this->customer->saveLocation($id, $data);

            if ($locationId) {
                return Response::success([
                    'message' => 'Location saved successfully',
                    'location_id' => $locationId
                ], 201);
            } else {
                return Response::error('Failed to save location', 500);
            }
        } catch (Exception $e) {
            error_log("saveLocation error: " . $e->getMessage());
            return Response::error('Failed to save location', 500);
        }
    }

    /**
     * Get customer statistics
     * GET /api/customers/{id}/statistics
     */
    public function getStatistics($id) {
        try {
            if (!$id || !is_numeric($id)) {
                return Response::error('Invalid customer ID', 400);
            }

            $stats = $this->customer->getStatistics($id);

            if (empty($stats)) {
                return Response::error('Customer not found', 404);
            }

            return Response::success([
                'statistics' => $stats
            ]);
        } catch (Exception $e) {
            error_log("getStatistics error: " . $e->getMessage());
            return Response::error('Failed to get statistics', 500);
        }
    }

    /**
     * Validate phone number format
     * 
     * @param string $phone Phone number
     * @return bool Valid or not
     */
    private function validatePhone($phone) {
        // Accept formats: +919876543210 or 9876543210
        return preg_match('/^(\+91)?[6-9]\d{9}$/', $phone);
    }
}
?>
