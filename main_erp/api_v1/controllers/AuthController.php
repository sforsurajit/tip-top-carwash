<?php
require_once 'models/User.php';
require_once 'models/Organization.php';
require_once 'utils/Validator.php';
require_once 'utils/Response.php';
require_once 'config/jwt.php';

class AuthController {
    private $userModel;
    private $organizationModel;
    
    public function __construct() {
        $this->userModel = new User();
        $this->organizationModel = new Organization();
    }

    public function orgLogin($id) {
    try {
        $orgId = $id;
        $input = json_decode(file_get_contents('php://input'), true);
        error_log("Organization login input received for org {$orgId}: " . json_encode($input));
        
        // Validate required fields
        $errors = Validator::validateRequired(['email', 'password'], $input);
        
        if (!empty($errors)) {
            error_log("Validation errors: " . json_encode($errors));
            Response::error('Validation failed', 400, $errors);
            return;
        }

        // Validate organization ID
        if (!$orgId || !is_numeric($orgId)) {
            Response::error('Invalid organization ID', 400);
            return;
        }

        // Check if organization exists and allows login
        if (!$this->organizationModel->allowsLogin($orgId)) {
            Response::error('Organization does not allow login or is inactive', 403);
            return;
        }

        // Get organization info
        $organization = $this->organizationModel->getBasicInfo($orgId);
        if (!$organization) {
            Response::error('Organization not found', 404);
            return;
        }

        // Check if user table exists for this organization
        if (!$this->userModel->orgTableExists($orgId)) {
            Response::error('User system not available for this organization', 503);
            return;
        }
        
        // Find user in organization table
        error_log("Searching for user with email: " . $input['email'] . " in org: " . $orgId);
        $user = $this->userModel->findByEmailInOrganization($input['email'], $orgId);
        
        if (!$user) {
            error_log("User not found for email: " . $input['email'] . " in org: " . $orgId);
            Response::error('Invalid credentials', 401);
            return;
        }
        
        // Verify password
        if (!$this->userModel->verifyPassword($input['password'], $user['password'])) {
            error_log("Password verification failed for user: " . $user['id'] . " in org: " . $orgId);
            Response::error('Invalid credentials', 401);
            return;
        }
        
        // Check if user is active
        if ($user['status'] !== 'active') {
            error_log("User account not active. Status: " . $user['status']);
            Response::error('Account is not active. Please contact administrator.', 403);
            return;
        }
        
        // Update last login
        $this->userModel->updateLastLoginInOrganization($user['id'], $orgId);
        
        // Generate JWT token
        $payload = [
            'user_id' => $user['id'],
            'name' => $user['name'],   // add this line
            'email' => $user['email'],
            'user_type' => $user['user_type'],
            'institution_id' => $user['institution_id'],
            'auth_type' => 'organization',
            'organization_id' => (int)$orgId, // Cast to integer
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60)
        ];
        
        $token = JWT::encode($payload);
        
        // Parse assigned features
        $assignedFeatures = null;
        if (!empty($user['assigned_features'])) {
            $assignedFeatures = json_decode($user['assigned_features'], true);
        }

        // If user has no assigned features, inherit from organization
        if (!$assignedFeatures && !empty($organization['selected_features'])) {
            $assignedFeatures = $organization['selected_features'];
        }
        
        $responseData = [
            'token' => $token,
            'auth_type' => 'organization',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'user_type' => $user['user_type'],
                'institution_id' => $user['institution_id'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'department' => $user['department'],
                'profile_image' => $user['profile_image'],
                //'assigned_features' => $assignedFeatures,
                'status' => $user['status'],
                'last_login' => $user['last_login']
            ],
            'organization' => [
                'id' => $organization['id'],
                'name' => $organization['institution_name'],
                'type' => $organization['institution_type'],
                'logo' => $organization['logo']
            ]
        ];
        
        error_log("Organization login successful for user: " . $user['id'] . " in org: " . $organization['institution_name']);
        
        Response::success($responseData, 'Login successful');
        
    } catch (Exception $e) {
        error_log("Organization login error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        Response::error('Internal server error', 500);
    }
}


    public function orgRegister($id) {
        $orgId = $id;
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            error_log("Organization registration input received for org {$orgId}: " . json_encode($input));
            
            // Validate organization ID
            if (!$orgId || !is_numeric($orgId)) {
                Response::error('Invalid organization ID', 400);
                return;
            }

            // Check if organization allows registration
            if (!$this->organizationModel->allowsRegistration($orgId)) {
                Response::error('Organization does not allow registration', 403);
                return;
            }

            // Get organization info
            $organization = $this->organizationModel->getBasicInfo($orgId);
            if (!$organization) {
                Response::error('Organization not found', 404);
                return;
            }

            // Check if user table exists for this organization
            if (!$this->userModel->orgTableExists($orgId)) {
                Response::error('User system not available for this organization', 503);
                return;
            }
            
            // Validate required fields
            $errors = Validator::validateRequired(['name', 'email', 'password'], $input);
            
            if (!Validator::validateEmail($input['email'] ?? '')) {
                $errors[] = 'Invalid email format';
            }
            
            if (!Validator::validateMinLength($input['password'] ?? '', 6)) {
                $errors[] = 'Password must be at least 6 characters';
            }
            
            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }
            
            // Check if user already exists in organization
            if ($this->userModel->findByEmailInOrganization($input['email'], $orgId)) {
                Response::error('User already exists with this email in this organization', 409);
                return;
            }

            // Check if user exists in global system
            if ($this->userModel->findByEmail($input['email'])) {
                Response::error('User already exists with this email in global system', 409);
                return;
            }
            
            // Prepare user data
            $userData = [
                'name' => trim($input['name']),
                'email' => strtolower(trim($input['email'])),
                'password' => $input['password'],
                'user_type' => $input['user_type'] ?? 'student',
                'phone' => $input['phone'] ?? null,
                'role' => $input['role'] ?? null,
                'department' => $input['department'] ?? null,
                'status' => 'pending', // Default to pending for approval
                'assigned_features' => $organization['selected_features'] // Inherit org features
            ];
            
            // Create user in organization table
            $userId = $this->userModel->createInOrganization($userData, $orgId);
            
            if ($userId) {
                Response::success([
                    'user_id' => $userId,
                    'organization_id' => $orgId,
                    'status' => 'pending',
                    'message' => 'Registration successful. Your account is pending approval.'
                ], 'User registered successfully');
            } else {
                Response::error('Failed to register user', 500);
            }
            
        } catch (Exception $e) {
            error_log("Organization registration error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }


    public function login() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            error_log("Global login input received: " . json_encode($input));
            
            $errors = Validator::validateRequired(['email', 'password'], $input);
            
            if (!empty($errors)) {
                error_log("Validation errors: " . json_encode($errors));
                Response::error('Validation failed', 400, $errors);
                return;
            }
            
            error_log("Searching for global user with email: " . $input['email']);
            $user = $this->userModel->findByEmail($input['email']);
            
            if (!$user) {
                error_log("Global user not found for email: " . $input['email']);
                $this->userModel->recordFailedLogin($input['email']);
                Response::error('Invalid credentials', 401);
                return;
            }
            
            if ($this->userModel->isAccountLocked($input['email'])) {
                error_log("Global account is locked for email: " . $input['email']);
                Response::error('Account is temporarily locked due to multiple failed login attempts. Please try again later.', 423);
                return;
            }
            
            if (!$this->userModel->verifyPassword($input['password'], $user['password'])) {
                error_log("Password verification failed for global user: " . $user['id']);
                $this->userModel->recordFailedLogin($input['email']);
                Response::error('Invalid credentials', 401);
                return;
            }
            
            $this->userModel->resetFailedAttempts($input['email']);
            
            if ($user['status'] !== 'active') {
                error_log("Global user account not active. Status: " . $user['status']);
                Response::error('Account is not active. Please contact administrator.', 403);
                return;
            }
            
            if (!empty($user['institution_id']) && $user['institution_status'] !== 'active') {
                error_log("Institution not active. Status: " . $user['institution_status']);
                Response::error('Your institution account is not active. Please contact administrator.', 403);
                return;
            }
            
            $this->userModel->updateLastLogin($user['id']);
            
            $payload = [
                'user_id' => $user['id'],
                'email' => $user['email'],
                'user_type' => $user['user_type'],
                'institution_id' => $user['institution_id'],
                'auth_type' => 'global', // Mark as global auth
                'iat' => time(),
                'exp' => time() + (24 * 60 * 60) // 24 hours
            ];
            
            $token = JWT::encode($payload);
            
            $responseData = [
                'token' => $token,
                'auth_type' => 'global',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'user_type' => $user['user_type'],
                    'institution_id' => $user['institution_id'],
                    'phone' => $user['phone'],
                    'role' => $user['role'],
                    'department' => $user['department'],
                    'profile_image' => $user['profile_image'],
                    //'assigned_features' => $user['assigned_features'],
                    'status' => $user['status'],
                    'last_login' => $user['last_login']
                ],
                'institution_name' => $user['institution_name'] ?? null,
                'institution_logo' => $user['institution_logo'] ?? null
            ];
            
            error_log("Global login successful for user: " . $user['id'] . ", Institution: " . ($user['institution_name'] ?? 'None'));
            
            Response::success($responseData, 'Login successful');
            
        } catch (Exception $e) {
            error_log("Global login error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Internal server error', 500);
        }
    }


    public function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $errors = Validator::validateRequired(['name', 'email', 'password'], $input);
        
        if (!Validator::validateEmail($input['email'] ?? '')) {
            $errors[] = 'Invalid email format';
        }
        
        if (!Validator::validateMinLength($input['password'] ?? '', 6)) {
            $errors[] = 'Password must be at least 6 characters';
        }
        
        if (!empty($errors)) {
            Response::error('Validation failed', 400, $errors);
        }
        
        if ($this->userModel->findByEmail($input['email'])) {
            Response::error('User already exists with this email', 409);
        }
        
        if ($this->userModel->create($input)) {
            Response::success(null, 'User registered successfully', 201);
        } else {
            Response::error('Failed to register user', 500);
        }
    }
    
    public function refresh() {
        $currentUser = getCurrentUser();
        
        if (!$currentUser) {
            Response::error('User not authenticated', 401);
        }
        
        $user = $this->userModel->findById($currentUser['id']);
        
        if (!$user || $user['status'] !== 'active') {
            Response::error('User account not found or inactive', 401);
        }
        
        $payload = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'user_type' => $user['user_type'],
            'institution_id' => $user['institution_id'],
            'auth_type' => $currentUser['auth_type'] ?? 'global',
            'organization_id' => $currentUser['organization_id'] ?? null,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60) // 24 hours
        ];
        
        $token = JWT::encode($payload);
        
        $assignedFeatures = null;
        if (!empty($user['assigned_features'])) {
            $assignedFeatures = json_decode($user['assigned_features'], true);
        }
        
        Response::success([
            'token' => $token,
            'auth_type' => $currentUser['auth_type'] ?? 'global',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'user_type' => $user['user_type'],
                'institution_id' => $user['institution_id'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'department' => $user['department'],
                'profile_image' => $user['profile_image'],
                'assigned_features' => $assignedFeatures,
                'status' => $user['status'],
                'last_login' => $user['last_login']
            ]
        ], 'Token refreshed successfully');
    }
    
    public function logout() {
        Response::success(null, 'Logged out successfully');
    }
    
    public function getCurrentUser() {
        $currentUser = getCurrentUser();
        
        if (!$currentUser) {
            Response::error('User not authenticated', 401);
        }
        
        $user = $this->userModel->findById($currentUser['id']);
        
        if (!$user) {
            Response::error('User not found', 404);
        }
        
        $assignedFeatures = null;
        if (!empty($user['assigned_features'])) {
            $assignedFeatures = json_decode($user['assigned_features'], true);
        }
        
        Response::success([
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'user_type' => $user['user_type'],
                'institution_id' => $user['institution_id'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'department' => $user['department'],
                'profile_image' => $user['profile_image'],
                'assigned_features' => $assignedFeatures,
                'status' => $user['status'],
                'last_login' => $user['last_login'],
                'created_at' => $user['created_at'],
                'updated_at' => $user['updated_at']
            ]
        ], 'User data retrieved successfully');
    }
    
    
}
?>