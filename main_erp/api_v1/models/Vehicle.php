<?php
require_once 'config/database.php';

class Vehicle {
    private $db;
    
    private $errorLogDir = __DIR__ . "/../logs/errors/";
    
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

            $logMessage = "[{$timestamp}] Vehicle: {$class}, Method: {$function}, Line: {$line}, Message: {$message}\n";

            file_put_contents($logFile, $logMessage, FILE_APPEND);
        } catch (Exception $e) {
            error_log("Logging failed: " . $e->getMessage());
        }
    }

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in Vehicle model: " . $e->getMessage());
            throw $e;
        }
    }

    // Get vehicle by ID
    public function findById($id) {
        try {
            $sql = "SELECT * FROM vehicles WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Vehicle findById error: " . $e->getMessage());
            return false;
        }
    }

    // Get vehicles by customer ID
    public function getByCustomerId($customerId) {
        try {
            $sql = "SELECT * FROM vehicles WHERE customer_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$customerId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Vehicle getByCustomerId error: " . $e->getMessage());
            return false;
        }
    }

  // Create new vehicle
    public function create($data) {
    try {
        // Log entry
        $this->logError("Starting vehicle creation. Data: " . json_encode($data));
        
        $sql = "INSERT INTO vehicles (customer_id, make, model, year, color, license_plate, type) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            $data['customer_id'],
            $data['make'],
            $data['model'],
            $data['year'] ?? null,
            $data['color'] ?? null,
            $data['license_plate'],
            $data['type']
        ]);
        
        if ($result) {
            $vehicleId = $this->db->lastInsertId();
            $this->logError("Vehicle created successfully with ID: " . $vehicleId);
            return $vehicleId;
        } else {
            $this->logError("Vehicle creation failed - execute() returned false");
            return false;
        }
        
        } catch (Exception $e) {
            $this->logError("Vehicle create error: " . $e->getMessage());
            return false;
        }
    }

    // Check if license plate already exists for a customer
    public function licensePlateExists($licensePlate, $customerId, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM vehicles 
                    WHERE license_plate = ? AND customer_id = ?";
            
            $params = [$licensePlate, $customerId];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log("licensePlateExists error: " . $e->getMessage());
            return false;
        }
    }
    // Update vehicle
    public function update($id, $data) {
        try {
            $sql = "UPDATE vehicles SET 
                    make = ?, model = ?, year = ?, color = ?, 
                    license_plate = ?, type = ?, updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                $data['make'] ?? null,
                $data['model'] ?? null,
                $data['year'] ?? null,
                $data['color'] ?? null,
                $data['license_plate'] ?? null,
                $data['type'] ?? null,
                $id
            ]);
        } catch (Exception $e) {
            error_log("Vehicle update error: " . $e->getMessage());
            return false;
        }
    }

    // Delete vehicle
    public function delete($id) {
        try {
            $sql = "DELETE FROM vehicles WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            error_log("Vehicle delete error: " . $e->getMessage());
            return false;
        }
    }

    // Check if vehicle has active bookings
    public function hasActiveBookings($vehicleId) {
        try {
            $sql = "SELECT COUNT(*) as count FROM bookings 
                    WHERE vehicle_id = ? 
                    AND status NOT IN ('completed', 'cancelled')";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$vehicleId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log("hasActiveBookings error: " . $e->getMessage());
            return false;
        }
    }

    // Check if vehicle belongs to customer (add this method)
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
}
?>