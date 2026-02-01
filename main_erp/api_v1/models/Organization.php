<?php
require_once 'config/database.php';

class Organization {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    // Existing methods remain the same...
    public function create($data) {
        $sql = "INSERT INTO organizations (
            institution_name, 
            institution_type, 
            principal_name, 
            contact_email, 
            contact_phone, 
            established_year, 
            address, 
            city, 
            state, 
            pincode, 
            website, 
            selected_features,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        try {
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['institution_name'],
                $data['institution_type'],
                $data['principal_name'],
                $data['contact_email'],
                $data['contact_phone'],
                $data['established_year'],
                $data['address'],
                $data['city'],
                $data['state'],
                $data['pincode'],
                $data['website'],
                json_encode($data['selected_features'], JSON_PRETTY_PRINT),
                'pending'
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (PDOException $e) {
            error_log("Organization creation error: " . $e->getMessage());
            return false;
        }
    }

    public function findById($id) {
        $sql = "SELECT * FROM organizations WHERE id = ?";
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $organization = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($organization && $organization['selected_features']) {
                $organization['selected_features'] = json_decode($organization['selected_features'], true);
            }
            
            return $organization;
        } catch (PDOException $e) {
            error_log("Organization find error: " . $e->getMessage());
            return false;
        }
    }

    public function findByEmail($email) {
        $sql = "SELECT * FROM organizations WHERE contact_email = ?";
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            $organization = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($organization && $organization['selected_features']) {
                $organization['selected_features'] = json_decode($organization['selected_features'], true);
            }
            
            return $organization;
        } catch (PDOException $e) {
            error_log("Organization find by email error: " . $e->getMessage());
            return false;
        }
    }

    // NEW METHOD: Get public organizations for landing page
    public function getPublicListings() {
        $sql = "SELECT 
                    id, 
                    institution_name, 
                    institution_type, 
                    logo, 
                    city, 
                    state,
                    established_year,
                    login, 
                    registration,
                    listing,
                    status,
                    created_at 
                FROM organizations 
                WHERE listing = 1 AND status = 'active' 
                ORDER BY institution_name ASC";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Get public listings error: " . $e->getMessage());
            return false;
        }
    }

    // NEW METHOD: Get organization basic info for auth
    public function getBasicInfo($id) {
        $sql = "SELECT 
                    id, 
                    institution_name, 
                    institution_type, 
                    logo, 
                    login, 
                    registration, 
                    status,
                    selected_features 
                FROM organizations 
                WHERE id = ? AND status = 'active'";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $organization = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($organization && $organization['selected_features']) {
                $organization['selected_features'] = json_decode($organization['selected_features'], true);
            }
            
            return $organization;
        } catch (PDOException $e) {
            error_log("Get organization basic info error: " . $e->getMessage());
            return false;
        }
    }

    // NEW METHOD: Check if organization allows login
    public function allowsLogin($id) {
        $sql = "SELECT login FROM organizations WHERE id = ? AND status = 'active'";
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result && $result['login'] == 1;
        } catch (PDOException $e) {
            error_log("Check login permission error: " . $e->getMessage());
            return false;
        }
    }

    // NEW METHOD: Check if organization allows registration
    public function allowsRegistration($id) {
        $sql = "SELECT registration FROM organizations WHERE id = ? AND status = 'active'";
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result && $result['registration'] == 1;
        } catch (PDOException $e) {
            error_log("Check registration permission error: " . $e->getMessage());
            return false;
        }
    }

    public function getAll($filters = []) {
        $sql = "SELECT * FROM organizations";
        $params = [];
        $conditions = [];

        if (!empty($filters['status'])) {
            $conditions[] = "status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['institution_type'])) {
            $conditions[] = "institution_type = ?";
            $params[] = $filters['institution_type'];
        }

        if (!empty($filters['city'])) {
            $conditions[] = "city LIKE ?";
            $params[] = "%" . $filters['city'] . "%";
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }

        $sql .= " ORDER BY created_at DESC";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $organizations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($organizations as &$organization) {
                if ($organization['selected_features']) {
                    $organization['selected_features'] = json_decode($organization['selected_features'], true);
                }
            }
            
            return $organizations;
        } catch (PDOException $e) {
            error_log("Organization getAll error: " . $e->getMessage());
            return false;
        }
    }

    public function update($id, $data) {
        $sql = "UPDATE organizations SET 
                institution_name = ?, 
                institution_type = ?, 
                principal_name = ?, 
                contact_email = ?, 
                contact_phone = ?, 
                established_year = ?, 
                address = ?, 
                city = ?, 
                state = ?, 
                pincode = ?, 
                website = ?, 
                selected_features = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                $data['institution_name'],
                $data['institution_type'],
                $data['principal_name'],
                $data['contact_email'],
                $data['contact_phone'],
                $data['established_year'],
                $data['address'],
                $data['city'],
                $data['state'],
                $data['pincode'],
                $data['website'],
                json_encode($data['selected_features'], JSON_PRETTY_PRINT),
                $id
            ]);
        } catch (PDOException $e) {
            error_log("Organization update error: " . $e->getMessage());
            return false;
        }
    }

    public function updateStatus($id, $status) {
        $sql = "UPDATE organizations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $id]);
        } catch (PDOException $e) {
            error_log("Organization status update error: " . $e->getMessage());
            return false;
        }
    }

    public function delete($id) {
        $sql = "DELETE FROM organizations WHERE id = ?";
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            error_log("Organization delete error: " . $e->getMessage());
            return false;
        }
    }

    public function getStatistics() {
        $sql = "SELECT 
                COUNT(*) as total_institutions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_institutions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_institutions,
                COUNT(CASE WHEN institution_type = 'college' THEN 1 END) as organizations,
                COUNT(CASE WHEN institution_type = 'school' THEN 1 END) as schools,
                COUNT(CASE WHEN institution_type = 'university' THEN 1 END) as universities,
                COUNT(CASE WHEN institution_type = 'institute' THEN 1 END) as institutes
                FROM organizations";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Organization statistics error: " . $e->getMessage());
            return false;
        }
    }

    public function getFeatureUsageAnalytics() {
        $sql = "SELECT selected_features FROM organizations WHERE selected_features IS NOT NULL AND selected_features != 'null'";
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $systemUsage = [];
            $moduleUsage = [];
            
            foreach ($results as $result) {
                $features = json_decode($result['selected_features'], true);
                if (is_array($features)) {
                    foreach ($features as $systemKey => $systemData) {
                        // Count system usage
                        $systemUsage[$systemKey] = ($systemUsage[$systemKey] ?? 0) + 1;
                        
                        // Count module usage
                        if (isset($systemData['selected_modules']) && is_array($systemData['selected_modules'])) {
                            foreach ($systemData['selected_modules'] as $module) {
                                $moduleKey = $systemKey . '.' . $module['key'];
                                $moduleUsage[$moduleKey] = ($moduleUsage[$moduleKey] ?? 0) + 1;
                            }
                        }
                    }
                }
            }
            
            // Sort by usage count
            arsort($systemUsage);
            arsort($moduleUsage);
            
            return [
                'system_usage' => $systemUsage,
                'module_usage' => $moduleUsage,
                'total_institutions_analyzed' => count($results)
            ];
        } catch (PDOException $e) {
            error_log("Feature usage analytics error: " . $e->getMessage());
            return false;
        }
    }
}
?>