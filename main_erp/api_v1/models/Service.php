<?php
require_once 'config/database.php';

class Service {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in Service model: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get all active services
     * @param int|null $limit - Optional limit
     * @param int $offset - Offset for pagination
     * @param string|null $vehicleCategory - Vehicle category to filter services (Hatchback, Sedan, Compact SUV, SUV, Bike)
     */
    public function getAllActive($limit = null, $offset = 0, $vehicleCategory = null) {
        try {
            $sql = "SELECT 
                        id,
                        service_key,
                        title,
                        description,
                        price,
                        duration,
                        features,
                        badge,
                        badge_type,
                        image_url,
                        display_order,
                        category
                    FROM services 
                    WHERE status = 'active'";
            
            $params = [];
            
            // Filter by vehicle category if provided
            if ($vehicleCategory) {
                $sql .= " AND (category IS NULL OR category = ? OR category = 'all')";
                $params[] = $vehicleCategory;
            }
            
            $sql .= " ORDER BY display_order ASC, created_at DESC";
            
            if ($limit) {
                $sql .= " LIMIT ? OFFSET ?";
                $params[] = $limit;
                $params[] = $offset;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Category pricing multipliers
            $categoryMultipliers = [
                'Hatchback' => 1.0,
                'Sedan' => 1.2,
                'Compact SUV' => 1.3,
                'SUV' => 1.6,
                'Bike' => 0.5
            ];
            
            $multiplier = isset($categoryMultipliers[$vehicleCategory]) 
                ? $categoryMultipliers[$vehicleCategory] 
                : 1.0;
            
            // Parse JSON features for each service
            foreach ($services as &$service) {
                if ($service['features']) {
                    $service['features'] = json_decode($service['features'], true);
                } else {
                    $service['features'] = [];
                }
                
                // Base price
                $basePrice = (float) $service['price'];
                $service['base_price'] = $basePrice;
                
                // Apply category multiplier
                $service['price'] = round($basePrice * $multiplier, 2);
                $service['duration'] = (int) $service['duration'];
                $service['price_multiplier'] = $multiplier;
            }
            
            return $services;
            
        } catch (Exception $e) {
            error_log("Get all active services error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get all services (including inactive) - Admin only
     */
    public function getAll($limit = null, $offset = 0) {
        try {
            $sql = "SELECT 
                        id,
                        service_key,
                        title,
                        description,
                        price,
                        duration,
                        features,
                        badge,
                        badge_type,
                        image_url,
                        display_order,
                        status,
                        created_at,
                        updated_at
                    FROM services 
                    ORDER BY display_order ASC, created_at DESC";
            
            if ($limit) {
                $sql .= " LIMIT ? OFFSET ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$limit, $offset]);
            } else {
                $stmt = $this->db->prepare($sql);
                $stmt->execute();
            }
            
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON features
            foreach ($services as &$service) {
                if ($service['features']) {
                    $service['features'] = json_decode($service['features'], true);
                } else {
                    $service['features'] = [];
                }
                $service['price'] = (float) $service['price'];
                $service['duration'] = (int) $service['duration'];
            }
            
            return $services;
            
        } catch (Exception $e) {
            error_log("Get all services error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get service by ID
     */
    public function findById($id) {
        try {
            $sql = "SELECT 
                        id,
                        service_key,
                        title,
                        description,
                        price,
                        duration,
                        features,
                        badge,
                        badge_type,
                        image_url,
                        display_order,
                        status,
                        created_at,
                        updated_at
                    FROM services 
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $service = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($service && $service['features']) {
                $service['features'] = json_decode($service['features'], true);
            }
            
            if ($service) {
                $service['price'] = (float) $service['price'];
                $service['duration'] = (int) $service['duration'];
            }
            
            return $service;
            
        } catch (Exception $e) {
            error_log("Find service by ID error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get service by service_key
     */
    public function findByKey($serviceKey) {
        try {
            $sql = "SELECT 
                        id,
                        service_key,
                        title,
                        description,
                        price,
                        duration,
                        features,
                        badge,
                        badge_type,
                        image_url,
                        display_order,
                        status
                    FROM services 
                    WHERE service_key = ? AND status = 'active'";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$serviceKey]);
            $service = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($service && $service['features']) {
                $service['features'] = json_decode($service['features'], true);
            }
            
            if ($service) {
                $service['price'] = (float) $service['price'];
                $service['duration'] = (int) $service['duration'];
            }
            
            return $service;
            
        } catch (Exception $e) {
            error_log("Find service by key error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create new service
     */
    public function create($data) {
        try {
            $sql = "INSERT INTO services (
                        service_key, 
                        title, 
                        description, 
                        price, 
                        duration, 
                        features, 
                        badge, 
                        badge_type, 
                        image_url, 
                        display_order, 
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            
            $features = isset($data['features']) ? json_encode($data['features']) : null;
            
            $result = $stmt->execute([
                $data['service_key'],
                $data['title'],
                $data['description'],
                $data['price'],
                $data['duration'],
                $features,
                $data['badge'] ?? null,
                $data['badge_type'] ?? 'default',
                $data['image_url'] ?? null,
                $data['display_order'] ?? 0,
                $data['status'] ?? 'active'
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
            
        } catch (Exception $e) {
            error_log("Service create error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update service
     */
    public function update($id, $data) {
        try {
            $sql = "UPDATE services SET 
                        title = ?,
                        description = ?,
                        price = ?,
                        duration = ?,
                        features = ?,
                        badge = ?,
                        badge_type = ?,
                        image_url = ?,
                        display_order = ?,
                        status = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            
            $features = isset($data['features']) ? json_encode($data['features']) : null;
            
            return $stmt->execute([
                $data['title'],
                $data['description'],
                $data['price'],
                $data['duration'],
                $features,
                $data['badge'] ?? null,
                $data['badge_type'] ?? 'default',
                $data['image_url'] ?? null,
                $data['display_order'] ?? 0,
                $data['status'] ?? 'active',
                $id
            ]);
            
        } catch (Exception $e) {
            error_log("Service update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update service status
     */
    public function updateStatus($id, $status) {
        try {
            $sql = "UPDATE services SET status = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $id]);
            
        } catch (Exception $e) {
            error_log("Update service status error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete service
     */
    public function delete($id) {
        try {
            $sql = "DELETE FROM services WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
            
        } catch (Exception $e) {
            error_log("Service delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get total count of services
     */
    public function getTotalCount($activeOnly = false) {
        try {
            $sql = "SELECT COUNT(*) as total FROM services";
            
            if ($activeOnly) {
                $sql .= " WHERE status = 'active'";
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['total'];
            
        } catch (Exception $e) {
            error_log("Get service count error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get service statistics
     */
    public function getStatistics() {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_services,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_services,
                        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_services,
                        MIN(price) as min_price,
                        MAX(price) as max_price,
                        AVG(price) as avg_price
                    FROM services";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Format decimals
            $stats['min_price'] = (float) $stats['min_price'];
            $stats['max_price'] = (float) $stats['max_price'];
            $stats['avg_price'] = round((float) $stats['avg_price'], 2);
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("Get service statistics error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if service key exists
     */
    public function serviceKeyExists($serviceKey, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM services WHERE service_key = ?";
            $params = [$serviceKey];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['count'] > 0;
            
        } catch (Exception $e) {
            error_log("Check service key exists error: " . $e->getMessage());
            return false;
        }
    }
}
?>