/**
 * World-Class Booking Flow V2 JavaScript
 * Premium UX with State Management
 * Full-Screen Quick Rebook for Returning Customers
 */

// ========================================
// STATE MANAGEMENT
// ========================================

const BookingState = {
    currentStep: 1,
    totalSteps: 5,

    // Auth State
    isLoggedIn: false,
    customerId: null,
    customerName: null,

    // Vehicle
    vehicleType: null,
    vehicleName: null,
    vehicleMultiplier: 1.0,
    savedVehicles: [],
    selectedVehicleId: null,

    // Service
    selectedService: null,
    selectedServiceIds: [],
    basePrice: 0,
    finalPrice: 0,
    totalPrice: 0,

    // Location
    zone: null,
    zoneName: null,
    houseNo: '',
    streetName: '',
    areaName: '',
    landmarkType: null,
    landmarkName: '',
    pincode: '',
    additionalNotes: '',
    gpsLat: null,
    gpsLng: null,

    // Schedule
    selectedDate: null,
    selectedDateLabel: '',
    selectedTime: null,
    selectedTimeLabel: '',

    // Customer
    phone: '',
    phoneVerified: false,
    otp: '',
    paymentMethod: 'cash',

    // Returning Customer
    isReturningCustomer: false,
    customerProfile: null,
    lastBooking: null,
    rebookData: null
};

// Service packages with base prices
const SERVICES = {
    quick: {
        id: 'quick',
        name: 'Quick Wash',
        basePrice: 299,
        duration: '30 minutes',
        emoji: '⚡'
    },
    full: {
        id: 'full',
        name: 'Full Wash',
        basePrice: 499,
        duration: '45 minutes',
        emoji: '⭐'
    },
    premium: {
        id: 'premium',
        name: 'Premium Detail',
        basePrice: 899,
        duration: '90 minutes',
        emoji: '💎'
    }
};

// Vehicle type configurations
const VEHICLE_CONFIG = {
    'hatchback': { name: 'Hatchback', multiplier: 1.0, icon: '🚗' },
    'sedan': { name: 'Sedan', multiplier: 1.2, icon: '🚙' },
    'compact-suv': { name: 'Compact SUV', multiplier: 1.3, icon: '🚙' },
    'suv': { name: 'SUV / MUV', multiplier: 1.6, icon: '🚐' },
    'bike': { name: 'Bike / Scooter', multiplier: 0.5, icon: '🏍️' }
};

// Landmark types
const LANDMARK_TYPES = {
    'temple': { icon: '🛕', label: 'Temple/Mandir' },
    'mosque': { icon: '🕌', label: 'Mosque/Masjid' },
    'school': { icon: '🏫', label: 'School/College' },
    'market': { icon: '🏪', label: 'Market/Bazaar' },
    'petrol': { icon: '⛽', label: 'Petrol Pump' },
    'hospital': { icon: '🏥', label: 'Hospital/Medical' },
    'other': { icon: '📍', label: 'Other' }
};

// Car database for search
let carData = [];

// Available services from API
let availableServices = [];

// Brand data from API
let brandData = [];
let selectedBrand = null;

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Booking Flow V2 Initializing...');

    // First check authentication status
    checkAuthStatus();

    // Initialize components
    initializeBookingFlow();
    loadCarData();
    loadBrands();
    loadServiceZones();
    setDateLabels();

    // Load auth modal component
    loadAuthModal();

    // Listen for authentication success event
    window.addEventListener('authSuccess', function (e) {
        console.log('🎉 Auth success event received:', e.detail);

        // Update booking state
        if (e.detail && e.detail.user) {
            BookingState.isLoggedIn = true;
            BookingState.customerId = e.detail.user.id;
            BookingState.customerName = e.detail.user.name;
            BookingState.phone = e.detail.user.phone;
            BookingState.phoneVerified = true;
        }

        // Hide login overlay and show booking app
        hideLoginPrompt();

        // Fetch customer data
        if (BookingState.customerId) {
            fetchPreviousBookings(BookingState.customerId);
            fetchCustomerVehicles(BookingState.customerId);
        }
    });
});

/**
 * Load auth modal component for login
 */
async function loadAuthModal() {
    try {
        const container = document.getElementById('auth-modal-container');
        if (!container) return;

        const response = await fetch('../components/auth-modal.html');
        if (response.ok) {
            container.innerHTML = await response.text();
            console.log('✅ Auth modal loaded');
        }
    } catch (e) {
        console.log('Auth modal not loaded:', e);
    }
}

/**
 * Check if user is logged in via AuthSystem
 */
function checkAuthStatus() {
    const authToken = localStorage.getItem('auth_token');
    const customerData = JSON.parse(localStorage.getItem('customer_data') || '{}');

    console.log('🔐 Checking auth status...');
    console.log('Token exists:', !!authToken);
    console.log('Customer data:', customerData);

    if (authToken && customerData.id) {
        // User is logged in
        BookingState.isLoggedIn = true;
        BookingState.customerId = customerData.id;
        BookingState.customerName = customerData.name;
        BookingState.phone = customerData.phone;
        BookingState.phoneVerified = true;

        console.log('✅ User is logged in:', customerData.name);

        // Hide login prompt
        hideLoginPrompt();

        // Check for previous bookings (for Quick Rebook)
        fetchPreviousBookings(customerData.id);

        // Fetch user's saved vehicles
        fetchCustomerVehicles(customerData.id);

    } else {
        // User is not logged in - show login prompt
        console.log('⚠️ User not logged in - showing login prompt');
        showLoginPrompt();
    }
}

/**
 * Show login prompt overlay
 */
function showLoginPrompt() {
    const overlay = document.getElementById('loginPromptOverlay');
    const bookingApp = document.getElementById('bookingApp');

    if (overlay) overlay.style.display = 'flex';
    if (bookingApp) bookingApp.style.display = 'none';

    // Setup login button (only once)
    const loginBtn = document.getElementById('loginPromptBtn');
    if (loginBtn && !loginBtn.hasAttribute('data-listener-attached')) {
        loginBtn.setAttribute('data-listener-attached', 'true');
        loginBtn.addEventListener('click', function () {
            // Open AuthSystem modal (don't hide overlay yet)
            if (window.AuthSystem && typeof AuthSystem.openAuthModal === 'function') {
                AuthSystem.openAuthModal();

                // Start checking for login success
                startAuthCheckInterval();
            } else {
                console.error('AuthSystem not available');
                alert('Login system loading... Please try again.');
            }
        });
    }
}

/**
 * Start interval to check for authentication completion
 */
let authCheckInterval = null;

function startAuthCheckInterval() {
    // Clear any existing interval
    if (authCheckInterval) clearInterval(authCheckInterval);

    // Check every 500ms if user has logged in
    authCheckInterval = setInterval(function () {
        const authToken = localStorage.getItem('auth_token');
        const customerData = JSON.parse(localStorage.getItem('customer_data') || '{}');

        if (authToken && customerData.id) {
            // User has logged in successfully!
            clearInterval(authCheckInterval);
            authCheckInterval = null;

            console.log('✅ Auth successful - showing booking app');

            // Update booking state
            BookingState.isLoggedIn = true;
            BookingState.customerId = customerData.id;
            BookingState.customerName = customerData.name;
            BookingState.phone = customerData.phone;
            BookingState.phoneVerified = true;

            // Hide overlay and show booking app
            hideLoginPrompt();

            // Fetch customer data
            fetchPreviousBookings(customerData.id);
            fetchCustomerVehicles(customerData.id);
        }

        // Also check if auth modal is closed (user might have dismissed it)
        const authModal = document.getElementById('phone-auth-modal');
        if (authModal && authModal.style.display === 'none') {
            // Modal closed but not logged in - keep overlay visible
            const loginOverlay = document.getElementById('loginPromptOverlay');
            if (loginOverlay && loginOverlay.style.display !== 'none') {
                // User closed modal without logging in - that's fine
            }
        }
    }, 500);

    // Stop checking after 5 minutes (safety)
    setTimeout(function () {
        if (authCheckInterval) {
            clearInterval(authCheckInterval);
            authCheckInterval = null;
        }
    }, 300000);
}

/**
 * Hide login prompt overlay
 */
function hideLoginPrompt() {
    const overlay = document.getElementById('loginPromptOverlay');
    const bookingApp = document.getElementById('bookingApp');

    if (overlay) overlay.style.display = 'none';
    if (bookingApp) bookingApp.style.display = 'block';

    // Stop auth check interval
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
    }
}

/**
 * Fetch previous bookings from API for Quick Rebook
 */
async function fetchPreviousBookings(customerId) {
    try {
        const authToken = localStorage.getItem('auth_token');
        const url = `${API_CONFIG.BASE_URL}/bookings/customer-bookings`;

        console.log('📋 Fetching previous bookings...');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ customer_id: customerId })
        });

        const data = await response.json();

        if (data.success && data.data.bookings && data.data.bookings.length > 0) {
            console.log('✅ Found', data.data.bookings.length, 'previous bookings');

            // Get the most recent booking
            const lastBooking = data.data.bookings[0];
            BookingState.isReturningCustomer = true;
            BookingState.lastBooking = lastBooking;

            // Show Quick Rebook
            showQuickRebookTakeover();
        } else {
            console.log('ℹ️ No previous bookings - new customer');
        }

    } catch (e) {
        console.log('Could not fetch previous bookings:', e);
    }
}

/**
 * Fetch customer's saved vehicles from API
 */
async function fetchCustomerVehicles(customerId) {
    try {
        const authToken = localStorage.getItem('auth_token');
        const url = `${API_CONFIG.BASE_URL}/vehicles/${customerId}`;

        console.log('🚗 Fetching customer vehicles...');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success && data.data.vehicles && data.data.vehicles.length > 0) {
            console.log('✅ Found', data.data.vehicles.length, 'saved vehicles');
            BookingState.savedVehicles = data.data.vehicles;

            // Update UI to show saved vehicles
            displaySavedVehicles(data.data.vehicles);
        } else {
            console.log('ℹ️ No saved vehicles');
        }

    } catch (e) {
        console.log('Could not fetch vehicles:', e);
    }
}

/**
 * Display saved vehicles in Step 1
 */
function displaySavedVehicles(vehicles) {
    // TODO: Create a "Saved Vehicles" section above the vehicle type grid
    // For now, we'll use the vehicle type selection
    console.log('Saved vehicles available:', vehicles);
}

function initializeBookingFlow() {
    // Vehicle Selection
    initializeBrandSelection();
    initializeModelSelection();
    initializeManualEntry();
    initializeSearch();

    // Service Selection
    initializeServiceCards();

    // Location
    initializeLandmarkChips();
    initializeLocationForm();
    initializeGPSButton();

    // Schedule
    initializeDateTabs();
    initializeTimeSlots();

    // Confirm
    initializePhoneInput();
    initializeOTPInputs();
    initializePaymentOptions();

    // Navigation
    initializeNavigation();

    // Quick Rebook
    initializeQuickRebook();

    // Listen for auth state changes
    window.addEventListener('storage', function (e) {
        if (e.key === 'customer_data' || e.key === 'auth_token') {
            console.log('🔄 Auth state changed, rechecking...');
            checkAuthStatus();
        }
    });
}

function showQuickRebookTakeover() {
    const takeover = document.getElementById('quickRebookTakeover');
    const bookingApp = document.getElementById('bookingApp');

    if (!takeover || !BookingState.lastBooking) return;

    const last = BookingState.lastBooking;

    // Get vehicle icon based on type (from API booking data)
    const vehicleType = last.vehicle_type || 'sedan';
    const vehicleIcon = VEHICLE_CONFIG[vehicleType]?.icon || '🚗';

    // Populate data from API format
    document.getElementById('rebookCustomerName').textContent = BookingState.customerName || last.customer_name || 'there';
    document.getElementById('rebookVehicleIcon').textContent = vehicleIcon;
    document.getElementById('rebookVehicleName').textContent = `${last.vehicle_make || ''} ${last.vehicle_model || ''}`.trim() || 'Your Vehicle';
    document.getElementById('rebookVehicleType').textContent = last.vehicle_plate || vehicleType;
    document.getElementById('rebookServiceName').textContent = last.service_titles || 'Car Wash';
    document.getElementById('rebookPrice').textContent = last.total_price || '499';
    document.getElementById('rebookLocation').textContent = last.address || 'Previous Location';

    // Store for rebook
    BookingState.rebookData = {
        vehicle_id: last.vehicle_id,
        service_ids: last.service_ids,
        address: last.address,
        latitude: last.latitude,
        longitude: last.longitude,
        total_price: last.total_price
    };

    takeover.style.display = 'flex';
    bookingApp.style.display = 'none';

    // Set up time slots with actual dates
    updateQuickRebookSlots();
}

function updateQuickRebookSlots() {
    const now = new Date();
    const todaySlots = document.querySelectorAll('.quick-slot');

    todaySlots.forEach(slot => {
        const slotType = slot.dataset.slot;

        if (slotType === 'today-morning') {
            // Check if it's still morning
            if (now.getHours() >= 11) {
                slot.style.display = 'none';
            }
        } else if (slotType === 'today-afternoon') {
            if (now.getHours() >= 15) {
                slot.style.display = 'none';
            }
        }
    });
}

function initializeQuickRebook() {
    // Close button
    const closeBtn = document.getElementById('closeQuickRebook');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideQuickRebook);
    }

    // Book different button
    const bookDifferent = document.getElementById('bookDifferentService');
    if (bookDifferent) {
        bookDifferent.addEventListener('click', hideQuickRebook);
    }

    // Quick slot selection
    document.querySelectorAll('.quick-slot').forEach(slot => {
        slot.addEventListener('click', function () {
            document.querySelectorAll('.quick-slot').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');

            const confirmBtn = document.getElementById('confirmQuickRebook');
            if (confirmBtn) {
                confirmBtn.disabled = false;
            }
        });
    });

    // Confirm quick rebook
    const confirmBtn = document.getElementById('confirmQuickRebook');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmQuickRebook);
    }

    // Change location
    const changeLocation = document.getElementById('changeRebookLocation');
    if (changeLocation) {
        changeLocation.addEventListener('click', function () {
            hideQuickRebook();
            // Jump to step 3 (location)
            goToStep(3);
        });
    }
}

function hideQuickRebook() {
    const takeover = document.getElementById('quickRebookTakeover');
    const bookingApp = document.getElementById('bookingApp');

    if (takeover) takeover.style.display = 'none';
    if (bookingApp) bookingApp.style.display = 'block';
}

async function confirmQuickRebook() {
    const selectedSlot = document.querySelector('.quick-slot.selected');
    if (!selectedSlot) return;

    const btn = document.getElementById('confirmQuickRebook');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';

    try {
        const last = BookingState.lastBooking;
        const slotType = selectedSlot.dataset.slot;

        // Determine date and time
        const now = new Date();
        let bookingDate = new Date();
        let bookingTime = '11:00';

        if (slotType === 'today-morning') {
            bookingTime = '11:00';
        } else if (slotType === 'today-afternoon') {
            bookingTime = '15:00';
        } else if (slotType === 'tomorrow') {
            bookingDate.setDate(bookingDate.getDate() + 1);
            bookingTime = '11:00';
        }

        // Create booking data
        const bookingData = {
            ...last,
            date: bookingDate.toISOString().split('T')[0],
            time: bookingTime,
            isQuickRebook: true,
            createdAt: new Date().toISOString()
        };

        // Submit booking (you can integrate with your API here)
        console.log('Quick Rebook Booking:', bookingData);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update state and show success
        BookingState.currentStep = 6;
        populateSuccessScreen(bookingData);
        hideQuickRebook();
        goToStep(6);

    } catch (error) {
        console.error('Quick rebook failed:', error);
        alert('Booking failed. Please try again.');
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// ========================================
// BRAND & MODEL SELECTION
// ========================================

/**
 * Fetch brands from API
 */
async function loadBrands() {
    try {
        console.log('🔄 Fetching brands from API...');
        const response = await fetch('https://tip-topcarwash.in/main_erp/api_v1/brands');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.brands) {
            brandData = data.data.brands;
            console.log('✅ Loaded', brandData.length, 'brands from API');
            displayBrands(brandData);
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error('❌ Failed to load brands:', error);
        // Fallback to mock data
        brandData = [
            { id: 1, brand_name: 'Maruti Suzuki', icon_url: null },
            { id: 2, brand_name: 'Hyundai', icon_url: null },
            { id: 3, brand_name: 'Tata', icon_url: null },
            { id: 4, brand_name: 'Honda', icon_url: null },
            { id: 5, brand_name: 'Toyota', icon_url: null },
            { id: 6, brand_name: 'Mahindra', icon_url: null },
            { id: 7, brand_name: 'Kia', icon_url: null }
        ];
        console.log('⚠️ Using fallback brand data');
        displayBrands(brandData);
    }
}

/**
 * Display brands in the grid
 */
function displayBrands(brands) {
    const brandGrid = document.getElementById('brandGrid');
    if (!brandGrid) return;

    // Clear skeleton loaders
    brandGrid.innerHTML = '';

    // Add brand cards
    brands.forEach(brand => {
        const brandCard = document.createElement('div');
        brandCard.className = 'brand-card';
        brandCard.dataset.brandId = brand.id;
        brandCard.dataset.brandName = brand.brand_name;

        // Use icon_url if available, otherwise use emoji
        const brandIcon = brand.icon_url
            ? `<img src="${brand.icon_url}" alt="${brand.brand_name}" style="width: 60px; height: 60px; object-fit: contain;">`
            : `<div class="brand-logo">🚗</div>`;

        brandCard.innerHTML = `
            ${brandIcon}
            <div class="brand-name">${brand.brand_name}</div>
        `;

        brandGrid.appendChild(brandCard);
    });

    // Add "Other Brand" option
    const otherCard = document.createElement('div');
    otherCard.className = 'brand-card other-brand';
    otherCard.dataset.brandName = 'Other';
    otherCard.innerHTML = `
        <div class="brand-logo">➕</div>
        <div class="brand-name">Other Brand</div>
    `;
    brandGrid.appendChild(otherCard);

    console.log('✅ Displayed', brands.length, 'brands');
}

/**
 * Initialize brand selection handlers
 */
function initializeBrandSelection() {
    // Use event delegation for dynamically created brand cards
    const brandGrid = document.getElementById('brandGrid');
    if (brandGrid) {
        brandGrid.addEventListener('click', function (e) {
            const brandCard = e.target.closest('.brand-card');
            if (!brandCard) return;

            const brandName = brandCard.dataset.brandName;

            if (brandName === 'Other') {
                // Show manual entry view
                showManualEntryView();
            } else {
                // Select brand and show models
                selectBrand(brandName);
            }
        });
    }
}

/**
 * Select a brand and fetch its models from API
 */
async function selectBrand(brandName) {
    selectedBrand = brandName;
    console.log('🎯 Selected brand:', brandName);

    // Find the brand ID from brandData
    const brand = brandData.find(b => b.brand_name === brandName);
    if (!brand) {
        console.error('❌ Brand not found in brandData:', brandName);
        showManualEntryView();
        return;
    }

    const brandId = brand.id;
    console.log('🔄 Fetching models for brand ID:', brandId);

    // Hide brand view, show model view
    const brandView = document.getElementById('brandSelectionView');
    const modelView = document.getElementById('modelSelectionView');
    const modelGrid = document.getElementById('modelGrid');

    if (brandView) brandView.style.display = 'none';
    if (modelView) {
        modelView.style.display = 'block';

        // Update selected brand header
        const brandLogo = document.getElementById('selectedBrandLogo');
        const brandNameEl = document.getElementById('selectedBrandName');

        if (brandLogo) brandLogo.textContent = '🚗';
        if (brandNameEl) brandNameEl.textContent = brandName;
    }

    // Show loading state
    if (modelGrid) {
        modelGrid.innerHTML = `
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
            <div class="brand-skeleton"></div>
        `;
    }

    try {
        // Fetch models from API
        const response = await fetch(`https://tip-topcarwash.in/main_erp/api_v1/brands/Allcars/${brandId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
            // API returns single car object or array - handle both cases
            const cars = Array.isArray(data.data) ? data.data : [data.data];

            console.log('✅ Loaded', cars.length, 'models for', brandName);

            // Convert API format to our format
            const models = cars.map(car => ({
                id: car.id,  // Store car ID for services API
                model: car.car_name,
                category: car.car_type || 'Hatchback',
                brand: car.brand_name || brandName,
                icon_url: car.icon_url
            }));

            displayModels(models);
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error('❌ Failed to load models from API:', error);

        // Fallback to car.json data
        console.log('⚠️ Falling back to local car.json data');
        const models = carData.filter(car => car.brand === brandName);

        if (models.length === 0) {
            console.warn('⚠️ No models found for brand:', brandName);
            // Show manual entry as fallback
            if (modelGrid) {
                modelGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                        <p style="color: var(--neutral-600); margin-bottom: 1rem;">
                            No models found for ${brandName}
                        </p>
                        <button class="btn-back-to-brands" onclick="document.getElementById('brandSelectionView').style.display='block'; document.getElementById('modelSelectionView').style.display='none';">
                            ← Back to Brands
                        </button>
                    </div>
                `;
            }
            return;
        }

        displayModels(models);
    }
}

/**
 * Display models for selected brand
 */
function displayModels(models) {
    const modelGrid = document.getElementById('modelGrid');
    if (!modelGrid) return;

    modelGrid.innerHTML = '';

    // Display models
    models.forEach(model => {
        const modelCard = document.createElement('div');
        modelCard.className = 'model-card';
        modelCard.dataset.model = model.model;
        modelCard.dataset.category = model.category;
        modelCard.dataset.carId = model.id || ''; // Store car ID for services API

        // Get category class for styling
        const categoryClass = model.category.toLowerCase().replace(/\s+/g, '-');

        // Build car image or icon
        let carImage = '';
        if (model.icon_url) {
            carImage = `<img src="${model.icon_url}" alt="${model.model}" class="model-image" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem;">`;
        } else {
            carImage = `<div class="model-icon" style="font-size: 2.5rem; margin-bottom: 0.75rem;">🚗</div>`;
        }

        modelCard.innerHTML = `
            ${carImage}
            <div class="model-name">${model.model}</div>
            <span class="model-type ${categoryClass}">${model.category}</span>
        `;

        modelGrid.appendChild(modelCard);
    });

    // Add "Other Model" option
    const otherCard = document.createElement('div');
    otherCard.className = 'model-card other-model';
    otherCard.dataset.model = 'Other';
    otherCard.innerHTML = `
        <div class="model-icon" style="font-size: 2.5rem; margin-bottom: 0.75rem;">➕</div>
        <div class="model-name">Other Model</div>
        <span class="model-type">Manual Entry</span>
    `;
    modelGrid.appendChild(otherCard);

    console.log('✅ Displayed', models.length, 'models for', selectedBrand);
}

/**
 * Initialize model selection handlers
 */
function initializeModelSelection() {
    // Back to brands button
    const backBtn = document.getElementById('backToBrandsBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            const brandView = document.getElementById('brandSelectionView');
            const modelView = document.getElementById('modelSelectionView');

            if (brandView) brandView.style.display = 'block';
            if (modelView) modelView.style.display = 'none';

            selectedBrand = null;
        });
    }

    // Use event delegation for model cards
    const modelGrid = document.getElementById('modelGrid');
    if (modelGrid) {
        modelGrid.addEventListener('click', function (e) {
            const modelCard = e.target.closest('.model-card');
            if (!modelCard) return;

            const modelName = modelCard.dataset.model;
            const category = modelCard.dataset.category;
            const carId = modelCard.dataset.carId; // Get car ID for services API

            if (modelName === 'Other') {
                // Show manual entry view
                showManualEntryView();
            } else {
                // Select model and proceed
                selectModel(modelName, category, carId);
            }
        });
    }
}

/**
 * Select a model, fetch services from API, and proceed to next step
 */
async function selectModel(modelName, category, carId) {
    console.log('🎯 Selected model:', modelName, 'Category:', category, 'Car ID:', carId);

    // Map category to vehicle type
    const categoryToType = {
        'Hatchback': 'hatchback',
        'Sedan': 'sedan',
        'Compact SUV': 'compact-suv',
        'SUV': 'suv',
        'MUV': 'suv',
        'Bike': 'bike',
        'Scooter': 'bike'
    };

    const vehicleType = categoryToType[category] || 'hatchback';
    const multiplier = VEHICLE_CONFIG[vehicleType]?.multiplier || 1.0;
    const fullVehicleName = `${selectedBrand} ${modelName}`;

    // Update booking state
    BookingState.vehicleType = vehicleType;
    BookingState.vehicleMultiplier = multiplier;
    BookingState.vehicleName = fullVehicleName;
    BookingState.vehicleBrand = selectedBrand;
    BookingState.vehicleModel = modelName;
    BookingState.carId = carId; // Store car ID for services API

    console.log('✅ Vehicle selected:', fullVehicleName, 'Type:', vehicleType, 'Multiplier:', multiplier);

    // Fetch services from API if car ID is available
    if (carId) {
        console.log('🔄 Fetching services for car ID:', carId);

        try {
            const response = await fetch(`https://tip-topcarwash.in/main_erp/api_v1/services/vehicle/${carId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                // Store services in global variable
                availableServices = Array.isArray(data.data) ? data.data : [data.data];
                console.log('✅ Loaded', availableServices.length, 'services from API');

                // Display services dynamically
                displayServicesFromAPI(availableServices);
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error('❌ Failed to load services from API:', error);
            console.log('⚠️ Using default service cards');
            // Fall back to existing static service cards
            updateServicePrices();
        }
    } else {
        console.log('⚠️ No car ID available, using default services');
        // Update service prices for static cards
        updateServicePrices();
    }

    // Auto-advance to next step
    setTimeout(() => goToStep(2), 300);
}

/**
 * Display services from API dynamically
 */
function displayServicesFromAPI(services) {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) {
        console.warn('⚠️ Services grid not found');
        return;
    }

    // Clear existing content (skeleton loaders or old services)
    servicesGrid.innerHTML = '';

    services.forEach((service, index) => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        if (index === 0) serviceCard.classList.add('selected'); // Pre-select first service

        serviceCard.dataset.service = service.id || service.service_id;
        serviceCard.dataset.basePrice = service.price || service.base_price || 0;

        // Build service card HTML
        serviceCard.innerHTML = `
            <div class="service-icon">${service.icon || '🚗'}</div>
            <h3 class="service-name">${service.service_name || service.name}</h3>
            <p class="service-description">${service.description || ''}</p>
            <div class="service-price">
                <span class="price-label">₹</span>
                <span class="price-value">${service.price || service.base_price || 0}</span>
            </div>
            ${service.popular ? '<div class="service-badge">Most Popular</div>' : ''}
        `;

        servicesGrid.appendChild(serviceCard);
    });

    console.log('✅ Displayed', services.length, 'services from API');

    // Re-initialize service card click handlers
    initializeServiceCards();
}


/**
 * Show manual entry view
 */
function showManualEntryView() {
    const brandView = document.getElementById('brandSelectionView');
    const modelView = document.getElementById('modelSelectionView');
    const manualView = document.getElementById('manualEntryView');

    if (brandView) brandView.style.display = 'none';
    if (modelView) modelView.style.display = 'none';
    if (manualView) manualView.style.display = 'block';
}

/**
 * Initialize manual entry handlers
 */
function initializeManualEntry() {
    // Back from manual entry
    const backBtn = document.getElementById('backFromManualBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            const brandView = document.getElementById('brandSelectionView');
            const manualView = document.getElementById('manualEntryView');

            if (brandView) brandView.style.display = 'block';
            if (manualView) manualView.style.display = 'none';

            selectedBrand = null;
        });
    }

    // Confirm manual entry
    const confirmBtn = document.getElementById('confirmManualEntry');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            const brandInput = document.getElementById('manualBrand');
            const modelInput = document.getElementById('manualModel');
            const typeSelect = document.getElementById('manualVehicleType');

            if (!brandInput || !modelInput || !typeSelect) return;

            const brand = brandInput.value.trim();
            const model = modelInput.value.trim();
            const vehicleType = typeSelect.value;

            if (!brand || !model || !vehicleType) {
                alert('Please fill in all required fields');
                return;
            }

            const multiplier = VEHICLE_CONFIG[vehicleType]?.multiplier || 1.0;
            const fullVehicleName = `${brand} ${model}`;

            // Update booking state
            BookingState.vehicleType = vehicleType;
            BookingState.vehicleMultiplier = multiplier;
            BookingState.vehicleName = fullVehicleName;
            BookingState.vehicleBrand = brand;
            BookingState.vehicleModel = model;

            // Update service prices
            updateServicePrices();

            console.log('✅ Manual vehicle entry:', fullVehicleName, 'Type:', vehicleType);

            // Auto-advance to next step
            setTimeout(() => goToStep(2), 300);
        });
    }
}

// Keep old function for compatibility
function initializeVehicleCards() {
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.addEventListener('click', function () {
            const type = this.dataset.type;
            const multiplier = parseFloat(this.dataset.multiplier);

            selectVehicle(type, multiplier, VEHICLE_CONFIG[type]?.name);

            // Visual feedback
            document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            // Auto-advance to next step
            setTimeout(() => goToStep(2), 300);
        });
    });
}

function selectVehicle(type, multiplier, name = null) {
    BookingState.vehicleType = type;
    BookingState.vehicleMultiplier = multiplier;
    BookingState.vehicleName = name || VEHICLE_CONFIG[type]?.name || type;

    // Update selected vehicle display in step 2
    const iconEl = document.getElementById('selectedVehicleIcon');
    const nameEl = document.getElementById('selectedVehicleName');

    if (iconEl) iconEl.textContent = VEHICLE_CONFIG[type]?.icon || '🚗';
    if (nameEl) nameEl.textContent = BookingState.vehicleName;

    // Update service prices
    updateServicePrices();

    console.log('Vehicle selected:', BookingState.vehicleName, 'Multiplier:', multiplier);
}

function updateServicePrices() {
    const multiplier = BookingState.vehicleMultiplier;

    document.querySelectorAll('.service-card').forEach(card => {
        const basePrice = parseInt(card.dataset.basePrice);
        const finalPrice = Math.round(basePrice * multiplier);

        const priceEl = card.querySelector('.price-value');
        if (priceEl) {
            priceEl.textContent = finalPrice;
        }

    });
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

function initializeSearch() {
    // Try both possible input IDs for compatibility
    const searchInput = document.getElementById('carSearchInput') || document.getElementById('carSearch');
    const searchClear = document.getElementById('searchClear');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput) {
        console.warn('⚠️ Search input not found');
        return;
    }

    searchInput.addEventListener('input', function () {
        const query = this.value.trim();

        if (query.length >= 1) {
            const results = searchBrandsAndModels(query);
            displaySearchResults(results);
            if (searchClear) searchClear.style.display = 'block';
        } else {
            hideSearchResults();
            if (searchClear) searchClear.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', function () {
        if (this.value.trim().length >= 1) {
            if (searchResults) searchResults.classList.add('active');
        }
    });

    if (searchClear) {
        searchClear.addEventListener('click', function () {
            searchInput.value = '';
            hideSearchResults();
            this.style.display = 'none';
            searchInput.focus();
        });
    }

    // Hide results when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
}

async function loadCarData() {
    try {
        const response = await fetch('../car.json');
        if (response.ok) {
            const data = await response.json();
            // Extract cars array from the JSON structure
            carData = data.cars || [];
            console.log('✅ Car data loaded:', carData.length, 'models');
        }
    } catch (e) {
        console.error('❌ Failed to load car data:', e);
        console.log('⚠️ Using fallback car data');
        carData = [
            { brand: 'Maruti Suzuki', model: 'Swift', category: 'Hatchback' },
            { brand: 'Maruti Suzuki', model: 'Alto', category: 'Hatchback' },
            { brand: 'Hyundai', model: 'i20', category: 'Hatchback' },
            { brand: 'Honda', model: 'City', category: 'Sedan' },
            { brand: 'Maruti Suzuki', model: 'Dzire', category: 'Sedan' },
            { brand: 'Hyundai', model: 'Creta', category: 'Compact SUV' },
            { brand: 'Tata', model: 'Nexon', category: 'Compact SUV' },
            { brand: 'Mahindra', model: 'XUV700', category: 'SUV' },
            { brand: 'Toyota', model: 'Fortuner', category: 'SUV' },
            { brand: 'Honda', model: 'Activa', category: 'Bike' }
        ];
    }
}

/**
 * Search through brands and models
 * Prioritizes brand matches over model matches
 */
function searchBrandsAndModels(query) {
    const q = query.toLowerCase();
    const results = [];

    // First, search brands
    const matchingBrands = brandData.filter(brand =>
        brand.brand_name.toLowerCase().includes(q)
    );

    // Add brand results (limit to 5)
    matchingBrands.slice(0, 5).forEach(brand => {
        results.push({
            type: 'brand',
            name: brand.brand_name,
            subtitle: 'Brand',
            brand: brand.brand_name,
            id: brand.id
        });
    });

    // Then, search models (only if we have less than 8 results)
    if (results.length < 8) {
        const matchingModels = carData.filter(car =>
            car.model?.toLowerCase().includes(q) ||
            car.brand?.toLowerCase().includes(q)
        );

        // Add model results
        matchingModels.slice(0, 8 - results.length).forEach(car => {
            results.push({
                type: 'model',
                name: `${car.brand} ${car.model}`,
                subtitle: car.category,
                brand: car.brand,
                model: car.model,
                category: car.category
            });
        });
    }

    return results;
}

// Keep old function for backward compatibility
function searchCars(query) {
    const q = query.toLowerCase();
    return carData.filter(car =>
        car.model?.toLowerCase().includes(q) ||
        car.category?.toLowerCase().includes(q) ||
        car.brand?.toLowerCase().includes(q)
    ).slice(0, 8);
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="search-result-item">
                <span class="result-name">No results found</span>
                <span class="result-type">Try searching by brand or model</span>
            </div>
        `;
    } else {
        container.innerHTML = results.map(result => {
            // Handle both new format (with type) and old format (without type)
            const resultType = result.type || 'model';
            const name = result.name || result.model;
            const subtitle = result.subtitle || result.category;

            return `
                <div class="search-result-item" 
                     data-type="${resultType}"
                     data-brand="${result.brand || ''}"
                     data-model="${result.model || ''}"
                     data-category="${result.category || ''}">
                    <span class="result-name">${name}</span>
                    <span class="result-type">${subtitle}</span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function () {
                const type = this.dataset.type;
                const brand = this.dataset.brand;
                const model = this.dataset.model;
                const category = this.dataset.category;

                if (type === 'brand') {
                    // User clicked on a brand - show models for that brand
                    selectBrand(brand);
                    hideSearchResults();
                } else {
                    // User clicked on a model - select it directly
                    selectModel(model, category);
                    hideSearchResults();
                }
            });
        });
    }

    container.classList.add('active');
}

function selectCarFromSearch(model, category) {
    // Map category to vehicle type
    const categoryToType = {
        'Hatchback': 'hatchback',
        'Sedan': 'sedan',
        'Compact SUV': 'compact-suv',
        'SUV': 'suv',
        'MUV': 'suv',
        'Bike': 'bike',
        'Scooter': 'bike'
    };

    const type = categoryToType[category] || 'hatchback';
    const multiplier = VEHICLE_CONFIG[type]?.multiplier || 1.0;

    // Update search input
    const searchInput = document.getElementById('carSearch');
    if (searchInput) searchInput.value = model;

    selectVehicle(type, multiplier, model);

    // Highlight corresponding card
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.type === type) {
            card.classList.add('selected');
        }
    });

    // Auto-advance
    setTimeout(() => goToStep(2), 300);
}

function hideSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) container.classList.remove('active');
}

// ========================================
// SERVICE SELECTION
// ========================================

function initializeServiceCards() {
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', function () {
            const serviceId = this.dataset.service;
            const basePrice = parseInt(this.dataset.basePrice);

            selectService(serviceId, basePrice);

            // Visual feedback
            document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            // Auto-advance
            setTimeout(() => goToStep(3), 300);
        });
    });

    // Change vehicle button
    const changeBtn = document.getElementById('changeVehicle');
    if (changeBtn) {
        changeBtn.addEventListener('click', () => goToStep(1));
    }

    // Pre-select Full Wash (most popular - 67% choose this)
    const preSelectedCard = document.querySelector('.service-card.selected');
    if (preSelectedCard) {
        const serviceId = preSelectedCard.dataset.service;
        const basePrice = parseInt(preSelectedCard.dataset.basePrice);
        selectService(serviceId, basePrice);
        console.log('✅ Pre-selected service:', serviceId);
    }
}

function selectService(serviceId, basePrice) {
    const finalPrice = Math.round(basePrice * BookingState.vehicleMultiplier);

    BookingState.serviceId = serviceId;
    BookingState.selectedService = serviceId;
    BookingState.serviceName = SERVICES[serviceId]?.name || serviceId;
    BookingState.basePrice = basePrice;
    BookingState.finalPrice = finalPrice;
    BookingState.totalPrice = finalPrice;

    // Update summaries and nav buttons
    updateSummaries();
    updateNavButtons();

    console.log('Service selected:', BookingState.serviceName, 'Price:', finalPrice);
}

function updateSummaries() {
    const vehicleName = BookingState.vehicleName || 'Vehicle';
    const serviceName = SERVICES[BookingState.selectedService]?.name || BookingState.serviceName || 'Service';
    const price = BookingState.finalPrice || BookingState.totalPrice || 0;

    // Step 3 summary
    const summaryVehicle = document.getElementById('summaryVehicle');
    const summaryService = document.getElementById('summaryService');
    const summaryPrice = document.getElementById('summaryPrice');

    if (summaryVehicle) summaryVehicle.textContent = vehicleName;
    if (summaryService) summaryService.textContent = serviceName;
    if (summaryPrice) summaryPrice.textContent = price;

    // Step 4 compact summary
    const scheduleSummary = document.getElementById('scheduleSummary');
    if (scheduleSummary) {
        scheduleSummary.textContent = `${vehicleName} • ${serviceName} • ₹${price}`;
    }

    // Step 5 confirmation
    const confirmVehicle = document.getElementById('confirmVehicle');
    const confirmService = document.getElementById('confirmService');
    const confirmDateTime = document.getElementById('confirmDateTime');
    const confirmLocation = document.getElementById('confirmLocation');
    const confirmTotal = document.getElementById('confirmTotal');

    if (confirmVehicle) confirmVehicle.textContent = vehicleName;
    if (confirmService) confirmService.textContent = serviceName;
    if (confirmTotal) confirmTotal.textContent = `₹${price}`;

    // Date & Time
    if (confirmDateTime) {
        const dateLabel = BookingState.selectedDateLabel || 'Date';
        const timeLabel = BookingState.selectedTimeLabel || 'Time';
        confirmDateTime.textContent = `${dateLabel}, ${timeLabel}`;
    }

    // Location
    if (confirmLocation) {
        confirmLocation.textContent = BookingState.locationSummary || BookingState.address || 'Location not set';
    }

    // Payment prices
    const onlinePrice = document.getElementById('onlinePrice');
    const cashPrice = document.getElementById('cashPrice');

    if (onlinePrice) onlinePrice.textContent = Math.round(price * 0.93); // 7% discount
    if (cashPrice) cashPrice.textContent = price;
}

// ========================================
// LOCATION FORM
// ========================================

async function loadServiceZones() {
    const zoneSelect = document.getElementById('zoneSelect');
    if (!zoneSelect) return;

    try {
        const response = await fetch(window.API_CONFIG?.BASE_URL + '/zones_routes/' || '../api/zones_routes/');
        if (response.ok) {
            const zones = await response.json();

            zoneSelect.innerHTML = '<option value="">Select Service Zone</option>';
            zones.forEach(zone => {
                const option = document.createElement('option');
                option.value = zone.id || zone.zone_id;
                option.textContent = zone.zone_name || zone.name;
                zoneSelect.appendChild(option);
            });
        }
    } catch (e) {
        console.log('Using fallback zones');
        zoneSelect.innerHTML = `
            <option value="">Select Service Zone</option>
            <option value="1">Kokrajhar Town</option>
            <option value="2">Gossaigaon</option>
            <option value="3">Dotma</option>
            <option value="4">Titaguri</option>
        `;
    }
}

function initializeLandmarkChips() {
    document.querySelectorAll('.landmark-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            const landmarkType = this.dataset.landmark;

            // Visual feedback
            document.querySelectorAll('.landmark-chip').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            BookingState.landmarkType = landmarkType;

            // Show landmark name input
            const landmarkNameGroup = document.getElementById('landmarkNameGroup');
            const landmarkIcon = document.getElementById('landmarkIcon');
            const landmarkNameLabel = document.getElementById('landmarkNameLabel');
            const landmarkNameInput = document.getElementById('landmarkName');

            if (landmarkNameGroup) {
                landmarkNameGroup.style.display = 'block';

                if (landmarkIcon) {
                    landmarkIcon.textContent = LANDMARK_TYPES[landmarkType]?.icon || '📍';
                }

                if (landmarkNameInput) {
                    landmarkNameInput.placeholder = landmarkType === 'other'
                        ? 'Describe the location'
                        : `Enter ${LANDMARK_TYPES[landmarkType]?.label || 'landmark'} name`;
                    landmarkNameInput.focus();
                }
            }

            validateLocationForm();
        });
    });
}

function initializeLocationForm() {
    const formInputs = ['houseNo', 'streetName', 'areaName', 'landmarkName', 'pincode', 'zoneSelect'];

    formInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', validateLocationForm);
            input.addEventListener('change', validateLocationForm);
        }
    });

    // Continue button
    const continueBtn = document.getElementById('continueToSchedule');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            if (saveLocationData()) {
                goToStep(4);
            }
        });
    }
}

function validateLocationForm() {
    const zone = document.getElementById('zoneSelect')?.value;
    const houseNo = document.getElementById('houseNo')?.value?.trim();
    const streetName = document.getElementById('streetName')?.value?.trim();
    const areaName = document.getElementById('areaName')?.value?.trim();
    const landmarkName = document.getElementById('landmarkName')?.value?.trim();
    const pincode = document.getElementById('pincode')?.value?.trim();

    const isValid = zone && houseNo && streetName && areaName &&
        BookingState.landmarkType && landmarkName &&
        pincode && /^\d{6}$/.test(pincode);

    const continueBtn = document.getElementById('continueToSchedule');
    if (continueBtn) {
        continueBtn.disabled = !isValid;
    }

    return isValid;
}

function saveLocationData() {
    const zoneSelect = document.getElementById('zoneSelect');

    BookingState.zone = zoneSelect?.value;
    BookingState.zoneName = zoneSelect?.options[zoneSelect.selectedIndex]?.text || '';
    BookingState.houseNo = document.getElementById('houseNo')?.value?.trim() || '';
    BookingState.streetName = document.getElementById('streetName')?.value?.trim() || '';
    BookingState.areaName = document.getElementById('areaName')?.value?.trim() || '';
    BookingState.landmarkName = document.getElementById('landmarkName')?.value?.trim() || '';
    BookingState.pincode = document.getElementById('pincode')?.value?.trim() || '';
    BookingState.additionalNotes = document.getElementById('additionalNotes')?.value?.trim() || '';

    // Create location summary for display
    const landmarkIcon = LANDMARK_TYPES[BookingState.landmarkType]?.icon || '📍';
    BookingState.locationSummary = `${landmarkIcon} Near ${BookingState.landmarkName}, ${BookingState.areaName}`;

    // Update confirmation display
    const confirmLocation = document.getElementById('confirmLocation');
    if (confirmLocation) {
        confirmLocation.textContent = BookingState.locationSummary;
    }

    return true;
}

function initializeLocationMethods() {
    const currentLocationBtn = document.getElementById('useCurrentLocationBtn');
    const manualEntryBtn = document.getElementById('enterManuallyBtn');
    const methodContainer = document.getElementById('locationMethodContainer');
    const detectedView = document.getElementById('locationDetectedView');
    const manualForm = document.getElementById('manualLocationForm');
    const proceedBtn = document.getElementById('proceedWithLocationBtn');
    const changeMethodBtn = document.getElementById('changeLocationMethodBtn');
    const backToMethodsBtn = document.getElementById('backToMethodsBtn');

    // Current Location Button
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', handleCurrentLocation);
    }

    // Manual Entry Button
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', function () {
            showManualForm();
        });
    }

    // Proceed with detected location
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function () {
            // Save location data from GPS
            BookingState.locationSummary = `📍 ${document.getElementById('detectedAddress')?.textContent || 'Current Location'}`;
            updateSummaries();
            goToStep(4);
        });
    }

    // Change location method (go back to options)
    if (changeMethodBtn) {
        changeMethodBtn.addEventListener('click', function () {
            showLocationMethods();
        });
    }

    // Back to methods from manual form
    if (backToMethodsBtn) {
        backToMethodsBtn.addEventListener('click', function () {
            showLocationMethods();
        });
    }
}

function showLocationMethods() {
    const methodContainer = document.getElementById('locationMethodContainer');
    const detectedView = document.getElementById('locationDetectedView');
    const manualForm = document.getElementById('manualLocationForm');

    if (methodContainer) methodContainer.style.display = 'block';
    if (detectedView) detectedView.style.display = 'none';
    if (manualForm) manualForm.style.display = 'none';

    // Reset state
    BookingState.locationMethod = null;
    updateNavButtons();
}

function showManualForm() {
    const methodContainer = document.getElementById('locationMethodContainer');
    const detectedView = document.getElementById('locationDetectedView');
    const manualForm = document.getElementById('manualLocationForm');

    if (methodContainer) methodContainer.style.display = 'none';
    if (detectedView) detectedView.style.display = 'none';
    if (manualForm) manualForm.style.display = 'flex';

    BookingState.locationMethod = 'manual';

    // Focus on zone select
    setTimeout(() => {
        const zoneSelect = document.getElementById('zoneSelect');
        if (zoneSelect) zoneSelect.focus();
    }, 300);
}

function showLocationDetected(lat, lng, address) {
    const methodContainer = document.getElementById('locationMethodContainer');
    const detectedView = document.getElementById('locationDetectedView');
    const manualForm = document.getElementById('manualLocationForm');

    if (methodContainer) methodContainer.style.display = 'none';
    if (manualForm) manualForm.style.display = 'none';
    if (detectedView) detectedView.style.display = 'block';

    // Update detected address display
    const addressEl = document.getElementById('detectedAddress');
    const coordsEl = document.getElementById('detectedCoords');

    if (addressEl) {
        addressEl.textContent = address || 'Location captured successfully';
    }
    if (coordsEl) {
        coordsEl.textContent = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    BookingState.locationMethod = 'current';
}

async function handleCurrentLocation() {
    const btn = document.getElementById('useCurrentLocationBtn');
    const loader = btn?.querySelector('.method-loader');
    const arrow = btn?.querySelector('.method-arrow');

    if (!navigator.geolocation) {
        alert('GPS is not supported by your browser. Please enter location manually.');
        return;
    }

    // Show loading state
    btn?.classList.add('loading');
    if (loader) loader.style.display = 'flex';
    if (arrow) arrow.style.display = 'none';

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            });
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        BookingState.gpsLat = lat;
        BookingState.gpsLng = lng;

        // Reverse geocode to get address
        let addressText = 'Your current location';
        try {
            const address = await reverseGeocode(lat, lng);
            if (address) {
                const parts = [];
                if (address.road) parts.push(address.road);
                if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
                if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);

                if (parts.length > 0) {
                    addressText = parts.join(', ');
                }

                // Store address parts for potential use
                BookingState.detectedAddress = address;
            }
        } catch (e) {
            console.log('Reverse geocoding failed, using coordinates');
        }

        // Reset button state
        btn?.classList.remove('loading');
        if (loader) loader.style.display = 'none';
        if (arrow) arrow.style.display = 'block';

        // Show detected location view
        showLocationDetected(lat, lng, addressText);

    } catch (error) {
        console.error('GPS error:', error);

        // Reset button state
        btn?.classList.remove('loading');
        if (loader) loader.style.display = 'none';
        if (arrow) arrow.style.display = 'block';

        if (error.code === 1) {
            alert('Location permission denied. Please enable location access or enter your address manually.');
        } else if (error.code === 2) {
            alert('Unable to determine your location. Please try again or enter your address manually.');
        } else {
            alert('Location request timed out. Please try again or enter your address manually.');
        }
    }
}

// Keep the old function name for backwards compatibility
function initializeGPSButton() {
    // This is now handled by initializeLocationMethods
    initializeLocationMethods();
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
        );

        if (response.ok) {
            const data = await response.json();
            return data.address;
        }
    } catch (e) {
        console.log('Reverse geocoding failed:', e);
    }
    return null;
}

// ========================================
// SCHEDULE SELECTION
// ========================================

function setDateLabels() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEl = document.getElementById('todayDate');
    const tomorrowEl = document.getElementById('tomorrowDate');

    const options = { weekday: 'short', month: 'short', day: 'numeric' };

    if (todayEl) todayEl.textContent = today.toLocaleDateString('en-IN', options);
    if (tomorrowEl) tomorrowEl.textContent = tomorrow.toLocaleDateString('en-IN', options);

    // Set min date for custom picker
    const customDate = document.getElementById('customDate');
    if (customDate) {
        const minDate = today.toISOString().split('T')[0];
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 30);

        customDate.min = minDate;
        customDate.max = maxDate.toISOString().split('T')[0];
    }
}

function initializeDateTabs() {
    document.querySelectorAll('.date-card').forEach(card => {
        card.addEventListener('click', function () {
            const dateType = this.dataset.date;

            // Visual feedback
            document.querySelectorAll('.date-card').forEach(c => c.classList.remove('active', 'selected'));
            this.classList.add('active', 'selected');

            const customDateInput = document.getElementById('customDate');

            if (dateType === 'custom') {
                if (customDateInput) {
                    customDateInput.style.display = 'block';
                    customDateInput.focus();
                }
            } else {
                if (customDateInput) customDateInput.style.display = 'none';

                const today = new Date();
                if (dateType === 'tomorrow') {
                    today.setDate(today.getDate() + 1);
                }

                const dateStr = today.toISOString().split('T')[0];
                BookingState.date = dateStr;
                BookingState.selectedDate = dateStr;
                BookingState.selectedDateLabel = this.querySelector('.date-value')?.textContent || dateType;

                updateSchedulePreview();
                checkScheduleComplete();
                updateNavButtons();
            }

            // Disable past time slots if today
            updateAvailableTimeSlots(dateType === 'today');
        });
    });

    // Custom date input
    const customDateInput = document.getElementById('customDate');
    if (customDateInput) {
        customDateInput.addEventListener('change', function () {
            const date = new Date(this.value);
            const options = { weekday: 'short', month: 'short', day: 'numeric' };

            BookingState.date = this.value;
            BookingState.selectedDate = this.value;
            BookingState.selectedDateLabel = date.toLocaleDateString('en-IN', options);

            updateSchedulePreview();
            checkScheduleComplete();
            updateNavButtons();

            // Check if it's today
            const today = new Date();
            const isToday = this.value === today.toISOString().split('T')[0];
            updateAvailableTimeSlots(isToday);
        });
    }
}

function initializeTimeSlots() {
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', function () {
            if (this.disabled) return;

            // Visual feedback
            document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');

            BookingState.time = this.dataset.time;
            BookingState.selectedTime = this.dataset.time;
            BookingState.selectedTimeLabel = this.textContent.trim();

            updateSchedulePreview();
            checkScheduleComplete();
            updateNavButtons();
        });
    });

    // Continue button
    const continueBtn = document.getElementById('continueToConfirm');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            updateConfirmationScreen();
            goToStep(5);
        });
    }
}

function updateAvailableTimeSlots(isToday) {
    const now = new Date();
    const currentHour = now.getHours();

    document.querySelectorAll('.time-slot').forEach(slot => {
        const timeStr = slot.dataset.time;
        const slotHour = parseInt(timeStr.split(':')[0]);

        if (isToday && slotHour <= currentHour) {
            slot.disabled = true;
            slot.classList.remove('selected');
        } else {
            slot.disabled = false;
        }
    });

    // Clear selection if current selection is now disabled
    if (isToday && BookingState.selectedTime) {
        const selectedHour = parseInt(BookingState.selectedTime.split(':')[0]);
        if (selectedHour <= currentHour) {
            BookingState.selectedTime = null;
            BookingState.selectedTimeLabel = '';
            updateSchedulePreview();
            checkScheduleComplete();
        }
    }
}

function updateSchedulePreview() {
    const preview = document.getElementById('schedulePreview');
    const previewDate = document.getElementById('previewDate');
    const previewTime = document.getElementById('previewTime');

    if (!preview) return;

    if (BookingState.selectedDate && BookingState.selectedTime) {
        preview.style.display = 'flex';
        if (previewDate) previewDate.textContent = BookingState.selectedDateLabel;
        if (previewTime) previewTime.textContent = BookingState.selectedTimeLabel;
    } else {
        preview.style.display = 'none';
    }
}

function checkScheduleComplete() {
    const isComplete = BookingState.selectedDate && BookingState.selectedTime;

    const continueBtn = document.getElementById('continueToConfirm');
    if (continueBtn) {
        continueBtn.disabled = !isComplete;
    }
}

function updateConfirmationScreen() {
    const confirmDateTime = document.getElementById('confirmDateTime');
    if (confirmDateTime) {
        confirmDateTime.textContent = `${BookingState.selectedDateLabel}, ${BookingState.selectedTimeLabel}`;
    }
}

// ========================================
// PHONE & OTP
// ========================================

function initializePhoneInput() {
    const phoneInput = document.getElementById('phoneInput');
    const sendOtpBtn = document.getElementById('sendOtpBtn');

    if (!phoneInput || !sendOtpBtn) return;

    phoneInput.addEventListener('input', function () {
        // Only allow numbers
        this.value = this.value.replace(/\D/g, '');

        // Enable/disable send button
        sendOtpBtn.disabled = this.value.length !== 10;
        BookingState.phone = this.value;
    });

    sendOtpBtn.addEventListener('click', sendOTP);

    // Pre-fill phone if returning customer
    if (BookingState.customerProfile?.phone) {
        phoneInput.value = BookingState.customerProfile.phone;
        sendOtpBtn.disabled = false;
        BookingState.phone = BookingState.customerProfile.phone;
    }
}

async function sendOTP() {
    const btn = document.getElementById('sendOtpBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';

    try {
        // Simulate OTP send (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate demo OTP
        BookingState.generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('🔐 Demo OTP:', BookingState.generatedOTP);

        // Show OTP container
        document.getElementById('phoneInputContainer').style.display = 'none';
        document.getElementById('otpContainer').style.display = 'block';

        // Update sent message
        const maskedPhone = `+91 ${BookingState.phone.substring(0, 5)}*****`;
        document.getElementById('otpSentTo').textContent = maskedPhone;

        // Start timer
        startResendTimer();

        // Focus first OTP box
        document.querySelector('.otp-box')?.focus();

    } catch (error) {
        console.error('OTP send failed:', error);
        alert('Failed to send OTP. Please try again.');
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

let resendTimerInterval;

function startResendTimer() {
    let seconds = 30;
    const timerEl = document.getElementById('otpTimer');
    const resendBtn = document.getElementById('resendOtpBtn');

    if (timerEl) timerEl.style.display = 'inline';
    if (resendBtn) resendBtn.style.display = 'none';

    clearInterval(resendTimerInterval);

    resendTimerInterval = setInterval(() => {
        seconds--;
        if (timerEl) timerEl.textContent = `Resend in ${seconds}s`;

        if (seconds <= 0) {
            clearInterval(resendTimerInterval);
            if (timerEl) timerEl.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'inline';
        }
    }, 1000);
}

function initializeOTPInputs() {
    const otpBoxes = document.querySelectorAll('.otp-box');

    otpBoxes.forEach((box, index) => {
        box.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');

            if (this.value.length === 1) {
                this.classList.add('filled');

                // Move to next box
                if (index < otpBoxes.length - 1) {
                    otpBoxes[index + 1].focus();
                }
            } else {
                this.classList.remove('filled');
            }

            // Check if all boxes filled
            const otp = Array.from(otpBoxes).map(b => b.value).join('');
            BookingState.otp = otp;

            const verifyBtn = document.getElementById('verifyOtpBtn');
            if (verifyBtn) {
                verifyBtn.disabled = otp.length !== 6;
            }
        });

        box.addEventListener('keydown', function (e) {
            // Backspace - move to previous box
            if (e.key === 'Backspace' && !this.value && index > 0) {
                otpBoxes[index - 1].focus();
            }
        });

        box.addEventListener('paste', function (e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);

            pastedData.split('').forEach((char, i) => {
                if (otpBoxes[i]) {
                    otpBoxes[i].value = char;
                    otpBoxes[i].classList.add('filled');
                }
            });

            BookingState.otp = pastedData;
            const verifyBtn = document.getElementById('verifyOtpBtn');
            if (verifyBtn) {
                verifyBtn.disabled = pastedData.length !== 6;
            }
        });
    });

    // Verify button
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyOTP);
    }

    // Resend button
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', function () {
            // Clear OTP boxes
            otpBoxes.forEach(box => {
                box.value = '';
                box.classList.remove('filled');
            });
            BookingState.otp = '';

            sendOTP();
        });
    }

    // Change number button
    const changeBtn = document.getElementById('changeNumberBtn');
    if (changeBtn) {
        changeBtn.addEventListener('click', function () {
            document.getElementById('otpContainer').style.display = 'none';
            document.getElementById('phoneInputContainer').style.display = 'flex';
            clearInterval(resendTimerInterval);
        });
    }
}

async function verifyOTP() {
    const btn = document.getElementById('verifyOtpBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';

    try {
        // Simulate verification (in real app, call API)
        await new Promise(resolve => setTimeout(resolve, 800));

        // For demo, any 6-digit OTP is valid
        // In production, compare with BookingState.generatedOTP

        BookingState.phoneVerified = true;

        // Hide OTP, show verified badge
        document.getElementById('otpContainer').style.display = 'none';
        document.getElementById('phoneVerified').style.display = 'flex';
        document.getElementById('verifiedNumber').textContent = `+91 ${BookingState.phone.substring(0, 5)}-${BookingState.phone.substring(5)}`;

        // Show payment section
        document.getElementById('paymentSection').style.display = 'block';

        // Enable confirm button
        const confirmBtn = document.getElementById('confirmBookingBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }

        // Hide verify hint
        const verifyHint = document.getElementById('verifyHint');
        if (verifyHint) verifyHint.style.display = 'none';

    } catch (error) {
        console.error('OTP verification failed:', error);
        alert('Invalid OTP. Please try again.');
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

// ========================================
// PAYMENT OPTIONS
// ========================================

function initializePaymentOptions() {
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function () {
            BookingState.paymentMethod = this.value;
        });
    });

    // Change verified number button
    const changeVerifiedBtn = document.getElementById('changeVerifiedBtn');
    if (changeVerifiedBtn) {
        changeVerifiedBtn.addEventListener('click', function () {
            BookingState.phoneVerified = false;

            document.getElementById('phoneVerified').style.display = 'none';
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('phoneInputContainer').style.display = 'flex';
            document.getElementById('verifyHint').style.display = 'block';

            const confirmBtn = document.getElementById('confirmBookingBtn');
            if (confirmBtn) confirmBtn.disabled = true;
        });
    }

    // Confirm booking button
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', submitBooking);
    }
}

// ========================================
// BOOKING SUBMISSION
// ========================================

async function submitBooking() {
    const btn = document.getElementById('confirmBookingBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';

    try {
        // Get auth token
        const authToken = localStorage.getItem('auth_token');

        if (!authToken || !BookingState.customerId) {
            alert('Please login to complete your booking');
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            return;
        }

        // Calculate end time (add service duration to start time)
        const startTime = BookingState.selectedTime || '10:00';
        const endTime = calculateEndTime(startTime, 60); // Default 1 hour duration

        // Build full address
        const fullAddress = buildFullAddress();

        // Prepare booking data for API
        const bookingData = {
            customer_id: BookingState.customerId,
            vehicle_id: BookingState.selectedVehicleId || null,
            service_ids: BookingState.selectedServiceIds.length > 0
                ? BookingState.selectedServiceIds
                : [1], // Default service if none selected
            booking_date: BookingState.selectedDate || getTodayDate(),
            start_time: startTime + ':00',
            end_time: endTime + ':00',
            address: fullAddress,
            latitude: BookingState.gpsLat || 26.401150644506842,
            longitude: BookingState.gpsLng || 90.26834889543073,
            total_price: BookingState.paymentMethod === 'online'
                ? Math.round(BookingState.finalPrice * 0.93)
                : BookingState.finalPrice
        };

        // If we don't have a vehicle_id, we need to create one first
        if (!bookingData.vehicle_id && BookingState.vehicleType) {
            const vehicleId = await createVehicleIfNeeded();
            if (vehicleId) {
                bookingData.vehicle_id = vehicleId;
            }
        }

        console.log('📦 Submitting booking to API:', bookingData);

        // Submit to API
        const response = await fetch(`${API_CONFIG.BASE_URL}/bookings/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Booking created successfully!', result);

            // Store booking info for success screen
            const successData = {
                id: result.data?.booking_id || result.data?.id || 'TT-' + Date.now(),
                vehicle: {
                    name: BookingState.vehicleName || 'Vehicle',
                    type: BookingState.vehicleType
                },
                service: {
                    name: SERVICES[BookingState.selectedService]?.name || 'Car Wash'
                },
                schedule: {
                    dateLabel: BookingState.selectedDateLabel,
                    timeLabel: BookingState.selectedTimeLabel
                },
                location: {
                    summary: fullAddress
                },
                price: bookingData.total_price
            };

            // Show success
            populateSuccessScreen(successData);
            goToStep(6);

            // Trigger confetti
            triggerConfetti();
        } else {
            console.error('❌ Booking failed:', result);
            alert(result.message || 'Booking failed. Please try again.');
        }

    } catch (error) {
        console.error('Booking submission failed:', error);
        alert('Connection error. Please check your internet and try again.');
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

/**
 * Calculate end time from start time and duration in minutes
 */
function calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Build full address string from state
 */
function buildFullAddress() {
    const parts = [];
    if (BookingState.houseNo) parts.push(BookingState.houseNo);
    if (BookingState.streetName) parts.push(BookingState.streetName);
    if (BookingState.landmarkName) parts.push(`near ${BookingState.landmarkName}`);
    if (BookingState.areaName) parts.push(BookingState.areaName);
    if (BookingState.zoneName) parts.push(BookingState.zoneName);

    return parts.length > 0 ? parts.join(', ') : 'Kokrajhar';
}

/**
 * Create vehicle via API if needed (when user selects vehicle type but no saved vehicle)
 */
async function createVehicleIfNeeded() {
    try {
        const authToken = localStorage.getItem('auth_token');

        // Map vehicle type to make/model
        const vehicleTypeMap = {
            hatchback: { make: 'Maruti Suzuki', model: 'Swift', type: 'hatchback' },
            sedan: { make: 'Honda', model: 'City', type: 'sedan' },
            suv: { make: 'Hyundai', model: 'Creta', type: 'suv' },
            luxury: { make: 'Mercedes', model: 'E-Class', type: 'luxury' },
            tempo: { make: 'Tata', model: 'Ace', type: 'tempo' }
        };

        const vehicleInfo = vehicleTypeMap[BookingState.vehicleType] || vehicleTypeMap.sedan;

        const vehicleData = {
            customer_id: BookingState.customerId,
            make: vehicleInfo.make,
            model: vehicleInfo.model,
            license_plate: 'NEW-' + Math.floor(Math.random() * 10000),
            type: vehicleInfo.type,
            year: new Date().getFullYear(),
            color: 'white'
        };

        console.log('🚗 Creating vehicle:', vehicleData);

        const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(vehicleData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Vehicle created:', result.data);
            return result.data.vehicle_id || result.data.vehicle?.id;
        }

    } catch (e) {
        console.log('Could not create vehicle:', e);
    }

    return null;
}

function saveForQuickRebook(booking) {
    try {
        const lastBooking = {
            vehicleType: booking.vehicle.type,
            vehicleName: booking.vehicle.name,
            service: booking.service.id,
            price: booking.price,
            locationSummary: booking.location.summary,
            location: booking.location,
            lastBookedAt: new Date().toISOString()
        };

        localStorage.setItem('tt_last_booking', JSON.stringify(lastBooking));

        // Also save customer profile if not exists
        if (!localStorage.getItem('tt_customer_profile')) {
            localStorage.setItem('tt_customer_profile', JSON.stringify({
                phone: booking.customer.phone,
                createdAt: new Date().toISOString()
            }));
        }
    } catch (e) {
        console.log('Could not save for quick rebook:', e);
    }
}

function populateSuccessScreen(booking) {
    const bookingId = document.getElementById('bookingId');
    const successVehicle = document.getElementById('successVehicle');
    const successDateTime = document.getElementById('successDateTime');
    const successLocation = document.getElementById('successLocation');

    if (bookingId) bookingId.textContent = `#${booking.id || booking.bookingId || 'TT-XXXXXX'}`;
    if (successVehicle) {
        successVehicle.textContent = `${booking.vehicle?.name || BookingState.vehicleName} - ${booking.service?.name || SERVICES[BookingState.selectedService]?.name}`;
    }
    if (successDateTime) {
        successDateTime.textContent = `${booking.schedule?.dateLabel || BookingState.selectedDateLabel}, ${booking.schedule?.timeLabel || BookingState.selectedTimeLabel}`;
    }
    if (successLocation) {
        successLocation.textContent = booking.location?.summary || BookingState.locationSummary;
    }

    // Show save location prompt for new customers
    if (!BookingState.isReturningCustomer) {
        const prompt = document.getElementById('saveLocationPrompt');
        if (prompt) prompt.style.display = 'block';
    }
}

function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    const colors = ['#f97316', '#ea580c', '#22c55e', '#3b82f6', '#a855f7'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: absolute;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100 - 50}px;
                top: ${Math.random() * 100 - 50}px;
                opacity: 1;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation: confettiFall ${Math.random() * 2 + 1}s ease-out forwards;
            `;
            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// Add confetti animation
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(200px) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(confettiStyle);

// ========================================
// NAVIGATION
// ========================================

function initializeNavigation() {
    // Back button
    const backBtn = document.getElementById('headerBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            if (BookingState.currentStep > 1 && BookingState.currentStep <= 5) {
                e.preventDefault();
                goToStep(BookingState.currentStep - 1);
            }
        });
    }

    // Add to calendar button
    const calendarBtn = document.getElementById('addToCalendar');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', addToCalendar);
    }

    // Save location buttons
    document.getElementById('saveAsHome')?.addEventListener('click', () => saveLocation('home'));
    document.getElementById('saveCustom')?.addEventListener('click', () => {
        const name = prompt('Enter a name for this location (e.g., Office, Parents\' Home):');
        if (name) saveLocation(name);
    });
    document.getElementById('skipSave')?.addEventListener('click', () => {
        document.getElementById('saveLocationPrompt').style.display = 'none';
    });
}

// goToStep function moved to line 2223 (STEP NAVIGATION section)

function addToCalendar() {
    const title = `Car Wash - ${BookingState.vehicleName}`;
    const details = `${SERVICES[BookingState.selectedService]?.name} at ${BookingState.locationSummary}`;

    // Parse date and time
    const [year, month, day] = BookingState.selectedDate.split('-');
    const [hour, minute] = BookingState.selectedTime.split(':');

    const startDate = new Date(year, month - 1, day, parseInt(hour), parseInt(minute));
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour

    // Create Google Calendar URL
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(details)}`;

    window.open(calendarUrl, '_blank');
}

function saveLocation(label) {
    try {
        const savedLocations = JSON.parse(localStorage.getItem('tt_saved_locations') || '[]');

        savedLocations.push({
            label: label,
            zone: BookingState.zone,
            zoneName: BookingState.zoneName,
            houseNo: BookingState.houseNo,
            streetName: BookingState.streetName,
            areaName: BookingState.areaName,
            landmarkType: BookingState.landmarkType,
            landmarkName: BookingState.landmarkName,
            pincode: BookingState.pincode,
            summary: BookingState.locationSummary,
            createdAt: new Date().toISOString()
        });

        localStorage.setItem('tt_saved_locations', JSON.stringify(savedLocations));

        document.getElementById('saveLocationPrompt').style.display = 'none';
        alert(`Location saved as "${label}"!`);
    } catch (e) {
        console.error('Could not save location:', e);
    }
}

// ========================================
// CONFIRMATION STEP (STEP 5) - Phone, OTP, Payment
// ========================================

function initializePhoneInput() {
    // Phone input validation if phone field exists
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
        phoneInput.addEventListener('input', function () {
            // Remove non-numeric characters
            this.value = this.value.replace(/\D/g, '').slice(0, 10);
            BookingState.phone = this.value;
            updateNavButtons();
        });
    }
    console.log('✅ Phone input initialized');
}

function initializeOTPInputs() {
    // OTP boxes if they exist
    const otpInputs = document.querySelectorAll('.otp-input');
    if (otpInputs.length > 0) {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', function () {
                if (this.value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });
        });
    }
    console.log('✅ OTP inputs initialized');
}

function initializePaymentOptions() {
    // Set default payment method
    BookingState.paymentMethod = 'cash';

    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function () {
            const paymentMethod = this.dataset.payment;

            // Visual feedback
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');

            // Update state
            BookingState.paymentMethod = paymentMethod;

            // Calculate discount for online payment
            if (paymentMethod === 'online' && BookingState.totalPrice) {
                const discount = Math.round(BookingState.totalPrice * 0.07);
                BookingState.discount = discount;
                BookingState.finalTotal = BookingState.totalPrice - discount;
            } else {
                BookingState.discount = 0;
                BookingState.finalTotal = BookingState.totalPrice;
            }

            updateNavButtons();
            console.log('Payment method selected:', paymentMethod);
        });
    });

    // Confirm booking button in Step 5
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            confirmBooking();
        });
    }

    console.log('✅ Payment options initialized');
}

// ========================================
// STEP NAVIGATION
// ========================================

let currentStep = 1;
const totalSteps = 5;

function initializeNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const bottomNav = document.getElementById('bottomNav');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (canProceed(currentStep)) {
                if (currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                } else if (currentStep === 5) {
                    // Confirm booking
                    confirmBooking();
                }
            } else {
                showValidationError(currentStep);
            }
        });
    }

    // Initial state
    updateNavButtons();
    updateProgress();
    console.log('✅ Navigation initialized');
}

function goToStep(step) {
    console.log(`📍 Going to step ${step}`);

    // Hide all sections
    document.querySelectorAll('.booking-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`step${step}`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentStep = step;

        // Update state
        BookingState.currentStep = step;

        // Update navigation buttons
        updateNavButtons();

        // Update progress tracker
        updateProgress();

        // Scroll to top of section
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update summaries if on confirmation step
        if (step === 5) {
            // Check if registration is incomplete
            const registrationIncomplete = localStorage.getItem('registration_incomplete') === 'true';
            const customerData = JSON.parse(localStorage.getItem('customer_data') || '{}');

            if (registrationIncomplete || !customerData.name) {
                // Show customer details section
                const customerSection = document.getElementById('customerDetailsSection');
                if (customerSection) {
                    customerSection.style.display = 'block';
                    console.log('📝 Showing customer details section for new user');
                }
            } else {
                // Hide customer details section
                const customerSection = document.getElementById('customerDetailsSection');
                if (customerSection) {
                    customerSection.style.display = 'none';
                    console.log('✅ Customer details already complete');
                }
            }

            updateSummaries();
        }
    }
}


function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const bottomNav = document.getElementById('bottomNav');
    const navPrice = document.getElementById('navPrice');

    // Show/hide back button
    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'flex' : 'none';
    }

    // Update next button based on step
    if (nextBtn) {
        // Enable/disable based on selection
        const canProceedNow = canProceed(currentStep);
        nextBtn.disabled = !canProceedNow;

        // Update button text
        if (currentStep === 5) {
            nextBtn.innerHTML = `
                Confirm Booking
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        } else {
            nextBtn.innerHTML = `
                Continue
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            `;
        }
    }

    // Hide bottom nav on success step
    if (bottomNav) {
        bottomNav.style.display = currentStep === 6 ? 'none' : 'flex';
    }

    // Update price display
    if (navPrice) {
        navPrice.textContent = `₹${BookingState.totalPrice || 0}`;
    }
}

function canProceed(step) {
    switch (step) {
        case 1:
            return !!BookingState.vehicleType;
        case 2:
            return !!BookingState.selectedService || BookingState.selectedServiceIds.length > 0;
        case 3:
            return validateLocationForm();
        case 4:
            return !!BookingState.selectedDate && !!BookingState.selectedTime;
        case 5:
            return !!BookingState.paymentMethod;
        default:
            return false;
    }
}

function showValidationError(step) {
    let message = 'Please complete this step before proceeding.';

    switch (step) {
        case 1:
            message = 'Please select a vehicle type';
            break;
        case 2:
            message = 'Please select a service package';
            break;
        case 3:
            message = 'Please fill in your complete address';
            break;
        case 4:
            message = 'Please select a date and time';
            break;
        case 5:
            message = 'Please enter your phone number and select payment method';
            break;
    }

    // Show alert or toast
    alert(message);
}

function updateProgress() {
    // Update progress tracker in header
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');

    progressSteps.forEach((stepEl, index) => {
        const stepNum = index + 1;
        stepEl.classList.remove('active', 'completed');

        if (stepNum < currentStep) {
            stepEl.classList.add('completed');
        } else if (stepNum === currentStep) {
            stepEl.classList.add('active');
        }
    });

    progressLines.forEach((line, index) => {
        const stepAfter = index + 2;
        line.classList.remove('completed');

        if (currentStep >= stepAfter) {
            line.classList.add('completed');
        }
    });
}

async function confirmBooking() {
    const confirmBtn = document.getElementById('nextBtn');

    // Show loading state
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `
            <div class="spinner"></div>
            Processing...
        `;
    }

    try {
        // Check if registration is incomplete
        const registrationIncomplete = localStorage.getItem('registration_incomplete') === 'true';

        if (registrationIncomplete) {
            console.log('📝 Registration incomplete - collecting customer details');

            // Get name and email
            const nameInput = document.getElementById('customerNameInput');
            const emailInput = document.getElementById('customerEmailInput');
            const name = nameInput?.value?.trim();
            const email = emailInput?.value?.trim();

            if (!name || name.length < 2) {
                alert('Please enter your name to continue');
                nameInput?.focus();
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `Confirm Booking`;
                }
                return;
            }

            // Validate email if provided
            if (email && !isValidEmail(email)) {
                alert('Please enter a valid email address');
                emailInput?.focus();
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `Confirm Booking`;
                }
                return;
            }

            // Complete registration
            const phone = localStorage.getItem('customer_phone');
            console.log('📤 Completing registration:', { phone, name, email });

            if (typeof apiRegister !== 'function') {
                console.error('❌ apiRegister function not found');
                alert('Registration function not available. Please refresh the page.');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `Confirm Booking`;
                }
                return;
            }

            const result = await apiRegister(phone, name, email || '');

            if (!result.success) {
                console.error('❌ Registration failed:', result.error);
                alert('Failed to save your details. Please try again.');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `Confirm Booking`;
                }
                return;
            }

            console.log('✅ Registration completed successfully');

            // Update customer data
            if (result.data && result.data.user) {
                localStorage.setItem('customer_data', JSON.stringify(result.data.user));
                localStorage.setItem('customer_phone', result.data.user.phone);
            }

            // Remove registration_incomplete flag
            localStorage.removeItem('registration_incomplete');

            console.log('✅ Registration completed before booking');
        }

        // Validate phone
        if (!BookingState.phone || BookingState.phone.length < 10) {
            alert('Please enter a valid phone number');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `Confirm Booking`;
            }
            return;
        }

        // Build booking payload
        const bookingData = {
            customer: {
                phone: BookingState.phone,
                name: BookingState.customerName || ''
            },
            vehicle: {
                type: BookingState.vehicleType,
                name: BookingState.vehicleName,
                multiplier: BookingState.vehicleMultiplier
            },
            service: {
                id: BookingState.serviceId,
                name: BookingState.serviceName,
                price: BookingState.totalPrice
            },
            location: {
                zone: BookingState.zone,
                address: BookingState.address,
                landmark: BookingState.landmark,
                pincode: BookingState.pincode,
                summary: BookingState.locationSummary
            },
            schedule: {
                date: BookingState.date,
                time: BookingState.time
            },
            payment: {
                method: BookingState.paymentMethod
            },
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        console.log('📦 Booking Data:', bookingData);

        // Try API if available
        let bookingId = 'TT-' + Date.now().toString().slice(-6);

        if (window.API_CONFIG?.BASE_URL) {
            try {
                const response = await fetch(`${window.API_CONFIG.BASE_URL}/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    const result = await response.json();
                    bookingId = result.bookingId || bookingId;
                }
            } catch (apiError) {
                console.warn('API booking failed, using local:', apiError);
            }
        }

        // Update success screen
        const bookingIdEl = document.getElementById('successBookingId');
        if (bookingIdEl) {
            bookingIdEl.textContent = bookingId;
        }

        // Save to local storage
        const bookings = JSON.parse(localStorage.getItem('tt_bookings') || '[]');
        bookings.push({ ...bookingData, bookingId });
        localStorage.setItem('tt_bookings', JSON.stringify(bookings));

        // Go to success step
        goToStep(6);

    } catch (error) {
        console.error('Booking failed:', error);
        alert('Something went wrong. Please try again.');

        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `Confirm Booking`;
        }
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Debug helper (remove in production)
window.BookingDebug = {
    state: BookingState,
    goToStep: goToStep,
    simulateReturningCustomer: function () {
        localStorage.setItem('tt_customer_profile', JSON.stringify({
            name: 'Rahul',
            phone: '9876543210'
        }));
        localStorage.setItem('tt_last_booking', JSON.stringify({
            vehicleType: 'compact-suv',
            vehicleName: 'Hyundai Creta',
            service: 'full',
            price: 649,
            locationSummary: '📍 Near Shiv Mandir, Raniganj'
        }));
        location.reload();
    },
    clearCustomerData: function () {
        localStorage.removeItem('tt_customer_profile');
        localStorage.removeItem('tt_last_booking');
        localStorage.removeItem('tt_saved_locations');
        location.reload();
    }
};

// ========================================
// STEP NAVIGATION
// ========================================

/**
 * Navigate to a specific step
 */
function goToStep(stepNumber) {
    console.log('📍 Navigating to step:', stepNumber);

    // Hide all step panels
    document.querySelectorAll('.step-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    } else {
        console.error('❌ Step not found:', `step${stepNumber}`);
        return;
    }

    // Update stepper indicators
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const itemStep = index + 1;
        item.classList.remove('active', 'completed');

        if (itemStep < stepNumber) {
            item.classList.add('completed');
        } else if (itemStep === stepNumber) {
            item.classList.add('active');
        }
    });

    // Update mobile step counter
    const currentStepEl = document.querySelector('.current-step');
    if (currentStepEl) {
        currentStepEl.textContent = stepNumber;
    }

    // Scroll to top of booking container
    const bookingContainer = document.querySelector('.booking-container');
    if (bookingContainer) {
        bookingContainer.scrollTop = 0;
    }

    // Reinitialize Lucide icons for new step
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('✅ Navigated to step', stepNumber);
}

console.log('✅ Booking Flow V2 Ready');
console.log('💡 Debug: Use BookingDebug.simulateReturningCustomer() to test quick rebook');
