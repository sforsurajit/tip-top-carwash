<?php
require_once 'models/Service.php';
require_once 'utils/Validator.php';

class ServiceController {
    private $serviceModel;

    public function __construct() {
        $this->serviceModel = new Service();
    }

    /**
     * Get all active services (PUBLIC - No authentication required)
     * Supports optional vehicle_category filter
     */
    public function getAllActive() {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $vehicleCategory = isset($_GET['vehicle_category']) ? $_GET['vehicle_category'] : null;
            
            // Validate vehicle category
            $validCategories = ['Hatchback', 'Sedan', 'Compact SUV', 'SUV', 'Bike'];
            if ($vehicleCategory && !in_array($vehicleCategory, $validCategories)) {
                $vehicleCategory = null; // Invalid category, ignore filter
            }
            
            $services = $this->serviceModel->getAllActive($limit, $offset, $vehicleCategory);
            $total = $this->serviceModel->getTotalCount(true);
            
            Response::success([
                'services' => $services,
                'total' => $total,
                'count' => count($services),
                'vehicle_category' => $vehicleCategory
            ], 'Services retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get active services error: " . $e->getMessage());
            Response::error('Failed to retrieve services', 500);
        }
    }

    /**
     * Get service by ID or key (PUBLIC - No authentication required)
     */
    public function getById($id) {
        try {
            // Check if it's a service_key (string) or ID (numeric)
            if (is_numeric($id)) {
                $service = $this->serviceModel->findById($id);
            } else {
                $service = $this->serviceModel->findByKey($id);
            }
            
            if (!$service) {
                Response::error('Service not found', 404);
                return;
            }

            Response::success([
                'service' => $service
            ], 'Service retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get service by ID error: " . $e->getMessage());
            Response::error('Failed to retrieve service', 500);
        }
    }

    /**
     * Get all services including inactive (PROTECTED - Admin only)
     */
    public function getAll() {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            $services = $this->serviceModel->getAll($limit, $offset);
            $total = $this->serviceModel->getTotalCount(false);
            
            Response::success([
                'services' => $services,
                'total' => $total,
                'count' => count($services)
            ], 'All services retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get all services error: " . $e->getMessage());
            Response::error('Failed to retrieve services', 500);
        }
    }

    /**
     * Create new service (PROTECTED - Admin only)
     */
    public function create() {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Validate required fields
            $requiredFields = ['service_key', 'title', 'description', 'price', 'duration'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Validate price and duration
            if (!is_numeric($input['price']) || $input['price'] <= 0) {
                Response::error('Invalid price value', 400);
                return;
            }

            if (!is_numeric($input['duration']) || $input['duration'] <= 0) {
                Response::error('Invalid duration value', 400);
                return;
            }

            // Check if service_key already exists
            if ($this->serviceModel->serviceKeyExists($input['service_key'])) {
                Response::error('Service key already exists', 409);
                return;
            }

            // Validate features format if provided
            if (isset($input['features']) && !is_array($input['features'])) {
                Response::error('Features must be an array', 400);
                return;
            }

            $serviceId = $this->serviceModel->create($input);

            if ($serviceId) {
                $service = $this->serviceModel->findById($serviceId);
                Response::success([
                    'service' => $service
                ], 'Service created successfully', 201);
            } else {
                Response::error('Failed to create service', 500);
            }

        } catch (Exception $e) {
            error_log("Create service error: " . $e->getMessage());
            Response::error('Failed to create service', 500);
        }
    }

    /**
     * Update service (PROTECTED - Admin only)
     */
    public function update($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Check if service exists
            $service = $this->serviceModel->findById($id);
            if (!$service) {
                Response::error('Service not found', 404);
                return;
            }

            // Validate required fields
            $requiredFields = ['title', 'description', 'price', 'duration'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Validate price and duration
            if (!is_numeric($input['price']) || $input['price'] <= 0) {
                Response::error('Invalid price value', 400);
                return;
            }

            if (!is_numeric($input['duration']) || $input['duration'] <= 0) {
                Response::error('Invalid duration value', 400);
                return;
            }

            // Validate features format if provided
            if (isset($input['features']) && !is_array($input['features'])) {
                Response::error('Features must be an array', 400);
                return;
            }

            $result = $this->serviceModel->update($id, $input);

            if ($result) {
                $updatedService = $this->serviceModel->findById($id);
                Response::success([
                    'service' => $updatedService
                ], 'Service updated successfully');
            } else {
                Response::error('Failed to update service', 500);
            }

        } catch (Exception $e) {
            error_log("Update service error: " . $e->getMessage());
            Response::error('Failed to update service', 500);
        }
    }

    /**
     * Update service status (PROTECTED - Admin only)
     */
    public function updateStatus($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['status'])) {
                Response::error('Status is required', 400);
                return;
            }

            $validStatuses = ['active', 'inactive'];
            if (!in_array($input['status'], $validStatuses)) {
                Response::error('Invalid status value. Must be: active or inactive', 400);
                return;
            }

            // Check if service exists
            $service = $this->serviceModel->findById($id);
            if (!$service) {
                Response::error('Service not found', 404);
                return;
            }

            $result = $this->serviceModel->updateStatus($id, $input['status']);

            if ($result) {
                Response::success([
                    'service_id' => (int)$id,
                    'status' => $input['status']
                ], 'Service status updated successfully');
            } else {
                Response::error('Failed to update status', 500);
            }

        } catch (Exception $e) {
            error_log("Update service status error: " . $e->getMessage());
            Response::error('Failed to update service status', 500);
        }
    }

    /**
     * Delete service (PROTECTED - Admin only)
     */
    public function delete($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            // Check if service exists
            $service = $this->serviceModel->findById($id);
            if (!$service) {
                Response::error('Service not found', 404);
                return;
            }

            $result = $this->serviceModel->delete($id);

            if ($result) {
                Response::success(null, 'Service deleted successfully');
            } else {
                Response::error('Failed to delete service', 500);
            }

        } catch (Exception $e) {
            error_log("Delete service error: " . $e->getMessage());
            Response::error('Failed to delete service', 500);
        }
    }

    /**
     * Get service statistics (PROTECTED - Admin only)
     */
    public function getStatistics() {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $stats = $this->serviceModel->getStatistics();

            if ($stats) {
                Response::success([
                    'statistics' => $stats
                ], 'Statistics retrieved successfully');
            } else {
                Response::error('Failed to retrieve statistics', 500);
            }

        } catch (Exception $e) {
            error_log("Get service statistics error: " . $e->getMessage());
            Response::error('Failed to retrieve statistics', 500);
        }
    }
}
?>