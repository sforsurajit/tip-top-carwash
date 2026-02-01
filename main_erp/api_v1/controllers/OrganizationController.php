<?php
require_once 'models/Organization.php';
require_once 'utils/Validator.php';
require_once 'utils/Response.php';

class OrganizationController {
    private $organizationModel; // Fixed property name

    // Constructor moved to top and fixed property name
    public function __construct() {
        $this->organizationModel = new Organization(); // Fixed property name
    }

    // Define valid hierarchical features for validation - UPDATED WITH ALL NEW SYSTEMS
    private $validFeatureSystems = [
        'student_management', 'bus_management', 'library_management', 
        'staff_management', 'fee_management', 'exam_management', 
        'hostel_management', 'inventory_management', 'communication_system',
        'event_management', 'alumni_management', 'sports_management',
        'academic_management', 'admission_management', 'placement_management',
        'health_management', 'security_management', 'research_management',
        'compliance_management', 'analytics_dashboard', 'system_administration'
    ];

    public function getPublicOrganizations() {
        try {
            $organizations = $this->organizationModel->getPublicListings();
    
            if ($organizations !== false) {
                Response::success([
                    'organizations' => $organizations,
                    'total' => count($organizations)
                ], 'Public organizations retrieved successfully');
            } else {
                Response::error('Failed to retrieve organizations', 500);
            }
        } catch (Exception $e) {
            error_log("Get public organizations error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function create() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = [
                'institution_name', 'institution_type', 'principal_name', 
                'contact_email', 'contact_phone', 'login_password', 'address', 'city', 'state', 'pincode'
            ];

            $errors = Validator::validateRequired($requiredFields, $input);

            if (!Validator::validateEmail($input['contact_email'] ?? '')) {
                $errors[] = 'Invalid email format';
            }

            if (!empty($input['website']) && !filter_var($input['website'], FILTER_VALIDATE_URL)) {
                $errors[] = 'Invalid website URL format';
            }

            if (!empty($input['established_year'])) {
                $year = (int)$input['established_year'];
                if ($year < 1800 || $year > date('Y')) {
                    $errors[] = 'Invalid established year';
                }
            }

            $validTypes = ['college', 'school', 'university', 'institute'];
            if (!in_array($input['institution_type'] ?? '', $validTypes)) {
                $errors[] = 'Invalid institution type. Must be: ' . implode(', ', $validTypes);
            }

            if (!preg_match('/^[\d\s\-\+\(\)]{10,}$/', $input['contact_phone'] ?? '')) {
                $errors[] = 'Invalid phone number format';
            }

            if (!preg_match('/^\d{6}$/', $input['pincode'] ?? '')) {
                $errors[] = 'PIN code must be 6 digits';
            }

            if (strlen($input['login_password'] ?? '') < 6) {
                $errors[] = 'Password must be at least 6 characters long';
            }

            if (!empty($input['selected_features'])) {
                $featureErrors = $this->validateHierarchicalFeatures($input['selected_features']);
                $errors = array_merge($errors, $featureErrors);
            }

            if (empty($input['selected_features']['system_administration'])) {
                $input['selected_features']['system_administration'] = $this->getSystemAdministrationDefaults();
            }

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $existingCollege = $this->organizationModel->findByEmail($input['contact_email']);
            if ($existingCollege) {
                Response::error('An institution with this email already exists', 409);
                return;
            }

            require_once 'models/User.php';
            $userModel = new User();
            $existingUser = $userModel->findByEmail($input['contact_email']);
            if ($existingUser) {
                Response::error('A user account with this email already exists', 409);
                return;
            }

            $collegeData = [
                'institution_name' => trim($input['institution_name']),
                'institution_type' => $input['institution_type'],
                'principal_name' => trim($input['principal_name']),
                'contact_email' => strtolower(trim($input['contact_email'])),
                'contact_phone' => trim($input['contact_phone']),
                'established_year' => !empty($input['established_year']) ? (int)$input['established_year'] : null,
                'address' => trim($input['address']),
                'city' => trim($input['city']),
                'state' => trim($input['state']),
                'pincode' => trim($input['pincode']),
                'website' => !empty($input['website']) ? trim($input['website']) : null,
                'selected_features' => $input['selected_features'] ?? [],
                'login_password' => $input['login_password']
            ];

            $collegeId = $this->organizationModel->create($collegeData);

            if ($collegeId) {
                $userCreation = $userModel->createSuperadminFromInstitution(
                    $collegeData, 
                    $collegeId, 
                    $input['selected_features'] ?? []
                );
                
                if ($userCreation) {
                    $featureCount = $this->countSelectedFeatures($input['selected_features'] ?? []);
                    
                    Response::success([
                        'institution_id' => $collegeId,
                        'superadmin_user_id' => $userCreation,
                        'message' => ucfirst($input['institution_type']) . ' account created successfully',
                        'status' => 'active',
                        'selected_systems' => count($input['selected_features'] ?? []),
                        'selected_modules' => $featureCount['total_modules'],
                        'login_credentials' => [
                            'email' => $collegeData['contact_email'],
                            'password' => 'As provided during registration',
                            'user_type' => 'superadmin'
                        ],
                        'next_steps' => [
                            'Login using your email and password',
                            'Access your institution dashboard with all assigned features',
                            'Configure system settings in System Administration',
                            'Create additional user accounts for your staff',
                            'Assign specific features to different users as needed'
                        ]
                    ], ucfirst($input['institution_type']) . ' registered successfully');
                } else {
                    $this->organizationModel->delete($collegeId);
                    Response::error('Failed to create superadmin account for institution', 500);
                }
            } else {
                Response::error('Failed to create institution account', 500);
            }

        } catch (Exception $e) {
            error_log("Institution creation error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    // NEW METHOD: Get organization info for authentication
    public function getOrganizationForAuth($id) {
        try {
            if (!$id || !is_numeric($id)) {
                Response::error('Invalid organization ID', 400);
                return;
            }

            $organization = $this->organizationModel->getBasicInfo($id);

            if ($organization) {
                Response::success([
                    'organization' => [
                        'id' => $organization['id'],
                        'institution_name' => $organization['institution_name'],
                        'institution_type' => $organization['institution_type'],
                        'logo' => $organization['logo'],
                        'login_enabled' => $organization['login'] == 1,
                        'registration_enabled' => $organization['registration'] == 1,
                        'selected_features' => $organization['selected_features']
                    ]
                ], 'Organization info retrieved successfully');
            } else {
                Response::error('Organization not found or inactive', 404);
            }

        } catch (Exception $e) {
            error_log("Get organization for auth error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    private function getSystemAdministrationDefaults() {
        return [
            'system_name' => 'System Administration & Settings',
            'system_description' => 'Complete system configuration and management',
            'system_icon' => 'settings',
            'selected_modules' => [
                [
                    'key' => 'user_management',
                    'name' => 'User Management',
                    'description' => 'Create and manage user accounts'
                ],
                [
                    'key' => 'role_management',
                    'name' => 'Role Management',
                    'description' => 'Define user roles and permissions'
                ],
                [
                    'key' => 'session_management',
                    'name' => 'Session Management',
                    'description' => 'User session and security settings'
                ],
                [
                    'key' => 'system_settings',
                    'name' => 'System Settings',
                    'description' => 'Global system configuration'
                ],
                [
                    'key' => 'backup_management',
                    'name' => 'Backup Management',
                    'description' => 'System backup and restore'
                ],
                [
                    'key' => 'audit_logs',
                    'name' => 'Audit Logs',
                    'description' => 'System activity monitoring'
                ],
                [
                    'key' => 'notification_settings',
                    'name' => 'Notification Settings',
                    'description' => 'System notification configuration'
                ],
                [
                    'key' => 'integration_management',
                    'name' => 'Integration Management',
                    'description' => 'Third-party service integrations'
                ],
                [
                    'key' => 'license_management',
                    'name' => 'License Management',
                    'description' => 'Software licensing and limits'
                ]
            ]
        ];
    }

    private function validateHierarchicalFeatures($features) {
        $errors = [];
        
        if (!is_array($features)) {
            $errors[] = 'Selected features must be an object';
            return $errors;
        }

        foreach ($features as $systemKey => $systemData) {
            if (!in_array($systemKey, $this->validFeatureSystems)) {
                $errors[] = "Invalid feature system: {$systemKey}";
                continue;
            }

            if (!is_array($systemData)) {
                $errors[] = "Feature system '{$systemKey}' must be an object";
                continue;
            }

            $requiredSystemFields = ['system_name', 'system_description', 'selected_modules'];
            foreach ($requiredSystemFields as $field) {
                if (!isset($systemData[$field])) {
                    $errors[] = "Missing '{$field}' in feature system '{$systemKey}'";
                }
            }

            if (isset($systemData['selected_modules'])) {
                if (!is_array($systemData['selected_modules'])) {
                    $errors[] = "Selected modules for '{$systemKey}' must be an array";
                } elseif (empty($systemData['selected_modules'])) {
                    $errors[] = "At least one module must be selected for '{$systemKey}'";
                } else {
                    foreach ($systemData['selected_modules'] as $module) {
                        if (!is_array($module)) {
                            $errors[] = "Module in '{$systemKey}' must be an object";
                            continue;
                        }
                        
                        $requiredModuleFields = ['key', 'name', 'description'];
                        foreach ($requiredModuleFields as $field) {
                            if (!isset($module[$field]) || empty($module[$field])) {
                                $errors[] = "Missing or empty '{$field}' in module for '{$systemKey}'";
                            }
                        }
                    }
                }
            }
        }

        return $errors;
    }

    private function countSelectedFeatures($features) {
        $totalSystems = count($features);
        $totalModules = 0;
        
        foreach ($features as $systemData) {
            if (isset($systemData['selected_modules']) && is_array($systemData['selected_modules'])) {
                $totalModules += count($systemData['selected_modules']);
            }
        }
        
        return [
            'total_systems' => $totalSystems,
            'total_modules' => $totalModules
        ];
    }

    public function getAll() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $filters = [];
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['institution_type'])) {
                $filters['institution_type'] = $_GET['institution_type'];
            }
            if (isset($_GET['city'])) {
                $filters['city'] = $_GET['city'];
            }

            $colleges = $this->organizationModel->getAll($filters);

            if ($colleges !== false) {
                foreach ($colleges as &$college) {
                    if ($college['selected_features']) {
                        $featureCount = $this->countSelectedFeatures($college['selected_features']);
                        $college['feature_summary'] = $featureCount;
                    }
                }

                Response::success([
                    'institutions' => $colleges,
                    'total' => count($colleges),
                    'filters_applied' => $filters
                ], 'Institutions retrieved successfully');
            } else {
                Response::error('Failed to retrieve institutions', 500);
            }

        } catch (Exception $e) {
            error_log("Get institutions error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function getById($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid institution ID', 400);
                return;
            }

            $college = $this->organizationModel->findById($id);

            if ($college) {
                if ($college['selected_features']) {
                    $featureCount = $this->countSelectedFeatures($college['selected_features']);
                    $college['feature_summary'] = $featureCount;
                }

                Response::success($college, 'Institution retrieved successfully');
            } else {
                Response::error('Institution not found', 404);
            }

        } catch (Exception $e) {
            error_log("Get institution by ID error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function getFeatureAnalytics() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $analytics = $this->organizationModel->getFeatureUsageAnalytics(); // Fixed property name

            if ($analytics !== false) {
                Response::success($analytics, 'Feature analytics retrieved successfully');
            } else {
                Response::error('Failed to retrieve feature analytics', 500);
            }

        } catch (Exception $e) {
            error_log("Feature analytics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function update($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid institution ID', 400);
                return;
            }

            $existingCollege = $this->organizationModel->findById($id); // Fixed property name
            if (!$existingCollege) {
                Response::error('Institution not found', 404);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = [
                'institution_name', 'institution_type', 'principal_name', 
                'contact_email', 'contact_phone', 'address', 'city', 'state', 'pincode'
            ];

            $errors = Validator::validateRequired($requiredFields, $input);

            if (!Validator::validateEmail($input['contact_email'] ?? '')) {
                $errors[] = 'Invalid email format';
            }

            if (!empty($input['website']) && !filter_var($input['website'], FILTER_VALIDATE_URL)) {
                $errors[] = 'Invalid website URL format';
            }

            // Validate hierarchical features if provided
            if (!empty($input['selected_features'])) {
                $featureErrors = $this->validateHierarchicalFeatures($input['selected_features']);
                $errors = array_merge($errors, $featureErrors);
            }

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $existingByEmail = $this->organizationModel->findByEmail($input['contact_email']); // Fixed property name
            if ($existingByEmail && $existingByEmail['id'] != $id) {
                Response::error('An institution with this email already exists', 409);
                return;
            }

            $updateData = [
                'institution_name' => trim($input['institution_name']),
                'institution_type' => $input['institution_type'],
                'principal_name' => trim($input['principal_name']),
                'contact_email' => strtolower(trim($input['contact_email'])),
                'contact_phone' => trim($input['contact_phone']),
                'established_year' => !empty($input['established_year']) ? (int)$input['established_year'] : null,
                'address' => trim($input['address']),
                'city' => trim($input['city']),
                'state' => trim($input['state']),
                'pincode' => trim($input['pincode']),
                'website' => !empty($input['website']) ? trim($input['website']) : null,
                'selected_features' => $input['selected_features'] ?? []
            ];

            $result = $this->organizationModel->update($id, $updateData); // Fixed property name

            if ($result) {
                $updatedCollege = $this->organizationModel->findById($id); // Fixed property name
                Response::success($updatedCollege, 'Institution updated successfully');
            } else {
                Response::error('Failed to update institution', 500);
            }

        } catch (Exception $e) {
            error_log("Institution update error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function updateStatus($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid institution ID', 400);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['status'])) {
                Response::error('Status is required', 400);
                return;
            }

            $validStatuses = ['pending', 'active', 'inactive', 'rejected'];
            if (!in_array($input['status'], $validStatuses)) {
                Response::error('Invalid status. Must be one of: ' . implode(', ', $validStatuses), 400);
                return;
            }

            $result = $this->organizationModel->updateStatus($id, $input['status']); // Fixed property name

            if ($result) {
                Response::success([
                    'institution_id' => $id,
                    'new_status' => $input['status']
                ], 'Institution status updated successfully');
            } else {
                Response::error('Failed to update institution status', 500);
            }

        } catch (Exception $e) {
            error_log("Institution status update error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function delete($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid institution ID', 400);
                return;
            }

            $existingCollege = $this->organizationModel->findById($id); // Fixed property name
            if (!$existingCollege) {
                Response::error('Institution not found', 404);
                return;
            }

            $result = $this->organizationModel->delete($id);

            if ($result) {
                Response::success([
                    'institution_id' => $id,
                    'deleted' => true
                ], 'Institution deleted successfully');
            } else {
                Response::error('Failed to delete institution', 500);
            }

        } catch (Exception $e) {
            error_log("Institution delete error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function getStatistics() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $stats = $this->organizationModel->getStatistics(); // Fixed property name
            $featureAnalytics = $this->organizationModel->getFeatureUsageAnalytics(); // Fixed property name

            if ($stats !== false) {
                Response::success([
                    'statistics' => $stats,
                    'feature_analytics' => $featureAnalytics
                ], 'Statistics retrieved successfully');
            } else {
                Response::error('Failed to retrieve statistics', 500);
            }

        } catch (Exception $e) {
            error_log("Statistics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get available feature systems with their modules (for admin use)
     */
    public function getAvailableFeatures() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // You can extend this to return the full feature definitions
            // This would be useful for admin interfaces
            Response::success([
                'valid_systems' => $this->validFeatureSystems,
                'total_systems' => count($this->validFeatureSystems)
            ], 'Available features retrieved successfully');

        } catch (Exception $e) {
            error_log("Get available features error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
}
?>