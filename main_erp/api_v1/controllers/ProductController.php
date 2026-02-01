<?php
require_once 'models/Product.php';
require_once 'utils/Validator.php';

class ProductController {
    private $productModel;

    public function __construct() {
        $this->productModel = new Product();
    }

    /**
     * Get home page products (PUBLIC - No authentication required)
     */
    public function getHomeProducts() {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 8;
            
            $products = $this->productModel->getHomeProducts($limit);
            
            Response::success([
                'products' => $products,
                'count' => count($products)
            ], 'Home products retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get home products error: " . $e->getMessage());
            Response::error('Failed to retrieve products', 500);
        }
    }

    /**
     * Get all active products (PUBLIC - No authentication required)
     */
    public function getAllActive() {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            // Build filters array
            $filters = [];
            
            if (isset($_GET['category_id'])) {
                $filters['category_id'] = (int)$_GET['category_id'];
            }
            
            if (isset($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }
            
            if (isset($_GET['min_price'])) {
                $filters['min_price'] = (float)$_GET['min_price'];
            }
            
            if (isset($_GET['max_price'])) {
                $filters['max_price'] = (float)$_GET['max_price'];
            }
            
            if (isset($_GET['brand'])) {
                $filters['brand'] = $_GET['brand'];
            }
            
            if (isset($_GET['featured'])) {
                $filters['featured'] = filter_var($_GET['featured'], FILTER_VALIDATE_BOOLEAN);
            }
            
            if (isset($_GET['bestseller'])) {
                $filters['bestseller'] = filter_var($_GET['bestseller'], FILTER_VALIDATE_BOOLEAN);
            }
            
            if (isset($_GET['new'])) {
                $filters['new'] = filter_var($_GET['new'], FILTER_VALIDATE_BOOLEAN);
            }
            
            if (isset($_GET['stock_status'])) {
                $filters['stock_status'] = $_GET['stock_status'];
            }
            
            if (isset($_GET['sort'])) {
                $filters['sort'] = $_GET['sort'];
            }
            
            $products = $this->productModel->getAllActive($filters, $limit, $offset);
            $total = $this->productModel->getTotalCount(true, $filters);
            
            Response::success([
                'products' => $products,
                'total' => $total,
                'count' => count($products),
                'limit' => $limit,
                'offset' => $offset
            ], 'Products retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get active products error: " . $e->getMessage());
            Response::error('Failed to retrieve products', 500);
        }
    }

    /**
     * Get product by ID or slug (PUBLIC - No authentication required)
     */
    public function getById($id) {
        try {
            // Check if it's a slug (string) or ID (numeric)
            if (is_numeric($id)) {
                $product = $this->productModel->findById($id);
            } else {
                $product = $this->productModel->findBySlug($id);
            }
            
            if (!$product) {
                Response::error('Product not found', 404);
                return;
            }

            Response::success([
                'product' => $product
            ], 'Product retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get product by ID error: " . $e->getMessage());
            Response::error('Failed to retrieve product', 500);
        }
    }

    /**
     * Get all brands (PUBLIC - No authentication required)
     */
    public function getAllBrands() {
        try {
            $brands = $this->productModel->getAllBrands();
            
            Response::success([
                'brands' => $brands,
                'count' => count($brands)
            ], 'Brands retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get all brands error: " . $e->getMessage());
            Response::error('Failed to retrieve brands', 500);
        }
    }

    /**
     * Create new product (PROTECTED - Admin only)
     */
    public function create() {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Validate required fields
            $requiredFields = ['product_key', 'name', 'slug', 'base_price'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Validate price
            if (!is_numeric($input['base_price']) || $input['base_price'] <= 0) {
                Response::error('Invalid base price value', 400);
                return;
            }

            // Check if product_key already exists
            if ($this->productModel->productKeyExists($input['product_key'])) {
                Response::error('Product key already exists', 409);
                return;
            }

            // Check if slug already exists
            if ($this->productModel->slugExists($input['slug'])) {
                Response::error('Slug already exists', 409);
                return;
            }

            $productId = $this->productModel->create($input);

            if ($productId) {
                $product = $this->productModel->findById($productId);
                Response::success([
                    'product' => $product
                ], 'Product created successfully', 201);
            } else {
                Response::error('Failed to create product', 500);
            }

        } catch (Exception $e) {
            error_log("Create product error: " . $e->getMessage());
            Response::error('Failed to create product', 500);
        }
    }

    /**
     * Update product (PROTECTED - Admin only)
     */
    public function update($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Check if product exists
            $product = $this->productModel->findById($id);
            if (!$product) {
                Response::error('Product not found', 404);
                return;
            }

            // Validate required fields
            $requiredFields = ['name', 'slug', 'base_price'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Validate price
            if (!is_numeric($input['base_price']) || $input['base_price'] <= 0) {
                Response::error('Invalid base price value', 400);
                return;
            }

            // Check if slug already exists (excluding current product)
            if (isset($input['slug']) && $input['slug'] !== $product['slug']) {
                if ($this->productModel->slugExists($input['slug'], $id)) {
                    Response::error('Slug already exists', 409);
                    return;
                }
            }

            $result = $this->productModel->update($id, $input);

            if ($result) {
                $updatedProduct = $this->productModel->findById($id);
                Response::success([
                    'product' => $updatedProduct
                ], 'Product updated successfully');
            } else {
                Response::error('Failed to update product', 500);
            }

        } catch (Exception $e) {
            error_log("Update product error: " . $e->getMessage());
            Response::error('Failed to update product', 500);
        }
    }

    /**
     * Update product status (PROTECTED - Admin only)
     */
    public function updateStatus($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['status'])) {
                Response::error('Status is required', 400);
                return;
            }

            $validStatuses = ['active', 'inactive', 'draft'];
            if (!in_array($input['status'], $validStatuses)) {
                Response::error('Invalid status value. Must be: active, inactive, or draft', 400);
                return;
            }

            // Check if product exists
            $product = $this->productModel->findById($id);
            if (!$product) {
                Response::error('Product not found', 404);
                return;
            }

            $result = $this->productModel->updateStatus($id, $input['status']);

            if ($result) {
                Response::success([
                    'product_id' => (int)$id,
                    'status' => $input['status']
                ], 'Product status updated successfully');
            } else {
                Response::error('Failed to update status', 500);
            }

        } catch (Exception $e) {
            error_log("Update product status error: " . $e->getMessage());
            Response::error('Failed to update product status', 500);
        }
    }

    /**
     * Update product stock (PROTECTED - Admin only)
     */
    public function updateStock($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['quantity'])) {
                Response::error('Quantity is required', 400);
                return;
            }

            if (!is_numeric($input['quantity']) || $input['quantity'] < 0) {
                Response::error('Invalid quantity value', 400);
                return;
            }

            // Check if product exists
            $product = $this->productModel->findById($id);
            if (!$product) {
                Response::error('Product not found', 404);
                return;
            }

            $operation = $input['operation'] ?? 'set'; // set, add, subtract

            $result = $this->productModel->updateStock($id, $input['quantity'], $operation);

            if ($result) {
                $updatedProduct = $this->productModel->findById($id);
                Response::success([
                    'product_id' => (int)$id,
                    'stock_quantity' => $updatedProduct['stock_quantity']
                ], 'Stock updated successfully');
            } else {
                Response::error('Failed to update stock', 500);
            }

        } catch (Exception $e) {
            error_log("Update product stock error: " . $e->getMessage());
            Response::error('Failed to update product stock', 500);
        }
    }

    /**
     * Delete product (PROTECTED - Admin only)
     */
    public function delete($id) {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            // Check if product exists
            $product = $this->productModel->findById($id);
            if (!$product) {
                Response::error('Product not found', 404);
                return;
            }

            $result = $this->productModel->delete($id);

            if ($result) {
                Response::success(null, 'Product deleted successfully');
            } else {
                Response::error('Failed to delete product', 500);
            }

        } catch (Exception $e) {
            error_log("Delete product error: " . $e->getMessage());
            Response::error('Failed to delete product', 500);
        }
    }

    /**
     * Get product statistics (PROTECTED - Admin only)
     */
    public function getStatistics() {
        try {
            // Check authentication
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            // Check admin privileges
            if ($currentUser['user_type'] !== 'superadmin' && $currentUser['user_type'] !== 'admin') {
                Response::error('Admin access required', 403);
                return;
            }

            $stats = $this->productModel->getStatistics();

            if ($stats) {
                Response::success([
                    'statistics' => $stats
                ], 'Statistics retrieved successfully');
            } else {
                Response::error('Failed to retrieve statistics', 500);
            }

        } catch (Exception $e) {
            error_log("Get product statistics error: " . $e->getMessage());
            Response::error('Failed to retrieve statistics', 500);
        }
    }
}
?>