/**
 * World-Class Booking Flow JavaScript
 * Super-Simple, 10-Second Rebooking for Returning Customers
 */

// ========================================
// STATE MANAGEMENT
// ========================================

const BookingState = {
    currentStep: 1,
    selectedVehicle: null,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    location: '',
    phone: '',
    paymentMethod: 'cash',
    isReturningCustomer: false,
    customerProfile: null
};

// Service packages with base prices
const SERVICES = [
    {
        id: 'quick',
        name: 'Quick Wash',
        basePrice: 299,
        duration: '30 minutes',
        emoji: '⚡',
        features: [
            'Exterior foam wash',
            'Tyre & rim cleaning',
            'Window cleaning'
        ]
    },
    {
        id: 'full',
        name: 'Full Wash',
        basePrice: 499,
        duration: '45 minutes',
        emoji: '⭐',
        features: [
            'Everything in Quick Wash',
            'Interior vacuum cleaning',
            'Dashboard & door panel wipe',
            'Air freshener'
        ],
        isPopular: true,
        socialProof: '67% of customers choose this'
    },
    {
        id: 'premium',
        name: 'Premium Detail',
        basePrice: 899,
        duration: '90 minutes',
        emoji: '💎',
        features: [
            'Everything in Full Wash',
            'Deep interior shampooing',
            'Leather conditioning',
            'Engine bay cleaning',
            'Wax polish protection'
        ],
        tip: 'Perfect for special occasions'
    }
];

// Vehicle type multipliers
const VEHICLE_MULTIPLIERS = {
    hatchback: 1.0,
    sedan: 1.2,
    suv: 1.5,
    bike: 0.5
};

// Vehicle type icons
const VEHICLE_ICONS = {
    hatchback: '🚗',
    sedan: '🚙',
    suv: '🚐',
    bike: '🏍️'
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    initializeBookingFlow();
});

function initializeBookingFlow() {
    // Check for returning customer
    checkReturningCustomer();

    // Initialize components
    initializeSearch();
    initializeVehicleCards();
    initializeServiceCards();
    initializeDateTabs();
    initializeTimeSlots();
    initializeLocationInput();
    initializePhoneInput();
    initializeOTPInputs();
    initializePaymentOptions();
    initializeNavigationButtons();

    // Set today's and tomorrow's dates
    setDateLabels();

    console.log('✅ Booking flow initialized');
}

// ========================================
// RETURNING CUSTOMER DETECTION
// ========================================

function checkReturningCustomer() {
    const savedPhone = localStorage.getItem('customer_phone');
    const savedProfile = localStorage.getItem('customer_profile');

    if (savedPhone && savedProfile) {
        try {
            BookingState.customerProfile = JSON.parse(savedProfile);
            BookingState.isReturningCustomer = true;
            BookingState.phone = savedPhone;

            // Show quick rebook card
            showQuickRebookCard();

            console.log('👋 Returning customer detected:', BookingState.customerProfile.name);
        } catch (e) {
            console.error('Error parsing customer profile:', e);
        }
    }
}

function showQuickRebookCard() {
    const card = document.getElementById('quickRebookCard');
    const profile = BookingState.customerProfile;

    if (!card || !profile || !profile.lastBooking) return;

    // Populate card with last booking details
    const vehicleEl = document.getElementById('rebookVehicleName');
    const serviceEl = document.getElementById('rebookServiceName');
    const priceEl = document.getElementById('rebookPrice');
    const locationEl = document.getElementById('rebookLocation');

    if (vehicleEl && profile.lastBooking.vehicleName) {
        vehicleEl.textContent = profile.lastBooking.vehicleName;
    }

    if (serviceEl && profile.lastBooking.serviceName) {
        serviceEl.textContent = profile.lastBooking.serviceName;
    }

    if (priceEl && profile.lastBooking.price) {
        priceEl.textContent = profile.lastBooking.price;
    }

    if (locationEl && profile.lastBooking.location) {
        locationEl.textContent = profile.lastBooking.location;
    }

    // Show the card
    card.style.display = 'block';

    // Setup quick slot buttons
    const quickSlotBtns = document.querySelectorAll('.quick-slot-btn');
    quickSlotBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const slot = this.dataset.slot;
            quickRebook(slot);
        });
    });

    // Close button
    document.getElementById('closeQuickRebook')?.addEventListener('click', function () {
        card.style.display = 'none';
    });

    // Book different button
    document.getElementById('bookDifferent')?.addEventListener('click', function () {
        card.style.display = 'none';
    });

    // Change location button
    document.getElementById('changeLocationBtn')?.addEventListener('click', function () {
        showLocationModal();
    });
}

function quickRebook(slot) {
    const profile = BookingState.customerProfile;
    if (!profile || !profile.lastBooking) return;

    // Show loading
    showToast('Booking your wash...', 'info');

    // Calculate date and time based on slot
    let bookingDate = new Date();
    let bookingTime = '11:00';

    if (slot === 'today-morning') {
        bookingTime = '11:00';
    } else if (slot === 'today-afternoon') {
        bookingTime = '15:00';
    } else if (slot === 'tomorrow') {
        bookingDate.setDate(bookingDate.getDate() + 1);
        bookingTime = '11:00';
    }

    // Create quick booking
    const bookingData = {
        vehicleType: profile.lastBooking.vehicleType,
        vehicleName: profile.lastBooking.vehicleName,
        serviceId: profile.lastBooking.serviceId,
        serviceName: profile.lastBooking.serviceName,
        price: profile.lastBooking.price,
        date: formatDate(bookingDate),
        time: bookingTime,
        location: profile.lastBooking.location,
        phone: BookingState.phone,
        paymentMethod: 'cash'
    };

    // Simulate API call
    setTimeout(() => {
        // Generate booking ID
        const bookingId = generateBookingId();

        // Update state
        BookingState.selectedVehicle = {
            type: bookingData.vehicleType,
            name: bookingData.vehicleName
        };
        BookingState.selectedService = {
            id: bookingData.serviceId,
            name: bookingData.serviceName,
            price: bookingData.price
        };
        BookingState.selectedDate = bookingData.date;
        BookingState.selectedTime = bookingData.time;
        BookingState.location = bookingData.location;

        // Go to success step
        showSuccessStep(bookingId);

        // Haptic feedback
        haptic.success();

    }, 1500);
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

let carData = [];

function initializeSearch() {
    const searchInput = document.getElementById('carSearch');
    const searchResults = document.getElementById('searchResults');
    const searchClear = document.getElementById('searchClear');

    if (!searchInput) return;

    // Load car data
    loadCarData();

    // Search input handler
    searchInput.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();

        // Show/hide clear button
        searchClear.style.display = query.length > 0 ? 'block' : 'none';

        if (query.length >= 2) {
            const results = searchCars(query);
            displaySearchResults(results);
        } else {
            hideSearchResults();
        }
    });

    // Focus shows recent/popular
    searchInput.addEventListener('focus', function () {
        if (this.value.trim().length < 2) {
            showRecentAndPopular();
        }
    });

    // Clear button
    searchClear?.addEventListener('click', function () {
        searchInput.value = '';
        this.style.display = 'none';
        hideSearchResults();
        searchInput.focus();
    });

    // Click outside to close
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });
}

async function loadCarData() {
    try {
        const response = await fetch('../car.json');
        carData = await response.json();
        console.log('✅ Loaded', carData.length, 'cars');
    } catch (e) {
        console.error('Error loading car data:', e);
        // Fallback data
        carData = [
            { name: 'Maruti Swift', type: 'hatchback' },
            { name: 'Maruti Alto', type: 'hatchback' },
            { name: 'Hyundai i20', type: 'hatchback' },
            { name: 'Honda City', type: 'sedan' },
            { name: 'Maruti Dzire', type: 'sedan' },
            { name: 'Hyundai Creta', type: 'suv' },
            { name: 'Tata Nexon', type: 'suv' },
            { name: 'Honda Activa', type: 'bike' }
        ];
    }
}

function searchCars(query) {
    return carData
        .filter(car => car.name.toLowerCase().includes(query))
        .slice(0, 8);
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="search-result-item no-results">
                <span class="result-name">No cars found</span>
                <span class="result-type">Select a vehicle type below</span>
            </div>
        `;
    } else {
        container.innerHTML = results.map(car => `
            <div class="search-result-item" data-name="${car.name}" data-type="${car.type}">
                <span class="result-name">${car.name}</span>
                <span class="result-type">${capitalizeFirst(car.type)}</span>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function () {
                if (!this.classList.contains('no-results')) {
                    selectVehicle(this.dataset.type, this.dataset.name);
                    hideSearchResults();
                }
            });
        });
    }

    container.classList.add('active');
}

function showRecentAndPopular() {
    const container = document.getElementById('searchResults');
    if (!container) return;

    // Get recent searches from localStorage
    const recentSearches = JSON.parse(localStorage.getItem('recent_car_searches') || '[]');

    // Popular cars in Kokrajhar (hardcoded for now)
    const popularCars = [
        { name: 'Maruti Alto', type: 'hatchback' },
        { name: 'Maruti Swift', type: 'hatchback' },
        { name: 'Tata Punch', type: 'suv' },
        { name: 'Honda Activa', type: 'bike' }
    ];

    let html = '';

    if (recentSearches.length > 0) {
        html += `<div class="search-section-label">🕐 Recent</div>`;
        recentSearches.slice(0, 3).forEach(car => {
            html += `
                <div class="search-result-item" data-name="${car.name}" data-type="${car.type}">
                    <span class="result-name">${car.name}</span>
                    <span class="result-type">${capitalizeFirst(car.type)}</span>
                </div>
            `;
        });
    }

    html += `<div class="search-section-label">🔥 Popular in Kokrajhar</div>`;
    popularCars.forEach(car => {
        html += `
            <div class="search-result-item" data-name="${car.name}" data-type="${car.type}">
                <span class="result-name">${car.name}</span>
                <span class="result-type">${capitalizeFirst(car.type)}</span>
            </div>
        `;
    });

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function () {
            selectVehicle(this.dataset.type, this.dataset.name);
            hideSearchResults();
        });
    });

    container.classList.add('active');
}

function hideSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.classList.remove('active');
    }
}

// ========================================
// VEHICLE SELECTION
// ========================================

function initializeVehicleCards() {
    const vehicleCards = document.querySelectorAll('.vehicle-card');

    vehicleCards.forEach(card => {
        card.addEventListener('click', function () {
            const type = this.dataset.type;
            selectVehicle(type);

            // Haptic feedback
            haptic.light();
        });
    });
}

function selectVehicle(type, name = null) {
    const multiplier = VEHICLE_MULTIPLIERS[type] || 1.0;
    const icon = VEHICLE_ICONS[type] || '🚗';

    // Update state
    BookingState.selectedVehicle = {
        type: type,
        name: name || capitalizeFirst(type),
        multiplier: multiplier,
        icon: icon
    };

    // Update UI - highlight selected card
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.type === type);
    });

    // Update service prices
    updateServicePrices();

    // Update selected vehicle bar in step 2
    document.getElementById('selectedVehicleIcon').textContent = icon;
    document.getElementById('selectedVehicleName').textContent = BookingState.selectedVehicle.name;

    // Save to recent searches
    if (name) {
        saveRecentSearch(name, type);
    }

    // Go to step 2
    goToStep(2);
}

function updateServicePrices() {
    const multiplier = BookingState.selectedVehicle?.multiplier || 1.0;

    document.querySelectorAll('.service-card').forEach(card => {
        const basePrice = parseInt(card.dataset.basePrice);
        const newPrice = Math.round(basePrice * multiplier);

        const priceEl = card.querySelector('.price-value');
        if (priceEl) {
            priceEl.textContent = newPrice;
        }
    });
}

function saveRecentSearch(name, type) {
    let recent = JSON.parse(localStorage.getItem('recent_car_searches') || '[]');

    // Remove if already exists
    recent = recent.filter(car => car.name !== name);

    // Add to front
    recent.unshift({ name, type });

    // Keep only last 5
    recent = recent.slice(0, 5);

    localStorage.setItem('recent_car_searches', JSON.stringify(recent));
}

// ========================================
// SERVICE SELECTION
// ========================================

function initializeServiceCards() {
    const serviceCards = document.querySelectorAll('.service-card');

    serviceCards.forEach(card => {
        card.addEventListener('click', function () {
            const serviceId = this.dataset.service;
            const basePrice = parseInt(this.dataset.basePrice);
            selectService(serviceId, basePrice);

            // Haptic feedback
            haptic.light();
        });
    });

    // Change vehicle button
    document.getElementById('changeVehicle')?.addEventListener('click', function () {
        goToStep(1);
    });
}

function selectService(serviceId, basePrice) {
    const service = SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    const multiplier = BookingState.selectedVehicle?.multiplier || 1.0;
    const finalPrice = Math.round(basePrice * multiplier);

    // Update state
    BookingState.selectedService = {
        id: serviceId,
        name: service.name,
        basePrice: basePrice,
        price: finalPrice,
        duration: service.duration
    };

    // Update UI - highlight selected card
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.service === serviceId);
    });

    // Update summary bar in step 3
    document.getElementById('summaryVehicle').textContent = BookingState.selectedVehicle?.name || 'Vehicle';
    document.getElementById('summaryService').textContent = service.name;
    document.getElementById('summaryPrice').textContent = finalPrice;

    // Go to step 3
    goToStep(3);
}

// ========================================
// DATE & TIME SELECTION
// ========================================

function initializeDateTabs() {
    const dateTabs = document.querySelectorAll('.date-tab');
    const customDateInput = document.getElementById('customDate');

    dateTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const dateType = this.dataset.date;

            // Update active state
            dateTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            if (dateType === 'custom') {
                customDateInput.style.display = 'block';
                customDateInput.focus();
            } else {
                customDateInput.style.display = 'none';

                const date = new Date();
                if (dateType === 'tomorrow') {
                    date.setDate(date.getDate() + 1);
                }

                BookingState.selectedDate = formatDate(date);
            }

            // Haptic feedback
            haptic.light();

            checkStep3Completion();
        });
    });

    // Custom date input
    customDateInput?.addEventListener('change', function () {
        BookingState.selectedDate = this.value;
        checkStep3Completion();
    });

    // Set default to today
    BookingState.selectedDate = formatDate(new Date());
}

function setDateLabels() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEl = document.getElementById('todayDate');
    const tomorrowEl = document.getElementById('tomorrowDate');

    if (todayEl) {
        todayEl.textContent = formatDateShort(today);
    }

    if (tomorrowEl) {
        tomorrowEl.textContent = formatDateShort(tomorrow);
    }

    // Set minimum date for custom picker
    const customDateInput = document.getElementById('customDate');
    if (customDateInput) {
        customDateInput.min = formatDate(today);
    }
}

function initializeTimeSlots() {
    const timeSlots = document.querySelectorAll('.time-slot');

    timeSlots.forEach(slot => {
        slot.addEventListener('click', function () {
            if (this.classList.contains('unavailable')) return;

            // Update active state
            timeSlots.forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');

            // Update state
            BookingState.selectedTime = this.dataset.time;

            // Haptic feedback
            haptic.light();

            checkStep3Completion();
        });
    });
}

// ========================================
// LOCATION INPUT
// ========================================

function initializeLocationInput() {
    const locationInput = document.getElementById('locationInput');
    const gpsBtn = document.getElementById('useGpsBtn');

    // Location input change
    locationInput?.addEventListener('input', function () {
        BookingState.location = this.value.trim();
        checkStep3Completion();
    });

    // GPS button
    gpsBtn?.addEventListener('click', function () {
        useGPSLocation();
    });

    // Load saved locations for returning customers
    if (BookingState.isReturningCustomer && BookingState.customerProfile?.locations) {
        showSavedLocations();
    }
}

function showSavedLocations() {
    const container = document.getElementById('savedLocations');
    const locations = BookingState.customerProfile?.locations || [];

    if (locations.length === 0 || !container) return;

    container.innerHTML = locations.map((loc, index) => `
        <button class="saved-location-btn" data-index="${index}" data-address="${loc.address}">
            <span class="loc-icon">${loc.label === 'Home' ? '🏠' : '🏢'}</span>
            <div class="loc-info">
                <span class="loc-label">${loc.label}</span>
                <span class="loc-address">${loc.address}</span>
            </div>
        </button>
    `).join('');

    container.style.display = 'block';

    // Add click handlers
    container.querySelectorAll('.saved-location-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const address = this.dataset.address;

            // Update UI
            container.querySelectorAll('.saved-location-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');

            // Update input
            const locationInput = document.getElementById('locationInput');
            if (locationInput) {
                locationInput.value = address;
                BookingState.location = address;
            }

            checkStep3Completion();
        });
    });
}

function useGPSLocation() {
    const btn = document.getElementById('useGpsBtn');
    const originalContent = btn.innerHTML;

    btn.innerHTML = `
        <div class="btn-loader" style="width:16px;height:16px;border:2px solid #2563eb;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span>Getting location...</span>
    `;
    btn.disabled = true;

    if (!navigator.geolocation) {
        showToast('GPS not supported on your device', 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;

            // For now, just show coordinates (in real app, use reverse geocoding)
            try {
                const address = await reverseGeocode(latitude, longitude);

                const locationInput = document.getElementById('locationInput');
                if (locationInput) {
                    locationInput.value = address;
                    BookingState.location = address;
                }

                showToast('Location detected!', 'success');
                checkStep3Completion();
            } catch (e) {
                // Fallback
                const locationInput = document.getElementById('locationInput');
                if (locationInput) {
                    locationInput.value = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Please add landmark)`;
                    locationInput.focus();
                }
            }

            btn.innerHTML = originalContent;
            btn.disabled = false;
        },
        (error) => {
            console.error('GPS error:', error);
            showToast('Could not get location. Please type your address.', 'error');
            btn.innerHTML = originalContent;
            btn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function reverseGeocode(lat, lng) {
    // In a real app, use Google Maps or Mapbox API
    // For now, return a mock address for Kokrajhar
    return `Near coordinates ${lat.toFixed(3)}, ${lng.toFixed(3)}, Kokrajhar`;
}

function checkStep3Completion() {
    const continueBtn = document.getElementById('continueToConfirm');

    const isComplete =
        BookingState.selectedDate &&
        BookingState.selectedTime &&
        BookingState.location.length > 5;

    if (continueBtn) {
        continueBtn.disabled = !isComplete;
    }
}

// ========================================
// PHONE & OTP
// ========================================

function initializePhoneInput() {
    const phoneInput = document.getElementById('phoneInput');

    phoneInput?.addEventListener('input', function () {
        // Only allow numbers
        this.value = this.value.replace(/\D/g, '');

        BookingState.phone = this.value;
    });
}

function initializeOTPInputs() {
    const otpDigits = document.querySelectorAll('.otp-digit');

    otpDigits.forEach((input, index) => {
        input.addEventListener('input', function () {
            // Only allow single digit
            this.value = this.value.replace(/\D/g, '').slice(0, 1);

            // Auto-focus next input
            if (this.value && index < otpDigits.length - 1) {
                otpDigits[index + 1].focus();
            }

            // Check if all digits entered
            const allFilled = Array.from(otpDigits).every(d => d.value.length === 1);
            if (allFilled) {
                verifyOTP();
            }
        });

        input.addEventListener('keydown', function (e) {
            // Handle backspace
            if (e.key === 'Backspace' && !this.value && index > 0) {
                otpDigits[index - 1].focus();
            }
        });

        // Paste handling
        input.addEventListener('paste', function (e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

            pastedData.split('').forEach((digit, i) => {
                if (otpDigits[i]) {
                    otpDigits[i].value = digit;
                }
            });

            // Focus last filled or first empty
            const lastFilled = Array.from(otpDigits).filter(d => d.value).length;
            if (lastFilled < otpDigits.length) {
                otpDigits[lastFilled].focus();
            }

            // Check if all digits entered
            if (pastedData.length === 6) {
                verifyOTP();
            }
        });
    });

    // Resend OTP button
    document.getElementById('resendOtp')?.addEventListener('click', function () {
        if (!this.disabled) {
            sendOTP();
        }
    });
}

function sendOTP() {
    const phone = BookingState.phone;

    if (phone.length !== 10) {
        showToast('Please enter a valid 10-digit number', 'error');
        return;
    }

    const btn = document.getElementById('confirmBookingBtn');
    const btnText = document.getElementById('confirmBtnText');
    const loader = document.getElementById('btnLoader');

    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';

    // Simulate API call
    setTimeout(() => {
        // Show OTP section
        document.getElementById('otpSection').style.display = 'block';

        // Update button
        btnText.textContent = 'Verify OTP';
        btnText.style.display = 'block';
        loader.style.display = 'none';
        btn.disabled = false;

        // Focus first OTP input
        document.querySelector('.otp-digit')?.focus();

        // Start resend timer
        startResendTimer();

        showToast('OTP sent to +91 ' + phone, 'success');
        haptic.light();

    }, 1500);
}

function startResendTimer() {
    const resendBtn = document.getElementById('resendOtp');
    const timerSpan = document.getElementById('resendTimer');

    let seconds = 30;
    resendBtn.disabled = true;

    const interval = setInterval(() => {
        seconds--;
        timerSpan.textContent = seconds;

        if (seconds <= 0) {
            clearInterval(interval);
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Resend OTP';
        }
    }, 1000);
}

function verifyOTP() {
    const otpDigits = document.querySelectorAll('.otp-digit');
    const otp = Array.from(otpDigits).map(d => d.value).join('');

    if (otp.length !== 6) return;

    const btn = document.getElementById('confirmBookingBtn');
    const btnText = document.getElementById('confirmBtnText');
    const loader = document.getElementById('btnLoader');

    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';

    // Simulate verification (in real app, call API)
    setTimeout(() => {
        // For demo, accept any 6-digit OTP
        // In production, verify with backend

        // Show payment section
        document.getElementById('paymentSection').style.display = 'block';

        // Update button
        btnText.textContent = 'Confirm Booking';
        btnText.style.display = 'block';
        loader.style.display = 'none';
        btn.disabled = false;

        // Update prices in payment section
        updatePaymentPrices();

        // Save customer info
        saveCustomerToLocalStorage();

        showToast('Phone verified!', 'success');
        haptic.success();

    }, 1000);
}

function updatePaymentPrices() {
    const price = BookingState.selectedService?.price || 0;
    const onlinePrice = Math.round(price * 0.93); // 7% discount for online

    document.getElementById('onlinePrice').textContent = onlinePrice;
    document.getElementById('cashPrice').textContent = price;
}

// ========================================
// PAYMENT OPTIONS
// ========================================

function initializePaymentOptions() {
    const paymentOptions = document.querySelectorAll('input[name="payment"]');

    paymentOptions.forEach(option => {
        option.addEventListener('change', function () {
            BookingState.paymentMethod = this.value;
        });
    });
}

// ========================================
// BOOKING CONFIRMATION
// ========================================

function initializeNavigationButtons() {
    // Continue to confirm button
    document.getElementById('continueToConfirm')?.addEventListener('click', function () {
        updateConfirmationSummary();
        goToStep(4);
    });

    // Confirm booking button
    document.getElementById('confirmBookingBtn')?.addEventListener('click', function () {
        const btnText = document.getElementById('confirmBtnText');

        if (btnText.textContent === 'Send OTP') {
            sendOTP();
        } else if (btnText.textContent === 'Verify OTP') {
            // OTP auto-verifies when all digits entered
            // But user can also click
            verifyOTP();
        } else if (btnText.textContent === 'Confirm Booking') {
            confirmBooking();
        }
    });
}

function updateConfirmationSummary() {
    const vehicle = BookingState.selectedVehicle;
    const service = BookingState.selectedService;

    document.getElementById('confirmVehicle').textContent = vehicle?.name || 'Vehicle';
    document.getElementById('confirmService').textContent = service?.name || 'Service';
    document.getElementById('confirmDateTime').textContent =
        formatDateLong(new Date(BookingState.selectedDate)) + ', ' + formatTime(BookingState.selectedTime);
    document.getElementById('confirmLocation').textContent = BookingState.location;
    document.getElementById('confirmTotal').textContent = '₹' + (service?.price || 0);

    // Pre-fill phone if returning customer
    if (BookingState.phone) {
        document.getElementById('phoneInput').value = BookingState.phone;
    }
}

function confirmBooking() {
    const btn = document.getElementById('confirmBookingBtn');
    const btnText = document.getElementById('confirmBtnText');
    const loader = document.getElementById('btnLoader');

    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';

    // Prepare booking data
    const bookingData = {
        vehicleType: BookingState.selectedVehicle?.type,
        vehicleName: BookingState.selectedVehicle?.name,
        serviceId: BookingState.selectedService?.id,
        serviceName: BookingState.selectedService?.name,
        price: BookingState.selectedService?.price,
        date: BookingState.selectedDate,
        time: BookingState.selectedTime,
        location: BookingState.location,
        phone: BookingState.phone,
        paymentMethod: BookingState.paymentMethod
    };

    // Simulate API call
    setTimeout(() => {
        const bookingId = generateBookingId();

        // Save customer profile for future quick rebook
        saveCustomerProfile(bookingData);

        // Show success step
        showSuccessStep(bookingId);

        haptic.success();

    }, 2000);
}

function showSuccessStep(bookingId) {
    // Update success content
    document.getElementById('bookingId').textContent = '#' + bookingId;
    document.getElementById('successVehicle').textContent =
        (BookingState.selectedVehicle?.name || 'Vehicle') + ' - ' +
        (BookingState.selectedService?.name || 'Service');
    document.getElementById('successDateTime').textContent =
        formatDateLong(new Date(BookingState.selectedDate)) + ', ' +
        formatTime(BookingState.selectedTime);
    document.getElementById('successLocation').textContent = BookingState.location;

    // Show save location prompt for new customers
    if (!BookingState.isReturningCustomer) {
        document.getElementById('saveLocationPrompt').style.display = 'block';
        initializeSaveLocationPrompt();
    }

    // Go to success step
    goToStep(5);

    // Hide progress bar
    document.querySelector('.progress-container').style.display = 'none';

    // Add to calendar button
    document.getElementById('addToCalendar')?.addEventListener('click', function () {
        addToCalendar();
    });
}

function initializeSaveLocationPrompt() {
    document.getElementById('saveAsHome')?.addEventListener('click', function () {
        saveLocation('Home', BookingState.location);
        this.closest('.save-location-prompt').style.display = 'none';
        showToast('Location saved as Home!', 'success');
    });

    document.getElementById('saveCustom')?.addEventListener('click', function () {
        const name = prompt('Enter a name for this location (e.g., Office, Parents):');
        if (name) {
            saveLocation(name, BookingState.location);
            this.closest('.save-location-prompt').style.display = 'none';
            showToast('Location saved!', 'success');
        }
    });

    document.getElementById('skipSave')?.addEventListener('click', function () {
        this.closest('.save-location-prompt').style.display = 'none';
    });
}

function saveLocation(label, address) {
    let profile = JSON.parse(localStorage.getItem('customer_profile') || '{}');

    if (!profile.locations) {
        profile.locations = [];
    }

    profile.locations.push({
        label: label,
        address: address,
        isDefault: profile.locations.length === 0
    });

    localStorage.setItem('customer_profile', JSON.stringify(profile));
}

function saveCustomerToLocalStorage() {
    localStorage.setItem('customer_phone', BookingState.phone);
}

function saveCustomerProfile(bookingData) {
    let profile = JSON.parse(localStorage.getItem('customer_profile') || '{}');

    profile.phone = BookingState.phone;
    profile.lastBooking = {
        vehicleType: bookingData.vehicleType,
        vehicleName: bookingData.vehicleName,
        serviceId: bookingData.serviceId,
        serviceName: bookingData.serviceName,
        price: bookingData.price,
        location: bookingData.location,
        date: new Date().toISOString()
    };

    if (!profile.locations || profile.locations.length === 0) {
        profile.locations = [{
            label: 'Home',
            address: bookingData.location,
            isDefault: true
        }];
    }

    localStorage.setItem('customer_profile', JSON.stringify(profile));
}

function addToCalendar() {
    const title = `Tip-Top Car Wash - ${BookingState.selectedService?.name}`;
    const date = new Date(BookingState.selectedDate + 'T' + BookingState.selectedTime);
    const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hour later
    const location = BookingState.location;

    // Google Calendar URL
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatCalendarDate(date)}/${formatCalendarDate(endDate)}&location=${encodeURIComponent(location)}`;

    window.open(url, '_blank');
}

// ========================================
// STEP NAVIGATION
// ========================================

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));

    // Show target step
    const targetStep = document.getElementById('step' + step);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    // Update progress indicator
    updateProgress(step);

    // Update state
    BookingState.currentStep = step;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress(step) {
    const progressFill = document.getElementById('progressFill');
    const progressSteps = document.querySelectorAll('.progress-step');

    // Update progress bar
    const percentage = (step / 4) * 100;
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }

    // Update step indicators
    progressSteps.forEach((s, index) => {
        const stepNum = index + 1;
        s.classList.remove('active', 'completed');

        if (stepNum < step) {
            s.classList.add('completed');
        } else if (stepNum === step) {
            s.classList.add('active');
        }
    });
}

// ========================================
// LOCATION MODAL
// ========================================

function showLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) {
        modal.style.display = 'flex';

        // Populate saved locations
        const listContainer = document.getElementById('savedLocationsList');
        const locations = BookingState.customerProfile?.locations || [];

        if (listContainer && locations.length > 0) {
            listContainer.innerHTML = locations.map((loc, index) => `
                <button class="saved-location-btn" data-address="${loc.address}">
                    <span>${loc.label === 'Home' ? '🏠' : '🏢'}</span>
                    <div>
                        <strong>${loc.label}</strong>
                        <span>${loc.address}</span>
                    </div>
                </button>
            `).join('');

            // Add click handlers
            listContainer.querySelectorAll('.saved-location-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const address = this.dataset.address;
                    updateQuickRebookLocation(address);
                    closeLocationModal();
                });
            });
        }

        // Close button
        document.getElementById('closeLocationModal')?.addEventListener('click', closeLocationModal);

        // Modal GPS button
        document.getElementById('modalGpsBtn')?.addEventListener('click', function () {
            // Use GPS and update quick rebook
            useGPSLocation();
            closeLocationModal();
        });

        // Use new location button
        document.getElementById('useNewLocation')?.addEventListener('click', function () {
            const newAddress = document.getElementById('newLocationInput')?.value.trim();
            if (newAddress) {
                updateQuickRebookLocation(newAddress);
                closeLocationModal();
            }
        });

        // Click outside to close
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeLocationModal();
            }
        });
    }
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateQuickRebookLocation(address) {
    const locationEl = document.getElementById('rebookLocation');
    if (locationEl) {
        locationEl.textContent = address;
    }

    // Update in profile
    if (BookingState.customerProfile?.lastBooking) {
        BookingState.customerProfile.lastBooking.location = address;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateShort(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDateLong(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (formatDate(date) === formatDate(today)) {
        return 'Today';
    } else if (formatDate(date) === formatDate(tomorrow)) {
        return 'Tomorrow';
    } else {
        return formatDateShort(date);
    }
}

function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes || '00'} ${ampm}`;
}

function formatCalendarDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateBookingId() {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TT-${datePart}-${randomPart}`;
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;

    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        zIndex: '9999',
        animation: 'slideUp 0.3s ease'
    });

    // Set background based on type
    const backgrounds = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6'
    };
    toast.style.background = backgrounds[type] || backgrounds.info;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations to head
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    .search-section-label {
        padding: 10px 16px 6px;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
    }
`;
document.head.appendChild(toastStyles);

// ========================================
// HAPTIC FEEDBACK
// ========================================

const haptic = {
    light: () => navigator.vibrate?.(10),
    medium: () => navigator.vibrate?.(25),
    success: () => navigator.vibrate?.([15, 50, 30]),
    error: () => navigator.vibrate?.([50, 30, 50])
};

// ========================================
// KEYBOARD HANDLING
// ========================================

// Handle back button
window.addEventListener('popstate', function () {
    if (BookingState.currentStep > 1 && BookingState.currentStep < 5) {
        goToStep(BookingState.currentStep - 1);
    }
});

// Push state when moving forward
const originalGoToStep = goToStep;
goToStep = function (step) {
    if (step > BookingState.currentStep) {
        history.pushState({ step }, '', `#step${step}`);
    }
    originalGoToStep(step);
};

console.log('🚀 Booking Flow JS Loaded');
