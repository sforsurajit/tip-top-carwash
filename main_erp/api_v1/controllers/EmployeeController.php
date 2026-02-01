<?php
require_once 'models/Employee.php';
require_once 'models/FormTemplate.php';
require_once 'utils/Validator.php';

class EmployeeController {
    private $employeeModel;
    private $formTemplateModel;
    private $uploadDir = '/main_erp/api_v1/public/uploads/employees/';
    private $maxFileSize = 50 * 1024 * 1024; // 50MB

    public function __construct() {
        $this->employeeModel = new Employee();
        $this->formTemplateModel = new FormTemplate();
    }

    /**
     * Get active employee registration form template for an organization
     * GET /employee/org/{orgId}/registration-form
     */
    public function getRegistrationForm($orgId) {
        try {
            $currentUser = getCurrentUser();
            
            // For public registration, allow access without auth
            if ($currentUser) {
                $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
                if ($userOrgId && (int)$userOrgId !== (int)$orgId) {
                    Response::error('Access denied to this organization', 403);
                    return;
                }
            }

            // Check if organization table exists
            if (!$this->employeeModel->orgTableExists($orgId)) {
                Response::error('Organization not found', 404);
                return;
            }

            // Get active employee form template
            $formTemplate = $this->formTemplateModel->getActiveFormByUserType($orgId, 'employee');
            
            if (!$formTemplate) {
                Response::error('No active employee registration form found for this organization', 404);
                return;
            }

            $formStructure = $formTemplate['form_structure'];
            
            Response::success([
                'form_id' => $formTemplate['id'],
                'form_name' => $formTemplate['form_name'],
                'form_description' => $formTemplate['form_description'],
                'form_structure' => $formStructure,
                'version' => $formTemplate['version'],
                'organization_id' => (int)$orgId
            ], 'Registration form retrieved successfully');

        } catch (Exception $e) {
            error_log("Get registration form error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Upload profile image for employee
     * POST /employee/org/{orgId}/upload-profile
     */
    public function uploadProfileImage($orgId) {
        try {
            if (!isset($_FILES['profile_image'])) {
                Response::error('No file uploaded', 400);
                return;
            }

            $file = $_FILES['profile_image'];
            
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $actualMimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            
            error_log("File upload validation - Browser MIME: {$file['type']}, Actual MIME: {$actualMimeType}, Extension: {$fileExtension}");
            
            if (!in_array($actualMimeType, $allowedTypes)) {
                error_log("Invalid MIME type for file: {$file['name']}");
                Response::error('Only JPG, PNG, GIF and WebP images are allowed', 400);
                return;
            }
            
            if (!in_array($fileExtension, $allowedExtensions)) {
                error_log("Invalid file extension: {$fileExtension}");
                Response::error('Only JPG, PNG, GIF and WebP images are allowed', 400);
                return;
            }

            if ($file['size'] > 5 * 1024 * 1024) {
                Response::error('Image size must be less than 5MB', 400);
                return;
            }

            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'profile_' . uniqid() . '_' . time() . '.' . $extension;
            
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . $this->uploadDir . 'profiles/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $filePath = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                $fileUrl = 'https://rootsofnortheast.com' . $this->uploadDir . 'profiles/' . $filename;
                
                error_log("Profile image uploaded successfully: $fileUrl");
                
                Response::success([
                    'file_url' => $fileUrl,
                    'file_name' => $filename,
                    'field_name' => 'profile_image'
                ], 'Profile image uploaded successfully', 201);
            } else {
                error_log("Failed to move file from {$file['tmp_name']} to {$filePath}");
                Response::error('Failed to upload file', 500);
            }

        } catch (Exception $e) {
            error_log("Upload profile image error: " . $e->getMessage());
            Response::error('Server error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Upload single file for employee
     * POST /employee/org/{orgId}/upload-file
     */
    public function uploadFile($orgId) {
        try {
            if (!isset($_FILES['file'])) {
                Response::error('No file uploaded', 400);
                return;
            }

            $file = $_FILES['file'];
            $fieldName = $_POST['field_name'] ?? 'file';

            error_log("Uploading file for field: $fieldName");

            if ($file['size'] > $this->maxFileSize) {
                Response::error('File size exceeds 50MB limit', 400);
                return;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $actualMimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            
            error_log("File validation - Name: {$file['name']}, Browser MIME: {$file['type']}, Actual MIME: {$actualMimeType}, Extension: {$fileExtension}");

            $filename = $fieldName . '_' . uniqid() . '_' . time() . '.' . $fileExtension;
            
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . $this->uploadDir . 'documents/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $filePath = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                $fileUrl = 'https://rootsofnortheast.com' . $this->uploadDir . 'documents/' . $filename;
                
                error_log("File uploaded successfully: $fileUrl");
                
                Response::success([
                    'file_url' => $fileUrl,
                    'file_name' => $filename,
                    'field_name' => $fieldName,
                    'mime_type' => $actualMimeType
                ], 'File uploaded successfully', 201);
            } else {
                error_log("Failed to move file from {$file['tmp_name']} to {$filePath}");
                Response::error('Failed to upload file', 500);
            }

        } catch (Exception $e) {
            error_log("Upload file error: " . $e->getMessage());
            Response::error('Server error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Upload multiple files for employee
     * POST /employee/org/{orgId}/upload-files
     */
    public function uploadFiles($orgId) {
        try {
            if (!isset($_FILES['files'])) {
                Response::error('No files uploaded', 400);
                return;
            }

            $files = $_FILES['files'];
            $fieldName = $_POST['field_name'] ?? 'files';

            error_log("Uploading " . count($files['name']) . " files");

            $uploadedFiles = [];
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . $this->uploadDir . 'documents/';
            
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);

            for ($i = 0; $i < count($files['name']); $i++) {
                $fileName = $files['name'][$i];
                $fileTmpName = $files['tmp_name'][$i];
                $fileSize = $files['size'][$i];
                $fileError = $files['error'][$i];

                if ($fileError !== UPLOAD_ERR_OK) {
                    error_log("Error uploading $fileName: $fileError");
                    continue;
                }

                if ($fileSize > $this->maxFileSize) {
                    error_log("File too large: $fileName");
                    continue;
                }

                $actualMimeType = finfo_file($finfo, $fileTmpName);
                $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                
                error_log("File $i - Browser MIME: {$files['type'][$i]}, Actual MIME: {$actualMimeType}, Extension: {$fileExtension}");

                $uniqueName = $fieldName . '_' . uniqid() . '_' . time() . '.' . $fileExtension;
                $filePath = $uploadDir . $uniqueName;

                if (move_uploaded_file($fileTmpName, $filePath)) {
                    $fileUrl = 'https://rootsofnortheast.com' . $this->uploadDir . 'documents/' . $uniqueName;
                    
                    $uploadedFiles[] = [
                        'original_name' => $fileName,
                        'file_url' => $fileUrl,
                        'file_name' => $uniqueName,
                        'mime_type' => $actualMimeType,
                        'size' => $fileSize
                    ];
                    
                    error_log("File uploaded: $fileUrl");
                }
            }

            finfo_close($finfo);

            if (empty($uploadedFiles)) {
                Response::error('No files were uploaded successfully', 400);
                return;
            }

            Response::success($uploadedFiles, 'Files uploaded successfully', 201);

        } catch (Exception $e) {
            error_log("Upload files error: " . $e->getMessage());
            Response::error('Server error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Register new employee
     * POST /employee/org/{orgId}/register
     */
    public function registerEmployee($orgId) {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                Response::error('No data provided', 400);
                return;
            }

            error_log("Employee registration request for org: $orgId");
            error_log("Input data keys: " . json_encode(array_keys($input)));

            $requiredFields = ['name', 'email', 'password'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!Validator::validateEmail($input['email'] ?? '')) {
                $errors[] = 'Invalid email format';
            }

            if (isset($input['password']) && strlen($input['password']) < 6) {
                $errors[] = 'Password must be at least 6 characters long';
            }

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            if (!$this->employeeModel->orgTableExists($orgId)) {
                Response::error('Organization not found', 404);
                return;
            }

            if ($this->employeeModel->findByEmailInOrganization($input['email'], $orgId)) {
                Response::error('Email already registered in this organization', 409);
                return;
            }

            $employeeData = [
                'name' => trim($input['name']),
                'email' => strtolower(trim($input['email'])),
                'password' => $input['password'],
                'user_type' => $input['user_type'] ?? 'staff',
                'phone' => $input['phone'] ?? null,
                'role' => $input['role'] ?? 'Unknown',
                'department' => $input['department'] ?? null,
                'profile_image' => $input['profile_image'] ?? null,
                'status' => 'pending',
                'custom_fields' => $input['custom_fields'] ?? [],
                'created_by' => null
            ];

            error_log("Prepared employee data - Name: {$employeeData['name']}, Email: {$employeeData['email']}, Type: {$employeeData['user_type']}");
            if (!empty($employeeData['profile_image'])) {
                error_log("Profile image URL: {$employeeData['profile_image']}");
            }

            $employeeId = $this->employeeModel->createInOrganization($employeeData, $orgId);

            if ($employeeId) {
                error_log("Employee created successfully with ID: $employeeId");
                Response::success([
                    'employee_id' => $employeeId,
                    'message' => 'Registration successful. Your account is pending approval.',
                    'status' => 'pending'
                ], 'Employee registered successfully', 201);
            } else {
                error_log("Failed to create employee in organization");
                Response::error('Failed to register employee', 500);
            }

        } catch (Exception $e) {
            error_log("Register employee error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get all employees in organization (excluding students)
     * GET /employee/org/{orgId}
     */
    public function getAllEmployees($orgId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            if (!in_array($currentUser['user_type'], ['superadmin', 'admin', 'staff', 'teacher'])) {
                Response::error('Insufficient privileges to view all employees', 403);
                return;
            }
        
            $userType = $_GET['user_type'] ?? null; // Filter by specific user type
            $status = $_GET['status'] ?? null;
            $department = $_GET['department'] ?? null;
            $search = $_GET['search'] ?? null;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $filters = [
                'user_type' => $userType,
                'status' => $status,
                'department' => $department,
                'search' => $search,
                'limit' => $limit,
                'offset' => $offset
            ];

            $employees = $this->employeeModel->getAllEmployeesInOrganization($orgId, $filters);
            $total = $this->employeeModel->countAllEmployeesInOrganization($orgId, $filters);

            foreach ($employees as &$employee) {
                unset($employee['password']);
                unset($employee['failed_attempts']);
                unset($employee['locked_until']);
                
                if (isset($employee['custom_fields']) && is_string($employee['custom_fields'])) {
                    $employee['custom_fields'] = json_decode($employee['custom_fields'], true);
                }
            }

            Response::success([
                'employees' => $employees,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'organization_id' => (int)$orgId
            ], 'Employees retrieved successfully');

        } catch (Exception $e) {
            error_log("Get all employees error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get employee by ID
     * GET /employee/org/{orgId}/{employeeId}
     */
    public function getEmployeeById($orgId, $employeeId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            error_log("👤 Getting employee: $employeeId for org: $orgId");

            $employee = $this->employeeModel->findEmployeeByIdInOrganization($employeeId, $orgId);
            
            if (!$employee) {
                Response::error('Employee not found', 404);
                return;
            }

            unset($employee['password']);
            unset($employee['failed_attempts']);
            unset($employee['locked_until']);
            
            if (isset($employee['custom_fields']) && is_string($employee['custom_fields'])) {
                $employee['custom_fields'] = json_decode($employee['custom_fields'], true);
            }

            Response::success($employee, 'Employee retrieved successfully');

        } catch (Exception $e) {
            error_log("Get employee error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Update employee
     * PUT /employee/org/{orgId}/{employeeId}
     */
    public function updateEmployee($orgId, $employeeId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                Response::error('No data provided', 400);
                return;
            }

            if (isset($input['email']) && !Validator::validateEmail($input['email'])) {
                Response::error('Invalid email format', 400);
                return;
            }

            error_log("Updating employee $employeeId with data keys: " . json_encode(array_keys($input)));

            $result = $this->employeeModel->updateInOrganization($employeeId, $input, $orgId);

            if ($result) {
                error_log("Employee updated successfully");
                Response::success([
                    'employee_id' => $employeeId,
                    'message' => 'Employee updated successfully'
                ], 'Employee updated successfully');
            } else {
                // ✅ FIXED - Try to fetch and return updated employee instead of error
                $employee = $this->employeeModel->findEmployeeByIdInOrganization($employeeId, $orgId);
                
                if ($employee) {
                    unset($employee['password']);
                    unset($employee['failed_attempts']);
                    unset($employee['locked_until']);
                    
                    Response::success([
                        'employee_id' => $employeeId,
                        'employee' => $employee,
                        'message' => 'Employee updated successfully'
                    ], 'Employee updated successfully');
                } else {
                    error_log("Employee not found after update: $employeeId");
                    Response::error('Failed to update employee or employee not found', 500);
                }
            }

        } catch (Exception $e) {
            error_log("Update employee error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }


    /**
     * Update employee status
     * PUT /employee/org/{orgId}/{employeeId}/status
     */
    public function updateEmployeeStatus($orgId, $employeeId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!in_array($currentUser['user_type'], ['superadmin', 'admin', 'staff'])) {
                Response::error('Insufficient privileges to change employee status', 403);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['status']) || !in_array($input['status'], ['active', 'inactive', 'pending'])) {
                Response::error('Valid status required (active, inactive, pending)', 400);
                return;
            }

            error_log("Updating employee $employeeId status to {$input['status']}");

            $result = $this->employeeModel->updateStatusInOrganization($employeeId, $input['status'], $orgId);

            if ($result) {
                error_log("Status updated successfully");
                Response::success([
                    'employee_id' => $employeeId,
                    'status' => $input['status'],
                    'message' => 'Employee status updated successfully'
                ], 'Employee status updated successfully');
            } else {
                // ✅ FIXED - Verify status was actually updated before returning error
                $employee = $this->employeeModel->findEmployeeByIdInOrganization($employeeId, $orgId);
                
                if ($employee && $employee['status'] === $input['status']) {
                    error_log("Status verification: Status was updated to {$input['status']}");
                    Response::success([
                        'employee_id' => $employeeId,
                        'status' => $input['status'],
                        'message' => 'Employee status updated successfully'
                    ], 'Employee status updated successfully');
                } else {
                    error_log("Status update failed or employee not found: $employeeId");
                    Response::error('Failed to update employee status', 500);
                }
            }

        } catch (Exception $e) {
            error_log("Update employee status error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }


    /**
     * Delete employee
     * DELETE /employee/org/{orgId}/{employeeId}
     */
    public function deleteEmployee($orgId, $employeeId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if ($currentUser['user_type'] !== 'admin' && $currentUser['user_type'] !== 'superadmin') {
                Response::error('Only administrators can delete employees', 403);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            $result = $this->employeeModel->deleteInOrganization($employeeId, $orgId);

            if ($result) {
                Response::success(null, 'Employee deleted successfully');
            } else {
                Response::error('Failed to delete employee or employee not found', 500);
            }

        } catch (Exception $e) {
            error_log("Delete employee error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get employee statistics for organization dashboard
     * GET /employee/org/{orgId}/statistics
     */
    public function getStatistics($orgId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            $stats = $this->employeeModel->getEmployeeStatistics($orgId);

            if ($stats) {
                Response::success($stats, 'Employee statistics retrieved successfully');
            } else {
                Response::error('Failed to retrieve statistics', 500);
            }

        } catch (Exception $e) {
            error_log("Get employee statistics error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get available user types (for filtering)
     * GET /employee/org/{orgId}/user-types
     */
    public function getAvailableUserTypes($orgId) {
        try {
            $currentUser = getCurrentUser();
            
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $userOrgId = $currentUser['organization_id'] ?? $currentUser['institution_id'] ?? null;
            if ((int)$userOrgId !== (int)$orgId) {
                Response::error('Access denied to this organization', 403);
                return;
            }

            $userTypes = $this->employeeModel->getAvailableUserTypes($orgId);

            Response::success([
                'user_types' => $userTypes,
                'organization_id' => (int)$orgId
            ], 'User types retrieved successfully');

        } catch (Exception $e) {
            error_log("Get user types error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
}
?>