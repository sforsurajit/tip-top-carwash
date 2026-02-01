<?php
require_once 'models/SystemFeature.php';
require_once 'models/User.php';
require_once 'models/Organization.php';
require_once 'utils/Validator.php';
require_once 'utils/Response.php';

class SystemFeatureController {
    private $systemFeatureModel;
    private $userModel;
    private $organizationModel;

    public function __construct() {
        $this->systemFeatureModel = new SystemFeature();
        $this->userModel = new User();
        $this->organizationModel = new Organization();
    }

    /**
     * PUBLIC ENDPOINT: Get all active system features
     */
    public function getActiveFeatures() {
        try {
            $features = $this->systemFeatureModel->getAllActive();

            if ($features !== false) {
                Response::success([
                    'features' => $features,
                    'total' => count($features)
                ], 'Active system features retrieved successfully');
            } else {
                Response::error('Failed to retrieve system features', 500);
            }
        } catch (Exception $e) {
            error_log("Get active features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get all system features (including inactive)
     */
    public function getAll() {
        try {
            $features = $this->systemFeatureModel->getAll();

            if ($features !== false) {
                Response::success([
                    'features' => $features,
                    'total' => count($features)
                ], 'System features retrieved successfully');
            } else {
                Response::error('Failed to retrieve system features', 500);
            }
        } catch (Exception $e) {
            error_log("Get all features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get feature statistics
     */
    public function getStatistics() {
        try {
            $stats = $this->systemFeatureModel->getStatistics();

            if ($stats !== false) {
                Response::success($stats, 'Feature statistics retrieved successfully');
            } else {
                Response::error('Failed to retrieve statistics', 500);
            }
        } catch (Exception $e) {
            error_log("Get feature statistics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Create a new system feature
     */
    public function create() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['system_key', 'system_name', 'system_description'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check if system_key already exists
            $existing = $this->systemFeatureModel->getByKey($input['system_key']);
            if ($existing) {
                Response::error('A feature with this system key already exists', 409);
                return;
            }

            $featureId = $this->systemFeatureModel->create($input);

            if ($featureId) {
                $feature = $this->systemFeatureModel->getById($featureId);
                Response::success($feature, 'System feature created successfully');
            } else {
                Response::error('Failed to create system feature', 500);
            }
        } catch (Exception $e) {
            error_log("Create feature error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Update a system feature
     */
    public function update($id) {
        try {
            if (!$id || !is_numeric($id)) {
                Response::error('Invalid feature ID', 400);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['system_name', 'system_description'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $result = $this->systemFeatureModel->update($id, $input);

            if ($result) {
                $feature = $this->systemFeatureModel->getById($id);
                Response::success($feature, 'System feature updated successfully');
            } else {
                Response::error('Failed to update system feature', 500);
            }
        } catch (Exception $e) {
            error_log("Update feature error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Toggle feature active status
     */
    public function toggleStatus($id) {
        try {
            if (!$id || !is_numeric($id)) {
                Response::error('Invalid feature ID', 400);
                return;
            }

            $result = $this->systemFeatureModel->toggleStatus($id);

            if ($result) {
                $feature = $this->systemFeatureModel->getById($id);
                Response::success($feature, 'Feature status toggled successfully');
            } else {
                Response::error('Failed to toggle feature status', 500);
            }
        } catch (Exception $e) {
            error_log("Toggle feature status error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Delete a system feature
     */
    public function delete($id) {
        try {
            if (!$id || !is_numeric($id)) {
                Response::error('Invalid feature ID', 400);
                return;
            }

            $result = $this->systemFeatureModel->delete($id);

            if ($result) {
                Response::success([
                    'feature_id' => $id,
                    'deleted' => true
                ], 'System feature deleted successfully');
            } else {
                Response::error('Failed to delete system feature', 500);
            }
        } catch (Exception $e) {
            error_log("Delete feature error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Create a module for a system
     */
    public function createModule() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['system_feature_id', 'module_key', 'module_name', 'module_description'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $moduleId = $this->systemFeatureModel->createModule($input);

            if ($moduleId) {
                Response::success([
                    'module_id' => $moduleId
                ], 'Module created successfully');
            } else {
                Response::error('Failed to create module', 500);
            }
        } catch (Exception $e) {
            error_log("Create module error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Update a module
     */
    public function updateModule($moduleId) {
        try {
            if (!$moduleId || !is_numeric($moduleId)) {
                Response::error('Invalid module ID', 400);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['module_name', 'module_description'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $result = $this->systemFeatureModel->updateModule($moduleId, $input);

            if ($result) {
                Response::success([
                    'module_id' => $moduleId
                ], 'Module updated successfully');
            } else {
                Response::error('Failed to update module', 500);
            }
        } catch (Exception $e) {
            error_log("Update module error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Delete a module
     */
    public function deleteModule($moduleId) {
        try {
            if (!$moduleId || !is_numeric($moduleId)) {
                Response::error('Invalid module ID', 400);
                return;
            }

            $result = $this->systemFeatureModel->deleteModule($moduleId);

            if ($result) {
                Response::success([
                    'module_id' => $moduleId,
                    'deleted' => true
                ], 'Module deleted successfully');
            } else {
                Response::error('Failed to delete module', 500);
            }
        } catch (Exception $e) {
            error_log("Delete module error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * PUBLIC ENDPOINT: Get user features
     * Shows which features the user has and which are available
     */
    public function getUserFeatures($userId) {
        try {
            if (!$userId || !is_numeric($userId)) {
                Response::error('Invalid user ID', 400);
                return;
            }

            $user = $this->userModel->findById($userId);
            if (!$user) {
                Response::error('User not found', 404);
                return;
            }

            $allFeatures = $this->systemFeatureModel->getAllActive();
            $userFeatures = $user['assigned_features'] ?? [];

            Response::success([
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'user_type' => $user['user_type'],
                    'status' => $user['status']
                ],
                'assigned_features' => $userFeatures,
                'available_features' => $allFeatures
            ], 'User features retrieved successfully');

        } catch (Exception $e) {
            error_log("Get user features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * PUBLIC ENDPOINT: Update user features
     * This allows enabling/disabling features for specific users
     */
    public function updateUserFeatures($userId) {
        try {
            if (!$userId || !is_numeric($userId)) {
                Response::error('Invalid user ID', 400);
                return;
            }

            $user = $this->userModel->findById($userId);
            if (!$user) {
                Response::error('User not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['assigned_features']) || !is_array($input['assigned_features'])) {
                Response::error('assigned_features must be an array', 400);
                return;
            }

            // Update user features
            $result = $this->userModel->updateFeatures($userId, $input['assigned_features']);

            if ($result) {
                $updatedUser = $this->userModel->findById($userId);
                Response::success([
                    'user' => [
                        'id' => $updatedUser['id'],
                        'name' => $updatedUser['name'],
                        'email' => $updatedUser['email'],
                        'assigned_features' => $updatedUser['assigned_features']
                    ]
                ], 'User features updated successfully');
            } else {
                Response::error('Failed to update user features', 500);
            }
        } catch (Exception $e) {
            error_log("Update user features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * PUBLIC ENDPOINT: Add specific feature to user
     */
    public function addFeatureToUser($userId) {
        try {
            if (!$userId || !is_numeric($userId)) {
                Response::error('Invalid user ID', 400);
                return;
            }

            $user = $this->userModel->findById($userId);
            if (!$user) {
                Response::error('User not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['system_key'])) {
                Response::error('system_key is required', 400);
                return;
            }

            // Get the feature details from master catalog
            $feature = $this->systemFeatureModel->getByKey($input['system_key']);
            if (!$feature) {
                Response::error('Feature not found in system catalog', 404);
                return;
            }

            // Get current user features
            $currentFeatures = $user['assigned_features'] ?? [];

            // Check if feature already exists
            if (isset($currentFeatures[$input['system_key']])) {
                Response::error('Feature already assigned to user', 409);
                return;
            }

            // Prepare modules data
            $selectedModules = [];
            if (isset($input['selected_modules']) && is_array($input['selected_modules'])) {
                $selectedModules = $input['selected_modules'];
            } else {
                // Add all modules by default
                foreach ($feature['modules'] as $module) {
                    $selectedModules[] = [
                        'key' => $module['module_key'],
                        'name' => $module['module_name'],
                        'description' => $module['module_description']
                    ];
                }
            }

            // Add new feature
            $currentFeatures[$input['system_key']] = [
                'system_name' => $feature['system_name'],
                'system_description' => $feature['system_description'],
                'system_icon' => $feature['system_icon'],
                'selected_modules' => $selectedModules
            ];

            // Update user
            $result = $this->userModel->updateFeatures($userId, $currentFeatures);

            if ($result) {
                Response::success([
                    'feature_added' => $input['system_key'],
                    'total_features' => count($currentFeatures)
                ], 'Feature added to user successfully');
            } else {
                Response::error('Failed to add feature', 500);
            }

        } catch (Exception $e) {
            error_log("Add feature to user error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * PUBLIC ENDPOINT: Remove specific feature from user
     */
    public function removeFeatureFromUser($userId, $systemKey) {
        try {
            if (!$userId || !is_numeric($userId)) {
                Response::error('Invalid user ID', 400);
                return;
            }

            if (!$systemKey) {
                Response::error('system_key is required', 400);
                return;
            }

            $user = $this->userModel->findById($userId);
            if (!$user) {
                Response::error('User not found', 404);
                return;
            }

            // Get current user features
            $currentFeatures = $user['assigned_features'] ?? [];

            // Check if feature exists
            if (!isset($currentFeatures[$systemKey])) {
                Response::error('Feature not found in user', 404);
                return;
            }

            // Remove the feature
            unset($currentFeatures[$systemKey]);

            // Update user
            $result = $this->userModel->updateFeatures($userId, $currentFeatures);

            if ($result) {
                Response::success([
                    'feature_removed' => $systemKey,
                    'total_features' => count($currentFeatures)
                ], 'Feature removed from user successfully');
            } else {
                Response::error('Failed to remove feature', 500);
            }

        } catch (Exception $e) {
            error_log("Remove feature from user error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * PUBLIC ENDPOINT: Enable/Disable specific feature for user
     */
    public function toggleUserFeature($userId, $systemKey) {
        try {
            if (!$userId || !is_numeric($userId)) {
                Response::error('Invalid user ID', 400);
                return;
            }

            if (!$systemKey) {
                Response::error('system_key is required', 400);
                return;
            }

            $user = $this->userModel->findById($userId);
            if (!$user) {
                Response::error('User not found', 404);
                return;
            }

            $currentFeatures = $user['assigned_features'] ?? [];

            // Check if feature exists
            if (!isset($currentFeatures[$systemKey])) {
                Response::error('Feature not found in user', 404);
                return;
            }

            // Toggle the enabled status
            $currentFeatures[$systemKey]['enabled'] = !($currentFeatures[$systemKey]['enabled'] ?? true);

            // Update user
            $result = $this->userModel->updateFeatures($userId, $currentFeatures);

            if ($result) {
                Response::success([
                    'feature' => $systemKey,
                    'enabled' => $currentFeatures[$systemKey]['enabled']
                ], 'Feature status toggled successfully');
            } else {
                Response::error('Failed to toggle feature status', 500);
            }

        } catch (Exception $e) {
            error_log("Toggle user feature error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get all users with their feature counts (from usersnew table)
     */
    public function getUsersWithFeatures() {
        try {
            // Get all users from usersnew table
            $sql = "SELECT id, name, email, user_type, institution_id, status, assigned_features, created_at FROM usersnew ORDER BY created_at DESC";
            $database = new Database();
            $db = $database->connect();
            $stmt = $db->prepare($sql);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $result = [];
            foreach ($users as $user) {
                $assignedFeatures = $user['assigned_features'] ? json_decode($user['assigned_features'], true) : [];
                $featureCount = count($assignedFeatures);
                $moduleCount = 0;
                
                if (!empty($assignedFeatures)) {
                    foreach ($assignedFeatures as $feature) {
                        if (isset($feature['selected_modules'])) {
                            $moduleCount += count($feature['selected_modules']);
                        }
                    }
                }

                $result[] = [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'user_type' => $user['user_type'],
                    'institution_id' => $user['institution_id'],
                    'status' => $user['status'],
                    'total_features' => $featureCount,
                    'total_modules' => $moduleCount,
                    'created_at' => $user['created_at']
                ];
            }

            Response::success([
                'users' => $result,
                'total' => count($result)
            ], 'Users with features retrieved successfully');

        } catch (Exception $e) {
            error_log("Get users with features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get users by institution
     */
    public function getUsersByInstitution($institutionId) {
        try {
            if (!$institutionId || !is_numeric($institutionId)) {
                Response::error('Invalid institution ID', 400);
                return;
            }

            $users = $this->userModel->getInstitutionUsers($institutionId);

            $result = [];
            foreach ($users as $user) {
                $featureCount = count($user['assigned_features'] ?? []);
                $moduleCount = 0;
                
                if (!empty($user['assigned_features'])) {
                    foreach ($user['assigned_features'] as $feature) {
                        if (isset($feature['selected_modules'])) {
                            $moduleCount += count($feature['selected_modules']);
                        }
                    }
                }

                $result[] = [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'user_type' => $user['user_type'],
                    'role' => $user['role'],
                    'department' => $user['department'],
                    'status' => $user['status'],
                    'total_features' => $featureCount,
                    'total_modules' => $moduleCount,
                    'created_at' => $user['created_at']
                ];
            }

            Response::success([
                'users' => $result,
                'total' => count($result)
            ], 'Institution users retrieved successfully');

        } catch (Exception $e) {
            error_log("Get users by institution error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // KEEP THE ORGANIZATION METHODS FOR BACKWARD COMPATIBILITY
    // These methods work with the organizations table
    
    public function getOrganizationFeatures($orgId) {
        try {
            if (!$orgId || !is_numeric($orgId)) {
                Response::error('Invalid organization ID', 400);
                return;
            }

            $organization = $this->organizationModel->findById($orgId);
            if (!$organization) {
                Response::error('Organization not found', 404);
                return;
            }

            $allFeatures = $this->systemFeatureModel->getAllActive();
            $orgFeatures = $organization['selected_features'] ?? [];

            Response::success([
                'organization' => [
                    'id' => $organization['id'],
                    'institution_name' => $organization['institution_name'],
                    'institution_type' => $organization['institution_type'],
                    'status' => $organization['status']
                ],
                'assigned_features' => $orgFeatures,
                'available_features' => $allFeatures
            ], 'Organization features retrieved successfully');

        } catch (Exception $e) {
            error_log("Get organization features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function updateOrganizationFeatures($orgId) {
        try {
            if (!$orgId || !is_numeric($orgId)) {
                Response::error('Invalid organization ID', 400);
                return;
            }

            $organization = $this->organizationModel->findById($orgId);
            if (!$organization) {
                Response::error('Organization not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['selected_features']) || !is_array($input['selected_features'])) {
                Response::error('selected_features must be an array', 400);
                return;
            }

            $updateData = [
                'institution_name' => $organization['institution_name'],
                'institution_type' => $organization['institution_type'],
                'principal_name' => $organization['principal_name'],
                'contact_email' => $organization['contact_email'],
                'contact_phone' => $organization['contact_phone'],
                'established_year' => $organization['established_year'],
                'address' => $organization['address'],
                'city' => $organization['city'],
                'state' => $organization['state'],
                'pincode' => $organization['pincode'],
                'website' => $organization['website'],
                'selected_features' => $input['selected_features']
            ];

            $result = $this->organizationModel->update($orgId, $updateData);

            if ($result) {
                $updatedOrg = $this->organizationModel->findById($orgId);
                Response::success([
                    'organization' => $updatedOrg
                ], 'Organization features updated successfully');
            } else {
                Response::error('Failed to update organization features', 500);
            }
        } catch (Exception $e) {
            error_log("Update organization features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
}
?>