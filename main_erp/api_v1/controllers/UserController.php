<?php
require_once 'models/User.php';
require_once 'utils/Validator.php';

class UserController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function getAllUsers() {
        $limit = $_GET['limit'] ?? 10;
        $offset = $_GET['offset'] ?? 0;
        
        $users = $this->userModel->getAll($limit, $offset);
        Response::success($users, 'Users retrieved successfully');
    }

    public function getUserById($id) {
        $user = $this->userModel->findById($id);
        
        if (!$user) {
            Response::error('User not found', 404);
        }

        Response::success($user, 'User retrieved successfully');
    }

    public function createUser() {
        $input = json_decode(file_get_contents('php://input'), true);

        $errors = Validator::validateRequired(['name', 'email', 'password'], $input);
        
        if (!Validator::validateEmail($input['email'] ?? '')) {
            $errors[] = 'Invalid email format';
        }

        if (!empty($errors)) {
            Response::error('Validation failed', 400, $errors);
        }

        if ($this->userModel->findByEmail($input['email'])) {
            Response::error('User already exists with this email', 409);
        }

        if ($this->userModel->create($input)) {
            Response::success(null, 'User created successfully', 201);
        } else {
            Response::error('Failed to create user', 500);
        }
    }

    public function updateUser($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        $errors = Validator::validateRequired(['name', 'email'], $input);
        
        if (!Validator::validateEmail($input['email'] ?? '')) {
            $errors[] = 'Invalid email format';
        }

        if (!empty($errors)) {
            Response::error('Validation failed', 400, $errors);
        }

        if ($this->userModel->update($id, $input)) {
            Response::success(null, 'User updated successfully');
        } else {
            Response::error('Failed to update user', 500);
        }
    }

    public function deleteUser($id) {
        if ($this->userModel->delete($id)) {
            Response::success(null, 'User deleted successfully');
        } else {
            Response::error('Failed to delete user', 500);
        }
    }

   public function getCurrentUserProfile() {
            try {
                $currentUser = getCurrentUser();
                
                if (!$currentUser) {
                    Response::error('User not authenticated', 401);
                }
        
                // Handle both old format (id) and new format (user_id)
                $userId = $currentUser['user_id'] ?? $currentUser['id'] ?? null;
                
                if (!$userId) {
                    Response::error('Invalid user context', 401);
                }
        
                $user = $this->userModel->findById($userId);
                
                if (!$user) {
                    Response::error('User not found', 404);
                }
        
                Response::success($user, 'Profile retrieved successfully');
            } catch (Exception $e) {
                error_log("getCurrentUserProfile error: " . $e->getMessage());
                Response::error('Error retrieving profile: ' . $e->getMessage(), 500);
            }
        }

    public function createInstitutionUser() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || $currentUser['user_type'] !== 'superadmin') {
                Response::error('Only superadmin can create users', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['name', 'email', 'password', 'user_type', 'role'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!Validator::validateEmail($input['email'] ?? '')) {
                $errors[] = 'Invalid email format';
            }

            $validUserTypes = ['admin', 'staff', 'teacher', 'accountant', 'librarian', 'driver', 'security'];
            if (!in_array($input['user_type'] ?? '', $validUserTypes)) {
                $errors[] = 'Invalid user type';
            }

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check if email exists
            if ($this->userModel->findByEmail($input['email'])) {
                Response::error('User already exists with this email', 409);
                return;
            }

            $userData = [
                'name' => trim($input['name']),
                'email' => strtolower(trim($input['email'])),
                'password' => $input['password'],
                'user_type' => $input['user_type'],
                'institution_id' => $currentUser['institution_id'],
                'phone' => $input['phone'] ?? null,
                'role' => trim($input['role']),
                'department' => $input['department'] ?? null,
                'assigned_features' => $input['assigned_features'] ?? [],
                'status' => 'active',
                'created_by' => $currentUser['id']
            ];

            $userId = $this->userModel->create($userData);

            if ($userId) {
                Response::success([
                    'user_id' => $userId,
                    'message' => 'User created successfully'
                ], 'User created successfully');
            } else {
                Response::error('Failed to create user', 500);
            }

        } catch (Exception $e) {
            error_log("Create institution user error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    
    public function assignUserFeaturesInOrg($orgId, $userId) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        if (!$userOrgId || (int)$userOrgId !== (int)$orgId) {
            Response::error('Access denied to this organization', 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['features']) || !is_array($input['features'])) {
            Response::error('Features array is required', 400);
            return;
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Verify target user exists in organization
        $targetUser = $this->userModel->findByIdInOrganization($userId, $orgId);
        if (!$targetUser) {
            Response::error('User not found in organization', 404);
            return;
        }

        // Update user features in organization table
        $result = $this->userModel->updateFeaturesInOrganization($userId, $orgId, $input['features']);

        if ($result) {
            Response::success([
                'user_id' => (int)$userId,
                'organization_id' => (int)$orgId,
                'features_assigned' => count($input['features'])
            ], 'Features assigned successfully');
        } else {
            Response::error('Failed to assign features', 500);
        }

    } catch (Exception $e) {
        error_log("Assign user features in org error: " . $e->getMessage());
        Response::error('Server error occurred', 500);
    }
}

public function bulkAssignUserFeaturesInOrg($orgId) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        if (!$userOrgId || (int)$userOrgId !== (int)$orgId) {
            Response::error('Access denied to this organization', 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['user_type']) || !isset($input['features'])) {
            Response::error('user_type and features are required', 400);
            return;
        }

        if (!is_array($input['features'])) {
            Response::error('Features must be an array', 400);
            return;
        }

        // Validate user_type
        $validUserTypes = ['student', 'teacher', 'staff', 'admin', 'accountant', 'librarian', 'driver', 'security'];
        if (!in_array($input['user_type'], $validUserTypes)) {
            Response::error('Invalid user type', 400);
            return;
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Perform bulk update
        $result = $this->userModel->bulkUpdateFeaturesByType(
            $orgId,
            $input['user_type'],
            $input['features']
        );

        if ($result !== false) {
            Response::success([
                'organization_id' => (int)$orgId,
                'user_type' => $input['user_type'],
                'users_affected' => $result,
                'features_assigned' => count($input['features'])
            ], 'Features assigned successfully to all ' . $input['user_type'] . ' users');
        } else {
            Response::error('Failed to bulk assign features', 500);
        }

    } catch (Exception $e) {
        error_log("Bulk assign user features in org error: " . $e->getMessage());
        Response::error('Server error occurred', 500);
    }
}

public function getOrganizationStatistics($orgId) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        if (!$userOrgId || (int)$userOrgId !== (int)$orgId) {
            Response::error('Access denied to this organization', 403);
            return;
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Get statistics
        $stats = $this->userModel->getOrganizationUserStatistics($orgId);

        if ($stats === null) {
            Response::error('Failed to load statistics', 500);
            return;
        }

        Response::success([
            'organization_id' => (int)$orgId,
            'statistics' => $stats
        ], 'Statistics retrieved successfully');

    } catch (Exception $e) {
        error_log("Get organization statistics error: " . $e->getMessage());
        Response::error('Server error occurred', 500);
    }
}

public function updateUserStatusInOrg($orgId, $userId) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        if (!$userOrgId || (int)$userOrgId !== (int)$orgId) {
            Response::error('Access denied to this organization', 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['status'])) {
            Response::error('Status is required', 400);
            return;
        }

        $validStatuses = ['active', 'inactive', 'pending'];
        if (!in_array($input['status'], $validStatuses)) {
            Response::error('Invalid status value. Must be: active, inactive, or pending', 400);
            return;
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Update status
        $result = $this->userModel->updateStatusInOrganization($userId, $orgId, $input['status']);

        if ($result) {
            Response::success([
                'user_id' => (int)$userId,
                'organization_id' => (int)$orgId,
                'status' => $input['status']
            ], 'User status updated successfully');
        } else {
            Response::error('Failed to update status', 500);
        }

    } catch (Exception $e) {
        error_log("Update user status in org error: " . $e->getMessage());
        Response::error('Server error occurred', 500);
    }
}

public function getUserFeaturesInOrg($orgId, $userId) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        if (!$userOrgId || (int)$userOrgId !== (int)$orgId) {
            Response::error('Access denied to this organization', 403);
            return;
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Get user from organization-specific table
        $user = $this->userModel->findByIdInOrganization($userId, $orgId);
        if (!$user) {
            Response::error('User not found in organization', 404);
            return;
        }

        // Ensure assigned_features is properly formatted
        $assignedFeatures = [];
        if (!empty($user['assigned_features'])) {
            if (is_string($user['assigned_features'])) {
                $assignedFeatures = json_decode($user['assigned_features'], true) ?? [];
            } elseif (is_array($user['assigned_features'])) {
                $assignedFeatures = $user['assigned_features'];
            }
        }

        Response::success([
            'user_id' => (int)$userId,
            'organization_id' => (int)$orgId,
            'features' => $assignedFeatures,
            'total_systems' => count($assignedFeatures)
        ], 'User features retrieved successfully');

    } catch (Exception $e) {
        error_log("Get user features in org error: " . $e->getMessage());
        Response::error('Server error occurred', 500);
    }
}


public function getOrganizationUserFeatures($orgId) {
    try {
        // Get current authenticated user
        $currentUser = getCurrentUser();
        
        if (!$currentUser) {
            Response::error('User not authenticated', 401);
            return;
        }

        // Handle both old format (id) and new format (user_id)
        $userId = $currentUser['user_id'] ?? $currentUser['id'] ?? null;
        
        if (!$userId) {
            Response::error('Invalid user context', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        
        // Allow if user belongs to this org OR is superadmin
        if (!$userOrgId && (!isset($currentUser['role']) || $currentUser['role'] !== 'superadmin')) {
            Response::error('Access denied to this organization', 403);
            return;
        }
        
        if ($userOrgId && (int)$userOrgId !== (int)$orgId) {
            // Check if superadmin
            if (!isset($currentUser['role']) || $currentUser['role'] !== 'superadmin') {
                Response::error('Access denied to this organization', 403);
                return;
            }
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Get user from organization-specific table
        $user = $this->userModel->findByIdInOrganization($userId, $orgId);

        if (!$user) {
            Response::error('User not found in organization', 404);
            return;
        }

        // Ensure assigned_features is properly formatted
        $assignedFeatures = [];
        if (!empty($user['assigned_features'])) {
            if (is_string($user['assigned_features'])) {
                $assignedFeatures = json_decode($user['assigned_features'], true) ?? [];
            } elseif (is_array($user['assigned_features'])) {
                $assignedFeatures = $user['assigned_features'];
            }
        }

        Response::success([
            'user_id' => (int)$userId,
            'organization_id' => (int)$orgId,
            'features' => $assignedFeatures,
            'total_systems' => count($assignedFeatures)
        ], 'Features retrieved successfully');

    } catch (Exception $e) {
        error_log("Error in getOrganizationUserFeatures: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        Response::error('Server error occurred: ' . $e->getMessage(), 500);
    }
}



    
    public function assignUserFeatures($userId) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin')) {
                Response::error('Insufficient privileges', 403);
                return;
            }
    
            $input = json_decode(file_get_contents('php://input'), true);
    
            if (!isset($input['features']) || !is_array($input['features'])) {
                Response::error('Features array is required', 400);
                return;
            }
    
            // Verify user exists and belongs to same institution
            $targetUser = $this->userModel->findById($userId);
            if (!$targetUser) {
                Response::error('User not found', 404);
                return;
            }
    
            if ($targetUser['institution_id'] !== $currentUser['institution_id']) {
                Response::error('Cannot assign features to users from different institutions', 403);
                return;
            }
    
            require_once 'models/UserFeatures.php';
            $userFeaturesModel = new UserFeatures();
            
            $result = $userFeaturesModel->assignFeaturesToUser($userId, $input['features'], $currentUser['id']);
    
            if ($result) {
                Response::success([
                    'user_id' => $userId,
                    'features_assigned' => count($input['features'])
                ], 'Features assigned successfully');
            } else {
                Response::error('Failed to assign features', 500);
            }
    
        } catch (Exception $e) {
            error_log("Assign user features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    
    public function getUserFeatures($userId = null) {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser) {
            Response::error('Authentication required', 401);
            return;
        }

        // Debug logging
        error_log("=== getUserFeatures DEBUG ===");
        error_log("Current user data: " . json_encode($currentUser));

        // Handle both old format (id) and new format (user_id)
        $userIdFromToken = $currentUser['user_id'] ?? $currentUser['id'] ?? null;
        $authType = $currentUser['auth_type'] ?? 'global';
        
        // If no userId provided, get current user's features
        if (!$userId) {
            $userId = $userIdFromToken;
        }

        error_log("User ID: $userId, Auth Type: $authType");

        // Check if this is an organization user trying to access global endpoint
        if ($authType === 'organization') {
            error_log("Organization user trying to access global endpoint - redirecting to org endpoint");
            
            $orgId = $currentUser['organization_id'] ?? null;
            if ($orgId) {
                // Call the organization-specific method instead
                return $this->getOrganizationUserFeatures($orgId, $userId);
            } else {
                Response::error('Organization context not found', 400);
                return;
            }
        }

        // For global users, continue with normal flow
        $user = $this->userModel->findById($userId);
        if (!$user) {
            error_log("Global user not found with ID: $userId");
            Response::error('User not found', 404);
            return;
        }

        error_log("Global user found: " . $user['name']);

        Response::success([
            'user_id' => $userId,
            'features' => $user['assigned_features'] ?? [],
            'total_systems' => count($user['assigned_features'] ?? [])
        ], 'User features retrieved successfully');

    } catch (Exception $e) {
        error_log("Get user features error: " . $e->getMessage());
        Response::error('Server error occurred', 500);
    }
}


    public function getInstitutionUsers() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !$currentUser['institution_id']) {
                Response::error('Institution access required', 403);
                return;
            }

            $users = $this->userModel->getInstitutionUsers($currentUser['institution_id'], $currentUser['id']);

            Response::success([
                'users' => $users,
                'total' => count($users),
                'institution_id' => $currentUser['institution_id']
            ], 'Institution users retrieved successfully');

        } catch (Exception $e) {
            error_log("Get institution users error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }


    public function updateUserFeatures($userId) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || $currentUser['user_type'] !== 'superadmin') {
                Response::error('Only superadmin can assign features', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['features']) || !is_array($input['features'])) {
                Response::error('Features array is required', 400);
                return;
            }

            $targetUser = $this->userModel->findById($userId);
            if (!$targetUser || $targetUser['institution_id'] !== $currentUser['institution_id']) {
                Response::error('User not found or not in same institution', 404);
                return;
            }

            $result = $this->userModel->updateFeatures($userId, $input['features']);

            if ($result) {
                Response::success([
                    'user_id' => $userId,
                    'features_assigned' => count($input['features'])
                ], 'Features assigned successfully');
            } else {
                Response::error('Failed to assign features', 500);
            }

        } catch (Exception $e) {
            error_log("Update user features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
    
    public function getOrganizationUsers($orgId) {
    try {
        // Get current authenticated user
        $currentUser = getCurrentUser();
        
        if (!$currentUser) {
            Response::error('User not authenticated', 401);
            return;
        }

        // Verify user has access to this organization
        $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
        
        // Allow if user belongs to this org OR is superadmin
        if (!$userOrgId && (!isset($currentUser['role']) || $currentUser['role'] !== 'superadmin')) {
            Response::error('Access denied to this organization', 403);
            return;
        }
        
        if ($userOrgId && (int)$userOrgId !== (int)$orgId) {
            // Check if superadmin
            if (!isset($currentUser['role']) || $currentUser['role'] !== 'superadmin') {
                Response::error('Access denied to this organization', 403);
                return;
            }
        }

        // Check if organization table exists
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('Organization user system not found', 404);
            return;
        }

        // Get all users from organization
        $users = $this->userModel->getAllUsersInOrganization($orgId);

        if ($users === false) {
            Response::error('Failed to retrieve users', 500);
            return;
        }

        Response::success([
            'users' => $users,
            'total' => count($users),
            'organization_id' => (int)$orgId
        ], 'Users retrieved successfully');

    } catch (Exception $e) {
        error_log("Error in getOrganizationUsers: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        Response::error('Server error occurred: ' . $e->getMessage(), 500);
    }
}


private function verifyOrganizationAccess($orgId) {
    $currentUser = $this->getCurrentUser();
    
    if (!$currentUser) {
        return false;
    }

    // Check if user's institution_id matches the requested orgId
    // OR if user is a superadmin (can access any org)
    if (isset($currentUser['role']) && $currentUser['role'] === 'superadmin') {
        return true;
    }

    if (isset($currentUser['institution_id']) && $currentUser['institution_id'] == $orgId) {
        return true;
    }

    return false;
}




    public function updateCurrentUserProfile() {
        try {
            // Enable error logging
            error_log("=== Profile Update Started ===");
            
            $currentUser = getCurrentUser();
            error_log("Current user: " . print_r($currentUser, true));
            
            if (!$currentUser) {
                error_log("No current user found");
                Response::error('User not authenticated', 401);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            error_log("Input data: " . print_r($input, true));

            if (!$input) {
                error_log("No input data received");
                Response::error('No data provided', 400);
                return;
            }

            // Validate input
            $errors = Validator::validateRequired(['name', 'email'], $input);
            
            if (!Validator::validateEmail($input['email'] ?? '')) {
                $errors[] = 'Invalid email format';
            }

            if (!empty($errors)) {
                error_log("Validation errors: " . print_r($errors, true));
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Attempt database update
            error_log("Attempting to update user ID: " . $currentUser['id']);
            $updateResult = $this->userModel->update($currentUser['id'], $input);
            error_log("Update result: " . ($updateResult ? 'success' : 'failed'));

            if ($updateResult) {
                // Get updated user data
                $updatedUser = $this->userModel->findById($currentUser['id']);
                error_log("Updated user from DB: " . print_r($updatedUser, true));
                
                Response::success($updatedUser, 'Profile updated successfully');
            } else {
                error_log("Database update failed");
                Response::error('Failed to update profile in database', 500);
            }

        } catch (Exception $e) {
            error_log("updateCurrentUserProfile exception: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error: ' . $e->getMessage(), 500);
        }
    }
}
?>