<?php
require_once 'config/database.php';

class UserFeatures {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in UserFeatures model: " . $e->getMessage());
            throw $e;
        }
    }

    public function assignFeaturesToUser($userId, $features, $assignedBy = null) {
        try {
            $this->db->beginTransaction();
            
            // First, remove existing features for this user
            $this->removeAllUserFeatures($userId);
            
            // Insert new features
            $sql = "INSERT INTO user_features (user_id, system_key, system_name, system_description, system_icon, selected_modules, assigned_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            
            foreach ($features as $systemKey => $systemData) {
                $result = $stmt->execute([
                    $userId,
                    $systemKey,
                    $systemData['system_name'],
                    $systemData['system_description'] ?? null,
                    $systemData['system_icon'] ?? null,
                    json_encode($systemData['selected_modules']),
                    $assignedBy
                ]);
                
                if (!$result) {
                    throw new Exception("Failed to assign feature: " . $systemKey);
                }
            }
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Assign features error: " . $e->getMessage());
            return false;
        }
    }

    public function getUserFeatures($userId) {
        try {
            $sql = "SELECT * FROM user_features WHERE user_id = ? AND status = 'active' ORDER BY system_name";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userId]);
            $features = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($features as $feature) {
                $result[$feature['system_key']] = [
                    'system_name' => $feature['system_name'],
                    'system_description' => $feature['system_description'],
                    'system_icon' => $feature['system_icon'],
                    'selected_modules' => json_decode($feature['selected_modules'], true),
                    'assigned_at' => $feature['assigned_at']
                ];
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("Get user features error: " . $e->getMessage());
            return [];
        }
    }

    public function removeUserFeature($userId, $systemKey) {
        try {
            $sql = "DELETE FROM user_features WHERE user_id = ? AND system_key = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$userId, $systemKey]);
        } catch (Exception $e) {
            error_log("Remove user feature error: " . $e->getMessage());
            return false;
        }
    }

    public function removeAllUserFeatures($userId) {
        try {
            $sql = "DELETE FROM user_features WHERE user_id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$userId]);
        } catch (Exception $e) {
            error_log("Remove all user features error: " . $e->getMessage());
            return false;
        }
    }

    public function updateFeatureStatus($userId, $systemKey, $status) {
        try {
            $sql = "UPDATE user_features SET status = ?, updated_at = NOW() WHERE user_id = ? AND system_key = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $userId, $systemKey]);
        } catch (Exception $e) {
            error_log("Update feature status error: " . $e->getMessage());
            return false;
        }
    }

    public function getFeatureUsageStats() {
        try {
            $sql = "SELECT 
                        system_key,
                        system_name,
                        COUNT(*) as user_count,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
                    FROM user_features 
                    GROUP BY system_key, system_name 
                    ORDER BY user_count DESC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Feature usage stats error: " . $e->getMessage());
            return [];
        }
    }

    public function getUsersByFeature($systemKey) {
        try {
            $sql = "SELECT u.id, u.name, u.email, u.role, u.institution_id, c.institution_name, uf.assigned_at
                    FROM user_features uf
                    JOIN usersnew u ON uf.user_id = u.id
                    LEFT JOIN organizations c ON u.institution_id = c.id
                    WHERE uf.system_key = ? AND uf.status = 'active'
                    ORDER BY u.name";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$systemKey]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Get users by feature error: " . $e->getMessage());
            return [];
        }
    }
}
?>