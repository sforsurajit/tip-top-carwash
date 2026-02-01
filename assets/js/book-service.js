/**
 * Optimized Booking Flow - JavaScript
 * Car-first selection with auto-advance UX
 */

// Configuration
const API_BASE = 'https://tip-topcarwash.in/main_erp/api_v1';
const ORG_ID = 3;

// State
let currentStep = 1;
let selectedVehicle = null;
let selectedService = null;
let selectedSlot = null;
let bookingData = {};
let userAuthenticated = false;

// Car Database (for autocomplete)
const carModels = [
    { name: 'Maruti Swift', type: 'hatchback', multiplier: 1.0 },
    { name: 'Maruti Baleno', type: 'hatchback', multiplier: 1.0 },
    { name: 'Maruti WagonR', type: 'hatchback', multiplier: 1.0 },
    { name: 'Hyundai i20', type: 'hatchback', multiplier: 1.0 },
    { name: 'Tata Tiago', type: 'hatchback', multiplier: 1.0 },

    { name: 'Honda City', type: 'sedan', multiplier: 1.2 },
    { name: 'Maruti Dzire', type: 'sedan', multiplier: 1.2 },
    { name: 'Hyundai Verna', type: 'sedan', multiplier: 1.2 },
    { name: 'Volkswagen Vento', type: 'sedan', multiplier: 1.2 },

    { name: 'Tata Nexon', type: 'suv', multiplier: 1.5 },
    { name: 'Hyundai Creta', type: 'suv', multiplier: 1.5 },
    { name: 'Maruti Brezza', type: 'suv', multiplier: 1.5 },
    { name: 'Mahindra XUV700', type: 'suv', multiplier: 1.7 },
    { name: 'Toyota Fortuner', type: 'suv', multiplier: 1.8 },

    { name: 'Honda Activa', type: 'bike', multiplier: 0.5 },
    { name: 'TVS Jupiter', type: 'bike', multiplier: 0.5 },
    { name: 'Hero Splendor', type: 'bike', multiplier: 0.5 },
];

// Service Packages (base prices)
const servicePackages = [
    {
        id: 1,
        name: 'Silver Wash',
        basePrice: 299,
        duration: '45 mins',
        features: ['Exterior Wash', 'Vacuum Cleaning', 'Tyre Shine'],
        nudge: null
    },
    {
        id: 2,
        name: 'Gold Wash',
        basePrice: 499,
        duration: '60 mins',
        features: ['Everything in Silver', 'Interior Vacuuming', 'Dashboard Polish', 'Door Panel Cleaning'],
        nudge: 'Includes Interior Vacuuming & Tyre Shine',
        badge: 'Popular for SUVs 🏆'
    },
    {
        id: 3,
        name: 'Platinum Detailing',
        basePrice: 899,
        duration: '90 mins',
        features: ['Everything in Gold', 'Deep Interior Clean', 'Wax Polish', 'Engine Bay Clean'],
        nudge: 'Best value for complete care',
        badge: 'Best Value'
    }
];

// Time Slots
const timeSlots = [
    { time: '08:00 AM', available: true },
    { time: '09:00 AM', available: true },
    { time: '10:00 AM', available: false },
    { time: '11:00 AM', available: true },
    { time: '12:00 PM', available: true },
    { time: '02:00 PM', available: true },
    { time: '03:00 PM', available: true },
    { time: '04:00 PM', available: true },
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeCarSearch();
    initializeVehicleButtons();
    initializeScheduling();
    initializeAuth();
});

/**
 * STEP 1: Car Selection
 */
function initializeCarSearch() {
    const searchInput = document.getElementById('car-search');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        const matches = carModels.filter(car =>
            car.name.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            searchResults.innerHTML = matches.map(car => `
                <div class="search-result-item" onclick="selectCar('${car.name}', '${car.type}', ${car.multiplier})">
                    <span class="result-name">${car.name}</span>
                    <span class="result-type">${capitalizeFirst(car.type)}</span>
                </div>
            `).join('');
            searchResults.classList.add('active');
        } else {
            searchResults.classList.remove('active');
        }
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.car-search-container')) {
            searchResults.classList.remove('active');
        }
    });
}

function initializeVehicleButtons() {
    const buttons = document.querySelectorAll('.vehicle-type-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const multiplier = getMultiplierForType(type);
            selectCar(capitalizeFirst(type), type, multiplier);
        });
    });
}

function selectCar(name, type, multiplier) {
    selectedVehicle = { name, type, multiplier };

    // Update UI
    document.getElementById('selected-vehicle-name').textContent = name;

    // Load services with dynamic pricing
    loadServices();

    // Auto-advance to Step 2
    setTimeout(() => goToStep(2), 300);
}

function getMultiplierForType(type) {
    const multipliers = {
        'hatchback': 1.0,
        'sedan': 1.2,
        'suv': 1.5,
        'bike': 0.5
    };
    return multipliers[type] || 1.0;
}

/**
 * STEP 2: Service Selection
 */
function loadServices() {
    const container = document.getElementById('service-packages');

    container.innerHTML = servicePackages.map(pkg => {
        const price = Math.round(pkg.basePrice * selectedVehicle.multiplier);

        return `
            <div class="service-package" onclick="selectService(${pkg.id}, '${pkg.name}', ${price})">
                ${pkg.badge ? `<div class="package-badge">${pkg.badge}</div>` : ''}
                <div class="package-header">
                    <div class="package-name">${pkg.name}</div>
                    <div class="package-price">₹${price}</div>
                </div>
                <div class="package-duration">⏱️ ${pkg.duration}</div>
                <ul class="package-features">
                    ${pkg.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                ${pkg.nudge ? `<div class="package-nudge">💡 ${pkg.nudge}</div>` : ''}
            </div>
        `;
    }).join('');
}

function selectService(id, name, price) {
    selectedService = { id, name, price };

    // Auto-advance to Step 3
    setTimeout(() => goToStep(3), 300);
}

/**
 * STEP 3: Smart Scheduling
 */
function initializeScheduling() {
    // Set min date to today
    const dateInput = document.getElementById('booking-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;

    // Load time slots
    dateInput.addEventListener('change', loadTimeSlots);
    loadTimeSlots();

    // Auto-advance when location is entered
    const locationInput = document.getElementById('location-input');
    locationInput.addEventListener('input', checkAndAutoAdvance);

    // Proceed button (kept as fallback)
    document.getElementById('btn-proceed-schedule').addEventListener('click', () => {
        if (validateSchedule()) {
            goToStep(4);
        }
    });
}

// Check if all fields are filled and auto-advance
function checkAndAutoAdvance() {
    const location = document.getElementById('location-input').value.trim();
    const date = document.getElementById('booking-date').value;

    // Only auto-advance if location has meaningful input (at least 3 characters)
    if (location.length >= 3 && date && selectedSlot) {
        bookingData.location = location;
        bookingData.date = date;
        bookingData.time = selectedSlot;

        // Auto-advance with a slight delay for better UX
        setTimeout(() => {
            goToStep(4);
        }, 500);
    }
}

function loadTimeSlots() {
    const container = document.getElementById('time-slots');

    container.innerHTML = timeSlots.map(slot => `
        <div class="time-slot ${slot.available ? '' : 'unavailable'}" 
             onclick="${slot.available ? `selectSlot('${slot.time}')` : ''}">
            ${slot.time}
        </div>
    `).join('');
}

function selectSlot(time) {
    selectedSlot = time;

    // Update UI
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Hide suggestion if shown
    document.getElementById('slot-suggestion').style.display = 'none';

    // Check if we can auto-advance
    checkAndAutoAdvance();
}

function validateSchedule() {
    const location = document.getElementById('location-input').value.trim();
    const date = document.getElementById('booking-date').value;

    if (!location) {
        alert('Please enter your location');
        return false;
    }

    if (!selectedSlot) {
        // Show smart suggestion
        showSlotSuggestion();
        return false;
    }

    bookingData.location = location;
    bookingData.date = date;
    bookingData.time = selectedSlot;

    return true;
}

function showSlotSuggestion() {
    const suggestion = document.getElementById('slot-suggestion');
    const nearestSlot = timeSlots.find(s => s.available);

    if (nearestSlot) {
        document.getElementById('nearest-slot').textContent = nearestSlot.time;
        suggestion.style.display = 'flex';

        document.getElementById('accept-suggestion').onclick = () => {
            selectSlot(nearestSlot.time);
            goToStep(4);
        };
    } else {
        alert('Please select a time slot');
    }
}

/**
 * STEP 4: Authentication & Payment
 */
function initializeAuth() {
    document.getElementById('btn-send-otp').addEventListener('click', sendOTP);
    document.getElementById('btn-verify-otp').addEventListener('click', verifyOTP);
    document.getElementById('btn-confirm-booking').addEventListener('click', confirmBooking);
}

function sendOTP() {
    const mobile = document.getElementById('mobile-number').value.trim();

    if (mobile.length !== 10) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }

    // Simulate OTP send
    document.getElementById('otp-section').style.display = 'block';
    alert('OTP sent to +91 ' + mobile);

    bookingData.mobile = mobile;
}

function verifyOTP() {
    const otp = document.getElementById('otp-input').value.trim();

    if (otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }

    // Simulate OTP verification
    userAuthenticated = true;
    document.getElementById('payment-section').style.display = 'block';
    alert('✅ Mobile verified successfully!');
}

async function confirmBooking() {
    if (!userAuthenticated) {
        alert('Please verify your mobile number first');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    bookingData.paymentMethod = paymentMethod;

    // Calculate discount for online payment
    let finalPrice = selectedService.price;
    if (paymentMethod === 'online') {
        finalPrice -= 50;
    }

    bookingData.finalPrice = finalPrice;

    // Show confirmation
    showConfirmation();
}

/**
 * STEP 5: Confirmation
 */
function showConfirmation() {
    goToStep(5);

    // Populate confirmation details
    document.getElementById('confirm-service').textContent = selectedService.name;
    document.getElementById('confirm-vehicle').textContent = selectedVehicle.name;
    document.getElementById('confirm-datetime').textContent = `${bookingData.date}, ${bookingData.time}`;
    document.getElementById('confirm-location').textContent = bookingData.location;
    document.getElementById('confirm-total').textContent = `₹${bookingData.finalPrice}`;

    // WhatsApp details
    document.getElementById('whatsapp-vehicle').textContent = selectedVehicle.name;
    document.getElementById('whatsapp-time').textContent = bookingData.time;

    // Simulate WhatsApp message
    setTimeout(() => {
        console.log('📱 WhatsApp message sent!');
    }, 1000);
}

/**
 * Navigation
 */
function goToStep(step) {
    currentStep = step;

    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(s => {
        s.classList.remove('active');
    });

    // Show current step
    document.getElementById(`step-${step}`).classList.add('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Utilities
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Expose to global scope
window.goToStep = goToStep;
window.selectCar = selectCar;
window.selectService = selectService;
window.selectSlot = selectSlot;

console.log('✅ Optimized booking flow loaded');
