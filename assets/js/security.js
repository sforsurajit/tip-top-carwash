/**
 * Security Module
 * Handles XSS prevention, input sanitization, and security utilities
 */

const Security = {
    /**
     * Sanitize HTML input to prevent XSS
     */
    sanitizeHtml(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\//g, "&#x2F;");
    },

    /**
     * Strip all HTML tags
     */
    stripHtml(html) {
        if (typeof html !== 'string') return html;
        
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },

    /**
     * Validate and sanitize URL
     */
    sanitizeUrl(url) {
        if (typeof url !== 'string') return '';
        
        // Allow only http and https protocols
        const pattern = /^(https?:\/\/)/i;
        if (!pattern.test(url)) {
            return '';
        }
        
        try {
            const urlObj = new URL(url);
            // Additional validation
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return '';
            }
            return urlObj.href;
        } catch (e) {
            return '';
        }
    },

    /**
     * Get CSRF token from meta tag
     */
    getCsrfToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    },

    /**
     * Generate random string for nonce/state
     */
    generateRandomString(length = 32) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Validate file before upload
     */
    validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB default
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        } = options;

        // Check file size
        if (file.size > maxSize) {
            throw new Error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        }

        // Check MIME type
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type');
        }

        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            throw new Error('Invalid file extension');
        }

        return true;
    },

    /**
     * Prevent timing attacks on string comparison
     */
    safeCompare(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return false;
        }

        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    },

    /**
     * Encode data for safe storage
     */
    encodeData(data) {
        try {
            return btoa(encodeURIComponent(JSON.stringify(data)));
        } catch (e) {
            console.error('Encoding error:', e);
            return null;
        }
    },

    /**
     * Decode stored data
     */
    decodeData(encodedData) {
        try {
            return JSON.parse(decodeURIComponent(atob(encodedData)));
        } catch (e) {
            console.error('Decoding error:', e);
            return null;
        }
    },

    /**
     * Check if running on HTTPS
     */
    isSecureContext() {
        return window.location.protocol === 'https:' || 
               window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1';
    },

    /**
     * Redirect to HTTPS if not already
     */
    enforceHttps() {
        if (!this.isSecureContext() && window.location.hostname !== 'localhost') {
            window.location.href = 'https://' + window.location.host + window.location.pathname;
        }
    },

    /**
     * Prevent clickjacking
     */
    preventClickjacking() {
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    },

    /**
     * Clear sensitive data from memory
     */
    clearSensitiveData(obj) {
        if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'string') {
                    obj[key] = '';
                } else if (typeof obj[key] === 'object') {
                    this.clearSensitiveData(obj[key]);
                }
            });
        }
    }
};

// Initialize security measures
document.addEventListener('DOMContentLoaded', function() {
    // Enforce HTTPS
    Security.enforceHttps();
    
    // Prevent clickjacking
    Security.preventClickjacking();
    
    // Warn if not in secure context (except localhost)
    if (!Security.isSecureContext()) {
        console.warn('WARNING: Application is not running in a secure context (HTTPS)');
    }
});

// Export for use in other modules
window.Security = Security;