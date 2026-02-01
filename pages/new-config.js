/**
 * TIP-TOP CAR WASH - Configuration
 */

const API_CONFIG = {
    // Base URL for API - Using production API
    BASE_URL: 'https://tip-topcarwash.in/api/v1',

    // API Endpoints
    ENDPOINTS: {
        // Authentication
        SEND_OTP: '/auth/send-register-otp',
        VERIFY_OTP: '/auth/verify-register-otp',
        REGISTER: '/auth/register',
        COMPLETE_REGISTRATION: '/auth/complete-registration',

        // Vehicle Categories
        VEHICLE_CATEGORIES: '/car-categories/active',

        // Services
        SERVICES_BY_VEHICLE: '/services/vehicle', // + /{vehicle_id}

        // Zones
        ZONES: '/zones_routes/',
        CHECK_LOCATION: '/zones_routes', // + /{zone_id}/check-location

        // Vehicles
        CUSTOMER_VEHICLES: '/vehicles', // + /{customer_id}
        CREATE_VEHICLE: '/vehicles/',

        // Bookings
        CREATE_BOOKING: '/bookings/',
        CUSTOMER_BOOKINGS: '/bookings/customer-bookings',
        UPDATE_BOOKING_STATUS: '/bookings' // + /{id}/status
    },

    // Request timeout in milliseconds
    TIMEOUT: 30000,

    // Retry configuration
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000
    }
};

// Business Configuration
const BUSINESS_CONFIG = {
    // Working hours
    WORKING_HOURS: {
        START: 7,  // 7 AM
        END: 18    // 6 PM
    },

    // Time slot duration in minutes
    TIME_SLOT_DURATION: 60,

    // Maximum advance booking days
    MAX_BOOKING_DAYS: 30,

    // Online payment discount
    ONLINE_DISCOUNT_PERCENT: 7,

    // Currency
    CURRENCY: {
        SYMBOL: '₹',
        CODE: 'INR',
        LOCALE: 'en-IN'
    }
};

// App Configuration
const APP_CONFIG = {
    // App name
    NAME: 'Tip-Top Car Wash',

    // Version
    VERSION: '2.0.0',

    // Storage keys
    STORAGE_KEYS: {
        USER: 'tiptop_user',
        TOKEN: 'tiptop_token',
        LAST_BOOKING: 'tiptop_last_booking'
    },

    // Feature flags
    FEATURES: {
        ONLINE_PAYMENT: true,
        SAVED_VEHICLES: true,
        LANDMARK_SUGGESTION: true,
        GPS_DETECTION: true
    }
};

// Export for use
window.API_CONFIG = API_CONFIG;
window.BUSINESS_CONFIG = BUSINESS_CONFIG;
window.APP_CONFIG = APP_CONFIG;