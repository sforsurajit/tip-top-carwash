<?php
/**
 * Customer Model
 * Handles all customer-related database operations
 * 
 * @package TipTop Car Wash
 * @version 1.0
 */

require_once __DIR__ . '/../config/database.php';

class Customer {
    private $db;
    private $pdo;

    public function __construct() {
        $this->db = new Database();
        $this->pdo = $this->db->connect();
    }

    /**
     * Check if a phone number exists in the system
     * 
     * @param string $phone Phone number with country code
     * @return array|null Customer data if exists, null otherwise
     */
    public function checkPhone($phone) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    id,
                    phone,
                    name,
                    email,
                    total_bookings,
                    last_booking_at,
                    created_at,
                    status
                FROM customers
                WHERE phone = ? AND status = 'active'
            ");
            
            $stmt->execute([$phone]);
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $customer ?: null;
        } catch (PDOException $e) {
            error_log("Customer checkPhone error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a new customer
     * 
     * @param array $data Customer data (phone, name, email)
     * @return array Created customer data with ID
     */
    public function create($data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO customers (phone, name, email, status)
                VALUES (?, ?, ?, 'active')
            ");
            
            $stmt->execute([
                $data['phone'],
                $data['name'] ?? null,
                $data['email'] ?? null
            ]);
            
            $customerId = $this->pdo->lastInsertId();
            
            // Return created customer
            return $this->findById($customerId);
        } catch (PDOException $e) {
            error_log("Customer create error: " . $e->getMessage());
            throw new Exception("Failed to create customer: " . $e->getMessage());
        }
    }

    /**
     * Find customer by ID
     * 
     * @param int $id Customer ID
     * @return array|null Customer data if found
     */
    public function findById($id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    id,
                    phone,
                    name,
                    email,
                    total_bookings,
                    last_booking_at,
                    created_at,
                    status
                FROM customers
                WHERE id = ?
            ");
            
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (PDOException $e) {
            error_log("Customer findById error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Update customer information
     * 
     * @param int $id Customer ID
     * @param array $data Data to update
     * @return bool Success status
     */
    public function update($id, $data) {
        try {
            $fields = [];
            $values = [];
            
            if (isset($data['name'])) {
                $fields[] = 'name = ?';
                $values[] = $data['name'];
            }
            
            if (isset($data['email'])) {
                $fields[] = 'email = ?';
                $values[] = $data['email'];
            }
            
            if (empty($fields)) {
                return true; // Nothing to update
            }
            
            $values[] = $id;
            
            $stmt = $this->pdo->prepare("
                UPDATE customers
                SET " . implode(', ', $fields) . "
                WHERE id = ?
            ");
            
            return $stmt->execute($values);
        } catch (PDOException $e) {
            error_log("Customer update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get customer's last booking
     * 
     * @param int $customerId Customer ID
     * @return array|null Last booking data
     */
    public function getLastBooking($customerId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    b.*,
                    s.name as service_name,
                    s.base_price
                FROM bookings b
                LEFT JOIN services s ON b.service_id = s.id
                WHERE b.customer_id = ?
                ORDER BY b.created_at DESC
                LIMIT 1
            ");
            
            $stmt->execute([$customerId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (PDOException $e) {
            error_log("Customer getLastBooking error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get all customer's bookings
     * 
     * @param int $customerId Customer ID
     * @param int $limit Number of bookings to retrieve
     * @return array Array of bookings
     */
    public function getBookings($customerId, $limit = 10) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    b.*,
                    s.name as service_name,
                    s.base_price
                FROM bookings b
                LEFT JOIN services s ON b.service_id = s.id
                WHERE b.customer_id = ?
                ORDER BY b.created_at DESC
                LIMIT ?
            ");
            
            $stmt->execute([$customerId, $limit]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Customer getBookings error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get customer's saved vehicles
     * 
     * @param int $customerId Customer ID
     * @return array Array of vehicles
     */
    public function getVehicles($customerId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT *
                FROM customer_vehicles
                WHERE customer_id = ?
                ORDER BY is_primary DESC, created_at DESC
            ");
            
            $stmt->execute([$customerId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Customer getVehicles error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Save a vehicle for customer
     * 
     * @param int $customerId Customer ID
     * @param array $data Vehicle data
     * @return int|false Vehicle ID or false on failure
     */
    public function saveVehicle($customerId, $data) {
        try {
            // If this is set as primary, unset other primary vehicles
            if (!empty($data['is_primary'])) {
                $this->pdo->prepare("
                    UPDATE customer_vehicles
                    SET is_primary = FALSE
                    WHERE customer_id = ?
                ")->execute([$customerId]);
            }
            
            $stmt = $this->pdo->prepare("
                INSERT INTO customer_vehicles 
                (customer_id, vehicle_type, vehicle_model, vehicle_number, is_primary)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $customerId,
                $data['vehicle_type'],
                $data['vehicle_model'] ?? null,
                $data['vehicle_number'] ?? null,
                !empty($data['is_primary']) ? 1 : 0
            ]);
            
            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("Customer saveVehicle error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get customer's saved locations
     * 
     * @param int $customerId Customer ID
     * @return array Array of locations
     */
    public function getLocations($customerId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT *
                FROM customer_locations
                WHERE customer_id = ?
                ORDER BY is_primary DESC, created_at DESC
            ");
            
            $stmt->execute([$customerId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Customer getLocations error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Save a location for customer
     * 
     * @param int $customerId Customer ID
     * @param array $data Location data
     * @return int|false Location ID or false on failure
     */
    public function saveLocation($customerId, $data) {
        try {
            // If this is set as primary, unset other primary locations
            if (!empty($data['is_primary'])) {
                $this->pdo->prepare("
                    UPDATE customer_locations
                    SET is_primary = FALSE
                    WHERE customer_id = ?
                ")->execute([$customerId]);
            }
            
            $stmt = $this->pdo->prepare("
                INSERT INTO customer_locations 
                (customer_id, label, address, lat, lng, landmark, landmark_type, notes, pincode, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $customerId,
                $data['label'] ?? null,
                $data['address'] ?? null,
                $data['lat'] ?? null,
                $data['lng'] ?? null,
                $data['landmark'] ?? null,
                $data['landmark_type'] ?? null,
                $data['notes'] ?? null,
                $data['pincode'] ?? null,
                !empty($data['is_primary']) ? 1 : 0
            ]);
            
            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("Customer saveLocation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update customer's booking count and last booking time
     * 
     * @param int $customerId Customer ID
     * @return bool Success status
     */
    public function updateBookingStats($customerId) {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE customers
                SET 
                    total_bookings = total_bookings + 1,
                    last_booking_at = NOW()
                WHERE id = ?
            ");
            
            return $stmt->execute([$customerId]);
        } catch (PDOException $e) {
            error_log("Customer updateBookingStats error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get customer statistics
     * 
     * @param int $customerId Customer ID
     * @return array Statistics data
     */
    public function getStatistics($customerId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    c.total_bookings,
                    c.last_booking_at,
                    c.created_at,
                    COUNT(DISTINCT cv.id) as saved_vehicles,
                    COUNT(DISTINCT cl.id) as saved_locations
                FROM customers c
                LEFT JOIN customer_vehicles cv ON c.id = cv.customer_id
                LEFT JOIN customer_locations cl ON c.id = cl.customer_id
                WHERE c.id = ?
                GROUP BY c.id
            ");
            
            $stmt->execute([$customerId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            error_log("Customer getStatistics error: " . $e->getMessage());
            return [];
        }
    }
}
?>
