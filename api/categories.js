/**
 * Category API Functions
 * Handles all category-related API calls
 */

/**
 * Fetch all active categories (PUBLIC)
 * @param {Object} params - Optional parameters (limit, offset)
 * @returns {Promise} - Category data or error
 */
async function fetchCategories(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);
        
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.ACTIVE}${queryString ? '?' + queryString : ''}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.categories,
            total: data.data.total,
            count: data.data.count
        };
        
    } catch (error) {
        console.error('Fetch categories error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch categories' 
        };
    }
}

/**
 * Fetch top level categories (PUBLIC)
 * @returns {Promise} - Category data or error
 */
async function fetchTopLevelCategories() {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.TOP_LEVEL}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.categories,
            count: data.data.count
        };
        
    } catch (error) {
        console.error('Fetch top level categories error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch categories' 
        };
    }
}

/**
 * Fetch category details by ID or key (PUBLIC)
 * @param {string|number} categoryId - Category ID or category_key
 * @returns {Promise} - Category details or error
 */
async function fetchCategoryDetails(categoryId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.DETAILS}/${categoryId}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.category,
            subcategories: data.data.subcategories || []
        };
        
    } catch (error) {
        console.error('Fetch category details error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch category details' 
        };
    }
}

/**
 * Fetch subcategories (PUBLIC)
 * @param {number} parentId - Parent category ID
 * @returns {Promise} - Subcategories or error
 */
async function fetchSubcategories(parentId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.SUBCATEGORIES}/${parentId}/subcategories`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.subcategories,
            count: data.data.count
        };
        
    } catch (error) {
        console.error('Fetch subcategories error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch subcategories' 
        };
    }
}

/**
 * Fetch all categories including inactive (ADMIN ONLY)
 * @param {Object} params - Optional parameters (limit, offset)
 * @returns {Promise} - Category data or error
 */
async function fetchAllCategories(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);
        
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.ALL}${queryString ? '?' + queryString : ''}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        return { 
            success: true, 
            data: data.data.categories,
            total: data.data.total,
            count: data.data.count
        };
        
    } catch (error) {
        console.error('Fetch all categories error:', error);
        handleApiError(error, 'fetchAllCategories');
        return { 
            success: false, 
            error: error.message || 'Failed to fetch categories' 
        };
    }
}

/**
 * Create new category (ADMIN ONLY)
 * @param {Object} categoryData - Category data object
 * @returns {Promise} - Created category or error
 */
async function createCategory(categoryData) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.CREATE}`;
        
        const data = await makeApiRequest(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(categoryData)
        });
        
        return { 
            success: true, 
            data: data.data.category,
            message: data.message
        };
        
    } catch (error) {
        console.error('Create category error:', error);
        handleApiError(error, 'createCategory');
        return { 
            success: false, 
            error: error.message || 'Failed to create category' 
        };
    }
}

/**
 * Update category (ADMIN ONLY)
 * @param {number} categoryId - Category ID
 * @param {Object} categoryData - Updated category data
 * @returns {Promise} - Updated category or error
 */
async function updateCategory(categoryId, categoryData) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.UPDATE}/${categoryId}`;
        
        const data = await makeApiRequest(url, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(categoryData)
        });
        
        return { 
            success: true, 
            data: data.data.category,
            message: data.message
        };
        
    } catch (error) {
        console.error('Update category error:', error);
        handleApiError(error, 'updateCategory');
        return { 
            success: false, 
            error: error.message || 'Failed to update category' 
        };
    }
}

/**
 * Update category status (ADMIN ONLY)
 * @param {number} categoryId - Category ID
 * @param {string} status - New status (active/inactive)
 * @returns {Promise} - Success or error
 */
async function updateCategoryStatus(categoryId, status) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.UPDATE_STATUS}/${categoryId}/status`;
        
        const data = await makeApiRequest(url, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        
        return { 
            success: true, 
            message: data.message
        };
        
    } catch (error) {
        console.error('Update category status error:', error);
        handleApiError(error, 'updateCategoryStatus');
        return { 
            success: false, 
            error: error.message || 'Failed to update category status' 
        };
    }
}

/**
 * Delete category (ADMIN ONLY)
 * @param {number} categoryId - Category ID
 * @returns {Promise} - Success or error
 */
async function deleteCategory(categoryId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES.DELETE}/${categoryId}`;
        
        const data = await makeApiRequest(url, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        return { 
            success: true, 
            message: data.message
        };
        
    } catch (error) {
        console.error('Delete category error:', error);
        handleApiError(error, 'deleteCategory');
        return { 
            success: false, 
            error: error.message || 'Failed to delete category' 
        };
    }
}

// Export functions
window.CategoryAPI = {
    fetchCategories,
    fetchTopLevelCategories,
    fetchCategoryDetails,
    fetchSubcategories,
    fetchAllCategories,
    createCategory,
    updateCategory,
    updateCategoryStatus,
    deleteCategory
};