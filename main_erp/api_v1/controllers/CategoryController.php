<?php
require_once 'models/Category.php';
require_once 'utils/Validator.php';

class CategoryController {
    private $categoryModel;

    public function __construct() {
        $this->categoryModel = new Category();
    }

    /**
     * Get all active categories (PUBLIC - No authentication required)
     */
    public function getAllActive() {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            $categories = $this->categoryModel->getAllActive($limit, $offset);
            $total = $this->categoryModel->getTotalCount(true);
            
            Response::success([
                'categories' => $categories,
                'total' => $total,
                'count' => count($categories)
            ], 'Categories retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get active categories error: " . $e->getMessage());
            Response::error('Failed to retrieve categories', 500);
        }
    }

    /**
     * Get top level categories (PUBLIC - No authentication required)
     */
    public function getTopLevel() {
        try {
            $categories = $this->categoryModel->getTopLevel();
            
            Response::success([
                'categories' => $categories,
                'count' => count($categories)
            ], 'Top level categories retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get top level categories error: " . $e->getMessage());
            Response::error('Failed to retrieve categories', 500);
        }
    }

    /**
     * Get category by ID or key (PUBLIC - No authentication required)
     */
    public function getById($id) {
        try {
            // Check if it's a category_key (string) or ID (numeric)
            if (is_numeric($id)) {
                $category = $this->categoryModel->findById($id);
            } else {
                $category = $this->categoryModel->findByKey($id);
            }
            
            if (!$category) {
                Response::error('Category not found', 404);
                return;
            }

            // Get subcategories if any
            $subcategories = $this->categoryModel->getSubcategories($category['id']);

            Response::success([
                'category' => $category,
                'subcategories' => $subcategories
            ], 'Category retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get category by ID error: " . $e->getMessage());
            Response::error('Failed to retrieve category', 500);
        }
    }

    /**
     * Get subcategories (PUBLIC - No authentication required)
     */
    public function getSubcategories($parentId) {
        try {
            $subcategories = $this->categoryModel->getSubcategories($parentId);
            
            Response::success([
                'subcategories' => $subcategories,
                'count' => count($subcategories)
            ], 'Subcategories retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get subcategories error: " . $e->getMessage());
            Response::error('Failed to retrieve subcategories', 500);
        }
    }

    /**
     * Get all categories including inactive (PROTECTED - Admin only)
     */
    public function getAll() {
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

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            $categories = $this->categoryModel->getAll($limit, $offset);
            $total = $this->categoryModel->getTotalCount(false);
            
            Response::success([
                'categories' => $categories,
                'total' => $total,
                'count' => count($categories)
            ], 'All categories retrieved successfully');
            
        } catch (Exception $e) {
            error_log("Get all categories error: " . $e->getMessage());
            Response::error('Failed to retrieve categories', 500);
        }
    }

    /**
     * Create new category (PROTECTED - Admin only)
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
            $requiredFields = ['category_key', 'name'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check if category_key already exists
            if ($this->categoryModel->categoryKeyExists($input['category_key'])) {
                Response::error('Category key already exists', 409);
                return;
            }

            $categoryId = $this->categoryModel->create($input);

            if ($categoryId) {
                $category = $this->categoryModel->findById($categoryId);
                Response::success([
                    'category' => $category
                ], 'Category created successfully', 201);
            } else {
                Response::error('Failed to create category', 500);
            }

        } catch (Exception $e) {
            error_log("Create category error: " . $e->getMessage());
            Response::error('Failed to create category', 500);
        }
    }

    /**
     * Update category (PROTECTED - Admin only)
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

            // Check if category exists
            $category = $this->categoryModel->findById($id);
            if (!$category) {
                Response::error('Category not found', 404);
                return;
            }

            // Validate required fields
            $requiredFields = ['name'];
            $errors = Validator::validateRequired($requiredFields, $input);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $result = $this->categoryModel->update($id, $input);

            if ($result) {
                $updatedCategory = $this->categoryModel->findById($id);
                Response::success([
                    'category' => $updatedCategory
                ], 'Category updated successfully');
            } else {
                Response::error('Failed to update category', 500);
            }

        } catch (Exception $e) {
            error_log("Update category error: " . $e->getMessage());
            Response::error('Failed to update category', 500);
        }
    }

    /**
     * Update category status (PROTECTED - Admin only)
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

            $validStatuses = ['active', 'inactive'];
            if (!in_array($input['status'], $validStatuses)) {
                Response::error('Invalid status value. Must be: active or inactive', 400);
                return;
            }

            // Check if category exists
            $category = $this->categoryModel->findById($id);
            if (!$category) {
                Response::error('Category not found', 404);
                return;
            }

            $result = $this->categoryModel->updateStatus($id, $input['status']);

            if ($result) {
                Response::success([
                    'category_id' => (int)$id,
                    'status' => $input['status']
                ], 'Category status updated successfully');
            } else {
                Response::error('Failed to update status', 500);
            }

        } catch (Exception $e) {
            error_log("Update category status error: " . $e->getMessage());
            Response::error('Failed to update category status', 500);
        }
    }

    /**
     * Delete category (PROTECTED - Admin only)
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

            // Check if category exists
            $category = $this->categoryModel->findById($id);
            if (!$category) {
                Response::error('Category not found', 404);
                return;
            }

            try {
                $result = $this->categoryModel->delete($id);

                if ($result) {
                    Response::success(null, 'Category deleted successfully');
                } else {
                    Response::error('Failed to delete category', 500);
                }
            } catch (Exception $e) {
                if (strpos($e->getMessage(), 'Cannot delete category') !== false) {
                    Response::error($e->getMessage(), 400);
                } else {
                    throw $e;
                }
            }

        } catch (Exception $e) {
            error_log("Delete category error: " . $e->getMessage());
            Response::error('Failed to delete category', 500);
        }
    }
}
?>