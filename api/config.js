/**
 * API Configuration
 * Central configuration for all API calls
 */

// Detect environment
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.');

const API_CONFIG = {
    // Base URL - Always use production server
    BASE_URL: 'https://tip-topcarwash.in/main_erp/api_v1',

    // Environment flag
    IS_LOCAL: isLocalhost,

    TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,

    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },

    ENDPOINTS: {
        AUTH: {
            REGISTER: '/auth/register',                // POST { phone, name, email } - Register new user
            SEND_OTP: '/auth/send-register-otp',       // POST { phone } - Send OTP
            VERIFY_OTP: '/auth/verify-register-otp',   // POST { phone, otp } - Verify OTP
            RESEND_OTP: '/auth/resend-otp',            // POST { phone, type: "register" }
            COMPLETE_REGISTRATION: '/auth/complete-registration', // POST { name, ... }
            LOGIN: '/auth/login',
            LOGOUT: '/auth/logout',
            REFRESH: '/auth/refresh'
        },
        SERVICES: {
            ACTIVE: '/services/active',          // GET - Get all active services (PUBLIC)
            ALL: '/services/all',                 // GET - Get all services (ADMIN)
            DETAILS: '/services',                 // GET /:id - Get service details (PUBLIC)
            CREATE: '/services',                  // POST - Create service (ADMIN)
            UPDATE: '/services',                  // PUT /:id - Update service (ADMIN)
            DELETE: '/services',                  // DELETE /:id - Delete service (ADMIN)
            STATISTICS: '/services/statistics'    // GET - Get statistics (ADMIN)
        },
        PRODUCTS: {
            HOME: '/products/home',               // GET - Get home page products (PUBLIC)
            ACTIVE: '/products/active',           // GET - Get all active products (PUBLIC)
            DETAILS: '/products',                 // GET /:id - Get product details (PUBLIC)
            BRANDS: '/products/brands',           // GET - Get all brands (PUBLIC)
            CREATE: '/products',                  // POST - Create product (ADMIN)
            UPDATE: '/products',                  // PUT /:id - Update product (ADMIN)
            DELETE: '/products',                  // DELETE /:id - Delete product (ADMIN)
            UPDATE_STATUS: '/products',           // PUT /:id/status - Update status (ADMIN)
            UPDATE_STOCK: '/products',            // PUT /:id/stock - Update stock (ADMIN)
            STATISTICS: '/products/statistics'    // GET - Get statistics (ADMIN)
        },
        CATEGORIES: {
            ACTIVE: '/categories/active',         // GET - Get all active categories (PUBLIC)
            TOP_LEVEL: '/categories/top-level',   // GET - Get top level categories (PUBLIC)
            DETAILS: '/categories',               // GET /:id - Get category details (PUBLIC)
            SUBCATEGORIES: '/categories',         // GET /:id/subcategories - Get subcategories (PUBLIC)
            ALL: '/categories/all',               // GET - Get all categories (ADMIN)
            CREATE: '/categories',                // POST - Create category (ADMIN)
            UPDATE: '/categories',                // PUT /:id - Update category (ADMIN)
            DELETE: '/categories',                // DELETE /:id - Delete category (ADMIN)
            UPDATE_STATUS: '/categories'          // PUT /:id/status - Update status (ADMIN)
        },
        BOOKING: {
            CREATE: '/booking/create',
            LIST: '/booking/list',
            DETAILS: '/booking/details',
            CANCEL: '/booking/cancel'
        },
        CUSTOMERS: {
            CHECK_PHONE: '/routes/customers.php/check-phone',
            PROFILE: '/routes/customers.php',
            CREATE: '/routes/customers.php',
            UPDATE: '/routes/customers.php',
            LAST_BOOKING: '/routes/customers.php',
            BOOKINGS: '/routes/customers.php',
            VEHICLES: '/routes/customers.php',
            LOCATIONS: '/routes/customers.php',
            STATISTICS: '/routes/customers.php'
        },
        USER: {
            PROFILE: '/user/profile',
            UPDATE: '/user/update',
            CARS: '/user/cars'
        }
    }
};

/**
 * Get authentication headers
 */
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };

    // Add CSRF token if available
    if (typeof Security !== 'undefined') {
        const csrfToken = Security.getCsrfToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
    }

    return headers;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    // Check for session indicator (not the actual token)
    return sessionStorage.getItem('authenticated') === 'true';
}

/**
 * Handle API errors
 */
function handleApiError(error, context = '') {
    console.error(`API Error (${context}):`, error);

    if (error.message && error.message.includes('Rate limit')) {
        if (typeof showNotification === 'function') {
            showNotification(error.message, 'error');
        }
        return;
    }

    if (error.status === 401) {
        // Unauthorized - clear session and redirect to login
        sessionStorage.clear();
        if (typeof showNotification === 'function') {
            showNotification('Session expired. Please login again.', 'error');
        }
        setTimeout(() => {
            if (typeof openAuthModal === 'function') {
                openAuthModal();
            }
        }, 1500);
        return;
    }

    if (error.status === 403) {
        if (typeof showNotification === 'function') {
            showNotification('Access denied', 'error');
        }
        return;
    }

    if (error.status === 429) {
        if (typeof showNotification === 'function') {
            showNotification('Too many requests. Please slow down.', 'error');
        }
        return;
    }

    if (error.status >= 500) {
        if (typeof showNotification === 'function') {
            showNotification('Server error. Please try again later.', 'error');
        }
        return;
    }

    if (typeof showNotification === 'function') {
        showNotification(error.message || 'An error occurred', 'error');
    }
}

/**
 * Make API request with retry logic
 */
async function makeApiRequest(url, options = {}, retries = API_CONFIG.MAX_RETRIES) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw {
                status: response.status,
                message: data.message || 'Request failed',
                data: data
            };
        }

        return data;

    } catch (error) {
        // Retry logic for network errors
        if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
            return makeApiRequest(url, options, retries - 1);
        }

        throw error;
    }
}

// Export for use in other modules
window.API_CONFIG = API_CONFIG;
window.getAuthHeaders = getAuthHeaders;
window.isAuthenticated = isAuthenticated;
window.handleApiError = handleApiError;
window.makeApiRequest = makeApiRequest;