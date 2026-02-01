/**
 * API Request Interceptor
 * Intercepts and modifies all fetch requests
 */

(function () {
    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
        // Only intercept API calls
        if (!url.includes(API_CONFIG.BASE_URL)) {
            return originalFetch(url, options);
        }

        try {
            // Check rate limit
            if (!apiRateLimiter.isAllowed('api_calls')) {
                throw new Error('Rate limit exceeded. Please wait before making more requests.');
            }

            // Add security headers
            options.headers = {
                ...options.headers,
                ...getAuthHeaders()
            };

            // Set timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            options.signal = controller.signal;

            // Make the request
            const response = await originalFetch(url, options);
            clearTimeout(timeoutId);

            // Handle response
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.response = response;

                try {
                    error.data = await response.json();
                } catch (e) {
                    // Response might not be JSON
                }

                throw error;
            }

            return response;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    };
})();

/**
 * Secure fetch wrapper with retry logic
 */
async function secureFetch(url, options = {}, retries = API_CONFIG.MAX_RETRIES) {
    try {
        return await fetch(url, options);
    } catch (error) {
        if (retries > 0 && error.message !== 'Rate limit exceeded') {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
            return secureFetch(url, options, retries - 1);
        }
        throw error;
    }
}

window.secureFetch = secureFetch;