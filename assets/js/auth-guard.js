/**
 * Authentication Guard
 * Protects pages that require authentication
 * Redirects unauthenticated users to homepage with auth modal
 * 
 * @package TipTop Car Wash
 * @version 1.0
 */

(function () {
    'use strict';

    /**
     * Check if user is authenticated
     */
    function checkAuthentication() {
        console.log('🔒 Auth Guard: Checking authentication...');

        // Check for existing session
        const savedCustomer = localStorage.getItem('customer_data');
        const savedPhone = localStorage.getItem('customer_phone');
        const authToken = localStorage.getItem('auth_token');

        // User is authenticated if they have customer data and phone
        const isAuthenticated = !!(savedCustomer && savedPhone);

        console.log('🔒 Auth Guard: Authentication status:', isAuthenticated);

        if (!isAuthenticated) {
            console.log('🔒 Auth Guard: User not authenticated, redirecting to homepage...');

            // Store the current page URL as the intended destination
            const currentPath = window.location.pathname;
            localStorage.setItem('auth_redirect_after_login', currentPath);
            console.log('🔒 Auth Guard: Stored redirect destination:', currentPath);

            // Redirect to homepage
            window.location.href = '../index.html';

            // Set flag to open auth modal after redirect
            localStorage.setItem('open_auth_modal_on_load', 'true');
        } else {
            console.log('✅ Auth Guard: User authenticated, allowing access');
        }
    }

    // Run authentication check when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthentication);
    } else {
        checkAuthentication();
    }
})();
