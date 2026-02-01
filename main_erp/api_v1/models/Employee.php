<?php
require_once 'config/database.php';

class Employee {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in Employee model: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get organization-specific user table name
     */
    public function getOrgUserTable($orgId) {
        return "user_2025_{$orgId}";
    }

    /**
     * Check if organization table exists
     */
    public function orgTableExists($orgId) {
        $tableName = $this->getOrgUserTable($orgId);
        $sql = "SHOW TABLES LIKE '{$tableName}'";
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            error_log("Check org table exists error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Find employee by email in organization (excluding students)
     */
    public function findByEmailInOrganization($email, $orgId) {
        try {
            $tableName = $this->getOrgUserTable($orgId);
            $sql = "SELECT * FROM {$tableName} WHERE email = ? AND user_type != 'student'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Find employee by email error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Find employee by ID in organization (excluding students)
     */
    public function findEmployeeByIdInOrganization($employeeId, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        try {
            $sql = "SELECT * FROM {$tableName} WHERE id = ? AND user_type != 'student'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$employeeId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && isset($result['custom_fields']) && is_string($result['custom_fields'])) {
                $result['custom_fields'] = json_decode($result['custom_fields'], true);
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("Find employee by ID error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create new employee in organization
     */
    public function createInOrganization($data, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            error_log("Organization table does not exist for org ID: $orgId");
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "INSERT INTO {$tableName} (
            name, email, password, user_type, institution_id, phone, role, 
            department, profile_image, assigned_features, custom_fields, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        try {
            $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
            
            $assignedFeatures = isset($data['assigned_features']) && !empty($data['assigned_features']) 
                ? json_encode($data['assigned_features']) 
                : json_encode([]);
            
            $customFields = isset($data['custom_fields']) && !empty($data['custom_fields']) 
                ? json_encode($data['custom_fields']) 
                : json_encode([]);
            
            $profileImage = $data['profile_image'] ?? null;
            $userType = $data['user_type'] ?? 'staff';
            
            error_log("Creating employee with data:");
            error_log("  - Name: {$data['name']}");
            error_log("  - Email: {$data['email']}");
            error_log("  - User Type: $userType");
            error_log("  - Phone: " . ($data['phone'] ?? 'null'));
            error_log("  - Department: " . ($data['department'] ?? 'null'));
            error_log("  - Profile Image: " . ($profileImage ? 'set' : 'null'));
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['name'],
                $data['email'],
                $hashedPassword,
                $userType,
                $orgId,
                $data['phone'] ?? null,
                $data['role'] ?? 'Unknown',
                $data['department'] ?? null,
                $profileImage,
                $assignedFeatures,
                $customFields,
                $data['status'] ?? 'pending',
                $data['created_by'] ?? null
            ]);
            
            if ($result) {
                $lastId = $this->db->lastInsertId();
                error_log("Employee created successfully with ID: $lastId");
                return $lastId;
            } else {
                error_log("Failed to execute insert statement");
                error_log("Error info: " . print_r($stmt->errorInfo(), true));
                return false;
            }
        } catch (Exception $e) {
            error_log("Create employee exception: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }

    /**
     * Get all employees in organization (excluding students)
     */
    public function getAllEmployeesInOrganization($orgId, $filters = []) {
        if (!$this->orgTableExists($orgId)) {
            return [];
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "SELECT id, name, email, phone, role, user_type, department, custom_fields, status, 
                       last_login, profile_image, created_at, updated_at
                FROM {$tableName} WHERE user_type != 'student'";
        
        $params = [];

        // Filter by specific user type if provided
        if (!empty($filters['user_type'])) {
            $sql .= " AND user_type = ?";
            $params[] = $filters['user_type'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['department'])) {
            $sql .= " AND department = ?";
            $params[] = $filters['department'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            $searchTerm = "%{$filters['search']}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $sql .= " ORDER BY created_at DESC";

        if (isset($filters['limit']) && $filters['limit'] > 0) {
            $sql .= " LIMIT " . (int)$filters['limit'];
            
            if (isset($filters['offset']) && $filters['offset'] > 0) {
                $sql .= " OFFSET " . (int)$filters['offset'];
            }
        }

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($employees as &$employee) {
                if (isset($employee['custom_fields']) && is_string($employee['custom_fields'])) {
                    $employee['custom_fields'] = json_decode($employee['custom_fields'], true);
                }
            }
            
            return $employees;
        } catch (Exception $e) {
            error_log("Get all employees error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Count all employees in organization (excluding students)
     */
    public function countAllEmployeesInOrganization($orgId, $filters = []) {
        if (!$this->orgTableExists($orgId)) {
            return 0;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "SELECT COUNT(*) as total FROM {$tableName} WHERE user_type != 'student'";
        
        $params = [];

        if (!empty($filters['user_type'])) {
            $sql .= " AND user_type = ?";
            $params[] = $filters['user_type'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['department'])) {
            $sql .= " AND department = ?";
            $params[] = $filters['department'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            $searchTerm = "%{$filters['search']}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return (int)$result['total'];
        } catch (Exception $e) {
            error_log("Count employees error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Update employee in organization
     */
    public function updateInOrganization($employeeId, $data, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        
        $updateFields = [];
        $params = [];

        if (isset($data['name'])) {
            $updateFields[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $updateFields[] = "email = ?";
            $params[] = $data['email'];
        }
        if (isset($data['phone'])) {
            $updateFields[] = "phone = ?";
            $params[] = $data['phone'];
        }
        if (isset($data['department'])) {
            $updateFields[] = "department = ?";
            $params[] = $data['department'];
        }
        if (isset($data['role'])) {
            $updateFields[] = "role = ?";
            $params[] = $data['role'];
        }
        if (isset($data['profile_image'])) {
            $updateFields[] = "profile_image = ?";
            $params[] = $data['profile_image'];
            error_log("Updating profile_image to: " . $data['profile_image']);
        }
        if (isset($data['custom_fields'])) {
            $customFieldsJson = is_string($data['custom_fields']) 
                ? $data['custom_fields'] 
                : json_encode($data['custom_fields']);
            $updateFields[] = "custom_fields = ?";
            $params[] = $customFieldsJson;
            error_log("Updating custom_fields");
        }

        if (empty($updateFields)) {
            error_log("No fields to update");
            return false;
        }

        $updateFields[] = "updated_at = NOW()";
        $params[] = $employeeId;

        $sql = "UPDATE {$tableName} SET " . implode(', ', $updateFields) . " WHERE id = ? AND user_type != 'student'";

        try {
            error_log("Executing update query for employee $employeeId");
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                $rowsAffected = $stmt->rowCount();
                error_log("Update executed - Rows affected: $rowsAffected");
                return true; // ✅ FIXED - Return true if execute succeeds
            }
            
            error_log("Update failed to execute");
            return false;
        } catch (Exception $e) {
            error_log("Update employee error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }


    /**
     * Update employee status
     */
    public function updateStatusInOrganization($employeeId, $status, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "UPDATE {$tableName} SET status = ?, updated_at = NOW() WHERE id = ? AND user_type != 'student'";

        try {
            error_log("Updating status for employee $employeeId to $status");
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([$status, $employeeId]);
            
            if ($result) {
                $rowsAffected = $stmt->rowCount();
                error_log("Status update executed - Rows affected: $rowsAffected");
                return true; // ✅ FIXED - Return true if execute succeeds
            }
            
            error_log("Status update failed to execute");
            return false;
        } catch (Exception $e) {
            error_log("Update employee status error: " . $e->getMessage());
            return false;
        }
    }


    /**
     * Delete employee
     */
    public function deleteInOrganization($employeeId, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "DELETE FROM {$tableName} WHERE id = ? AND user_type != 'student'";

        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$employeeId]);
        } catch (Exception $e) {
            error_log("Delete employee error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get employee statistics for organization (excluding students)
     */
    public function getEmployeeStatistics($orgId) {
        if (!$this->orgTableExists($orgId)) {
            return null;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "SELECT 
                    COUNT(*) as total_employees,
                    COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_count,
                    COUNT(CASE WHEN user_type = 'staff' THEN 1 END) as staff_count,
                    COUNT(CASE WHEN user_type = 'teacher' THEN 1 END) as teacher_count,
                    COUNT(CASE WHEN user_type = 'accountant' THEN 1 END) as accountant_count,
                    COUNT(CASE WHEN user_type = 'librarian' THEN 1 END) as librarian_count,
                    COUNT(CASE WHEN user_type = 'driver' THEN 1 END) as driver_count,
                    COUNT(CASE WHEN user_type = 'security' THEN 1 END) as security_count,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_employees,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_employees,
                    COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_month
                FROM {$tableName} WHERE user_type != 'student'";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Get employee statistics error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get available user types in organization (excluding student)
     */
    public function getAvailableUserTypes($orgId) {
        if (!$this->orgTableExists($orgId)) {
            return [];
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "SELECT DISTINCT user_type, COUNT(*) as count 
                FROM {$tableName} 
                WHERE user_type != 'student' 
                GROUP BY user_type 
                ORDER BY user_type ASC";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Get available user types error: " . $e->getMessage());
            return [];
        }
    }
}
?>