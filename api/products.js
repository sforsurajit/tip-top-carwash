/**
 * Product API Functions
 * Handles all product-related API calls
 */

/**
 * Fetch home page products (8 featured products) (PUBLIC)
 * @param {number} limit - Number of products to fetch (default: 8)
 * @returns {Promise} - Product data or error
 */
async function fetchHomeProducts(limit = 8) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.HOME}?limit=${limit}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.products,
            count: data.data.count
        };
        
    } catch (error) {
        console.error('Fetch home products error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch products' 
        };
    }
}

/**
 * Fetch all active products with filters (PUBLIC)
 * @param {Object} filters - Filter options
 * @returns {Promise} - Product data or error
 */
async function fetchProducts(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        
        // Pagination
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.offset) queryParams.append('offset', filters.offset);
        
        // Filters
        if (filters.category_id) queryParams.append('category_id', filters.category_id);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.min_price) queryParams.append('min_price', filters.min_price);
        if (filters.max_price) queryParams.append('max_price', filters.max_price);
        if (filters.brand) queryParams.append('brand', filters.brand);
        if (filters.stock_status) queryParams.append('stock_status', filters.stock_status);
        
        // Feature flags
        if (filters.featured) queryParams.append('featured', 'true');
        if (filters.bestseller) queryParams.append('bestseller', 'true');
        if (filters.new) queryParams.append('new', 'true');
        
        // Sorting
        if (filters.sort) queryParams.append('sort', filters.sort);
        
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.ACTIVE}${queryString ? '?' + queryString : ''}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.products,
            total: data.data.total,
            count: data.data.count,
            limit: data.data.limit,
            offset: data.data.offset
        };
        
    } catch (error) {
        console.error('Fetch products error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch products' 
        };
    }
}

/**
 * Fetch product details by ID or slug (PUBLIC)
 * @param {string|number} productId - Product ID or slug
 * @returns {Promise} - Product details or error
 */
async function fetchProductDetails(productId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.DETAILS}/${productId}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.product 
        };
        
    } catch (error) {
        console.error('Fetch product details error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch product details' 
        };
    }
}

/**
 * Fetch all brands (PUBLIC)
 * @returns {Promise} - Brands list or error
 */
async function fetchBrands() {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.BRANDS}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });
        
        return { 
            success: true, 
            data: data.data.brands,
            count: data.data.count
        };
        
    } catch (error) {
        console.error('Fetch brands error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to fetch brands' 
        };
    }
}

/**
 * Create new product (ADMIN ONLY)
 * @param {Object} productData - Product data object
 * @returns {Promise} - Created product or error
 */
async function createProduct(productData) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.CREATE}`;
        
        const data = await makeApiRequest(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(productData)
        });
        
        return { 
            success: true, 
            data: data.data.product,
            message: data.message
        };
        
    } catch (error) {
        console.error('Create product error:', error);
        handleApiError(error, 'createProduct');
        return { 
            success: false, 
            error: error.message || 'Failed to create product' 
        };
    }
}

/**
 * Update product (ADMIN ONLY)
 * @param {number} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise} - Updated product or error
 */
async function updateProduct(productId, productData) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE}/${productId}`;
        
        const data = await makeApiRequest(url, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(productData)
        });
        
        return { 
            success: true, 
            data: data.data.product,
            message: data.message
        };
        
    } catch (error) {
        console.error('Update product error:', error);
        handleApiError(error, 'updateProduct');
        return { 
            success: false, 
            error: error.message || 'Failed to update product' 
        };
    }
}

/**
 * Update product status (ADMIN ONLY)
 * @param {number} productId - Product ID
 * @param {string} status - New status (active/inactive/draft)
 * @returns {Promise} - Success or error
 */
async function updateProductStatus(productId, status) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE_STATUS}/${productId}/status`;
        
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
        console.error('Update product status error:', error);
        handleApiError(error, 'updateProductStatus');
        return { 
            success: false, 
            error: error.message || 'Failed to update product status' 
        };
    }
}

/**
 * Update product stock (ADMIN ONLY)
 * @param {number} productId - Product ID
 * @param {number} quantity - Stock quantity
 * @param {string} operation - Operation type (set/add/subtract)
 * @returns {Promise} - Success or error
 */
async function updateProductStock(productId, quantity, operation = 'set') {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE_STOCK}/${productId}/stock`;
        
        const data = await makeApiRequest(url, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity, operation })
        });
        
        return { 
            success: true, 
            data: data.data,
            message: data.message
        };
        
    } catch (error) {
        console.error('Update product stock error:', error);
        handleApiError(error, 'updateProductStock');
        return { 
            success: false, 
            error: error.message || 'Failed to update stock' 
        };
    }
}

/**
 * Delete product (ADMIN ONLY)
 * @param {number} productId - Product ID
 * @returns {Promise} - Success or error
 */
async function deleteProduct(productId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.DELETE}/${productId}`;
        
        const data = await makeApiRequest(url, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        return { 
            success: true, 
            message: data.message
        };
        
    } catch (error) {
        console.error('Delete product error:', error);
        handleApiError(error, 'deleteProduct');
        return { 
            success: false, 
            error: error.message || 'Failed to delete product' 
        };
    }
}

/**
 * Get product statistics (ADMIN ONLY)
 * @returns {Promise} - Statistics or error
 */
async function getProductStatistics() {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS.STATISTICS}`;
        
        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        return { 
            success: true, 
            data: data.data.statistics
        };
        
    } catch (error) {
        console.error('Get product statistics error:', error);
        handleApiError(error, 'getProductStatistics');
        return { 
            success: false, 
            error: error.message || 'Failed to fetch statistics' 
        };
    }
}

// Export functions
window.ProductAPI = {
    fetchHomeProducts,
    fetchProducts,
    fetchProductDetails,
    fetchBrands,
    createProduct,
    updateProduct,
    updateProductStatus,
    updateProductStock,
    deleteProduct,
    getProductStatistics
};