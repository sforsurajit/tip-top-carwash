<?php
require_once 'config/database.php';

class Category {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in Category model: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get all active categories
     */
    public function getAllActive($limit = null, $offset = 0) {
        try {
            $sql = "SELECT 
                        c.id,
                        c.category_key,
                        c.name,
                        c.description,
                        c.parent_id,
                        c.image_url,
                        c.icon,
                        c.display_order,
                        parent.name as parent_name,
                        (SELECT COUNT(*) FROM product_categories pc 
                         INNER JOIN products p ON pc.product_id = p.id 
                         WHERE pc.category_id = c.id AND p.status = 'active') as product_count
                    FROM categories c
                    LEFT JOIN categories parent ON c.parent_id = parent.id
                    WHERE c.status = 'active'
                    ORDER BY c.display_order ASC, c.name ASC";
            
            if ($limit) {
                $sql .= " LIMIT ? OFFSET ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$limit, $offset]);
            } else {
                $stmt = $this->db->prepare($sql);
                $stmt->execute();
            }
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get all active categories error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get all categories including inactive (Admin only)
     */
    public function getAll($limit = null, $offset = 0) {
        try {
            $sql = "SELECT 
                        c.id,
                        c.category_key,
                        c.name,
                        c.description,
                        c.parent_id,
                        c.image_url,
                        c.icon,
                        c.display_order,
                        c.status,
                        c.created_at,
                        c.updated_at,
                        parent.name as parent_name,
                        (SELECT COUNT(*) FROM product_categories pc WHERE pc.category_id = c.id) as product_count
                    FROM categories c
                    LEFT JOIN categories parent ON c.parent_id = parent.id
                    ORDER BY c.display_order ASC, c.name ASC";
            
            if ($limit) {
                $sql .= " LIMIT ? OFFSET ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$limit, $offset]);
            } else {
                $stmt = $this->db->prepare($sql);
                $stmt->execute();
            }
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get all categories error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get category by ID
     */
    public function findById($id) {
        try {
            $sql = "SELECT 
                        c.*,
                        parent.name as parent_name,
                        (SELECT COUNT(*) FROM product_categories pc WHERE pc.category_id = c.id) as product_count
                    FROM categories c
                    LEFT JOIN categories parent ON c.parent_id = parent.id
                    WHERE c.id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Find category by ID error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get category by key
     */
    public function findByKey($categoryKey) {
        try {
            $sql = "SELECT 
                        c.*,
                        parent.name as parent_name,
                        (SELECT COUNT(*) FROM product_categories pc 
                         INNER JOIN products p ON pc.product_id = p.id 
                         WHERE pc.category_id = c.id AND p.status = 'active') as product_count
                    FROM categories c
                    LEFT JOIN categories parent ON c.parent_id = parent.id
                    WHERE c.category_key = ? AND c.status = 'active'";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$categoryKey]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Find category by key error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get subcategories
     */
    public function getSubcategories($parentId) {
        try {
            $sql = "SELECT 
                        c.id,
                        c.category_key,
                        c.name,
                        c.description,
                        c.image_url,
                        c.icon,
                        c.display_order,
                        (SELECT COUNT(*) FROM product_categories pc 
                         INNER JOIN products p ON pc.product_id = p.id 
                         WHERE pc.category_id = c.id AND p.status = 'active') as product_count
                    FROM categories c
                    WHERE c.parent_id = ? AND c.status = 'active'
                    ORDER BY c.display_order ASC, c.name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$parentId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get subcategories error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get top level categories (no parent)
     */
    public function getTopLevel() {
        try {
            $sql = "SELECT 
                        c.id,
                        c.category_key,
                        c.name,
                        c.description,
                        c.image_url,
                        c.icon,
                        c.display_order,
                        (SELECT COUNT(*) FROM product_categories pc 
                         INNER JOIN products p ON pc.product_id = p.id 
                         WHERE pc.category_id = c.id AND p.status = 'active') as product_count
                    FROM categories c
                    WHERE c.parent_id IS NULL AND c.status = 'active'
                    ORDER BY c.display_order ASC, c.name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get top level categories error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Create new category
     */
    public function create($data) {
        try {
            $sql = "INSERT INTO categories (
                        category_key, 
                        name, 
                        description, 
                        parent_id, 
                        image_url, 
                        icon, 
                        display_order, 
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            
            $result = $stmt->execute([
                $data['category_key'],
                $data['name'],
                $data['description'] ?? null,
                $data['parent_id'] ?? null,
                $data['image_url'] ?? null,
                $data['icon'] ?? null,
                $data['display_order'] ?? 0,
                $data['status'] ?? 'active'
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
            
        } catch (Exception $e) {
            error_log("Category create error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update category
     */
    public function update($id, $data) {
        try {
            $sql = "UPDATE categories SET 
                        name = ?,
                        description = ?,
                        parent_id = ?,
                        image_url = ?,
                        icon = ?,
                        display_order = ?,
                        status = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            
            return $stmt->execute([
                $data['name'],
                $data['description'] ?? null,
                $data['parent_id'] ?? null,
                $data['image_url'] ?? null,
                $data['icon'] ?? null,
                $data['display_order'] ?? 0,
                $data['status'] ?? 'active',
                $id
            ]);
            
        } catch (Exception $e) {
            error_log("Category update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update category status
     */
    public function updateStatus($id, $status) {
        try {
            $sql = "UPDATE categories SET status = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $id]);
            
        } catch (Exception $e) {
            error_log("Update category status error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete category
     */
    public function delete($id) {
        try {
            // Check if category has products
            $sql = "SELECT COUNT(*) as count FROM product_categories WHERE category_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                throw new Exception("Cannot delete category with associated products");
            }
            
            // Check if category has subcategories
            $sql = "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                throw new Exception("Cannot delete category with subcategories");
            }
            
            $sql = "DELETE FROM categories WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
            
        } catch (Exception $e) {
            error_log("Category delete error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get total count of categories
     */
    public function getTotalCount($activeOnly = false) {
        try {
            $sql = "SELECT COUNT(*) as total FROM categories";
            
            if ($activeOnly) {
                $sql .= " WHERE status = 'active'";
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['total'];
            
        } catch (Exception $e) {
            error_log("Get category count error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Check if category key exists
     */
    public function categoryKeyExists($categoryKey, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM categories WHERE category_key = ?";
            $params = [$categoryKey];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['count'] > 0;
            
        } catch (Exception $e) {
            error_log("Check category key exists error: " . $e->getMessage());
            return false;
        }
    }
}
?>