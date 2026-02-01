<?php
require_once 'config/database.php';

class SystemFeature {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    /**
     * Get all active system features with their modules
     */
    public function getAllActive() {
        $sql = "SELECT 
                    sf.id,
                    sf.system_key,
                    sf.system_name,
                    sf.system_description,
                    sf.system_icon,
                    sf.system_category,
                    sf.display_order
                FROM system_features sf
                WHERE sf.is_active = 1
                ORDER BY sf.display_order ASC, sf.system_name ASC";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $features = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get modules for each feature
            foreach ($features as &$feature) {
                $feature['modules'] = $this->getModulesBySystemId($feature['id']);
            }
            
            return $features;
        } catch (PDOException $e) {
            error_log("Get all active features error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all system features (including inactive)
     */
    public function getAll() {
        $sql = "SELECT * FROM system_features ORDER BY display_order ASC, system_name ASC";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $features = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($features as &$feature) {
                $feature['modules'] = $this->getModulesBySystemId($feature['id']);
            }
            
            return $features;
        } catch (PDOException $e) {
            error_log("Get all features error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get modules for a specific system feature
     */
    public function getModulesBySystemId($systemFeatureId) {
        $sql = "SELECT 
                    id,
                    module_key,
                    module_name,
                    module_description,
                    is_active,
                    display_order
                FROM system_modules
                WHERE system_feature_id = ? AND is_active = 1
                ORDER BY display_order ASC, module_name ASC";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$systemFeatureId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Get modules error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get a single system feature by ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM system_features WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $feature = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($feature) {
                $feature['modules'] = $this->getModulesBySystemId($feature['id']);
            }
            
            return $feature;
        } catch (PDOException $e) {
            error_log("Get feature by ID error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get a system feature by system_key
     */
    public function getByKey($systemKey) {
        $sql = "SELECT * FROM system_features WHERE system_key = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$systemKey]);
            $feature = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($feature) {
                $feature['modules'] = $this->getModulesBySystemId($feature['id']);
            }
            
            return $feature;
        } catch (PDOException $e) {
            error_log("Get feature by key error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create a new system feature
     */
    public function create($data) {
        $sql = "INSERT INTO system_features (
                    system_key, 
                    system_name, 
                    system_description, 
                    system_icon,
                    system_category,
                    is_active,
                    display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        try {
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['system_key'],
                $data['system_name'],
                $data['system_description'],
                $data['system_icon'] ?? null,
                $data['system_category'] ?? 'support',
                $data['is_active'] ?? 1,
                $data['display_order'] ?? 0
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (PDOException $e) {
            error_log("Create system feature error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update a system feature
     */
    public function update($id, $data) {
        $sql = "UPDATE system_features SET 
                    system_name = ?,
                    system_description = ?,
                    system_icon = ?,
                    system_category = ?,
                    is_active = ?,
                    display_order = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                $data['system_name'],
                $data['system_description'],
                $data['system_icon'] ?? null,
                $data['system_category'] ?? 'support',
                $data['is_active'] ?? 1,
                $data['display_order'] ?? 0,
                $id
            ]);
        } catch (PDOException $e) {
            error_log("Update system feature error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete a system feature
     */
    public function delete($id) {
        $sql = "DELETE FROM system_features WHERE id = ?";
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            error_log("Delete system feature error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Toggle feature active status
     */
    public function toggleStatus($id) {
        $sql = "UPDATE system_features SET 
                    is_active = NOT is_active,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            error_log("Toggle feature status error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create a new module for a system
     */
    public function createModule($data) {
        $sql = "INSERT INTO system_modules (
                    system_feature_id,
                    module_key,
                    module_name,
                    module_description,
                    is_active,
                    display_order
                ) VALUES (?, ?, ?, ?, ?, ?)";
        
        try {
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['system_feature_id'],
                $data['module_key'],
                $data['module_name'],
                $data['module_description'],
                $data['is_active'] ?? 1,
                $data['display_order'] ?? 0
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (PDOException $e) {
            error_log("Create module error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update a module
     */
    public function updateModule($moduleId, $data) {
        $sql = "UPDATE system_modules SET 
                    module_name = ?,
                    module_description = ?,
                    is_active = ?,
                    display_order = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                $data['module_name'],
                $data['module_description'],
                $data['is_active'] ?? 1,
                $data['display_order'] ?? 0,
                $moduleId
            ]);
        } catch (PDOException $e) {
            error_log("Update module error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete a module
     */
    public function deleteModule($moduleId) {
        $sql = "DELETE FROM system_modules WHERE id = ?";
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$moduleId]);
        } catch (PDOException $e) {
            error_log("Delete module error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get statistics about features
     */
    public function getStatistics() {
        $sql = "SELECT 
                    COUNT(*) as total_systems,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_systems,
                    COUNT(CASE WHEN system_category = 'core' THEN 1 END) as core_systems,
                    COUNT(CASE WHEN system_category = 'academic' THEN 1 END) as academic_systems,
                    COUNT(CASE WHEN system_category = 'administrative' THEN 1 END) as administrative_systems,
                    COUNT(CASE WHEN system_category = 'financial' THEN 1 END) as financial_systems,
                    COUNT(CASE WHEN system_category = 'communication' THEN 1 END) as communication_systems,
                    COUNT(CASE WHEN system_category = 'support' THEN 1 END) as support_systems
                FROM system_features";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get total modules
            $moduleSql = "SELECT COUNT(*) as total_modules FROM system_modules WHERE is_active = 1";
            $moduleStmt = $this->db->prepare($moduleSql);
            $moduleStmt->execute();
            $moduleStats = $moduleStmt->fetch(PDO::FETCH_ASSOC);
            
            $stats['total_modules'] = $moduleStats['total_modules'];
            
            return $stats;
        } catch (PDOException $e) {
            error_log("Get feature statistics error: " . $e->getMessage());
            return false;
        }
    }
}
?>