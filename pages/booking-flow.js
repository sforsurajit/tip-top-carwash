/**
 * TIP-TOP CAR WASH - Premium Booking Flow
 * Complete API Integration with Modern UX
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // Use API_CONFIG from new-config.js (loaded before this script)
    get API_BASE() {
        return typeof API_CONFIG !== 'undefined' ? API_CONFIG.BASE_URL : 'https://tip-topcarwash.in/api/v1';
    },
    get WORKING_HOURS() {
        return typeof BUSINESS_CONFIG !== 'undefined' ? BUSINESS_CONFIG.WORKING_HOURS : { start: 7, end: 18 };
    },
    TIME_SLOT_DURATION: 60, // minutes
    get ONLINE_DISCOUNT() {
        return typeof BUSINESS_CONFIG !== 'undefined' ? (BUSINESS_CONFIG.ONLINE_DISCOUNT_PERCENT / 100) : 0.07;
    }
};

// ============================================
// MOCK DATA - Car Brands & Models
// ============================================
const MOCK_CAR_BRANDS = [
    { id: 1, name: 'Maruti Suzuki', logo: '🚗' },
    { id: 2, name: 'Hyundai', logo: '🚙' },
    { id: 3, name: 'Tata', logo: '🚐' },
    { id: 4, name: 'Mahindra', logo: '🚙' },
    { id: 5, name: 'Honda', logo: '🚗' },
    { id: 6, name: 'Toyota', logo: '🚙' },
    { id: 7, name: 'Kia', logo: '🚐' },
    { id: 8, name: 'Renault', logo: '🚗' },
    { id: 9, name: 'Nissan', logo: '🚙' },
    { id: 10, name: 'Volkswagen', logo: '🚗' },
    { id: 11, name: 'Skoda', logo: '🚙' },
    { id: 12, name: 'MG', logo: '🚐' }
];

const MOCK_CAR_MODELS = {
    1: [ // Maruti Suzuki
        { id: 101, name: 'Alto', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 102, name: 'Swift', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 103, name: 'Baleno', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 104, name: 'Dzire', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 105, name: 'Ciaz', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 106, name: 'Ertiga', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 107, name: 'Brezza', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    2: [ // Hyundai
        { id: 201, name: 'i10', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 202, name: 'i20', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 203, name: 'Verna', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 204, name: 'Creta', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 205, name: 'Venue', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 206, name: 'Alcazar', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    3: [ // Tata
        { id: 301, name: 'Tiago', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 302, name: 'Altroz', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 303, name: 'Tigor', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 304, name: 'Nexon', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 305, name: 'Harrier', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 306, name: 'Safari', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    4: [ // Mahindra
        { id: 401, name: 'XUV300', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 402, name: 'XUV500', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 403, name: 'XUV700', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 404, name: 'Scorpio', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 405, name: 'Thar', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    5: [ // Honda
        { id: 501, name: 'Amaze', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 502, name: 'City', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 503, name: 'Civic', type: 'Sedan', categoryId: 2, multiplier: 1.2 }
    ],
    6: [ // Toyota
        { id: 601, name: 'Glanza', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 602, name: 'Fortuner', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 603, name: 'Innova Crysta', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    7: [ // Kia
        { id: 701, name: 'Seltos', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 702, name: 'Sonet', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 703, name: 'Carens', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    8: [ // Renault
        { id: 801, name: 'Kwid', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 802, name: 'Triber', type: 'Hatchback', categoryId: 1, multiplier: 1.0 }
    ],
    9: [ // Nissan
        { id: 901, name: 'Magnite', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    10: [ // Volkswagen
        { id: 1001, name: 'Polo', type: 'Hatchback', categoryId: 1, multiplier: 1.0 },
        { id: 1002, name: 'Vento', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 1003, name: 'Taigun', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    11: [ // Skoda
        { id: 1101, name: 'Rapid', type: 'Sedan', categoryId: 2, multiplier: 1.2 },
        { id: 1102, name: 'Kushaq', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ],
    12: [ // MG
        { id: 1201, name: 'Hector', type: 'SUV', categoryId: 3, multiplier: 1.5 },
        { id: 1202, name: 'Astor', type: 'SUV', categoryId: 3, multiplier: 1.5 }
    ]
};

// ============================================
// BOOKING STATE MANAGEMENT
// ============================================
const BookingState = {
    currentStep: 1,
    totalSteps: 5,

    // User Data
    user: {
        id: null,
        phone: null,
        name: null,
        email: null,
        isNewUser: true,
        token: null
    },

    // Vehicle Selection
    vehicle: {
        brandId: null,
        brandName: null,
        modelId: null,
        modelName: null,
        categoryId: null,
        categoryName: null,
        vehicleId: null,
        vehicleName: null,
        multiplier: 1.0,
        isCustom: false, // For manual entry
        savedVehicles: []
    },

    // Service Selection
    service: {
        id: null,
        name: null,
        basePrice: 0,
        finalPrice: 0,
        features: []
    },

    // Location
    location: {
        method: null, // null, 'auto' or 'manual' - user must choose
        lat: null,
        lng: null,
        tempLat: null, // For map link parsing
        tempLng: null,
        address: null,
        zoneId: null,
        zoneName: null,
        isValid: false
    },

    // Schedule
    schedule: {
        date: null,
        displayDate: null,
        time: null,
        displayTime: null
    },

    // Landmark
    landmark: {
        type: null,
        name: null
    },

    // Payment
    payment: {
        method: 'online',
        totalPrice: 0,
        discount: 0,
        finalAmount: 0
    },

    // API Data Cache
    cache: {
        vehicleCategories: [],
        services: [],
        zones: []
    }
};

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
    // Initialize after DOM load
    init() {
        // Steps
        this.steps = document.querySelectorAll('.step-item');
        this.connectors = document.querySelectorAll('.step-connector');
        this.panels = document.querySelectorAll('.step-panel');
        this.currentStepEl = document.querySelector('.current-step');

        // Navigation
        this.backBtn = document.getElementById('backBtn');
        this.backBtnMobile = document.getElementById('backBtnMobile');
        this.nextBtn = document.getElementById('nextBtn');
        this.confirmBtn = document.getElementById('confirmBtn');

        // Step 1: Vehicle
        this.carSearchInput = document.getElementById('carSearchInput');
        this.searchClear = document.getElementById('searchClear');
        this.searchResults = document.getElementById('searchResults');

        // Brand/Model Selection
        this.brandSelectionView = document.getElementById('brandSelectionView');
        this.modelSelectionView = document.getElementById('modelSelectionView');
        this.manualEntryView = document.getElementById('manualEntryView');
        this.brandGrid = document.getElementById('brandGrid');
        this.modelGrid = document.getElementById('modelGrid');
        this.selectedBrandHeader = document.getElementById('selectedBrandHeader');
        this.selectedBrandLogo = document.getElementById('selectedBrandLogo');
        this.selectedBrandName = document.getElementById('selectedBrandName');
        this.backToBrandsBtn = document.getElementById('backToBrandsBtn');
        this.backFromManualBtn = document.getElementById('backFromManualBtn');

        // Manual Entry Form
        this.manualBrandInput = document.getElementById('manualBrandInput');
        this.manualModelInput = document.getElementById('manualModelInput');
        this.manualCategorySelect = document.getElementById('manualCategorySelect');
        this.confirmManualBtn = document.getElementById('confirmManualBtn');

        // Legacy (keep for saved vehicles)
        this.savedVehiclesSection = document.getElementById('savedVehiclesSection');
        this.savedVehiclesGrid = document.getElementById('savedVehiclesGrid');
        this.newVehicleSection = document.getElementById('newVehicleSection');
        this.addNewVehicleBtn = document.getElementById('addNewVehicleBtn');


        // Step 2: Services
        this.servicesGrid = document.getElementById('servicesGrid');
        this.selectedVehicleType = document.getElementById('selectedVehicleType');

        // Step 3: Location
        this.detectLocationBtn = document.getElementById('detectLocationBtn');
        this.manualLocationBtn = document.getElementById('manualLocationBtn');
        this.locationDetectArea = document.getElementById('locationDetectArea');
        this.detectStatus = document.getElementById('detectStatus');
        this.locationSuccess = document.getElementById('locationSuccess');
        this.locationError = document.getElementById('locationError');
        this.detectedAddress = document.getElementById('detectedAddress');
        this.zoneBadge = document.getElementById('zoneBadge');
        this.zoneName = document.getElementById('zoneName');
        this.changeLocationBtn = document.getElementById('changeLocationBtn');
        this.tryManualBtn = document.getElementById('tryManualBtn');
        this.manualEntryArea = document.getElementById('manualEntryArea');
        this.manualZoneSelect = document.getElementById('zoneSelect');
        this.manualAddressInput = document.getElementById('manualAddress');
        this.confirmAddressBtn = document.getElementById('confirmAddressBtn');

        // Step 4: Schedule
        this.quickDates = document.getElementById('quickDates');
        this.showCalendarBtn = document.getElementById('showCalendarBtn');
        this.calendarContainer = document.getElementById('calendarContainer');
        this.calendarMonth = document.getElementById('calendarMonth');
        this.calendarDays = document.getElementById('calendarDays');
        this.prevMonth = document.getElementById('prevMonth');
        this.nextMonth = document.getElementById('nextMonth');
        this.timeSlotsGrid = document.getElementById('timeSlotsGrid');

        // Step 5: Confirmation
        this.userDetailsSection = document.getElementById('userDetailsSection');
        this.customerName = document.getElementById('customerName');
        this.customerEmail = document.getElementById('customerEmail');
        this.landmarkChips = document.getElementById('landmarkChips');
        this.landmarkInputWrapper = document.getElementById('landmarkInputWrapper');
        this.landmarkInput = document.getElementById('landmarkInput');
        this.summaryVehicle = document.getElementById('summaryVehicle');
        this.summaryService = document.getElementById('summaryService');
        this.summaryLocation = document.getElementById('summaryLocation');
        this.summarySchedule = document.getElementById('summarySchedule');
        this.summaryTotal = document.getElementById('summaryTotal');

        // Overlays & Modals
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.successModal = document.getElementById('successModal');
        this.bookingIdDisplay = document.getElementById('bookingIdDisplay');
        this.toastContainer = document.getElementById('toastContainer');

        // User Profile
        this.userProfile = document.getElementById('userProfile');
        this.userName = document.getElementById('userName');
    }
};

// ============================================
// API SERVICE
// ============================================
const API = {
    // Base URL for the Main ERP API
    MAIN_ERP_BASE: 'https://tip-topcarwash.in/main_erp/api_v1',

    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (BookingState.user.token) {
            headers['Authorization'] = `Bearer ${BookingState.user.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // ===== NEW: Real Brand API =====
    async getBrands() {
        console.log('🔄 Fetching brands from API...');
        try {
            const response = await fetch(`${this.MAIN_ERP_BASE}/brands`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.success && data.data && data.data.brands) {
                console.log('✅ Loaded', data.data.brands.length, 'brands from API');
                return data.data.brands;
            }
            throw new Error('Invalid API response');
        } catch (error) {
            console.error('❌ Failed to load brands:', error);
            return null; // Will fall back to mock data
        }
    },

    // ===== NEW: Real Car Models API =====
    async getCarsByBrand(brandId) {
        console.log('🔄 Fetching cars for brand ID:', brandId);
        try {
            const response = await fetch(`${this.MAIN_ERP_BASE}/brands/Allcars/${brandId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.success && data.data) {
                // Check if cars are in data.data.cars (new API structure)
                let cars = data.data.cars || data.data;
                // Handle both single object and array
                cars = Array.isArray(cars) ? cars : [cars];
                console.log('✅ Loaded', cars.length, 'cars for brand');
                return cars;
            }
            throw new Error('Invalid API response');
        } catch (error) {
            console.error('❌ Failed to load cars:', error);
            return null; // Will fall back to mock data
        }
    },

    // ===== NEW: Real Services API =====
    async getServicesByVehicle(carId) {
        console.log('🔄 Fetching services for car ID:', carId);
        try {
            const response = await fetch(`${this.MAIN_ERP_BASE}/services/vehicle/${carId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.success && data.data) {
                // API returns data.services array inside data.data
                const servicesArray = data.data.services || data.data;
                const services = Array.isArray(servicesArray) ? servicesArray : [servicesArray];
                console.log('✅ Loaded', services.length, 'services from API');
                return services;
            }
            throw new Error('Invalid API response');
        } catch (error) {
            console.error('❌ Failed to load services:', error);
            return null; // Will fall back to mock data
        }
    },

    // Vehicle Categories
    async getVehicleCategories() {
        return this.request('/car-categories/active');
    },

    // Legacy Services by Vehicle Type
    async getServices(vehicleId) {
        return this.request(`/services/vehicle/${vehicleId}`);
    },

    // Service Zones
    async getZones() {
        console.log('🔄 Fetching zones from API...');
        try {
            const response = await fetch(`${this.MAIN_ERP_BASE}/zones_routes/`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.success && data.data && data.data.zones) {
                console.log('✅ Loaded', data.data.zones.length, 'zones from API');
                return data;
            }
            throw new Error('Invalid API response');
        } catch (error) {
            console.error('❌ Failed to load zones:', error);
            throw error;
        }
    },

    // Check Location in Zone
    async checkLocation(zoneId, lat, lng) {
        console.log('🔄 Checking location in zone:', zoneId);
        try {
            const response = await fetch(`${this.MAIN_ERP_BASE}/zones_routes/${zoneId}/check-location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.success && data.data) {
                console.log('✅ Location check result:', data.data.is_in_zone ? 'Inside zone' : 'Outside zone');
                return data;
            }
            throw new Error('Invalid API response');
        } catch (error) {
            console.error('❌ Failed to check location:', error);
            throw error;
        }
    },

    // Customer Vehicles
    async getCustomerVehicles(customerId) {
        return this.request(`/vehicles/${customerId}`);
    },

    // Create Vehicle
    async createVehicle(data) {
        console.log('🚗 Creating vehicle:', data);
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('tiptop_token');
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.MAIN_ERP_BASE}/vehicles/`, {
                method: 'POST',
                mode: 'cors',
                headers: headers,
                body: JSON.stringify(data)
            });

            console.log('📥 Vehicle creation response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Vehicle creation error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('📥 Vehicle creation response:', result);

            if (result.success && result.data) {
                // Return the vehicle data with ID
                return {
                    id: result.data.vehicle_id || result.data.vehicle?.id,
                    ...result.data.vehicle
                };
            }
            throw new Error(result.message || 'Vehicle creation failed');
        } catch (error) {
            console.error('❌ Failed to create vehicle:', error);
            throw error;
        }
    },

    // Create Booking
    async createBooking(data) {
        console.log('🔄 Creating booking with data:', data);
        try {
            // Get auth token from localStorage
            const token = localStorage.getItem('auth_token') || localStorage.getItem('tiptop_token');
            console.log('🔑 Auth token from localStorage:', token ? token : 'NOT FOUND');

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('✅ Authorization header set');
            } else {
                console.warn('⚠️ No auth token found in localStorage!');
            }


            const url = `${this.MAIN_ERP_BASE}/bookings/`;
            console.log('📡 Sending request to:', url);
            console.log('📋 Request headers:', JSON.stringify(headers, null, 2));
            console.log('📦 Request body:', JSON.stringify(data, null, 2));

            let response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    mode: 'cors',
                    headers: headers,
                    body: JSON.stringify(data)
                });
                console.log('📥 Response status:', response.status);
            } catch (fetchError) {
                console.error('❌ Network error - fetch failed:', fetchError);
                throw new Error(`Network error: ${fetchError.message}. Check if server is accessible.`);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('📥 Response data:', result);

            if (result.success) {
                console.log('✅ Booking created successfully:', result.data);
                return result.data;
            }
            throw new Error(result.message || 'Booking failed');
        } catch (error) {
            console.error('❌ Failed to create booking:', error);
            throw error;
        }
    },

    // Complete Registration
    async completeRegistration(data) {
        return this.request('/auth/complete-registration', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// ============================================
// CAR DATA (Local JSON)
// ============================================
const CarDatabase = {
    data: [],

    async load() {
        // This would normally load from car.json
        // For now using sample data
        this.data = [
            { name: "Maruti Swift", type: "Hatchback", category_id: 1 },
            { name: "Maruti Baleno", type: "Hatchback", category_id: 1 },
            { name: "Hyundai i20", type: "Hatchback", category_id: 1 },
            { name: "Tata Altroz", type: "Hatchback", category_id: 1 },
            { name: "Honda Amaze", type: "Sedan", category_id: 2 },
            { name: "Maruti Dzire", type: "Sedan", category_id: 2 },
            { name: "Hyundai Verna", type: "Sedan", category_id: 2 },
            { name: "Honda City", type: "Sedan", category_id: 2 },
            { name: "Hyundai Creta", type: "SUV", category_id: 3 },
            { name: "Kia Seltos", type: "SUV", category_id: 3 },
            { name: "Tata Nexon", type: "SUV", category_id: 3 },
            { name: "Mahindra XUV700", type: "SUV", category_id: 3 },
            { name: "Royal Enfield Classic", type: "Bike", category_id: 4 },
            { name: "Honda Activa", type: "Bike", category_id: 4 },
            { name: "TVS Jupiter", type: "Bike", category_id: 4 },
            { name: "Bajaj Pulsar", type: "Bike", category_id: 4 }
        ];
    },

    search(query) {
        if (!query || query.length < 2) return [];
        const lowerQuery = query.toLowerCase();
        return this.data.filter(car =>
            car.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 8);
    },

    getCategoryByName(name) {
        const car = this.data.find(c => c.name === name);
        return car ? car.category_id : null;
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    showLoading(message = 'Processing...') {
        DOM.loadingOverlay.querySelector('.loader-text').textContent = message;
        DOM.loadingOverlay.classList.add('active');
    },

    hideLoading() {
        DOM.loadingOverlay.classList.remove('active');
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check-circle' :
            type === 'error' ? 'alert-circle' : 'info';

        toast.innerHTML = `
            <i data-lucide="${icon}"></i>
            <span>${message}</span>
        `;

        DOM.toastContainer.appendChild(toast);
        lucide.createIcons({ icons: { [icon]: lucide.icons[icon] }, nameAttr: 'data-lucide' });

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    formatDate(date) {
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        return date.toLocaleDateString('en-IN', options);
    },

    formatTime(hour) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h = hour % 12 || 12;
        return `${h}:00 ${ampm}`;
    },

    formatCurrency(amount) {
        return `₹${amount.toLocaleString('en-IN')}`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ============================================
// STEP NAVIGATION
// ============================================
const Navigation = {
    init() {
        DOM.backBtn.addEventListener('click', () => this.prevStep());
        if (DOM.backBtnMobile) {
            DOM.backBtnMobile.addEventListener('click', () => this.prevStep());
        }
        DOM.nextBtn.addEventListener('click', () => this.nextStep());
        DOM.confirmBtn.addEventListener('click', () => BookingFlow.submitBooking());

        this.updateUI();
    },

    goToStep(step) {
        if (step < 1 || step > BookingState.totalSteps) return;

        BookingState.currentStep = step;
        this.updateUI();

        // Trigger step-specific initialization
        switch (step) {
            case 2: ServiceSelection.init(); break;
            case 3: LocationSelection.init(); break;
            case 4: ScheduleSelection.init(); break;
            case 5: Confirmation.init(); break;
        }
    },

    nextStep() {
        if (!this.validateCurrentStep()) return;

        if (BookingState.currentStep < BookingState.totalSteps) {
            this.goToStep(BookingState.currentStep + 1);
        }
    },

    prevStep() {
        if (BookingState.currentStep > 1) {
            this.goToStep(BookingState.currentStep - 1);
        }
    },

    validateCurrentStep() {
        switch (BookingState.currentStep) {
            case 1:
                if (!BookingState.vehicle.categoryId) {
                    Utils.showToast('Please select a vehicle type', 'error');
                    return false;
                }
                return true;

            case 2:
                if (!BookingState.service.id) {
                    Utils.showToast('Please select a service', 'error');
                    return false;
                }
                return true;

            case 3:
                if (!BookingState.location.isValid) {
                    Utils.showToast('Please set your location', 'error');
                    return false;
                }
                return true;

            case 4:
                if (!BookingState.schedule.date || !BookingState.schedule.time) {
                    Utils.showToast('Please select date and time', 'error');
                    return false;
                }
                return true;

            default:
                return true;
        }
    },

    updateUI() {
        const step = BookingState.currentStep;

        // Update step indicators
        DOM.steps.forEach((stepEl, index) => {
            const stepNum = index + 1;
            stepEl.classList.remove('active', 'completed');

            if (stepNum < step) {
                stepEl.classList.add('completed');
            } else if (stepNum === step) {
                stepEl.classList.add('active');
            }
        });

        // Update connectors
        DOM.connectors.forEach((conn, index) => {
            conn.classList.toggle('active', index < step - 1);
        });

        // Update panels
        DOM.panels.forEach((panel, index) => {
            panel.classList.toggle('active', index === step - 1);
        });

        // Update mobile counter
        if (DOM.currentStepEl) {
            DOM.currentStepEl.textContent = step;
        }

        // Update navigation buttons
        const showBack = step > 1 ? 'flex' : 'none';
        DOM.backBtn.style.display = showBack;
        if (DOM.backBtnMobile) {
            DOM.backBtnMobile.style.display = showBack;
        }

        // Hide Continue button permanently as we using auto-advance
        DOM.nextBtn.style.display = 'none';

        DOM.confirmBtn.style.display = step === BookingState.totalSteps ? 'flex' : 'none';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ============================================
// STEP 1: VEHICLE SELECTION (Brand -> Model)
// ============================================
const VehicleSelection = {
    currentView: 'brand', // 'brand', 'model', or 'manual'
    selectedBrand: null,
    apiBrands: [], // Store API brands

    async init() {
        await this.renderBrands();
        this.setupSearch();
        this.setupNavigation();
        this.checkSavedVehicles();
    },

    async renderBrands() {
        // Show loading state
        DOM.brandGrid.innerHTML = `
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
        `;

        // Try to fetch brands from API
        const apiBrands = await API.getBrands();

        // Check if API returned data
        if (apiBrands === null) {
            // API failed, show error message
            DOM.brandGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Unable to Load Brands</h3>
                    <p style="color: var(--text-secondary);">Please check your connection and try again</p>
                </div>
            `;
            return;
        }

        if (apiBrands.length === 0) {
            // API returned empty array
            DOM.brandGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🚗</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Brands Available</h3>
                    <p style="color: var(--text-secondary);">Please check back later or contact support</p>
                </div>
            `;
            return;
        }

        // Use API brands
        this.apiBrands = apiBrands;
        const brandsToRender = apiBrands.map(b => ({
            id: b.id,
            name: b.brand_name,
            logo: b.icon_url ? `<img src="${b.icon_url}" alt="${b.brand_name}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : '🚗'
        }));

        const brandsHTML = brandsToRender.map(brand => `
            <div class="brand-card" data-id="${brand.id}" data-name="${brand.name}">
                <div class="brand-logo">${brand.logo}</div>
                <div class="brand-name">${brand.name}</div>
            </div>
        `).join('');

        // Add "Other" option
        const otherHTML = `
            <div class="brand-card other-brand" data-id="other">
                <div class="brand-logo">✏️</div>
                <div class="brand-name">Other Brand</div>
            </div>
        `;

        DOM.brandGrid.innerHTML = brandsHTML + otherHTML;

        // Add click handlers
        DOM.brandGrid.querySelectorAll('.brand-card').forEach(card => {
            card.addEventListener('click', () => this.selectBrand(card));
        });

        lucide.createIcons();
    },

    async selectBrand(card) {
        const brandId = card.dataset.id;

        if (brandId === 'other') {
            this.showManualEntry();
            return;
        }

        // Find brand from API brands or mock
        let brand = this.apiBrands.find(b => b.id === parseInt(brandId));
        if (brand) {
            // Convert API brand format
            brand = {
                id: brand.id,
                name: brand.brand_name,
                logo: brand.icon_url ? `<img src="${brand.icon_url}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : '🚗'
            };
        } else {
            // Fallback to mock
            brand = MOCK_CAR_BRANDS.find(b => b.id === parseInt(brandId));
            if (brand) {
                brand = { id: brand.id, name: brand.name, logo: brand.logo };
            }
        }

        if (!brand) return;

        this.selectedBrand = brand;
        BookingState.vehicle.brandId = brand.id;
        BookingState.vehicle.brandName = brand.name;

        // Show models for this brand
        await this.showModelSelection(brand);
    },

    async showModelSelection(brand) {
        this.currentView = 'model';

        // Hide brand view, show model view
        DOM.brandSelectionView.style.display = 'none';
        DOM.modelSelectionView.style.display = 'block';
        DOM.manualEntryView.style.display = 'none';

        // Update header
        DOM.selectedBrandLogo.innerHTML = typeof brand.logo === 'string' && brand.logo.startsWith('<img')
            ? brand.logo
            : brand.logo || '🚗';
        DOM.selectedBrandName.textContent = brand.name;

        // Update search placeholder
        DOM.carSearchInput.placeholder = `Search ${brand.name} models...`;
        DOM.carSearchInput.value = '';

        // Render models (with API fetch)
        await this.renderModels(brand.id);
    },

    async renderModels(brandId) {
        // Show loading state
        DOM.modelGrid.innerHTML = `
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
        `;

        // Try to fetch cars from API
        const apiCars = await API.getCarsByBrand(brandId);

        // Check if API returned data
        if (apiCars === null) {
            // API failed, show error message
            DOM.modelGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Unable to Load Models</h3>
                    <p style="color: var(--text-secondary);">Please check your connection and try again</p>
                    <button onclick="VehicleSelection.renderModels(${brandId})" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
                </div>
            `;
            return;
        }

        if (apiCars.length === 0) {
            // API returned empty array - show no models message with Other option
            DOM.modelGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🚗</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Models Available</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">We don't have models for this brand yet. You can add your vehicle manually.</p>
                </div>
                <div class="model-card other-model" data-id="other" style="grid-column: 1/-1; max-width: 300px; margin: 0 auto;">
                    <div class="model-name">Add Your Model</div>
                    <span class="model-type">Custom Entry</span>
                </div>
            `;
            // Add click handler for the Other option
            DOM.modelGrid.querySelector('.other-model').addEventListener('click', () => this.selectModel(DOM.modelGrid.querySelector('.other-model')));
            return;
        }

        // Use API cars
        const modelsToRender = apiCars.map(car => ({
            id: car.id,
            name: car.car_name,
            type: car.car_type || 'Hatchback',
            categoryId: this.getCategoryIdFromType(car.car_type),
            multiplier: this.getMultiplierFromType(car.car_type),
            icon_url: car.icon_url
        }));

        const modelsHTML = modelsToRender.map(model => `
            <div class="model-card" data-id="${model.id}" data-brand-id="${brandId}" 
                 data-name="${model.name}" data-type="${model.type}" 
                 data-category-id="${model.categoryId}" data-multiplier="${model.multiplier}">
                ${model.icon_url ? `<img src="${model.icon_url}" alt="${model.name}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:0.5rem;">` : ''}
                <div class="model-name">${model.name}</div>
                <span class="model-type ${model.type.toLowerCase()}">${model.type}</span>
            </div>
        `).join('');

        // Add "Other Model" option
        const otherHTML = `
            <div class="model-card other-model" data-id="other">
                <div class="model-name">Other Model</div>
                <span class="model-type">Custom</span>
            </div>
        `;

        DOM.modelGrid.innerHTML = modelsHTML + otherHTML;

        // Add click handlers
        DOM.modelGrid.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', () => this.selectModel(card));
        });

        lucide.createIcons();
    },

    getCategoryIdFromType(type) {
        const typeMap = {
            'Hatchback': 1,
            'Sedan': 2,
            'SUV': 3,
            'Compact SUV': 3,
            'MUV': 3,
            'Bike': 4
        };
        return typeMap[type] || 1;
    },

    getMultiplierFromType(type) {
        const multiplierMap = {
            'Hatchback': 1.0,
            'Sedan': 1.2,
            'SUV': 1.5,
            'Compact SUV': 1.3,
            'MUV': 1.5,
            'Bike': 0.5
        };
        return multiplierMap[type] || 1.0;
    },

    async selectModel(card) {
        if (card.dataset.id === 'other') {
            this.showManualEntry(true); // true = already have brand
            return;
        }

        // Remove previous selection
        DOM.modelGrid.querySelectorAll('.model-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        // Update booking state
        const carId = parseInt(card.dataset.id);
        BookingState.vehicle.modelId = carId;
        BookingState.vehicle.modelName = card.dataset.name;
        BookingState.vehicle.categoryId = parseInt(card.dataset.categoryId);
        BookingState.vehicle.categoryName = card.dataset.type;
        BookingState.vehicle.multiplier = parseFloat(card.dataset.multiplier);
        BookingState.vehicle.vehicleName = `${BookingState.vehicle.brandName} ${card.dataset.name}`;
        BookingState.vehicle.isCustom = false;
        BookingState.vehicle.carId = carId; // Store for services API

        Utils.showToast(`${BookingState.vehicle.vehicleName} selected!`, 'success');

        // Create vehicle record in database
        try {
            const customerId = BookingState.user.id || JSON.parse(localStorage.getItem('customer_data') || '{}').id;

            if (customerId) {
                console.log('🚗 Creating vehicle record for customer:', customerId);

                const vehicleData = {
                    customer_id: customerId,
                    make: BookingState.vehicle.brandName || 'Unknown',
                    model: card.dataset.name,
                    type: card.dataset.type || 'sedan',
                    license_plate: null, // Optional
                    year: null, // Optional
                    color: null // Optional
                };

                const createdVehicle = await API.createVehicle(vehicleData);

                if (createdVehicle && createdVehicle.id) {
                    BookingState.vehicle.vehicleId = parseInt(createdVehicle.id);
                    console.log('✅ Vehicle created with ID:', BookingState.vehicle.vehicleId);
                }
            } else {
                console.warn('⚠️ No customer ID found, skipping vehicle creation');
            }
        } catch (error) {
            console.error('❌ Vehicle creation failed:', error);
            // Don't block the flow - continue even if vehicle creation fails
            // The booking will try to create vehicle again if needed
        }

        // Fetch services from API BEFORE advancing
        await ServiceSelection.loadServicesFromAPI(carId);

        // Auto-advance to next step
        setTimeout(() => Navigation.nextStep(), 400);
    },

    // Old duplicate functions removed - now using async versions above

    showManualEntry(hasBrand = false) {
        this.currentView = 'manual';

        // Hide other views
        DOM.brandSelectionView.style.display = 'none';
        DOM.modelSelectionView.style.display = 'none';
        DOM.manualEntryView.style.display = 'block';

        // Pre-fill brand if coming from model selection
        if (hasBrand && this.selectedBrand) {
            DOM.manualBrandInput.value = this.selectedBrand.name;
            DOM.manualBrandInput.readOnly = true;
        } else {
            DOM.manualBrandInput.value = '';
            DOM.manualBrandInput.readOnly = false;
        }

        DOM.manualModelInput.value = '';
        DOM.manualCategorySelect.value = '';

        // Update search placeholder
        DOM.carSearchInput.placeholder = 'Search car brand...';
    },

    setupNavigation() {
        // Back to brands from models
        DOM.backToBrandsBtn.addEventListener('click', () => {
            this.currentView = 'brand';
            DOM.brandSelectionView.style.display = 'block';
            DOM.modelSelectionView.style.display = 'none';
            DOM.manualEntryView.style.display = 'none';
            DOM.carSearchInput.placeholder = 'Search car brand...';
            DOM.carSearchInput.value = '';
            this.selectedBrand = null;
        });

        // Back from manual entry
        DOM.backFromManualBtn.addEventListener('click', () => {
            if (this.selectedBrand) {
                // Go back to model selection
                this.showModelSelection(this.selectedBrand);
            } else {
                // Go back to brand selection
                this.currentView = 'brand';
                DOM.brandSelectionView.style.display = 'block';
                DOM.modelSelectionView.style.display = 'none';
                DOM.manualEntryView.style.display = 'none';
                DOM.carSearchInput.placeholder = 'Search car brand...';
            }
        });

        // Confirm manual entry
        DOM.confirmManualBtn.addEventListener('click', () => {
            this.confirmManualEntry();
        });
    },

    confirmManualEntry() {
        const brand = DOM.manualBrandInput.value.trim();
        const model = DOM.manualModelInput.value.trim();
        const categoryId = parseInt(DOM.manualCategorySelect.value);

        // Validation
        if (!brand || !model) {
            Utils.showToast('Please enter both brand and model', 'error');
            return;
        }

        if (!categoryId) {
            Utils.showToast('Please select vehicle type for pricing', 'error');
            return;
        }

        // Get category details
        const categoryMap = {
            1: { name: 'Hatchback', multiplier: 1.0 },
            2: { name: 'Sedan', multiplier: 1.2 },
            3: { name: 'SUV', multiplier: 1.5 },
            4: { name: 'Bike', multiplier: 0.5 }
        };

        const category = categoryMap[categoryId];

        // Update booking state
        BookingState.vehicle.brandId = null;
        BookingState.vehicle.brandName = brand;
        BookingState.vehicle.modelId = null;
        BookingState.vehicle.modelName = model;
        BookingState.vehicle.categoryId = categoryId;
        BookingState.vehicle.categoryName = category.name;
        BookingState.vehicle.multiplier = category.multiplier;
        BookingState.vehicle.vehicleName = `${brand} ${model}`;
        BookingState.vehicle.isCustom = true;

        Utils.showToast(`${BookingState.vehicle.vehicleName} added!`, 'success');

        // Auto-advance
        setTimeout(() => Navigation.nextStep(), 400);
    },

    setupSearch() {
        const debouncedSearch = Utils.debounce((query) => {
            this.performSearch(query);
        }, 300);

        DOM.carSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            DOM.searchClear.style.display = query ? 'flex' : 'none';
            debouncedSearch(query);
        });

        DOM.searchClear.addEventListener('click', () => {
            DOM.carSearchInput.value = '';
            DOM.searchClear.style.display = 'none';
            DOM.searchResults.classList.remove('active');
        });

        // Close search on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                DOM.searchResults.classList.remove('active');
            }
        });
    },

    performSearch(query) {
        if (query.length < 2) {
            DOM.searchResults.classList.remove('active');
            return;
        }

        let results = [];

        if (this.currentView === 'brand') {
            // Search brands
            results = MOCK_CAR_BRANDS.filter(brand =>
                brand.name.toLowerCase().includes(query.toLowerCase())
            ).map(brand => ({
                type: 'brand',
                id: brand.id,
                name: brand.name,
                logo: brand.logo
            }));
        } else if (this.currentView === 'model' && this.selectedBrand) {
            // Search models for current brand
            const models = MOCK_CAR_MODELS[this.selectedBrand.id] || [];
            results = models.filter(model =>
                model.name.toLowerCase().includes(query.toLowerCase())
            ).map(model => ({
                type: 'model',
                id: model.id,
                name: model.name,
                category: model.type,
                categoryId: model.categoryId,
                multiplier: model.multiplier
            }));
        }

        if (results.length === 0) {
            DOM.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="result-info">
                        <div class="result-name">No results found</div>
                        <div class="result-type">Try a different search term</div>
                    </div>
                </div>
            `;
        } else {
            DOM.searchResults.innerHTML = results.map(item => `
                <div class="search-result-item" data-type="${item.type}" data-id="${item.id}" 
                     ${item.type === 'model' ? `data-category-id="${item.categoryId}" data-multiplier="${item.multiplier}" data-category="${item.category}"` : ''}>
                    <div class="result-icon">
                        ${item.type === 'brand' ? item.logo : '🚗'}
                    </div>
                    <div class="result-info">
                        <div class="result-name">${item.name}</div>
                        <div class="result-type">${item.type === 'brand' ? 'Brand' : item.category}</div>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            DOM.searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => this.selectFromSearch(item));
            });
        }

        DOM.searchResults.classList.add('active');
    },

    selectFromSearch(item) {
        const type = item.dataset.type;
        const id = parseInt(item.dataset.id);

        if (type === 'brand') {
            const brand = MOCK_CAR_BRANDS.find(b => b.id === id);
            if (brand) {
                const brandCard = DOM.brandGrid.querySelector(`[data-id="${id}"]`);
                if (brandCard) {
                    this.selectBrand(brandCard);
                }
            }
        } else if (type === 'model') {
            const modelCard = DOM.modelGrid.querySelector(`[data-id="${id}"]`);
            if (modelCard) {
                this.selectModel(modelCard);
            }
        }

        DOM.searchResults.classList.remove('active');
        DOM.carSearchInput.value = '';
    },

    async checkSavedVehicles() {
        if (!BookingState.user.id || BookingState.user.isNewUser) {
            DOM.savedVehiclesSection.style.display = 'none';
            return;
        }

        try {
            const vehicles = await API.getCustomerVehicles(BookingState.user.id);
            if (vehicles && vehicles.length > 0) {
                BookingState.vehicle.savedVehicles = vehicles;
                this.renderSavedVehicles(vehicles);
                DOM.savedVehiclesSection.style.display = 'block';
                DOM.newVehicleSection.style.display = 'none';
            }
        } catch (error) {
            console.log('No saved vehicles found');
        }
    },

    renderSavedVehicles(vehicles) {
        const icons = { 'Hatchback': '🚗', 'Sedan': '🚙', 'SUV': '🚐', 'Bike': '🏍️' };

        DOM.savedVehiclesGrid.innerHTML = vehicles.map(v => `
            <div class="saved-vehicle-card" data-id="${v.id}" data-category="${v.category_id}" data-name="${v.make} ${v.model}">
                <div class="saved-vehicle-icon">${icons[v.category_name] || '🚗'}</div>
                <div class="saved-vehicle-info">
                    <div class="saved-vehicle-name">${v.make} ${v.model}</div>
                    <div class="saved-vehicle-type">${v.plate_number || v.category_name}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        DOM.savedVehiclesGrid.querySelectorAll('.saved-vehicle-card').forEach(card => {
            card.addEventListener('click', () => this.selectSavedVehicle(card));
        });

        // Add new vehicle button handler
        DOM.addNewVehicleBtn.addEventListener('click', () => {
            DOM.savedVehiclesSection.style.display = 'none';
            DOM.newVehicleSection.style.display = 'block';
        });
    },

    selectSavedVehicle(card) {
        DOM.savedVehiclesGrid.querySelectorAll('.saved-vehicle-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        BookingState.vehicle.vehicleId = parseInt(card.dataset.id);
        BookingState.vehicle.categoryId = parseInt(card.dataset.category);
        BookingState.vehicle.vehicleName = card.dataset.name;

        Utils.showToast(`${card.dataset.name} selected!`, 'success');

        // Auto-advance
        setTimeout(() => Navigation.nextStep(), 400);
    }
};

// ============================================
// STEP 2: SERVICE SELECTION
// ============================================
const ServiceSelection = {
    async init() {
        if (!BookingState.vehicle.categoryId) return;

        // Update header
        DOM.selectedVehicleType.textContent = BookingState.vehicle.categoryName;

        // Check if services were already loaded from API (by selectModel)
        if (BookingState.cache.services && BookingState.cache.services.length > 0) {
            console.log('✅ Using pre-loaded API services');
            this.renderServices(BookingState.cache.services);
            return;
        }

        // If cache is empty array (no services available)
        if (BookingState.cache.services && BookingState.cache.services.length === 0) {
            console.log('⚠️ No services available for selected vehicle');
            this.showNoServicesMessage();
            return;
        }

        // Show loading
        DOM.servicesGrid.innerHTML = `
            <div class="service-skeleton"></div>
            <div class="service-skeleton"></div>
            <div class="service-skeleton"></div>
        `;

        await this.loadServices();
    },

    async loadServices() {
        try {
            const services = await API.getServices(BookingState.vehicle.categoryId);
            BookingState.cache.services = services;
            this.renderServices(services);
        } catch (error) {
            console.error('❌ Failed to load services:', error);
            this.showNoServicesMessage();
        }
    },

    showNoServicesMessage() {
        DOM.servicesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🚗</div>
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.5rem;">No Services Available</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">We don't have services available for this vehicle at the moment.</p>
                <button onclick="Navigation.prevStep()" style="padding: 0.75rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 500;">
                    ← Choose Different Vehicle
                </button>
            </div>
        `;
    },

    // ===== NEW: Load services from real API using car ID =====
    async loadServicesFromAPI(carId) {
        console.log('🔄 Loading services for car ID:', carId);

        try {
            const apiServices = await API.getServicesByVehicle(carId);

            if (apiServices && apiServices.length > 0) {
                // Map API response to our format
                // API uses: title, price (string), features: [{icon, text}]
                const services = apiServices.map(s => ({
                    id: s.id || s.service_id,
                    name: s.title || s.service_name || s.name || 'Unnamed Service',
                    base_price: parseFloat(s.price || s.base_price || 0),
                    description: s.description || '',
                    // Extract text from feature objects if needed
                    features: Array.isArray(s.features)
                        ? s.features.map(f => typeof f === 'object' ? f.text : f).filter(Boolean)
                        : ['Professional cleaning'],
                    popular: s.badge === 'Recommended' || s.badge_type === 'featured' || s.popular || false
                }));

                BookingState.cache.services = services;
                console.log('✅ Services loaded from API:', services.length);
                return services;
            } else {
                // No services available for this vehicle
                console.log('⚠️ No services available for this vehicle');
                BookingState.cache.services = [];
                return [];
            }
        } catch (error) {
            console.error('❌ Failed to load services from API:', error);
            BookingState.cache.services = [];
            return [];
        }
    },

    renderServices(services) {
        // Check if services array is empty
        if (!services || services.length === 0) {
            this.showNoServicesMessage();
            return;
        }

        // For API services, prices are already vehicle-specific
        // For fallback services, we need to apply multiplier
        const isAPIService = BookingState.cache.services && BookingState.cache.services.length > 0;
        const multiplier = isAPIService ? 1 : BookingState.vehicle.multiplier;

        DOM.servicesGrid.innerHTML = services.map(service => {
            const price = Math.round(service.base_price * multiplier);
            const features = service.features || ['Professional cleaning', 'Quality products'];

            return `
                <div class="service-card ${service.popular ? 'popular' : ''}" 
                     data-id="${service.id}" 
                     data-name="${service.name}" 
                     data-price="${price}"
                     data-features='${JSON.stringify(features)}'>
                    <div class="service-header">
                        <div class="service-name">${service.name}</div>
                        <div class="service-price">${Utils.formatCurrency(price)}</div>
                    </div>
                    <p class="service-description">${service.description}</p>
                    <div class="service-features">
                        ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        DOM.servicesGrid.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => this.selectService(card));
        });

        // Auto-select popular service - REMOVED per user request
        // const popularCard = DOM.servicesGrid.querySelector('.service-card.popular');
        // if (popularCard) {
        //    this.selectService(popularCard);
        // }
    },

    selectService(card) {
        DOM.servicesGrid.querySelectorAll('.service-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        BookingState.service.id = parseInt(card.dataset.id);
        BookingState.service.name = card.dataset.name;
        // dataset.price is already (base_price * multiplier), so it is the final price for this service
        BookingState.service.finalPrice = parseInt(card.dataset.price);
        BookingState.service.features = JSON.parse(card.dataset.features);

        this.updatePayment(); // Calculate totals immediately

        Utils.showToast(`${card.dataset.name} selected!`, 'success');

        // Auto-advance
        setTimeout(() => Navigation.nextStep(), 400);
    },

    updatePayment() {
        BookingState.payment.totalPrice = BookingState.service.finalPrice;

        if (BookingState.payment.method === 'online') {
            BookingState.payment.discount = Math.round(BookingState.payment.totalPrice * CONFIG.ONLINE_DISCOUNT);
            BookingState.payment.finalAmount = BookingState.payment.totalPrice - BookingState.payment.discount;
        } else {
            BookingState.payment.discount = 0;
            BookingState.payment.finalAmount = BookingState.payment.totalPrice;
        }
    }
};

// ============================================
// STEP 3: LOCATION SELECTION
// ============================================
// ============================================
// LOCATION UTILS
// ============================================
const GeometryUtils = {
    // Ray-casting algorithm to check if point is in polygon
    isPointInPolygon(point, vs) {
        // point = [lat, lng], vs = [[lat, lng], ...]
        var x = point[0], y = point[1];
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    },

    // Parse coordinates from Google Maps/WhatsApp links
    parseMapLink(url) {
        if (!url) return null;

        // Pattern 1: @lat,lng (e.g., google.com/maps/@26.4168,90.2649,15z)
        const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const atMatch = url.match(atPattern);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        // Pattern 2: q=lat,lng (e.g., maps.google.com/?q=26.4168,90.2649)
        const qPattern = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const qMatch = url.match(qPattern);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

        // Pattern 3: ll=lat,lng (sometimes in embed links)
        const llPattern = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const llMatch = url.match(llPattern);
        if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

        return null;
    }
};

// ============================================
// STEP 3: LOCATION SELECTION
// ============================================
const LocationSelection = {
    apiZones: [], // Cache loaded zones

    async init() {
        this.setupLocationOptions();

        // Load zones in background immediately
        await this.loadZones();

        // Reset state (don't auto-select 'auto')
        BookingState.location.method = null;
        this.resetLocation();
    },

    setupLocationOptions() {
        // Auto detect option
        DOM.detectLocationBtn.addEventListener('click', () => {
            this.setLocationMethod('auto');
            this.detectLocation();
        });

        // Manual entry option
        DOM.manualLocationBtn.addEventListener('click', () => {
            this.setLocationMethod('manual');
        });

        // Detect status click (retry)
        DOM.detectStatus.addEventListener('click', () => {
            this.detectLocation();
        });

        // Change location button
        DOM.changeLocationBtn.addEventListener('click', () => {
            this.setLocationMethod(null); // Go back to selection
            this.resetLocation();
        });

        // Try manual button (from error state)
        DOM.tryManualBtn.addEventListener('click', () => {
            this.setLocationMethod('manual');
        });

        // Confirm manual address button
        DOM.confirmAddressBtn.addEventListener('click', () => {
            this.confirmManualAddress();
        });

        // Map Link Parsing
        const mapLinkInput = document.getElementById('mapLinkInput');
        if (mapLinkInput) {
            mapLinkInput.addEventListener('input', (e) => this.handleMapLink(e.target.value));
            mapLinkInput.addEventListener('paste', (e) => {
                // Small delay to ensure value is pasted
                setTimeout(() => this.handleMapLink(e.target.value), 100);
            });
        }
    },

    setLocationMethod(method) {
        BookingState.location.method = method;

        // Update UI Tabs
        DOM.detectLocationBtn.classList.toggle('active', method === 'auto');
        DOM.manualLocationBtn.classList.toggle('active', method === 'manual');

        if (method === 'auto') {
            DOM.locationDetectArea.style.display = 'block';
            DOM.manualEntryArea.style.display = 'none';
        } else if (method === 'manual') {
            DOM.locationDetectArea.style.display = 'none';
            DOM.manualEntryArea.style.display = 'block';
        } else {
            // Reset view (show both options but active class removed)
            DOM.locationDetectArea.style.display = 'none';
            DOM.manualEntryArea.style.display = 'none';
        }
    },

    resetLocation() {
        DOM.locationSuccess.style.display = 'none';
        DOM.locationError.style.display = 'none';
        DOM.detectStatus.style.display = 'block';
        // Hide "Change" button in detect status when resetting
        DOM.changeLocationBtn.style.display = 'none';

        // Reset manual form inputs
        const mapInput = document.getElementById('mapLinkInput');
        if (mapInput) mapInput.value = '';
        DOM.manualAddressInput.value = '';
        DOM.manualZoneSelect.value = '';

        BookingState.location.isValid = false;
        BookingState.location.lat = null;
        BookingState.location.lng = null;
        BookingState.location.zoneId = null;
    },

    async loadZones() {
        try {
            console.log('🔄 Loading zones...');
            const response = await API.getZones();
            if (response && response.success && response.data && response.data.zones) {
                this.apiZones = response.data.zones;
                this.populateZoneDropdown(this.apiZones);
                console.log('✅ Zones loaded:', this.apiZones.length);
            }
        } catch (error) {
            console.error('❌ Failed to load zones:', error);
            Utils.showToast('Failed to load service zones', 'error');
        }
    },

    populateZoneDropdown(zones) {
        DOM.manualZoneSelect.innerHTML = '<option value="">Select a Service Zone</option>';
        zones.forEach(zone => {
            const option = document.createElement('option');
            option.value = zone.id;
            option.textContent = zone.zone_name;
            DOM.manualZoneSelect.appendChild(option);
        });
    },

    // ============================================
    // Logic: Auto Detect
    // ============================================
    detectLocation() {
        if (!navigator.geolocation) {
            Utils.showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        // Show Animation
        DOM.detectStatus.innerHTML = `
            <div class="detect-animation">
                <div class="pulse-ring"></div>
                <div class="pulse-ring"></div>
                <div class="pulse-ring"></div>
                <i data-lucide="loader-2" class="spin"></i>
            </div>
            <p class="detect-text">Detecting precise location...</p>
        `;
        lucide.createIcons();

        navigator.geolocation.getCurrentPosition(
            (position) => this.handlePositionSuccess(position.coords.latitude, position.coords.longitude),
            (error) => this.handlePositionError(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    },

    async handlePositionSuccess(lat, lng) {
        console.log('📍 Location detected:', lat, lng);

        // Get actual address using reverse geocoding
        let actualAddress = 'Auto-detected location';
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.display_name) {
                actualAddress = data.display_name;
                console.log('📍 Address:', actualAddress);
            }
        } catch (e) {
            console.warn('Failed to get address, using coordinates');
            actualAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        // Check matching zone locally first (fast)
        const matchedZone = this.findMatchingZone(lat, lng);

        if (matchedZone) {
            console.log('✅ Point inside zone:', matchedZone.zone_name);

            // Validate with Server API (Double Check)
            try {
                const check = await API.checkLocation(matchedZone.id, lat, lng);
                if (check.success && check.data.is_in_zone) {
                    this.onLocationValid(lat, lng, matchedZone.id, matchedZone.zone_name, actualAddress);
                    return;
                }
            } catch (e) {
                console.warn('API Check failed, trusting local check:', e);
                // Trust local check if API fails but polygon matched
                this.onLocationValid(lat, lng, matchedZone.id, matchedZone.zone_name, actualAddress);
                return;
            }
        }

        // If no match found or API rejected
        this.onLocationInvalid();
    },

    handlePositionError(error) {
        console.error('Geolocation error:', error);
        DOM.detectStatus.innerHTML = `
            <div class="detect-animation error">
                <i data-lucide="map-pin-off"></i>
            </div>
            <p class="detect-text">Location access denied.<br>Please enter manually.</p>
        `;
        lucide.createIcons();

        setTimeout(() => {
            this.setLocationMethod('manual');
            Utils.showToast('Please enter location manually', 'warning');
        }, 1500);
    },

    findMatchingZone(lat, lng) {
        // Prepare point [lat, lng]
        const point = [lat, lng];

        return this.apiZones.find(zone => {
            if (!zone.coordinates) return false;
            // Convert zone coordinates to array of [lat, lng]
            const polygon = zone.coordinates.map(c => [c.lat, c.lng]);
            return GeometryUtils.isPointInPolygon(point, polygon);
        });
    },

    onLocationValid(lat, lng, zoneId, zoneName, addressText) {
        // Update State
        BookingState.location.isValid = true;
        BookingState.location.lat = lat;
        BookingState.location.lng = lng;
        BookingState.location.zoneId = zoneId;
        BookingState.location.address = addressText;
        BookingState.location.zoneName = zoneName;

        // Calculate travel fee (mock logic or from API if available)
        // For now assuming free or included
        BookingState.payment.travelFee = 0;

        Utils.showToast(`Zone: ${zoneName} confirmed!`, 'success');

        // Auto-advance
        setTimeout(() => Navigation.nextStep(), 500);
    },

    onLocationInvalid() {
        console.log('❌ Location outside service area');
        Utils.showToast('You are outside our service area', 'warning');

        DOM.locationError.style.display = 'block';
        DOM.detectStatus.style.display = 'none';

        // Auto switch to manual after short delay
        setTimeout(() => {
            this.setLocationMethod('manual');
            const mapLinkInput = document.getElementById('mapLinkInput');
            if (mapLinkInput) mapLinkInput.focus();
        }, 1500);
    },

    // ============================================
    // Logic: Manual Entry & Map Link
    // ============================================

    handleMapLink(url) {
        const coords = GeometryUtils.parseMapLink(url);
        if (coords) {
            console.log('🔗 Link parsed:', coords);

            // Check if these coords are in a zone
            const matchedZone = this.findMatchingZone(coords.lat, coords.lng);

            if (matchedZone) {
                // Auto-fill form
                DOM.manualZoneSelect.value = matchedZone.id;
                DOM.manualAddressInput.value = `Location from Link: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

                // Highlight success
                DOM.manualZoneSelect.style.borderColor = 'var(--success-500)';
                Utils.showToast(`Found Zone: ${matchedZone.zone_name}`, 'success');

                // Store coords
                BookingState.location.tempLat = coords.lat;
                BookingState.location.tempLng = coords.lng;
            } else {
                Utils.showToast('Link location is outside service areas', 'error');
                DOM.manualZoneSelect.value = '';
                DOM.manualZoneSelect.style.borderColor = 'var(--error-500)';
            }
        }
    },

    confirmManualAddress() {
        const zoneId = DOM.manualZoneSelect.value;
        const address = DOM.manualAddressInput.value.trim();

        if (!zoneId) {
            Utils.showToast('Please select a service zone', 'error');
            return;
        }

        if (address.length < 5) {
            Utils.showToast('Please enter a complete address', 'error');
            return;
        }

        const selectedZone = this.apiZones.find(z => z.id == zoneId);

        // Update State
        BookingState.location.isValid = true;
        BookingState.location.zoneId = parseInt(zoneId);
        BookingState.location.zoneName = selectedZone ? selectedZone.zone_name : 'Selected Zone';
        BookingState.location.address = address;

        // Use temp coords from link if available, otherwise null (will rely on address text)
        BookingState.location.lat = BookingState.location.tempLat || null;
        BookingState.location.lng = BookingState.location.tempLng || null;

        Utils.showToast('Location confirmed!', 'success');
        Navigation.nextStep();
    }
};





// ============================================
// STEP 4: SCHEDULE SELECTION
// ============================================
const ScheduleSelection = {
    currentMonth: new Date(),

    init() {
        this.renderQuickDates();
        this.renderTimeSlots();
        this.setupCalendar();
    },

    renderQuickDates() {
        const today = new Date();
        const dates = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
        }

        DOM.quickDates.innerHTML = dates.map((date, index) => {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const isToday = index === 0;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sun (0) or Sat (6)
            const dateStr = date.toISOString().split('T')[0];

            return `
                <div class="quick-date-card ${isToday ? 'today selected' : ''} ${isWeekend ? 'weekend' : ''}" data-date="${dateStr}">
                    <div class="date-day">${dayNames[date.getDay()]}</div>
                    <div class="date-num">${date.getDate()}</div>
                    <div class="date-month">${monthNames[date.getMonth()]}</div>
                </div>
            `;
        }).join('');

        // Set default selection to today
        const todayStr = today.toISOString().split('T')[0];
        BookingState.schedule.date = todayStr;
        BookingState.schedule.displayDate = Utils.formatDate(today);

        // Add click handlers
        DOM.quickDates.querySelectorAll('.quick-date-card').forEach(card => {
            card.addEventListener('click', () => this.selectDate(card));
        });

        // Calendar toggle
        DOM.showCalendarBtn.addEventListener('click', () => {
            const isVisible = DOM.calendarContainer.style.display === 'block';
            DOM.calendarContainer.style.display = isVisible ? 'none' : 'block';
            DOM.showCalendarBtn.innerHTML = isVisible ?
                '<i data-lucide="calendar-range"></i> Choose another date' :
                '<i data-lucide="x"></i> Hide calendar';
            lucide.createIcons();
        });
    },

    selectDate(card) {
        DOM.quickDates.querySelectorAll('.quick-date-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');
        const dateStr = card.dataset.date;
        BookingState.schedule.date = dateStr;
        BookingState.schedule.displayDate = Utils.formatDate(new Date(dateStr));

        Utils.showToast(`Date set to ${BookingState.schedule.displayDate}`);

        // If calendar was open, hide it
        if (DOM.calendarContainer.style.display === 'block') {
            DOM.calendarContainer.style.display = 'none';
            DOM.showCalendarBtn.innerHTML = '<i data-lucide="calendar-range"></i> Choose another date';
            lucide.createIcons();
        }

        // Focus on Time Slots
        DOM.timeSlotsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Refresh time slots if needed (e.g., filter based on date)
        this.renderTimeSlots();
    },
    selectCalendarDate(card) {
        DOM.calendarDays.querySelectorAll('.calendar-day').forEach(d => {
            d.classList.remove('selected');
        });

        card.classList.add('selected');

        const dateStr = card.dataset.date;
        const date = new Date(dateStr);

        BookingState.schedule.date = dateStr;
        BookingState.schedule.displayDate = Utils.formatDate(date);

        Utils.showToast(`Date set to ${BookingState.schedule.displayDate}`);

        // Hide Calendar
        DOM.calendarContainer.style.display = 'none';
        DOM.showCalendarBtn.innerHTML = '<i data-lucide="calendar-range"></i> Choose another date';
        lucide.createIcons();

        // Focus on Time Slots
        DOM.timeSlotsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Re-render time slots
        this.renderTimeSlots();
    },

    setupCalendar() {
        DOM.prevMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });

        DOM.nextMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });

        this.renderCalendar();
    },

    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        DOM.calendarMonth.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '';

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            html += `<button class="calendar-day other-month disabled">${prevMonthLastDay - i}</button>`;
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            const isSelected = dateStr === BookingState.schedule.date;

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isPast) classes += ' disabled';
            if (isSelected) classes += ' selected';

            html += `<button class="${classes}" data-date="${dateStr}" ${isPast ? 'disabled' : ''}>${day}</button>`;
        }

        // Next month days
        const remainingDays = 42 - (startingDay + totalDays);
        for (let i = 1; i <= remainingDays; i++) {
            html += `<button class="calendar-day other-month disabled">${i}</button>`;
        }

        DOM.calendarDays.innerHTML = html;

        // Add click handlers
        DOM.calendarDays.querySelectorAll('.calendar-day:not(.disabled)').forEach(day => {
            day.addEventListener('click', () => this.selectCalendarDate(day));
        });
    },

    selectCalendarDate(dayEl) {
        // Remove previous selections
        DOM.quickDates.querySelectorAll('.quick-date-card').forEach(c => {
            c.classList.remove('selected');
        });
        DOM.calendarDays.querySelectorAll('.calendar-day').forEach(d => {
            d.classList.remove('selected');
        });

        dayEl.classList.add('selected');

        const dateStr = dayEl.dataset.date;
        const date = new Date(dateStr);

        BookingState.schedule.date = dateStr;
        BookingState.schedule.displayDate = Utils.formatDate(date);

        // Check if selected date is in quick dates
        const quickCard = DOM.quickDates.querySelector(`[data-date="${dateStr}"]`);
        if (quickCard) {
            quickCard.classList.add('selected');
        }

        // Show toast notification
        Utils.showToast(`Date set to ${BookingState.schedule.displayDate}`, 'success');

        // Hide Calendar
        DOM.calendarContainer.style.display = 'none';
        DOM.showCalendarBtn.innerHTML = '<i data-lucide="calendar-range"></i> Choose another date';
        lucide.createIcons();

        // Focus on Time Slots - scroll smoothly to bring time slots into view
        DOM.timeSlotsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Re-render time slots
        this.renderTimeSlots();
    },

    renderTimeSlots() {
        const workingHours = CONFIG.WORKING_HOURS;
        // Handle both uppercase (new-config) and lowercase (fallback) keys
        const start = workingHours.START !== undefined ? workingHours.START : (workingHours.start || 7);
        const end = workingHours.END !== undefined ? workingHours.END : (workingHours.end || 18);

        const slots = [];

        const isToday = BookingState.schedule.date === new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();

        for (let hour = start; hour < end; hour++) {
            const isPast = isToday && hour <= currentHour;
            const timeLabel = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

            slots.push({
                hour,
                time: Utils.formatTime(hour),
                label: timeLabel,
                disabled: isPast
            });
        }

        DOM.timeSlotsGrid.innerHTML = slots.map(slot => `
            <div class="time-slot ${slot.disabled ? 'disabled' : ''}" 
                 data-hour="${slot.hour}" 
                 data-time="${slot.time}"
                 ${slot.disabled ? 'disabled' : ''}>
                <div class="time-slot-time">${slot.time}</div>
                <div class="time-slot-label">${slot.label}</div>
            </div>
        `).join('');

        // Add click handlers
        DOM.timeSlotsGrid.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
            slot.addEventListener('click', () => this.selectTime(slot));
        });
    },

    selectTime(slot) {
        DOM.timeSlotsGrid.querySelectorAll('.time-slot').forEach(s => {
            s.classList.remove('selected');
        });

        slot.classList.add('selected');

        const hour = parseInt(slot.dataset.hour);
        BookingState.schedule.time = `${hour.toString().padStart(2, '0')}:00:00`;
        BookingState.schedule.displayTime = slot.dataset.time;

        Utils.showToast(`Time set to ${slot.dataset.time}`, 'success');

        // Auto-advance to next step (Confirmation)
        setTimeout(() => Navigation.nextStep(), 400);
    }
};

// ============================================
// STEP 5: CONFIRMATION
// ============================================
const Confirmation = {
    init() {
        this.setupUserDetails();
        this.setupLandmarks();
        this.setupPaymentOptions();
        this.updateSummary();
    },

    setupUserDetails() {
        if (BookingState.user.isNewUser) {
            DOM.userDetailsSection.style.display = 'block';
        } else {
            DOM.userDetailsSection.style.display = 'none';
        }
    },

    setupLandmarks() {
        const chips = DOM.landmarkChips.querySelectorAll('.landmark-chip');

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove previous selection
                chips.forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                const landmarkType = chip.dataset.landmark;
                BookingState.landmark.type = landmarkType;

                // Show input
                DOM.landmarkInputWrapper.style.display = 'block';
                DOM.landmarkInput.focus();

                // Update placeholder based on type
                const placeholders = {
                    temple: 'Enter temple name (e.g., Shiv Mandir)',
                    mosque: 'Enter mosque name',
                    school: 'Enter school name',
                    market: 'Enter market name',
                    petrol: 'Enter petrol pump name (e.g., Indian Oil)',
                    hospital: 'Enter hospital name',
                    bank: 'Enter bank name (e.g., SBI Main Branch)',
                    other: 'Enter landmark description'
                };

                DOM.landmarkInput.placeholder = placeholders[landmarkType] || 'Enter landmark name';
            });
        });

        DOM.landmarkInput.addEventListener('input', (e) => {
            BookingState.landmark.name = e.target.value.trim();
        });
    },

    setupPaymentOptions() {
        const paymentOptions = document.querySelectorAll('input[name="paymentMethod"]');

        // Set initial selection based on state
        const currentMethod = BookingState.payment.method;
        const defaultOption = document.querySelector(`input[name="paymentMethod"][value="${currentMethod}"]`);
        if (defaultOption) {
            defaultOption.checked = true;
            // Trigger change event to update UI and totals
            defaultOption.dispatchEvent(new Event('change'));
        }

        paymentOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                BookingState.payment.method = e.target.value;

                // Update parent styling
                document.querySelectorAll('.payment-option').forEach(opt => {
                    opt.classList.toggle('active', opt.querySelector('input').checked);
                });

                // Recalculate payment
                ServiceSelection.updatePayment();
                this.updateSummary();
            });
        });
    },

    updateSummary() {
        DOM.summaryVehicle.textContent = BookingState.vehicle.vehicleName || '-';
        DOM.summaryService.textContent = BookingState.service.name || '-';
        DOM.summaryLocation.textContent = BookingState.location.address
            ? (BookingState.location.address.length > 50
                ? BookingState.location.address.substring(0, 50) + '...'
                : BookingState.location.address)
            : '-';
        DOM.summarySchedule.textContent = BookingState.schedule.date
            ? `${BookingState.schedule.displayDate} at ${BookingState.schedule.displayTime || '-'}`
            : '-';

        // Calculate final amount
        let total = BookingState.payment.totalPrice;
        if (BookingState.payment.method === 'online') {
            total = Math.round(total * (1 - CONFIG.ONLINE_DISCOUNT));
        }
        BookingState.payment.finalAmount = total;

        DOM.summaryTotal.textContent = Utils.formatCurrency(total);
    }
};

// ============================================
// BOOKING SUBMISSION
// ============================================
const BookingFlow = {
    async submitBooking() {
        // Validate user details for new users
        if (BookingState.user.isNewUser) {
            const name = DOM.customerName.value.trim();
            if (!name) {
                Utils.showToast('Please enter your name', 'error');
                DOM.customerName.focus();
                return;
            }
            BookingState.user.name = name;
            BookingState.user.email = DOM.customerEmail.value.trim();
        }

        Utils.showLoading('Creating your booking...');

        try {
            // Step 1: Complete registration for new users
            if (BookingState.user.isNewUser && BookingState.user.phone) {
                await API.completeRegistration({
                    phone: BookingState.user.phone,
                    name: BookingState.user.name,
                    email: BookingState.user.email
                });
            }

            // Step 2: Create vehicle if needed (Smart Auto-Create)
            if (!BookingState.vehicle.vehicleId && BookingState.user.id) {
                const vehicleData = {
                    customer_id: BookingState.user.id,
                    category_id: BookingState.vehicle.categoryId,
                    make: BookingState.vehicle.vehicleName.split(' ')[0] || 'Unknown',
                    model: BookingState.vehicle.vehicleName.split(' ').slice(1).join(' ') || BookingState.vehicle.categoryName,
                    plate_number: null
                };

                const newVehicle = await API.createVehicle(vehicleData);
                BookingState.vehicle.vehicleId = newVehicle.id;
            }

            // Step 3: Build address with landmark
            let fullAddress = BookingState.location.address;
            if (BookingState.landmark.name) {
                fullAddress += ` (Near ${BookingState.landmark.type}: ${BookingState.landmark.name})`;
            }

            // Step 4: Create booking
            // Get customer_id from localStorage or BookingState
            let customerId = BookingState.user.id;
            if (!customerId) {
                const userData = localStorage.getItem('customer_data');
                if (userData) {
                    try {
                        const customer = JSON.parse(userData);
                        customerId = customer.id || customer.customer_id;
                    } catch (e) {
                        console.error('Failed to parse customer data');
                    }
                }
            }

            // Validate customer_id exists - CRITICAL: Don't allow booking without valid customer
            if (!customerId) {
                console.error('❌ No customer_id found! User must be logged in to book.');
                Utils.hideLoading();
                Utils.showToast('Please log in to continue booking', 'error');

                // Redirect to login or open auth modal
                if (typeof AuthSystem !== 'undefined') {
                    AuthSystem.openAuthModal();
                }
                return;
            }

            console.log('✅ Customer ID validated:', customerId);
            console.log('🚗 Vehicle state:', {
                vehicleId: BookingState.vehicle.vehicleId,
                carId: BookingState.vehicle.carId,
                modelId: BookingState.vehicle.modelId,
                categoryId: BookingState.vehicle.categoryId
            });

            // Build booking payload matching API requirements
            const bookingData = {
                customer_id: customerId, // No fallback - must be valid
                vehicle_id: BookingState.vehicle.vehicleId || BookingState.vehicle.carId || BookingState.vehicle.modelId,
                service_ids: Array.isArray(BookingState.service.id)
                    ? BookingState.service.id
                    : [BookingState.service.id], // Ensure it's always an array
                booking_date: BookingState.schedule.date,
                start_time: BookingState.schedule.time,
                end_time: this.calculateEndTime(BookingState.schedule.time),
                address: fullAddress,
                latitude: BookingState.location.lat || BookingState.location.latitude,
                longitude: BookingState.location.lng || BookingState.location.longitude,
                total_price: BookingState.payment.finalAmount
            };

            // Add zone_id only if it exists (optional field)
            if (BookingState.location.zoneId) {
                bookingData.zone_id = BookingState.location.zoneId;
            }

            // Validate required fields before sending
            console.log('📋 Validating booking data...');
            const requiredFields = ['customer_id', 'vehicle_id', 'service_ids', 'booking_date', 'start_time', 'end_time', 'address', 'latitude', 'longitude', 'total_price'];
            const missingFields = requiredFields.filter(field => !bookingData[field] || (Array.isArray(bookingData[field]) && bookingData[field].length === 0));

            if (missingFields.length > 0) {
                console.error('❌ Missing required fields:', missingFields);
                Utils.hideLoading();
                Utils.showToast(`Missing required data: ${missingFields.join(', ')}`, 'error');
                return;
            }

            console.log('📦 Booking data to send:', bookingData);
            console.log('📋 Field types:', {
                customer_id: typeof bookingData.customer_id,
                vehicle_id: typeof bookingData.vehicle_id,
                service_ids: Array.isArray(bookingData.service_ids) ? 'array' : typeof bookingData.service_ids,
                booking_date: typeof bookingData.booking_date,
                latitude: typeof bookingData.latitude,
                longitude: typeof bookingData.longitude,
                total_price: typeof bookingData.total_price
            });

            // Log the exact JSON string that will be sent
            console.log('📤 Exact JSON payload:');
            console.log(JSON.stringify(bookingData, null, 2));

            const booking = await API.createBooking(bookingData);

            Utils.hideLoading();
            this.showSuccess(booking);

        } catch (error) {
            Utils.hideLoading();

            // Show detailed error message
            let errorMessage = 'Failed to create booking. ';
            if (error.message) {
                errorMessage += error.message;
            }

            Utils.showToast(errorMessage, 'error');
            console.error('❌ Booking error details:', {
                message: error.message,
                stack: error.stack,
                error: error
            });
        }
    },

    calculateEndTime(startTime) {
        const [hours, minutes, seconds] = startTime.split(':').map(Number);
        const endHour = hours + 1;
        return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    showSuccess(booking) {
        const bookingId = booking?.id || Math.random().toString(36).substr(2, 8).toUpperCase();
        DOM.bookingIdDisplay.textContent = `#TTC-${bookingId}`;
        DOM.successModal.classList.add('active');

        // Reinitialize icons in modal
        lucide.createIcons();
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM references
    DOM.init();

    // Initialize navigation
    Navigation.init();

    // Initialize Step 1
    await VehicleSelection.init();

    // Check for existing user session
    checkUserSession();

    console.log('🚗 Tip-Top Car Wash Booking System Initialized!');
});

function checkUserSession() {
    // Check localStorage for user data
    const userData = localStorage.getItem('tiptop_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            BookingState.user = { ...BookingState.user, ...user };

            // Update UI
            if (user.name) {
                DOM.userName.textContent = user.name;
            }
            if (user.phone) {
                DOM.userName.textContent = user.phone;
            }

            // Check for saved vehicles
            VehicleSelection.checkSavedVehicles();
        } catch (e) {
            console.log('No valid user session');
        }
    }
}

// Export for external access
window.BookingState = BookingState;
window.Navigation = Navigation;
window.Utils = Utils;