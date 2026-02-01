<?php
require_once 'models/Vehicle.php';
require_once 'utils/Validator.php';
require_once 'utils/Response.php';

class VehicleController {
    private $vehicleModel;

    private $errorLogDir = __DIR__ . "/logs/errors/";
    /**
     * Dynamic logging method
     */
    private function logError($message) {
        try {
            if (!is_dir($this->errorLogDir)) {
                mkdir($this->errorLogDir, 0755, true);
            }

            $logFile = $this->errorLogDir . "error_" . date("Y-m-d") . ".log";
            $timestamp = date("Y-m-d H:i:s");

            $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1);
            $file = $backtrace[0]['file'] ?? 'unknown';
            $line = $backtrace[0]['line'] ?? 'unknown';

            $logMessage = "[{$timestamp}] File: {$file}, Line: {$line}, Message: {$message}\n";

            file_put_contents($logFile, $logMessage, FILE_APPEND);
        } catch (Exception $e) {
            error_log("Logging failed: " . $e->getMessage());
        }
    }
    
    public function __construct() {
        $this->vehicleModel = new Vehicle();
    }

    // Get all vehicles for current customer
    public function getAll() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $vehicles = $this->vehicleModel->getByCustomerId($currentUser['id']);
            
            if ($vehicles === false) {
                Response::error('Failed to retrieve vehicles', 500);
                return;
            }

            Response::success([
                'vehicles' => $vehicles,
                'total' => count($vehicles)
            ], 'Vehicles retrieved successfully');

        } catch (Exception $e) {
            error_log("Get all vehicles error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Get vehicle by ID
    public function getById($id) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // The $id parameter is now customer_id
        $customerId = $id;
        
        // Get vehicles for this customer
        $vehicles = $this->vehicleModel->getByCustomerId($customerId);
        
        if ($vehicles === false) {
            Response::error('Failed to retrieve vehicles', 500);
            return;
        }

        if (empty($vehicles)) {
            Response::success([
                'vehicles' => [],
                'total' => 0,
                'customer_id' => $customerId
            ], 'No vehicles found for this customer');
            return;
        }

        Response::success([
            'vehicles' => $vehicles,
            'total' => count($vehicles),
            'customer_id' => $customerId
        ], 'Vehicles retrieved successfully');

        } catch (Exception $e) {
            error_log("Get vehicles by customer ID error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }


   // Create new vehicle
    public function create() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                $this->logError("Authentication required for vehicle creation");
                Response::error('Authentication required', 401);
                return;
            }
    
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Log the received data
            $this->logError("Received vehicle data: " . print_r($input, true));
    
            // Validate required fields
            $requiredFields = ['customer_id', 'make', 'model', 'license_plate', 'type'];
            $errors = Validator::validateRequired($requiredFields, $input);
            
            if (!empty($errors)) {
                $this->logError("Validation failed for vehicle creation: " . print_r($errors, true));
                Response::error('Validation failed', 400, $errors);
                return;
            }
    
            // Check if license plate already exists for this customer
            if ($this->vehicleModel->licensePlateExists($input['license_plate'], $input['customer_id'])) {
                $this->logError("License plate already exists: {$input['license_plate']} for customer: {$input['customer_id']}");
                Response::error('License plate already registered for this customer', 409);
                return;
            }
    
            // Prepare vehicle data
            $vehicleData = [
                'customer_id' => $input['customer_id'],
                'make' => $input['make'],
                'model' => $input['model'],
                'license_plate' => $input['license_plate'],
                'type' => $input['type'],
                'year' => $input['year'] ?? null,
                'color' => $input['color'] ?? null
            ];
    
            $this->logError("Attempting to create vehicle with data: " . print_r($vehicleData, true));
            
            $vehicleId = $this->vehicleModel->create($vehicleData);
            
            // Check if creation was successful
            if ($vehicleId) {
                $this->logError("Vehicle created successfully with ID: {$vehicleId}");
                
                // Add the ID to the vehicle data for response
                $vehicleData['id'] = $vehicleId;
                
                Response::success([
                    'vehicle_id' => $vehicleId,
                    'vehicle' => $vehicleData
                ], 'Vehicle created successfully', 201);
            } else {
                $this->logError("Vehicle creation failed - model returned false");
                Response::error('Failed to create vehicle', 500);
            }
    
        } catch (Exception $e) {
            $this->logError("Create vehicle error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    // Update vehicle
    public function update($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $vehicle = $this->vehicleModel->findById($id);
            if (!$vehicle) {
                Response::error('Vehicle not found', 404);
                return;
            }

            // Check if vehicle belongs to customer
            if ($vehicle['customer_id'] != $currentUser['id']) {
                Response::error('Access denied', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $result = $this->vehicleModel->update($id, $input);

            if ($result) {
                Response::success(null, 'Vehicle updated successfully');
            } else {
                Response::error('Failed to update vehicle', 500);
            }

        } catch (Exception $e) {
            error_log("Update vehicle error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // Delete vehicle
    public function delete($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $vehicle = $this->vehicleModel->findById($id);
            if (!$vehicle) {
                Response::error('Vehicle not found', 404);
                return;
            }

            // Check if vehicle belongs to customer
            if ($vehicle['customer_id'] != $currentUser['id']) {
                Response::error('Access denied', 403);
                return;
            }

            // Check if vehicle has any active bookings
            if ($this->vehicleModel->hasActiveBookings($id)) {
                Response::error('Cannot delete vehicle with active bookings', 400);
                return;
            }

            $result = $this->vehicleModel->delete($id);

            if ($result) {
                Response::success(null, 'Vehicle deleted successfully');
            } else {
                Response::error('Failed to delete vehicle', 500);
            }

        } catch (Exception $e) {
            error_log("Delete vehicle error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
}
?>