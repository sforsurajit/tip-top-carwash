/**
 * Service API Functions
 * Handles all service-related API calls
 */

/**
 * Fetch all active services (PUBLIC)
 * @param {Object} params - Optional parameters (limit, offset, vehicleCategory)
 * @returns {Promise} - Service data or error
 */
async function fetchServices(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);
        if (params.vehicleCategory) queryParams.append('vehicle_category', params.vehicleCategory);

        const queryString = queryParams.toString();
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.ACTIVE}${queryString ? '?' + queryString : ''}`;

        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });

        return {
            success: true,
            data: data.data.services,
            total: data.data.total,
            count: data.data.count,
            vehicleCategory: data.data.vehicle_category
        };

    } catch (error) {
        console.error('Fetch services error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch services'
        };
    }
}

/**
 * Fetch service details by ID or key (PUBLIC)
 * @param {string|number} serviceId - Service ID or service_key
 * @returns {Promise} - Service details or error
 */
async function fetchServiceDetails(serviceId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.DETAILS}/${serviceId}`;

        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: API_CONFIG.HEADERS
        });

        return {
            success: true,
            data: data.data.service
        };

    } catch (error) {
        console.error('Fetch service details error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch service details'
        };
    }
}

/**
 * Fetch all services including inactive (ADMIN ONLY)
 * @param {Object} params - Optional parameters (limit, offset)
 * @returns {Promise} - Service data or error
 */
async function fetchAllServices(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);

        const queryString = queryParams.toString();
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.ALL}${queryString ? '?' + queryString : ''}`;

        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        return {
            success: true,
            data: data.data.services,
            total: data.data.total,
            count: data.data.count
        };

    } catch (error) {
        console.error('Fetch all services error:', error);
        handleApiError(error, 'fetchAllServices');
        return {
            success: false,
            error: error.message || 'Failed to fetch services'
        };
    }
}

/**
 * Create new service (ADMIN ONLY)
 * @param {Object} serviceData - Service data object
 * @returns {Promise} - Created service or error
 */
async function createService(serviceData) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.CREATE}`;

        const data = await makeApiRequest(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(serviceData)
        });

        return {
            success: true,
            data: data.data.service,
            message: data.message
        };

    } catch (error) {
        console.error('Create service error:', error);
        handleApiError(error, 'createService');
        return {
            success: false,
            error: error.message || 'Failed to create service'
        };
    }
}

/**
 * Update service (ADMIN ONLY)
 * @param {number} serviceId - Service ID
 * @param {Object} serviceData - Updated service data
 * @returns {Promise} - Updated service or error
 */
async function updateService(serviceId, serviceData) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.UPDATE}/${serviceId}`;

        const data = await makeApiRequest(url, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(serviceData)
        });

        return {
            success: true,
            data: data.data.service,
            message: data.message
        };

    } catch (error) {
        console.error('Update service error:', error);
        handleApiError(error, 'updateService');
        return {
            success: false,
            error: error.message || 'Failed to update service'
        };
    }
}

/**
 * Update service status (ADMIN ONLY)
 * @param {number} serviceId - Service ID
 * @param {string} status - New status (active/inactive)
 * @returns {Promise} - Success or error
 */
async function updateServiceStatus(serviceId, status) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.UPDATE}/${serviceId}/status`;

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
        console.error('Update service status error:', error);
        handleApiError(error, 'updateServiceStatus');
        return {
            success: false,
            error: error.message || 'Failed to update service status'
        };
    }
}

/**
 * Delete service (ADMIN ONLY)
 * @param {number} serviceId - Service ID
 * @returns {Promise} - Success or error
 */
async function deleteService(serviceId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.DELETE}/${serviceId}`;

        const data = await makeApiRequest(url, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        return {
            success: true,
            message: data.message
        };

    } catch (error) {
        console.error('Delete service error:', error);
        handleApiError(error, 'deleteService');
        return {
            success: false,
            error: error.message || 'Failed to delete service'
        };
    }
}

/**
 * Get service statistics (ADMIN ONLY)
 * @returns {Promise} - Statistics or error
 */
async function getServiceStatistics() {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.STATISTICS}`;

        const data = await makeApiRequest(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        return {
            success: true,
            data: data.data.statistics
        };

    } catch (error) {
        console.error('Get service statistics error:', error);
        handleApiError(error, 'getServiceStatistics');
        return {
            success: false,
            error: error.message || 'Failed to fetch statistics'
        };
    }
}

// Export functions
window.ServiceAPI = {
    fetchServices,
    fetchServiceDetails,
    fetchAllServices,
    createService,
    updateService,
    updateServiceStatus,
    deleteService,
    getServiceStatistics
};