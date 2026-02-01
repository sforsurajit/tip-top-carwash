<?php
require_once 'config/database.php';

class Product {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in Product model: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get all active products for home page (is_home_view = true)
     */
    public function getHomeProducts($limit = 8) {
        try {
            $sql = "SELECT 
                        p.id,
                        p.product_key,
                        p.name,
                        p.slug,
                        p.short_description,
                        p.base_price,
                        p.sale_price,
                        p.brand,
                        p.average_rating,
                        p.rating_count,
                        p.badge,
                        p.badge_type,
                        p.stock_status,
                        pi.image_url,
                        pi.alt_text
                    FROM products p
                    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
                    WHERE p.status = 'active' AND p.is_home_view = TRUE
                    ORDER BY p.display_order ASC, p.created_at DESC
                    LIMIT ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$limit]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get home products error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get all active products with filters
     */
    public function getAllActive($filters = [], $limit = null, $offset = 0) {
        try {
            $sql = "SELECT 
                        p.id,
                        p.product_key,
                        p.name,
                        p.slug,
                        p.short_description,
                        p.base_price,
                        p.sale_price,
                        p.brand,
                        p.average_rating,
                        p.rating_count,
                        p.badge,
                        p.badge_type,
                        p.stock_status,
                        p.featured,
                        p.is_bestseller,
                        p.is_new,
                        pi.image_url,
                        pi.alt_text
                    FROM products p
                    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
                    WHERE p.status = 'active'";
            
            $params = [];
            
            // Category filter
            if (!empty($filters['category_id'])) {
                $sql .= " AND p.id IN (SELECT product_id FROM product_categories WHERE category_id = ?)";
                $params[] = $filters['category_id'];
            }
            
            // Search filter
            if (!empty($filters['search'])) {
                $sql .= " AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            // Price range filter
            if (!empty($filters['min_price'])) {
                $sql .= " AND COALESCE(p.sale_price, p.base_price) >= ?";
                $params[] = $filters['min_price'];
            }
            
            if (!empty($filters['max_price'])) {
                $sql .= " AND COALESCE(p.sale_price, p.base_price) <= ?";
                $params[] = $filters['max_price'];
            }
            
            // Brand filter
            if (!empty($filters['brand'])) {
                $sql .= " AND p.brand = ?";
                $params[] = $filters['brand'];
            }
            
            // Featured filter
            if (isset($filters['featured']) && $filters['featured']) {
                $sql .= " AND p.featured = TRUE";
            }
            
            // Bestseller filter
            if (isset($filters['bestseller']) && $filters['bestseller']) {
                $sql .= " AND p.is_bestseller = TRUE";
            }
            
            // New products filter
            if (isset($filters['new']) && $filters['new']) {
                $sql .= " AND p.is_new = TRUE";
            }
            
            // Stock status filter
            if (!empty($filters['stock_status'])) {
                $sql .= " AND p.stock_status = ?";
                $params[] = $filters['stock_status'];
            }
            
            // Sorting
            $orderBy = " ORDER BY ";
            if (!empty($filters['sort'])) {
                switch ($filters['sort']) {
                    case 'price_asc':
                        $orderBy .= "COALESCE(p.sale_price, p.base_price) ASC";
                        break;
                    case 'price_desc':
                        $orderBy .= "COALESCE(p.sale_price, p.base_price) DESC";
                        break;
                    case 'name_asc':
                        $orderBy .= "p.name ASC";
                        break;
                    case 'name_desc':
                        $orderBy .= "p.name DESC";
                        break;
                    case 'rating':
                        $orderBy .= "p.average_rating DESC";
                        break;
                    case 'newest':
                        $orderBy .= "p.created_at DESC";
                        break;
                    default:
                        $orderBy .= "p.display_order ASC, p.created_at DESC";
                }
            } else {
                $orderBy .= "p.display_order ASC, p.created_at DESC";
            }
            
            $sql .= $orderBy;
            
            if ($limit) {
                $sql .= " LIMIT ? OFFSET ?";
                $params[] = $limit;
                $params[] = $offset;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get all active products error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get product by ID with full details
     */
    public function findById($id) {
        try {
            $sql = "SELECT 
                        p.*
                    FROM products p
                    WHERE p.id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product) {
                // Get all images
                $product['images'] = $this->getProductImages($id);
                
                // Get categories
                $product['categories'] = $this->getProductCategories($id);
                
                // Get variants
                $product['variants'] = $this->getProductVariants($id);
            }
            
            return $product;
            
        } catch (Exception $e) {
            error_log("Find product by ID error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get product by slug
     */
    public function findBySlug($slug) {
        try {
            $sql = "SELECT 
                        p.*
                    FROM products p
                    WHERE p.slug = ? AND p.status = 'active'";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$slug]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product) {
                $product['images'] = $this->getProductImages($product['id']);
                $product['categories'] = $this->getProductCategories($product['id']);
                $product['variants'] = $this->getProductVariants($product['id']);
            }
            
            return $product;
            
        } catch (Exception $e) {
            error_log("Find product by slug error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get product images
     */
    private function getProductImages($productId) {
        try {
            $sql = "SELECT id, image_url, alt_text, is_primary, display_order
                    FROM product_images
                    WHERE product_id = ?
                    ORDER BY is_primary DESC, display_order ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get product images error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get product categories
     */
    private function getProductCategories($productId) {
        try {
            $sql = "SELECT c.id, c.category_key, c.name, pc.is_primary
                    FROM categories c
                    INNER JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = ?
                    ORDER BY pc.is_primary DESC, c.name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get product categories error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get product variants
     */
    private function getProductVariants($productId) {
        try {
            $sql = "SELECT id, variant_key, name, variant_type, sku, price, 
                           stock_quantity, image_url, display_order, status
                    FROM product_variants
                    WHERE product_id = ? AND status = 'active'
                    ORDER BY display_order ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Get product variants error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Create new product
     */
    public function create($data) {
        try {
            $this->db->beginTransaction();
            
            $sql = "INSERT INTO products (
                        product_key, name, slug, short_description, description,
                        base_price, sale_price, sku, barcode, brand,
                        weight, dimensions, stock_quantity, low_stock_threshold,
                        manage_stock, stock_status, featured, is_bestseller,
                        is_new, is_home_view, badge, badge_type,
                        meta_title, meta_description, meta_keywords,
                        display_order, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            
            $result = $stmt->execute([
                $data['product_key'],
                $data['name'],
                $data['slug'],
                $data['short_description'] ?? null,
                $data['description'] ?? null,
                $data['base_price'],
                $data['sale_price'] ?? null,
                $data['sku'] ?? null,
                $data['barcode'] ?? null,
                $data['brand'] ?? null,
                $data['weight'] ?? null,
                $data['dimensions'] ?? null,
                $data['stock_quantity'] ?? 0,
                $data['low_stock_threshold'] ?? 10,
                $data['manage_stock'] ?? true,
                $data['stock_status'] ?? 'in_stock',
                $data['featured'] ?? false,
                $data['is_bestseller'] ?? false,
                $data['is_new'] ?? false,
                $data['is_home_view'] ?? false,
                $data['badge'] ?? null,
                $data['badge_type'] ?? 'default',
                $data['meta_title'] ?? null,
                $data['meta_description'] ?? null,
                $data['meta_keywords'] ?? null,
                $data['display_order'] ?? 0,
                $data['status'] ?? 'active'
            ]);
            
            if ($result) {
                $productId = $this->db->lastInsertId();
                
                // Add categories if provided
                if (!empty($data['categories'])) {
                    $this->updateProductCategories($productId, $data['categories']);
                }
                
                // Add images if provided
                if (!empty($data['images'])) {
                    $this->updateProductImages($productId, $data['images']);
                }
                
                $this->db->commit();
                return $productId;
            }
            
            $this->db->rollBack();
            return false;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Product create error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update product
     */
    public function update($id, $data) {
        try {
            $this->db->beginTransaction();
            
            $sql = "UPDATE products SET 
                        name = ?,
                        slug = ?,
                        short_description = ?,
                        description = ?,
                        base_price = ?,
                        sale_price = ?,
                        sku = ?,
                        barcode = ?,
                        brand = ?,
                        weight = ?,
                        dimensions = ?,
                        stock_quantity = ?,
                        low_stock_threshold = ?,
                        manage_stock = ?,
                        stock_status = ?,
                        featured = ?,
                        is_bestseller = ?,
                        is_new = ?,
                        is_home_view = ?,
                        badge = ?,
                        badge_type = ?,
                        meta_title = ?,
                        meta_description = ?,
                        meta_keywords = ?,
                        display_order = ?,
                        status = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            
            $result = $stmt->execute([
                $data['name'],
                $data['slug'],
                $data['short_description'] ?? null,
                $data['description'] ?? null,
                $data['base_price'],
                $data['sale_price'] ?? null,
                $data['sku'] ?? null,
                $data['barcode'] ?? null,
                $data['brand'] ?? null,
                $data['weight'] ?? null,
                $data['dimensions'] ?? null,
                $data['stock_quantity'] ?? 0,
                $data['low_stock_threshold'] ?? 10,
                $data['manage_stock'] ?? true,
                $data['stock_status'] ?? 'in_stock',
                $data['featured'] ?? false,
                $data['is_bestseller'] ?? false,
                $data['is_new'] ?? false,
                $data['is_home_view'] ?? false,
                $data['badge'] ?? null,
                $data['badge_type'] ?? 'default',
                $data['meta_title'] ?? null,
                $data['meta_description'] ?? null,
                $data['meta_keywords'] ?? null,
                $data['display_order'] ?? 0,
                $data['status'] ?? 'active',
                $id
            ]);
            
            if ($result) {
                // Update categories if provided
                if (isset($data['categories'])) {
                    $this->updateProductCategories($id, $data['categories']);
                }
                
                // Update images if provided
                if (isset($data['images'])) {
                    $this->updateProductImages($id, $data['images']);
                }
                
                $this->db->commit();
                return true;
            }
            
            $this->db->rollBack();
            return false;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Product update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update product categories
     */
    private function updateProductCategories($productId, $categories) {
        try {
            // Delete existing categories
            $sql = "DELETE FROM product_categories WHERE product_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);
            
            // Insert new categories
            if (!empty($categories)) {
                $sql = "INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (?, ?, ?)";
                $stmt = $this->db->prepare($sql);
                
                foreach ($categories as $index => $categoryId) {
                    $isPrimary = ($index === 0);
                    $stmt->execute([$productId, $categoryId, $isPrimary]);
                }
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("Update product categories error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update product images
     */
    private function updateProductImages($productId, $images) {
        try {
            // Delete existing images
            $sql = "DELETE FROM product_images WHERE product_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);
            
            // Insert new images
            if (!empty($images)) {
                $sql = "INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order) 
                        VALUES (?, ?, ?, ?, ?)";
                $stmt = $this->db->prepare($sql);
                
                foreach ($images as $index => $image) {
                    $isPrimary = ($index === 0);
                    $stmt->execute([
                        $productId,
                        $image['url'],
                        $image['alt'] ?? null,
                        $isPrimary,
                        $index
                    ]);
                }
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("Update product images error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete product
     */
    public function delete($id) {
        try {
            $sql = "DELETE FROM products WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
            
        } catch (Exception $e) {
            error_log("Product delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update product status
     */
    public function updateStatus($id, $status) {
        try {
            $sql = "UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $id]);
            
        } catch (Exception $e) {
            error_log("Update product status error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update stock quantity
     */
    public function updateStock($id, $quantity, $operation = 'set') {
        try {
            if ($operation === 'add') {
                $sql = "UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = NOW() WHERE id = ?";
            } elseif ($operation === 'subtract') {
                $sql = "UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = NOW() WHERE id = ?";
            } else {
                $sql = "UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?";
            }
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$quantity, $id]);
            
        } catch (Exception $e) {
            error_log("Update product stock error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get total count of products
     */
    public function getTotalCount($activeOnly = false, $filters = []) {
        try {
            $sql = "SELECT COUNT(DISTINCT p.id) as total FROM products p";
            $params = [];
            $where = [];
            
            if ($activeOnly) {
                $where[] = "p.status = 'active'";
            }
            
            if (!empty($filters['category_id'])) {
                $sql .= " INNER JOIN product_categories pc ON p.id = pc.product_id";
                $where[] = "pc.category_id = ?";
                $params[] = $filters['category_id'];
            }
            
            if (!empty($filters['search'])) {
                $where[] = "(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['total'];
            
        } catch (Exception $e) {
            error_log("Get product count error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get all brands
     */
    public function getAllBrands() {
        try {
            $sql = "SELECT DISTINCT brand 
                    FROM products 
                    WHERE brand IS NOT NULL AND brand != '' AND status = 'active'
                    ORDER BY brand ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
            
        } catch (Exception $e) {
            error_log("Get all brands error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get product statistics
     */
    public function getStatistics() {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_products,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_products,
                        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_products,
                        COUNT(CASE WHEN stock_status = 'out_of_stock' THEN 1 END) as out_of_stock,
                        COUNT(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 END) as low_stock,
                        MIN(COALESCE(sale_price, base_price)) as min_price,
                        MAX(COALESCE(sale_price, base_price)) as max_price,
                        AVG(COALESCE(sale_price, base_price)) as avg_price,
                        SUM(stock_quantity) as total_stock
                    FROM products";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $stats['min_price'] = (float) $stats['min_price'];
            $stats['max_price'] = (float) $stats['max_price'];
            $stats['avg_price'] = round((float) $stats['avg_price'], 2);
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("Get product statistics error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if product key exists
     */
    public function productKeyExists($productKey, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM products WHERE product_key = ?";
            $params = [$productKey];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['count'] > 0;
            
        } catch (Exception $e) {
            error_log("Check product key exists error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if slug exists
     */
    public function slugExists($slug, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM products WHERE slug = ?";
            $params = [$slug];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['count'] > 0;
            
        } catch (Exception $e) {
            error_log("Check slug exists error: " . $e->getMessage());
            return false;
        }
    }
}
?>