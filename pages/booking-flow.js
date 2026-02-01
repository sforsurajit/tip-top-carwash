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
        categoryId: null,
        categoryName: null,
        vehicleId: null,
        vehicleName: null,
        multiplier: 1.0,
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
        method: 'auto', // 'auto' or 'manual'
        latitude: null,
        longitude: null,
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
        method: 'cash',
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
        this.nextBtn = document.getElementById('nextBtn');
        this.confirmBtn = document.getElementById('confirmBtn');

        // Step 1: Vehicle
        this.carSearchInput = document.getElementById('carSearchInput');
        this.searchClear = document.getElementById('searchClear');
        this.searchResults = document.getElementById('searchResults');
        this.vehicleTypesGrid = document.getElementById('vehicleTypesGrid');
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
        this.zoneSelect = document.getElementById('zoneSelect');
        this.manualAddress = document.getElementById('manualAddress');
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

    // Vehicle Categories
    async getVehicleCategories() {
        return this.request('/car-categories/active');
    },

    // Services by Vehicle Type
    async getServices(vehicleId) {
        return this.request(`/services/vehicle/${vehicleId}`);
    },

    // Service Zones
    async getZones() {
        return this.request('/zones_routes/');
    },

    // Check Location in Zone
    async checkLocation(zoneId, lat, lng) {
        return this.request(`/zones_routes/${zoneId}/check-location`, {
            method: 'POST',
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });
    },

    // Customer Vehicles
    async getCustomerVehicles(customerId) {
        return this.request(`/vehicles/${customerId}`);
    },

    // Create Vehicle
    async createVehicle(data) {
        return this.request('/vehicles/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Create Booking
    async createBooking(data) {
        return this.request('/bookings/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
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
        DOM.backBtn.style.display = step > 1 ? 'flex' : 'none';
        DOM.nextBtn.style.display = step < BookingState.totalSteps ? 'flex' : 'none';
        DOM.confirmBtn.style.display = step === BookingState.totalSteps ? 'flex' : 'none';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ============================================
// STEP 1: VEHICLE SELECTION
// ============================================
const VehicleSelection = {
    async init() {
        await CarDatabase.load();
        await this.loadVehicleCategories();
        this.setupSearch();
        this.checkSavedVehicles();
    },

    async loadVehicleCategories() {
        try {
            // Try API first
            const categories = await API.getVehicleCategories();
            BookingState.cache.vehicleCategories = categories;
            this.renderVehicleTypes(categories);
        } catch (error) {
            // Fallback to default categories
            const defaultCategories = [
                { id: 1, car_name: 'Hatchback', multiplier: 1.0, icon: '🚗' },
                { id: 2, car_name: 'Sedan', multiplier: 1.2, icon: '🚙' },
                { id: 3, car_name: 'SUV', multiplier: 1.5, icon: '🚐' },
                { id: 4, car_name: 'Bike', multiplier: 0.5, icon: '🏍️' }
            ];
            BookingState.cache.vehicleCategories = defaultCategories;
            this.renderVehicleTypes(defaultCategories);
        }
    },

    renderVehicleTypes(categories) {
        const icons = {
            'Hatchback': '🚗',
            'Sedan': '🚙',
            'Sudan': '🚙', // API typo handling
            'SUV': '🚐',
            'Bike': '🏍️'
        };

        DOM.vehicleTypesGrid.innerHTML = categories.map(cat => `
            <div class="vehicle-type-card" data-id="${cat.id}" data-name="${cat.car_name}" data-multiplier="${cat.multiplier}">
                <div class="vehicle-type-icon">${icons[cat.car_name] || '🚗'}</div>
                <div class="vehicle-type-name">${cat.car_name}</div>
                <div class="vehicle-type-multiplier">From ₹${Math.round(200 * parseFloat(cat.multiplier))}</div>
            </div>
        `).join('');

        // Add click handlers
        DOM.vehicleTypesGrid.querySelectorAll('.vehicle-type-card').forEach(card => {
            card.addEventListener('click', () => this.selectVehicleType(card));
        });
    },

    selectVehicleType(card) {
        // Remove previous selection
        DOM.vehicleTypesGrid.querySelectorAll('.vehicle-type-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        // Update state
        BookingState.vehicle.categoryId = parseInt(card.dataset.id);
        BookingState.vehicle.categoryName = card.dataset.name;
        BookingState.vehicle.multiplier = parseFloat(card.dataset.multiplier);
        BookingState.vehicle.vehicleName = card.dataset.name; // Default to category name

        // Clear search
        DOM.carSearchInput.value = '';
        DOM.searchResults.classList.remove('active');

        Utils.showToast(`${card.dataset.name} selected!`, 'success');
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

        const results = CarDatabase.search(query);

        if (results.length === 0) {
            DOM.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="result-info">
                        <div class="result-name">No cars found</div>
                        <div class="result-type">Try selecting a vehicle type below</div>
                    </div>
                </div>
            `;
        } else {
            DOM.searchResults.innerHTML = results.map(car => `
                <div class="search-result-item" data-name="${car.name}" data-type="${car.type}" data-category="${car.category_id}">
                    <div class="result-icon">
                        <i data-lucide="car"></i>
                    </div>
                    <div class="result-info">
                        <div class="result-name">${car.name}</div>
                        <div class="result-type">${car.type}</div>
                    </div>
                </div>
            `).join('');

            // Re-initialize icons
            lucide.createIcons();

            // Add click handlers
            DOM.searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => this.selectFromSearch(item));
            });
        }

        DOM.searchResults.classList.add('active');
    },

    selectFromSearch(item) {
        const categoryId = parseInt(item.dataset.category);
        const carName = item.dataset.name;
        const carType = item.dataset.type;

        // Find and select the corresponding category card
        const categoryCard = DOM.vehicleTypesGrid.querySelector(`[data-id="${categoryId}"]`);
        if (categoryCard) {
            this.selectVehicleType(categoryCard);
        }

        // Update vehicle name
        BookingState.vehicle.vehicleName = carName;

        // Update search input
        DOM.carSearchInput.value = carName;
        DOM.searchResults.classList.remove('active');

        Utils.showToast(`${carName} selected!`, 'success');
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
            // Fallback services
            const fallbackServices = [
                {
                    id: 1,
                    name: 'Quick Wash',
                    base_price: 199,
                    description: 'Exterior wash with foam and rinse',
                    features: ['Exterior Wash', 'Foam Treatment', 'Tire Shine'],
                    popular: false
                },
                {
                    id: 2,
                    name: 'Full Wash',
                    base_price: 349,
                    description: 'Complete interior and exterior cleaning',
                    features: ['Exterior Wash', 'Interior Vacuum', 'Dashboard Polish', 'Tire Shine'],
                    popular: true
                },
                {
                    id: 3,
                    name: 'Premium Detailing',
                    base_price: 599,
                    description: 'Deep cleaning with premium products',
                    features: ['Full Wash', 'Engine Cleaning', 'Leather Treatment', 'Ceramic Coat'],
                    popular: false
                }
            ];
            this.renderServices(fallbackServices);
        }
    },

    renderServices(services) {
        const multiplier = BookingState.vehicle.multiplier;

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

        // Auto-select popular service
        const popularCard = DOM.servicesGrid.querySelector('.service-card.popular');
        if (popularCard) {
            this.selectService(popularCard);
        }
    },

    selectService(card) {
        DOM.servicesGrid.querySelectorAll('.service-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        BookingState.service.id = parseInt(card.dataset.id);
        BookingState.service.name = card.dataset.name;
        BookingState.service.finalPrice = parseInt(card.dataset.price);
        BookingState.service.features = JSON.parse(card.dataset.features);

        this.updatePayment();
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
const LocationSelection = {
    init() {
        this.setupLocationOptions();
        this.loadZones();
    },

    setupLocationOptions() {
        // Auto detect option
        DOM.detectLocationBtn.addEventListener('click', () => {
            this.setLocationMethod('auto');
        });

        // Manual entry option
        DOM.manualLocationBtn.addEventListener('click', () => {
            this.setLocationMethod('manual');
        });

        // Detect status click
        DOM.detectStatus.addEventListener('click', () => {
            if (BookingState.location.method === 'auto') {
                this.detectLocation();
            }
        });

        // Change location button
        DOM.changeLocationBtn.addEventListener('click', () => {
            this.resetLocation();
        });

        // Try manual button (from error state)
        DOM.tryManualBtn.addEventListener('click', () => {
            this.setLocationMethod('manual');
        });

        // Confirm address button
        DOM.confirmAddressBtn.addEventListener('click', () => {
            this.confirmManualAddress();
        });
    },

    setLocationMethod(method) {
        BookingState.location.method = method;

        // Update UI
        DOM.detectLocationBtn.classList.toggle('active', method === 'auto');
        DOM.manualLocationBtn.classList.toggle('active', method === 'manual');

        if (method === 'auto') {
            DOM.locationDetectArea.style.display = 'block';
            DOM.manualEntryArea.style.display = 'none';
            this.resetLocation();
        } else {
            DOM.locationDetectArea.style.display = 'none';
            DOM.manualEntryArea.style.display = 'block';
        }
    },

    resetLocation() {
        DOM.locationSuccess.style.display = 'none';
        DOM.locationError.style.display = 'none';
        DOM.detectStatus.style.display = 'block';
        BookingState.location.isValid = false;
    },

    async loadZones() {
        try {
            const response = await API.getZones();

            // Parse response structure: {success: true, data: {zones: []}}
            let zones = [];
            if (response && response.success && response.data && response.data.zones) {
                zones = response.data.zones.map(z => ({
                    id: z.id,
                    name: z.zone_name
                }));
            } else if (Array.isArray(response)) {
                // Fallback if API returns array directly
                zones = response;
            }

            BookingState.cache.zones = zones;
            this.populateZoneDropdown(zones);
        } catch (error) {
            console.error('Failed to load zones:', error);
            // Fallback zones
            const fallbackZones = [
                { id: 1, name: 'Kokrajhar' },
                { id: 2, name: 'Gossaigaon' },
                { id: 3, name: 'Dotma' }
            ];
            BookingState.cache.zones = fallbackZones;
            this.populateZoneDropdown(fallbackZones);
        }
    },

    populateZoneDropdown(zones) {
        DOM.zoneSelect.innerHTML = `
            <option value="">Select your area</option>
            ${zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('')}
        `;
    },

    async detectLocation() {
        if (!navigator.geolocation) {
            Utils.showToast('Geolocation not supported', 'error');
            return;
        }

        DOM.detectStatus.classList.add('loading');
        DOM.detectStatus.querySelector('.detect-text').textContent = 'Detecting location...';

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                BookingState.location.latitude = latitude;
                BookingState.location.longitude = longitude;

                // Get address from coordinates
                await this.reverseGeocode(latitude, longitude);

                // Check if in service zone
                await this.checkServiceZone(latitude, longitude);
            },
            (error) => {
                DOM.detectStatus.classList.remove('loading');
                DOM.detectStatus.querySelector('.detect-text').textContent = 'Click to detect your location';
                Utils.showToast('Unable to detect location. Please enter manually.', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            BookingState.location.address = data.display_name || 'Location detected';
        } catch (error) {
            BookingState.location.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    },

    async checkServiceZone(lat, lng) {
        const zones = BookingState.cache.zones;
        let foundZone = null;

        // Check each zone
        for (const zone of zones) {
            try {
                const response = await API.checkLocation(zone.id, lat, lng);

                // Check if response indicates location is in zone
                if (response && response.success && response.data && response.data.is_in_zone) {
                    foundZone = {
                        id: response.data.zone_id,
                        name: response.data.zone_name
                    };
                    break;
                }
            } catch (error) {
                console.log(`Zone ${zone.id} check failed:`, error);
                continue;
            }
        }

        DOM.detectStatus.classList.remove('loading');

        if (foundZone) {
            // Success - location is in service zone
            BookingState.location.zoneId = foundZone.id;
            BookingState.location.zoneName = foundZone.name;
            BookingState.location.isValid = true;

            this.showLocationSuccess();
        } else {
            // Error - outside service area
            this.showLocationError();

            // Show alert to user
            setTimeout(() => {
                alert('⚠️ Out of Service Area\n\nYour current location is outside our service area. Please enter your address manually to check if we can serve your location.');

                // Automatically switch to manual entry
                this.setLocationMethod('manual');
            }, 500);
        }
    },

    showLocationSuccess() {
        DOM.detectStatus.style.display = 'none';
        DOM.locationError.style.display = 'none';
        DOM.locationSuccess.style.display = 'flex';

        DOM.detectedAddress.textContent = BookingState.location.address;
        DOM.zoneName.textContent = BookingState.location.zoneName;

        Utils.showToast('Location confirmed!', 'success');
    },

    showLocationError() {
        DOM.detectStatus.style.display = 'none';
        DOM.locationSuccess.style.display = 'none';
        DOM.locationError.style.display = 'block';

        BookingState.location.isValid = false;
    },

    confirmManualAddress() {
        const zoneId = DOM.zoneSelect.value;
        const address = DOM.manualAddress.value.trim();

        if (!zoneId) {
            Utils.showToast('Please select a service zone', 'error');
            return;
        }

        if (!address) {
            Utils.showToast('Please enter your address', 'error');
            return;
        }

        const zone = BookingState.cache.zones.find(z => z.id == zoneId);

        BookingState.location.zoneId = parseInt(zoneId);
        BookingState.location.zoneName = zone ? zone.name : 'Selected Zone';
        BookingState.location.address = address;
        BookingState.location.isValid = true;

        Utils.showToast('Address confirmed!', 'success');

        // Auto advance to next step
        setTimeout(() => Navigation.nextStep(), 500);
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
            const dateStr = date.toISOString().split('T')[0];

            return `
                <div class="quick-date-card ${isToday ? 'today selected' : ''}" data-date="${dateStr}">
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
        DOM.calendarDays.querySelectorAll('.calendar-day').forEach(d => {
            d.classList.remove('selected');
        });

        card.classList.add('selected');

        const dateStr = card.dataset.date;
        const date = new Date(dateStr);

        BookingState.schedule.date = dateStr;
        BookingState.schedule.displayDate = Utils.formatDate(date);

        // Re-render time slots if today is selected
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

        // Re-render time slots
        this.renderTimeSlots();
    },

    renderTimeSlots() {
        const { start, end } = CONFIG.WORKING_HOURS;
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
            const bookingData = {
                customer_id: BookingState.user.id || 1,
                vehicle_id: BookingState.vehicle.vehicleId || BookingState.vehicle.categoryId,
                service_ids: [BookingState.service.id],
                booking_date: BookingState.schedule.date,
                start_time: BookingState.schedule.time,
                end_time: this.calculateEndTime(BookingState.schedule.time),
                address: fullAddress,
                latitude: BookingState.location.latitude,
                longitude: BookingState.location.longitude,
                zone_id: BookingState.location.zoneId,
                total_price: BookingState.payment.finalAmount,
                payment_method: BookingState.payment.method,
                notes: BookingState.landmark.name ? `Landmark: ${BookingState.landmark.name}` : null
            };

            const booking = await API.createBooking(bookingData);

            Utils.hideLoading();
            this.showSuccess(booking);

        } catch (error) {
            Utils.hideLoading();
            Utils.showToast('Failed to create booking. Please try again.', 'error');
            console.error('Booking error:', error);
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