<?php
require_once 'config/database.php';

class User {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in User model: " . $e->getMessage());
            throw $e;
        }
    }

    
    public function getOrgUserTable($orgId) {
        return "users";
            }
        
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
    
    public function getUserByIdInOrganization($userId, $orgId) {
    try {
        $tableName = "users";
        
        $stmt = $this->db->prepare("
            SELECT * FROM {$tableName}
            WHERE id = ?
            LIMIT 1
        ");
        
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        error_log("Error getting user by ID in organization: " . $e->getMessage());
        return null;
    }
}

public function getAllUsersInOrganization($orgId) {
    try {
        if (!$this->orgTableExists($orgId)) {
            error_log("Organization table does not exist for orgId: {$orgId}");
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        
        $sql = "SELECT 
                    id, 
                    name, 
                    email, 
                    user_type, 
                    phone, 
                    role, 
                    department, 
                    assigned_features, 
                    status, 
                    assign_class,
                    assign_fee,
                    last_login, 
                    profile_image,
                    created_at, 
                    updated_at
                FROM {$tableName}
                ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parse assigned_features for each user - ALWAYS return OBJECT not array
        foreach ($users as &$user) {
            if (!empty($user['assigned_features'])) {
                if (is_string($user['assigned_features'])) {
                    $decoded = json_decode($user['assigned_features'], true);
                    
                    // CRITICAL: Ensure it's always an object (associative array)
                    if (is_array($decoded)) {
                        // Check if it's an empty array or indexed array
                        if (empty($decoded) || array_keys($decoded) === range(0, count($decoded) - 1)) {
                            // It's empty or indexed array - convert to empty object
                            $user['assigned_features'] = new stdClass();
                        } else {
                            // It's already associative array (object)
                            $user['assigned_features'] = $decoded;
                        }
                    } else {
                        $user['assigned_features'] = new stdClass();
                    }
                } else {
                    $user['assigned_features'] = new stdClass();
                }
            } else {
                // Empty - return empty object
                $user['assigned_features'] = new stdClass();
            }
        }
        
        return $users;
        
    } catch (PDOException $e) {
        error_log("Error in getAllUsersInOrganization: " . $e->getMessage());
        error_log("SQL Error: " . $e->getCode());
        error_log("Stack trace: " . $e->getTraceAsString());
        return false;
    } catch (Exception $e) {
        error_log("General error in getAllUsersInOrganization: " . $e->getMessage());
        return false;
    }
}


public function updateFeaturesInOrganization($userId, $orgId, $features) {
    try {
        if (!$this->orgTableExists($orgId)) {
            error_log("Organization table does not exist for orgId: {$orgId}");
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        
        $sql = "UPDATE {$tableName} 
                SET assigned_features = ?, 
                    updated_at = NOW() 
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            json_encode($features, JSON_UNESCAPED_UNICODE),
            $userId
        ]);
        
        return $result;
        
    } catch (PDOException $e) {
        error_log("Error in updateFeaturesInOrganization: " . $e->getMessage());
        return false;
    }
}

public function bulkUpdateFeaturesByType($orgId, $userType, $features) {
    try {
        if (!$this->orgTableExists($orgId)) {
            error_log("Organization table does not exist for orgId: {$orgId}");
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        
        $sql = "UPDATE {$tableName} 
                SET assigned_features = ?, 
                    updated_at = NOW() 
                WHERE user_type = ?";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            json_encode($features, JSON_UNESCAPED_UNICODE),
            $userType
        ]);
        
        if ($result) {
            return $stmt->rowCount();
        }
        
        return false;
        
    } catch (PDOException $e) {
        error_log("Error in bulkUpdateFeaturesByType: " . $e->getMessage());
        return false;
    }
}

public function updateStatusInOrganization($userId, $orgId, $status) {
    try {
        if (!$this->orgTableExists($orgId)) {
            error_log("Organization table does not exist for orgId: {$orgId}");
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        
        $sql = "UPDATE {$tableName} 
                SET status = ?, 
                    updated_at = NOW() 
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$status, $userId]);
        
    } catch (PDOException $e) {
        error_log("Error in updateStatusInOrganization: " . $e->getMessage());
        return false;
    }
}

public function getOrganizationUserStatistics($orgId) {
    try {
        if (!$this->orgTableExists($orgId)) {
            return null;
        }

        $tableName = $this->getOrgUserTable($orgId);
        
        $sql = "SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN user_type = 'student' THEN 1 END) as students,
                    COUNT(CASE WHEN user_type = 'teacher' THEN 1 END) as teachers,
                    COUNT(CASE WHEN user_type = 'staff' THEN 1 END) as staff,
                    COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin,
                    COUNT(CASE WHEN user_type = 'accountant' THEN 1 END) as accountant,
                    COUNT(CASE WHEN user_type = 'librarian' THEN 1 END) as librarian,
                    COUNT(CASE WHEN user_type = 'driver' THEN 1 END) as driver,
                    COUNT(CASE WHEN user_type = 'security' THEN 1 END) as security,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
                    COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_logins,
                    COUNT(CASE WHEN assigned_features IS NOT NULL AND assigned_features != '[]' AND assigned_features != '{}' THEN 1 END) as users_with_features
                FROM {$tableName}";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        error_log("Error in getOrganizationUserStatistics: " . $e->getMessage());
        return null;
    }
}


    
    public function findByEmailInOrganization($email, $orgId) {
        try {
            $tableName = $this->getOrgUserTable($orgId);
            $sql = "SELECT * FROM {$tableName} WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("CRITICAL ERROR in findByEmailInOrganization: " . $e->getMessage());
            return false;
        }
    }
    
    public function checkOrganizationTableExists($orgId) {
    try {
        $tableName = "users";
        
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
            AND table_name = ?
        ");
        
        $stmt->execute([$tableName]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result && $result['count'] > 0;
        
    } catch (PDOException $e) {
        error_log("Error checking organization table: " . $e->getMessage());
        return false;
    }
}


    public function findByIdInOrganization($userId, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }
    
        $tableName = $this->getOrgUserTable($orgId);
        try {
            $sql = "SELECT * FROM {$tableName} WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user && $user['assigned_features']) {
                $user['assigned_features'] = json_decode($user['assigned_features'], true);
            }
            
            return $user;
        } catch (Exception $e) {
            error_log("Find user by ID in organization error: " . $e->getMessage());
            return false;
        }
    }

    public function createInOrganization($data, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "INSERT INTO {$tableName} (
            name, email, password, user_type, phone, role, department, 
            assigned_features, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        try {
            $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['name'],
                $data['email'],
                $hashedPassword,
                $data['user_type'] ?? 'student',
                $data['phone'] ?? null,
                $data['role'] ?? null,
                $data['department'] ?? null,
                isset($data['assigned_features']) ? json_encode($data['assigned_features']) : null,
                $data['status'] ?? 'pending',
                $data['created_by'] ?? null
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (Exception $e) {
            error_log("Create user in organization error: " . $e->getMessage());
            return false;
        }
    }

    public function updateLastLoginInOrganization($userId, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        $sql = "UPDATE {$tableName} SET last_login = NOW() WHERE id = ?";
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$userId]);
        } catch (Exception $e) {
            error_log("Update last login in organization error: " . $e->getMessage());
            return false;
        }
    }

    public function recordFailedLoginInOrganization($email, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        try {
            $sql = "UPDATE {$tableName} SET 
                        failed_attempts = COALESCE(failed_attempts, 0) + 1,
                        locked_until = CASE 
                            WHEN COALESCE(failed_attempts, 0) + 1 >= 5 
                            THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
                            ELSE locked_until 
                        END
                    WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$email]);
        } catch (Exception $e) {
            error_log("Record failed login in organization error: " . $e->getMessage());
            return false;
        }
    }

    public function isAccountLockedInOrganization($email, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        try {
            $sql = "SELECT failed_attempts, locked_until FROM {$tableName} WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            $result = $stmt->fetch();
            
            if ($result && $result['locked_until'] && $result['locked_until'] > date('Y-m-d H:i:s')) {
                return true;
            }
            
            return false;
        } catch (Exception $e) {
            error_log("Account lock check in organization error: " . $e->getMessage());
            return false;
        }
    }

    public function resetFailedAttemptsInOrganization($email, $orgId) {
        if (!$this->orgTableExists($orgId)) {
            return false;
        }

        $tableName = $this->getOrgUserTable($orgId);
        try {
            $sql = "UPDATE {$tableName} SET failed_attempts = 0, locked_until = NULL WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$email]);
        } catch (Exception $e) {
            error_log("Reset failed attempts in organization error: " . $e->getMessage());
            return false;
        }
    }

    // EXISTING METHODS (keeping all your current functionality)

    public function create($data) {
        try {
            $sql = "INSERT INTO usersnew (name, email, password, user_type, institution_id, phone, role, department, assigned_features, status, created_by, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['name'],
                $data['email'],
                password_hash($data['password'], PASSWORD_BCRYPT),
                $data['user_type'] ?? 'admin',
                $data['institution_id'] ?? null,
                $data['phone'] ?? null,
                $data['role'] ?? 'User',
                $data['department'] ?? null,
                isset($data['assigned_features']) ? json_encode($data['assigned_features']) : null,
                $data['status'] ?? 'active',
                $data['created_by'] ?? null
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (Exception $e) {
            error_log("User create error: " . $e->getMessage());
            return false;
        }
    }
    
    public function isAccountLocked($email) {
        try {
            $sql = "SELECT failed_attempts, locked_until FROM usersnew WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            $result = $stmt->fetch();
            
            if ($result && $result['locked_until'] && $result['locked_until'] > date('Y-m-d H:i:s')) {
                return true;
            }
            
            return false;
        } catch (Exception $e) {
            error_log("Account lock check error: " . $e->getMessage());
            return false;
        }
    }
    
    public function recordFailedLogin($email) {
        try {
            $sql = "UPDATE usersnew SET 
                        failed_attempts = COALESCE(failed_attempts, 0) + 1,
                        locked_until = CASE 
                            WHEN COALESCE(failed_attempts, 0) + 1 >= 5 
                            THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
                            ELSE locked_until 
                        END
                    WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$email]);
        } catch (Exception $e) {
            error_log("Record failed login error: " . $e->getMessage());
            return false;
        }
    }
    
     public function resetFailedAttempts($email) {
        try {
            $sql = "UPDATE usersnew SET failed_attempts = 0, locked_until = NULL WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$email]);
        } catch (Exception $e) {
            error_log("Reset failed attempts error: " . $e->getMessage());
            return false;
        }
    }
    
    public function getUserProfile($id) {
        try {
            $sql = "SELECT u.*, 
                           c.institution_name, 
                           c.institution_type, 
                           c.selected_features as institution_features, 
                           c.status as institution_status,
                           c.address, 
                           c.city, 
                           c.state, 
                           c.pincode, 
                           c.website,
                           c.contact_email as institution_email,
                           c.contact_phone as institution_phone
                    FROM usersnew u 
                    LEFT JOIN organizations c ON u.institution_id = c.id 
                    WHERE u.id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            
            if ($user) {
                if ($user['assigned_features']) {
                    $user['assigned_features'] = json_decode($user['assigned_features'], true);
                }
                if ($user['institution_features']) {
                    $user['institution_features'] = json_decode($user['institution_features'], true);
                }
                
                $user['institution'] = [
                    'id' => $user['institution_id'],
                    'name' => $user['institution_name'],
                    'type' => $user['institution_type'],
                    'status' => $user['institution_status'],
                    'address' => $user['address'],
                    'city' => $user['city'],
                    'state' => $user['state'],
                    'pincode' => $user['pincode'],
                    'website' => $user['website'],
                    'email' => $user['institution_email'],
                    'phone' => $user['institution_phone'],
                    'features' => $user['institution_features']
                ];
            }
            
            return $user;
        } catch (Exception $e) {
            error_log("Get user profile error: " . $e->getMessage());
            return false;
        }
    }
    
     public function updateProfileImage($id, $imagePath) {
        try {
            $sql = "UPDATE usersnew SET profile_image = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$imagePath, $id]);
        } catch (Exception $e) {
            error_log("Update profile image error: " . $e->getMessage());
            return false;
        }
    }
    
    public function hasFeatureAccess($userId, $feature, $module = null) {
        try {
            $user = $this->findById($userId);
            if (!$user || !$user['assigned_features']) {
                return false;
            }
            
            $features = $user['assigned_features'];
            
            if (!isset($features[$feature])) {
                return false;
            }
            
            if ($module === null) {
                return true;
            }
            
            if (isset($features[$feature]['selected_modules'])) {
                foreach ($features[$feature]['selected_modules'] as $selectedModule) {
                    if ($selectedModule['key'] === $module) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (Exception $e) {
            error_log("Feature access check error: " . $e->getMessage());
            return false;
        }
    }

    public function getUsersByType($institutionId, $userType, $activeOnly = true) {
        try {
            $sql = "SELECT u.id, u.name, u.email, u.phone, u.role, u.department, u.status, u.last_login
                    FROM usersnew u 
                    WHERE u.institution_id = ? AND u.user_type = ?";
            
            $params = [$institutionId, $userType];
            
            if ($activeOnly) {
                $sql .= " AND u.status = 'active'";
            }
            
            $sql .= " ORDER BY u.name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (Exception $e) {
            error_log("Get users by type error: " . $e->getMessage());
            return [];
        }
    }

    public function createSuperadminFromInstitution($institutionData, $institutionId, $selectedFeatures) {
        try {
            $sql = "INSERT INTO usersnew (name, email, password, user_type, institution_id, phone, role, assigned_features, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $this->db->prepare($sql);
            
            $result = $stmt->execute([
                $institutionData['principal_name'],
                $institutionData['contact_email'],
                password_hash($institutionData['login_password'], PASSWORD_BCRYPT),
                'superadmin',
                $institutionId,
                $institutionData['contact_phone'],
                'Principal/Administrator',
                json_encode($selectedFeatures),
                'active'
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (Exception $e) {
            error_log("User createSuperadminFromInstitution error: " . $e->getMessage());
            return false;
        }
    }

    public function findByEmail($email) {
        try {
            $sql = "SELECT u.*, 
                           c.institution_name, 
                           c.institution_type, 
                           c.selected_features as institution_features, 
                           c.status as institution_status,
                           c.logo as institution_logo
                    FROM usersnew u 
                    LEFT JOIN organizations c ON u.institution_id = c.id 
                    WHERE u.email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if ($user) {
                if ($user['assigned_features']) {
                    $user['assigned_features'] = json_decode($user['assigned_features'], true);
                }
                if ($user['institution_features']) {
                    $user['institution_features'] = json_decode($user['institution_features'], true);
                }
            }
            
            return $user;
        } catch (Exception $e) {
            error_log("User findByEmail error: " . $e->getMessage());
            return false;
        }
    }

    public function findById($id) {
        try {
            $sql = "SELECT u.*, c.institution_name, c.institution_type, c.selected_features as institution_features, c.status as institution_status,
                           c.address, c.city, c.state, c.pincode, c.website
                    FROM usersnew u 
                    LEFT JOIN organizations c ON u.institution_id = c.id 
                    WHERE u.id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            
            if ($user) {
                if ($user['assigned_features']) {
                    $user['assigned_features'] = json_decode($user['assigned_features'], true);
                }
                if ($user['institution_features']) {
                    $user['institution_features'] = json_decode($user['institution_features'], true);
                }
            }
            
            return $user;
        } catch (Exception $e) {
            error_log("User findById error: " . $e->getMessage());
            return false;
        }
    }

    public function getInstitutionUsers($institutionId, $excludeUserId = null) {
        try {
            $sql = "SELECT u.id, u.name, u.email, u.user_type, u.role, u.department, u.status, u.created_at, u.last_login, u.assigned_features
                    FROM usersnew u 
                    WHERE u.institution_id = ?";
            $params = [$institutionId];
            
            if ($excludeUserId) {
                $sql .= " AND u.id != ?";
                $params[] = $excludeUserId;
            }
            
            $sql .= " ORDER BY u.created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $users = $stmt->fetchAll();
            
            foreach ($users as &$user) {
                if ($user['assigned_features']) {
                    $user['assigned_features'] = json_decode($user['assigned_features'], true);
                }
            }
            
            return $users;
        } catch (Exception $e) {
            error_log("Get institution users error: " . $e->getMessage());
            return [];
        }
    }

    public function update($id, $data) {
        try {
            $existingUser = $this->findById($id);
            if (!$existingUser) {
                return false;
            }
            
            $sql = "UPDATE usersnew SET name = ?, email = ?, phone = ?, role = ?, department = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['name'],
                $data['email'],
                $data['phone'] ?? $existingUser['phone'],
                $data['role'] ?? $existingUser['role'],
                $data['department'] ?? $existingUser['department'],
                $id
            ]);
            
            return $result && $stmt->rowCount() > 0;
            
        } catch (Exception $e) {
            error_log("User update error: " . $e->getMessage());
            return false;
        }
    }

    public function updateFeatures($id, $features) {
        try {
            $sql = "UPDATE usersnew SET assigned_features = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([json_encode($features), $id]);
        } catch (Exception $e) {
            error_log("Update user features error: " . $e->getMessage());
            return false;
        }
    }

    public function updateLastLogin($id) {
        try {
            $sql = "UPDATE usersnew SET last_login = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            error_log("Update last login error: " . $e->getMessage());
            return false;
        }
    }

    public function updatePassword($id, $newPassword) {
        try {
            $sql = "UPDATE usersnew SET password = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([password_hash($newPassword, PASSWORD_BCRYPT), $id]);
        } catch (Exception $e) {
            error_log("Password update error: " . $e->getMessage());
            return false;
        }
    }

    public function updateStatus($id, $status) {
        try {
            $sql = "UPDATE usersnew SET status = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $id]);
        } catch (Exception $e) {
            error_log("Status update error: " . $e->getMessage());
            return false;
        }
    }

    public function delete($id) {
        try {
            $sql = "DELETE FROM usersnew WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            error_log("User delete error: " . $e->getMessage());
            return false;
        }
    }

    public function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }

    public function getUsersStatistics($institutionId = null) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_users,
                        COUNT(CASE WHEN user_type = 'superadmin' THEN 1 END) as superadmins,
                        COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admins,
                        COUNT(CASE WHEN user_type = 'staff' THEN 1 END) as staff,
                        COUNT(CASE WHEN user_type = 'teacher' THEN 1 END) as teachers,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_users,
                        COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_logins
                    FROM usersnew";
            
            $params = [];
            if ($institutionId) {
                $sql .= " WHERE institution_id = ?";
                $params[] = $institutionId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch();
        } catch (Exception $e) {
            error_log("Users statistics error: " . $e->getMessage());
            return false;
        }
    }
}
?>