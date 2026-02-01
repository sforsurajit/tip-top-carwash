/**
 * Location Booking Module
 * Handles GPS capture, map display, landmark selection, scheduling, and offline booking
 */

const LocationBooking = (function () {
    // State
    let currentStep = 1;
    let map = null;
    let marker = null;
    let isMapAdjustMode = false;

    // Booking data
    let bookingData = {
        service: null,
        vehicleType: null,
        price: null,
        zone: {
            id: null,
            name: null
        },
        location: {
            lat: null,
            lng: null,
            address: null,
            landmark: null,
            landmarkType: null,
            notes: '',
            pincode: ''
        },
        schedule: {
            date: null,
            time: null,
            timeLabel: null
        },
        customer: {
            phone: null,
            isVerified: false
        }
    };

    // Available zones from API
    let availableZones = [];

    // OTP state
    let otpTimer = null;
    let otpCountdown = 30;
    let generatedOTP = null; // For demo/testing (in production, this comes from backend)

    // Landmark options
    const LANDMARKS = [
        { id: 'temple', label: 'Temple / Mandir', icon: '🛕' },
        { id: 'mosque', label: 'Mosque / Masjid', icon: '🕌' },
        { id: 'school', label: 'School / College', icon: '🏫' },
        { id: 'market', label: 'Market / Bazaar', icon: '🏪' },
        { id: 'petrol', label: 'Petrol Pump', icon: '⛽' },
        { id: 'medical', label: 'Medical Store / Hospital', icon: '🏥' },
        { id: 'other', label: 'Other', icon: '📍' }
    ];

    // Time slots
    const TIME_SLOTS = [
        { value: '07:00', label: '7:00 AM', period: 'morning' },
        { value: '08:00', label: '8:00 AM', period: 'morning' },
        { value: '09:00', label: '9:00 AM', period: 'morning' },
        { value: '10:00', label: '10:00 AM', period: 'morning' },
        { value: '11:00', label: '11:00 AM', period: 'morning' },
        { value: '12:00', label: '12:00 PM', period: 'afternoon' },
        { value: '13:00', label: '1:00 PM', period: 'afternoon' },
        { value: '14:00', label: '2:00 PM', period: 'afternoon' },
        { value: '15:00', label: '3:00 PM', period: 'afternoon' },
        { value: '16:00', label: '4:00 PM', period: 'evening' },
        { value: '17:00', label: '5:00 PM', period: 'evening' },
        { value: '18:00', label: '6:00 PM', period: 'evening' }
    ];

    // Default center (Kokrajhar, Assam)
    const DEFAULT_CENTER = { lat: 26.4012, lng: 90.2696 };

    /**
     * Open booking modal with service data
     */
    function openBookingModal(serviceData) {
        console.log('📍 Opening location booking modal', serviceData);

        // Store service data
        bookingData.service = serviceData;
        bookingData.vehicleType = serviceData.vehicleType || 'sedan';
        bookingData.price = serviceData.price;

        // Reset state
        currentStep = 1;
        isMapAdjustMode = false;
        bookingData.location = { lat: null, lng: null, landmark: null, landmarkType: null, notes: '', pincode: '' };
        bookingData.schedule = { date: null, time: null, timeLabel: null };

        // Create and show modal
        createModal();
        showStep(1);

        // Start GPS capture
        captureGPS();
    }

    /**
     * Get minimum date (today)
     */
    function getMinDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    /**
     * Get maximum date (30 days from now)
     */
    function getMaxDate() {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        return maxDate.toISOString().split('T')[0];
    }

    /**
     * Format date for display
     */
    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Create modal HTML
     */
    function createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('location-booking-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'location-booking-modal';
        modal.className = 'location-booking-modal';
        modal.innerHTML = `
            <div class="location-booking-overlay" onclick="LocationBooking.closeModal()"></div>
            <div class="location-booking-container">
                <!-- Header -->
                <div class="location-booking-header">
                    <button class="location-booking-back" onclick="LocationBooking.goBack()" id="booking-back-btn" style="visibility: hidden;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h2 class="location-booking-title">Confirm Your Location</h2>
                    <button class="location-booking-close" onclick="LocationBooking.closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Progress (4 steps now) -->
                <div class="location-booking-progress">
                    <div class="progress-step active" data-step="1">
                        <span class="step-number">1</span>
                        <span class="step-label">Location</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step" data-step="2">
                        <span class="step-number">2</span>
                        <span class="step-label">Landmark</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step" data-step="3">
                        <span class="step-number">3</span>
                        <span class="step-label">Schedule</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step" data-step="4">
                        <span class="step-number">4</span>
                        <span class="step-label">Confirm</span>
                    </div>
                </div>

                <!-- Step 1: Location Capture -->
                <div class="location-booking-step active" id="booking-step-1">
                    <div class="step-content">
                        <!-- Zone Selector (Outside Map) -->
                        <div class="zone-selector-section" id="zone-selector">
                            <label class="zone-label">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                Service Area
                            </label>
                            <select id="zone-dropdown" class="zone-dropdown" onchange="LocationBooking.onZoneChange()">
                                <option value="">Loading zones...</option>
                            </select>
                        </div>

                        <div class="map-container" id="booking-map">
                            <div class="map-loading">
                                <div class="spinner"></div>
                                <p>Detecting your location...</p>
                            </div>
                        </div>
                        
                        <div class="location-status" id="location-status">
                            <div class="status-icon">📍</div>
                            <span>Detecting location...</span>
                        </div>

                        <div class="location-actions">
                            <button class="btn-location-action" onclick="LocationBooking.adjustLocation()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 8v8M8 12h8"></path>
                                </svg>
                                Adjust Pin
                            </button>
                            <button class="btn-location-action" onclick="LocationBooking.showManualEntry()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Enter Address
                            </button>
                        </div>

                        <!-- Manual Address Entry (hidden by default) -->
                        <div class="manual-entry-container" id="manual-entry-container" style="display: none;">
                            <div class="manual-entry-header">
                                <span>📍 Enter your address manually</span>
                                <button class="btn-close-manual" onclick="LocationBooking.hideManualEntry()">✕</button>
                            </div>
                            
                            <div class="manual-entry-form">
                                <!-- Zone Selection -->
                                <div class="form-group">
                                    <label class="form-label">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                            <circle cx="12" cy="10" r="3"/>
                                        </svg>
                                        Service Zone <span class="required">*</span>
                                    </label>
                                    <select id="manual-zone-select" class="form-input">
                                        <option value="">Select your zone</option>
                                    </select>
                                </div>

                                <!-- House/Building Number -->
                                <div class="form-group">
                                    <label class="form-label">
                                        🏠 House/Building No. <span class="required">*</span>
                                    </label>
                                    <input type="text" id="manual-house-no" class="form-input" 
                                           placeholder="e.g., H-123, Flat 4B, Building A" 
                                           maxlength="50">
                                </div>

                                <!-- Street/Road -->
                                <div class="form-group">
                                    <label class="form-label">
                                        🛣️ Street/Road Name <span class="required">*</span>
                                    </label>
                                    <input type="text" id="manual-street" class="form-input" 
                                           placeholder="e.g., MG Road, Station Road" 
                                           maxlength="100">
                                </div>

                                <!-- Area/Locality -->
                                <div class="form-group">
                                    <label class="form-label">
                                        📍 Area/Locality <span class="required">*</span>
                                    </label>
                                    <input type="text" id="manual-area" class="form-input" 
                                           placeholder="e.g., Ranjit Nagar, City Center" 
                                           maxlength="100">
                                </div>

                                <!-- City -->
                                <div class="form-group">
                                    <label class="form-label">
                                        🏙️ City <span class="required">*</span>
                                    </label>
                                    <input type="text" id="manual-city" class="form-input" 
                                           placeholder="e.g., Kokrajhar" 
                                           maxlength="50">
                                </div>

                                <!-- Pincode -->
                                <div class="form-group">
                                    <label class="form-label">
                                        📮 Pincode <span class="required">*</span>
                                    </label>
                                    <input type="text" id="manual-pincode" class="form-input" 
                                           placeholder="e.g., 783370" 
                                           pattern="[0-9]{6}" 
                                           maxlength="6">
                                </div>
                            </div>
                        </div>

                        <!-- Map Adjust Hint -->
                        <div class="map-adjust-hint" id="map-adjust-hint" style="display: none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4M12 8h.01"></path>
                            </svg>
                            <span>Drag the pin to your exact location. If inside a lane, place near your gate.</span>
                        </div>
                    </div>

                    <div class="step-footer">
                        <button class="btn-primary btn-next" onclick="LocationBooking.validateAndProceed()" id="btn-next-step1" disabled>
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 2: Landmark Selection -->
                <div class="location-booking-step" id="booking-step-2">
                    <div class="step-content">
                        <h3 class="step-subtitle">Help our driver find you easily</h3>
                        <p class="step-description">Select the nearest landmark to your location</p>

                        <div class="landmark-options" id="landmark-options">
                            ${LANDMARKS.map(l => `
                                <button class="landmark-option" data-landmark="${l.id}" onclick="LocationBooking.selectLandmark('${l.id}', '${l.label}')">
                                    <span class="landmark-icon">${l.icon}</span>
                                    <span class="landmark-label">${l.label}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- Landmark Name Input (shows after selecting any landmark except Other) -->
                        <div class="landmark-name-section" id="landmark-name-section" style="display: none;">
                            <label class="landmark-name-label" id="landmark-name-label">
                                <span class="landmark-selected-icon" id="landmark-selected-icon">🛕</span>
                                Name of the landmark <span class="required">*</span>
                            </label>
                            <input type="text" id="landmark-name-input" class="landmark-name-input" 
                                   placeholder="e.g., Shiv Mandir, City High School, SBI ATM" 
                                   maxlength="100"
                                   oninput="LocationBooking.onLandmarkNameInput()">
                            <p class="landmark-name-hint">Enter the specific name so driver can find easily</p>
                        </div>

                        <!-- Manual Address Form (shows when Other is selected) -->
                        <div class="manual-address-form" id="manual-address-form" style="display: none;">
                            <div class="form-group">
                                <label class="form-label">
                                    📍 Full Address <span class="required">*</span>
                                </label>
                                <textarea id="manual-address" class="manual-address-input" 
                                          placeholder="House No., Building Name, Street/Road Name, Area/Colony"
                                          maxlength="200"
                                          rows="3"
                                          oninput="LocationBooking.onManualAddressInput()"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    🏠 Near / Landmark (Optional)
                                </label>
                                <input type="text" id="manual-landmark" class="form-input" 
                                       placeholder="e.g., Near City Petrol Pump, Opposite Main Market"
                                       maxlength="100">
                            </div>
                            <p class="manual-address-hint">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4M12 8h.01"></path>
                                </svg>
                                Provide detailed address so our driver can reach you easily
                            </p>
                        </div>
                    </div>

                    <div class="step-footer">
                        <button class="btn-primary btn-next" onclick="LocationBooking.goToStep(3)" id="btn-next-step2" disabled>
                            Continue
                        </button>
                    </div>
                </div>

                <!-- Step 3: Date & Time Selection (NEW) -->
                <div class="location-booking-step" id="booking-step-3">
                    <div class="step-content">
                        <h3 class="step-subtitle">When would you like the service?</h3>
                        <p class="step-description">Select your preferred date and time</p>

                        <!-- Date Selection -->
                        <div class="schedule-section">
                            <label class="schedule-label">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                Select Date
                            </label>
                            
                            <!-- Quick Date Buttons -->
                            <div class="quick-date-buttons">
                                <button class="quick-date-btn" id="btn-today" onclick="LocationBooking.selectQuickDate('today')">
                                    📅 Today
                                </button>
                                <button class="quick-date-btn" id="btn-tomorrow" onclick="LocationBooking.selectQuickDate('tomorrow')">
                                    📆 Tomorrow
                                </button>
                            </div>
                            
                            <div class="date-divider">
                                <span>or pick a date</span>
                            </div>
                            
                            <input type="date" id="booking-date" class="schedule-date-input" 
                                   min="${getMinDate()}" max="${getMaxDate()}" 
                                   onchange="LocationBooking.onDateChange()">
                        </div>

                        <!-- Time Slots -->
                        <div class="schedule-section">
                            <label class="schedule-label">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Select Time Slot
                            </label>
                            
                            <div class="time-period">
                                <span class="time-period-label">🌅 Morning</span>
                                <div class="time-slots-grid">
                                    ${TIME_SLOTS.filter(t => t.period === 'morning').map(t => `
                                        <button class="time-slot-btn" data-time="${t.value}" data-label="${t.label}" onclick="LocationBooking.selectTimeSlot('${t.value}', '${t.label}')">
                                            ${t.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="time-period">
                                <span class="time-period-label">☀️ Afternoon</span>
                                <div class="time-slots-grid">
                                    ${TIME_SLOTS.filter(t => t.period === 'afternoon').map(t => `
                                        <button class="time-slot-btn" data-time="${t.value}" data-label="${t.label}" onclick="LocationBooking.selectTimeSlot('${t.value}', '${t.label}')">
                                            ${t.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="time-period">
                                <span class="time-period-label">🌆 Evening</span>
                                <div class="time-slots-grid">
                                    ${TIME_SLOTS.filter(t => t.period === 'evening').map(t => `
                                        <button class="time-slot-btn" data-time="${t.value}" data-label="${t.label}" onclick="LocationBooking.selectTimeSlot('${t.value}', '${t.label}')">
                                            ${t.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Selected Schedule Preview -->
                        <div class="schedule-preview" id="schedule-preview" style="display: none;">
                            <div class="preview-icon">📅</div>
                            <div class="preview-text">
                                <span id="preview-date">-</span> at <span id="preview-time">-</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-footer">
                        <button class="btn-primary btn-next" onclick="LocationBooking.goToStep(4)" id="btn-next-step3" disabled>
                            Continue to Confirmation
                        </button>
                    </div>
                </div>

                <!-- Step 4: Booking Confirmation -->
                <div class="location-booking-step" id="booking-step-4">
                    <div class="step-content">
                        <h3 class="step-subtitle">Review Your Booking</h3>

                        <div class="booking-summary-card">
                            <div class="summary-row">
                                <span class="summary-label">Service</span>
                                <span class="summary-value" id="summary-service">-</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Vehicle Type</span>
                                <span class="summary-value" id="summary-vehicle">-</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Location</span>
                                <span class="summary-value" id="summary-location">-</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Landmark</span>
                                <span class="summary-value" id="summary-landmark">-</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Date & Time</span>
                                <span class="summary-value" id="summary-schedule">-</span>
                            </div>
                            <div class="summary-row total">
                                <span class="summary-label">Total Price</span>
                                <span class="summary-value" id="summary-price">₹0</span>
                            </div>
                        </div>

                        <!-- Phone Verification Section -->
                        <div class="phone-verification-section" id="phone-section">
                            <label class="phone-label">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                Contact Number <span class="required">*</span>
                            </label>
                            <p class="phone-hint">Driver will call this number if unable to find you</p>
                            
                            <!-- Phone Input -->
                            <div class="phone-input-container" id="phone-input-container">
                                <div class="phone-input-wrapper">
                                    <span class="country-code">+91</span>
                                    <input type="tel" id="phone-input" class="phone-input" 
                                           placeholder="Enter 10-digit mobile number" 
                                           maxlength="10" 
                                           pattern="[0-9]{10}"
                                           oninput="LocationBooking.onPhoneInput(this)">
                                </div>
                                <button class="btn-send-otp" id="btn-send-otp" onclick="LocationBooking.sendOTP()" disabled>
                                    <span class="btn-text">Send OTP</span>
                                    <span class="btn-loading" style="display: none;">
                                        <div class="btn-spinner-small"></div>
                                    </span>
                                </button>
                            </div>

                            <!-- OTP Input (Hidden initially) -->
                            <div class="otp-input-container" id="otp-container" style="display: none;">
                                <p class="otp-sent-msg" id="otp-sent-msg">OTP sent to +91 XXXXXXXXXX</p>
                                <div class="otp-boxes">
                                    <input type="text" class="otp-box" maxlength="1" data-index="0" oninput="LocationBooking.handleOTPInput(this)" onkeydown="LocationBooking.handleOTPKeydown(event, this)">
                                    <input type="text" class="otp-box" maxlength="1" data-index="1" oninput="LocationBooking.handleOTPInput(this)" onkeydown="LocationBooking.handleOTPKeydown(event, this)">
                                    <input type="text" class="otp-box" maxlength="1" data-index="2" oninput="LocationBooking.handleOTPInput(this)" onkeydown="LocationBooking.handleOTPKeydown(event, this)">
                                    <input type="text" class="otp-box" maxlength="1" data-index="3" oninput="LocationBooking.handleOTPInput(this)" onkeydown="LocationBooking.handleOTPKeydown(event, this)">
                                    <input type="text" class="otp-box" maxlength="1" data-index="4" oninput="LocationBooking.handleOTPInput(this)" onkeydown="LocationBooking.handleOTPKeydown(event, this)">
                                    <input type="text" class="otp-box" maxlength="1" data-index="5" oninput="LocationBooking.handleOTPInput(this)" onkeydown="LocationBooking.handleOTPKeydown(event, this)">
                                </div>
                                <button class="btn-verify-otp" id="btn-verify-otp" onclick="LocationBooking.verifyOTP()" disabled>
                                    <span class="btn-text">Verify OTP</span>
                                    <span class="btn-loading" style="display: none;">
                                        <div class="btn-spinner-small"></div>
                                    </span>
                                </button>
                                <div class="otp-actions">
                                    <span class="otp-timer" id="otp-timer">Resend OTP in 30s</span>
                                    <button class="btn-resend-otp" id="btn-resend-otp" onclick="LocationBooking.resendOTP()" style="display: none;">
                                        Resend OTP
                                    </button>
                                    <button class="btn-change-number" onclick="LocationBooking.changePhoneNumber()">
                                        Change Number
                                    </button>
                                </div>
                            </div>

                            <!-- Verified Badge (Hidden initially) -->
                            <div class="phone-verified" id="phone-verified" style="display: none;">
                                <div class="verified-badge">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                    <span>Phone Verified</span>
                                </div>
                                <span class="verified-number" id="verified-number">+91 XXXXXXXXXX</span>
                                <button class="btn-change-verified" onclick="LocationBooking.changePhoneNumber()">Change</button>
                            </div>
                        </div>

                        <div class="booking-contract">
                            <div class="contract-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Price is final. No hidden charges.</span>
                            </div>
                            <div class="contract-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Driver may call if unable to find you.</span>
                            </div>
                            <div class="contract-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Service at confirmed location only.</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-footer">
                        <button class="btn-primary btn-confirm" id="btn-confirm-booking" onclick="LocationBooking.confirmBooking()" disabled>
                            <span class="btn-text">Confirm Booking</span>
                            <span class="btn-loading" style="display: none;">
                                <div class="btn-spinner"></div>
                                Processing...
                            </span>
                        </button>
                        <p class="verify-hint" id="verify-hint">Please verify your phone number to continue</p>
                    </div>
                </div>

                <!-- Success Step -->
                <div class="location-booking-step" id="booking-step-success">
                    <div class="step-content success-content">
                        <div class="success-animation">
                            <svg class="checkmark" width="80" height="80" viewBox="0 0 52 52">
                                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h3 class="success-title">Booking Confirmed!</h3>
                        <p class="success-message" id="success-message">Your booking has been confirmed. Our driver will arrive at the scheduled time.</p>
                        
                        <div class="booking-id-display" id="booking-id-display" style="display: none;">
                            <span>Booking ID:</span>
                            <strong id="booking-id-value">-</strong>
                        </div>

                        <div class="success-schedule" id="success-schedule">
                            <div class="success-schedule-icon">📅</div>
                            <div class="success-schedule-text" id="success-schedule-text">-</div>
                        </div>

                        <div class="offline-notice" id="offline-notice" style="display: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4M12 8h.01"></path>
                            </svg>
                            <span>Booking saved offline. Will sync when online.</span>
                        </div>
                    </div>

                    <div class="step-footer">
                        <button class="btn-primary" onclick="LocationBooking.closeModal()">Done</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Initialize map after modal is in DOM
        setTimeout(() => initializeMap(), 100);
    }

    /**
     * Initialize Leaflet map
     */
    function initializeMap() {
        const mapContainer = document.getElementById('booking-map');
        if (!mapContainer) return;

        // Remove only the loading div, keep zone selector
        const loadingDiv = mapContainer.querySelector('.map-loading');
        if (loadingDiv) loadingDiv.remove();

        // Create map
        map = L.map('booking-map', {
            center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
            zoom: 15,
            zoomControl: true,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Create static marker
        const pinIcon = L.divIcon({
            className: 'location-pin-marker',
            html: `<div class="pin-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#f97316" stroke="#fff" stroke-width="1">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3" fill="#fff"/>
                </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        marker = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
            icon: pinIcon,
            draggable: false
        }).addTo(map);

        // Fetch zones from API
        fetchZones();
    }

    // Zone polygon layer reference
    let zonePolygon = null;

    /**
     * Fetch zones from API
     */
    async function fetchZones() {
        const dropdown = document.getElementById('zone-dropdown');

        try {
            const response = await fetch('https://tip-topcarwash.in/main_erp/api_v1/zones_routes/');
            const data = await response.json();

            if (data.success && data.data.zones) {
                availableZones = data.data.zones;

                // Populate dropdown
                dropdown.innerHTML = availableZones.map(zone =>
                    `<option value="${zone.id}">${zone.zone_name}</option>`
                ).join('');

                // Auto-select first zone
                if (availableZones.length > 0) {
                    dropdown.value = availableZones[0].id;
                    selectZone(availableZones[0]);
                }

                console.log('📍 Zones loaded:', availableZones.length);
            } else {
                dropdown.innerHTML = '<option value="">No zones available</option>';
            }
        } catch (error) {
            console.error('Failed to fetch zones:', error);
            dropdown.innerHTML = '<option value="">Kokrajhar</option>';
            // Set default zone
            bookingData.zone.id = 1;
            bookingData.zone.name = 'Kokrajhar';
        }
    }

    /**
     * Handle zone dropdown change
     */
    function onZoneChange() {
        const dropdown = document.getElementById('zone-dropdown');
        const zoneId = parseInt(dropdown.value);
        const zone = availableZones.find(z => z.id === zoneId);

        if (zone) {
            selectZone(zone);

            // Re-validate location against new zone
            if (bookingData.location.lat && bookingData.location.lng) {
                validateLocationInZone();
            }
        }
    }

    /**
     * Select and display zone
     */
    function selectZone(zone) {
        // Store zone in booking data
        bookingData.zone.id = zone.id;
        bookingData.zone.name = zone.zone_name;

        // Remove existing polygon
        if (zonePolygon) {
            map.removeLayer(zonePolygon);
        }

        // Draw zone polygon if coordinates available
        if (zone.coordinates && zone.coordinates.length > 0) {
            const coords = zone.coordinates.map(c => [c.lat, c.lng]);

            zonePolygon = L.polygon(coords, {
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(map);

            // Fit map to zone bounds
            map.fitBounds(zonePolygon.getBounds(), { padding: [20, 20] });
        }

        console.log('📍 Zone selected:', zone.zone_name);
    }

    /**
     * Capture GPS location (single attempt)
     */
    function captureGPS() {
        const nextBtn = document.getElementById('btn-next-step1');

        if (!navigator.geolocation) {
            updateLocationStatus('GPS not supported. Please enter PIN code.', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('📍 GPS captured:', latitude, longitude);

                bookingData.location.lat = latitude;
                bookingData.location.lng = longitude;

                if (map && marker) {
                    map.setView([latitude, longitude], 16);
                    marker.setLatLng([latitude, longitude]);
                }

                // Get address from coordinates
                reverseGeocode(latitude, longitude);

                // Validate location against zone
                validateLocationInZone();

                updateLocationStatus('Location detected', 'success');
                if (nextBtn) nextBtn.disabled = false;
            },
            (error) => {
                console.warn('📍 GPS error:', error.message);

                bookingData.location.lat = DEFAULT_CENTER.lat;
                bookingData.location.lng = DEFAULT_CENTER.lng;

                updateLocationStatus('Could not detect location. Adjust pin or enter PIN code.', 'warning');
                if (nextBtn) nextBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    /**
     * Reverse geocode coordinates to address using Nominatim
     * Note: Nominatim blocks CORS from localhost, works only on production
     */
    async function reverseGeocode(lat, lng) {
        // Skip on localhost - Nominatim blocks CORS from localhost
        const isLocalhost = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        if (isLocalhost) {
            console.log('📍 Skipping geocoding on localhost (CORS blocked)');
            updateLocationStatus('Location detected (address available on live site)', 'success');
            return;
        }

        try {
            updateLocationStatus('Getting address...', 'info');

            // Use simple fetch - Nominatim works with default browser headers
            // Adding email parameter as recommended by Nominatim usage policy
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&email=contact@tip-topcarwash.in`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Geocoding failed');
            }

            const data = await response.json();

            if (data && data.address) {
                // Build a readable address
                const parts = [];

                // Add specific location details
                if (data.address.road) parts.push(data.address.road);
                if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                if (data.address.suburb) parts.push(data.address.suburb);
                if (data.address.city || data.address.town || data.address.village) {
                    parts.push(data.address.city || data.address.town || data.address.village);
                }
                if (data.address.postcode) {
                    parts.push(data.address.postcode);
                    bookingData.location.pincode = data.address.postcode;
                }

                const address = parts.join(', ') || data.display_name;
                bookingData.location.address = address;

                // Show address in location status
                updateLocationStatusWithAddress(address);

                console.log('📍 Address:', address);
            } else {
                updateLocationStatus('Location detected', 'success');
            }

        } catch (error) {
            console.warn('Reverse geocoding error:', error);
            // Still show success even if geocoding fails
            updateLocationStatus('Location detected', 'success');
        }
    }

    /**
     * Check if a point is inside a polygon using ray-casting algorithm
     * @param {Object} point - {lat, lng}
     * @param {Array} polygon - Array of {lat, lng} coordinates
     * @returns {boolean}
     */
    function isPointInPolygon(point, polygon) {
        if (!polygon || polygon.length < 3) return false;

        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat, yi = polygon[i].lng;
            const xj = polygon[j].lat, yj = polygon[j].lng;

            const intersect = ((yi > point.lng) !== (yj > point.lng))
                && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Validate if current location is within selected zone
     */
    function validateLocationInZone() {
        // Get current location
        const currentLat = bookingData.location.lat;
        const currentLng = bookingData.location.lng;

        // Check if we have valid coordinates
        if (!currentLat || !currentLng) {
            console.log('📍 No GPS coordinates to validate');
            return true; // Allow to proceed if no GPS
        }

        // Get selected zone
        const selectedZone = availableZones.find(z => z.id === bookingData.zone.id);
        if (!selectedZone || !selectedZone.coordinates || selectedZone.coordinates.length === 0) {
            console.log('📍 No zone polygon to validate against');
            return true; // Allow to proceed if no zone boundaries
        }

        // Check if point is in polygon
        const point = { lat: currentLat, lng: currentLng };
        const isInRange = isPointInPolygon(point, selectedZone.coordinates);

        console.log('📍 Location validation:', {
            zone: selectedZone.zone_name,
            coordinates: point,
            inRange: isInRange
        });

        if (!isInRange) {
            // Location is out of range
            showOutOfRangeUI(selectedZone.zone_name);
        } else {
            // Location is in range
            hideOutOfRangeUI();
        }

        return isInRange;
    }

    /**
     * Show out-of-range UI
     */
    function showOutOfRangeUI(zoneName) {
        // Update location status with warning
        const statusEl = document.getElementById('location-status');
        if (statusEl) {
            statusEl.className = 'location-status status-out-of-range';
            statusEl.innerHTML = `
                <div class="out-of-range-content">
                    <div class="out-of-range-icon">⚠️</div>
                    <div class="out-of-range-text">
                        <strong>Location outside service area</strong>
                        <p>Your location is outside <span class="zone-name">${zoneName}</span> zone. Please enter your address manually.</p>
                    </div>
                </div>
            `;
        }

        // Auto-expand manual entry section with highlight
        const manualContainer = document.getElementById('manual-entry-container');
        if (manualContainer) {
            manualContainer.style.display = 'block';
            manualContainer.classList.add('highlighted');

            // Focus on textarea after a short delay
            setTimeout(() => {
                // Populate zone dropdown first
                const zoneSelect = document.getElementById('manual-zone-select');
                if (zoneSelect && availableZones.length > 0) {
                    zoneSelect.innerHTML = '<option value="">Select your zone</option>' +
                        availableZones.map(zone =>
                            `<option value="${zone.id}">${zone.zone_name}</option>`
                        ).join('');
                }

                // Focus on zone select
                if (zoneSelect) zoneSelect.focus();
            }, 300);
        }

        console.log('⚠️ Showing out-of-range UI');
    }

    /**
     * Hide out-of-range UI (when location is in range)
     */
    function hideOutOfRangeUI() {
        const manualContainer = document.getElementById('manual-entry-container');
        if (manualContainer) {
            manualContainer.classList.remove('highlighted');
        }
    }

    /**
     * Update location status with address
     */
    function updateLocationStatusWithAddress(address) {
        const statusEl = document.getElementById('location-status');
        if (!statusEl) return;

        // Add success class for animation
        statusEl.className = 'location-status status-success';

        statusEl.innerHTML = `
            <span class="success-text">✓ Your current location is detected successfully</span>
        `;
    }

    /**
     * Update location status display
     */
    function updateLocationStatus(message, type = 'info') {
        const statusEl = document.getElementById('location-status');
        if (!statusEl) return;

        // Update class for type-based styling
        statusEl.className = 'location-status' + (type === 'success' ? ' status-success' : '');

        if (type === 'success') {
            statusEl.innerHTML = `<span class="success-text">✓ Your current location is detected successfully</span>`;
        } else {
            statusEl.innerHTML = `<span class="${type}-text">${message}</span>`;
        }
    }

    /**
     * Enable map adjustment mode
     */
    function adjustLocation() {
        isMapAdjustMode = true;

        if (map) {
            map.dragging.enable();
            map.touchZoom.enable();
            map.scrollWheelZoom.enable();
        }

        if (marker) {
            marker.dragging.enable();
            marker.on('dragend', function (e) {
                const pos = e.target.getLatLng();
                bookingData.location.lat = pos.lat;
                bookingData.location.lng = pos.lng;
                console.log('📍 Pin moved to:', pos.lat, pos.lng);

                // Get new address for the moved location
                reverseGeocode(pos.lat, pos.lng);
            });
        }

        const hint = document.getElementById('map-adjust-hint');
        if (hint) hint.style.display = 'flex';

        updateLocationStatus('Drag the pin to your location', 'info');

        const nextBtn = document.getElementById('btn-next-step1');
        if (nextBtn) nextBtn.disabled = false;
    }

    /**
     * Show manual address entry form
     */
    function showManualEntry() {
        const container = document.getElementById('manual-entry-container');
        if (container) {
            container.style.display = 'block';

            // Populate zone dropdown
            const zoneSelect = document.getElementById('manual-zone-select');
            if (zoneSelect && availableZones.length > 0) {
                zoneSelect.innerHTML = '<option value="">Select your zone</option>' +
                    availableZones.map(zone =>
                        `<option value="${zone.id}">${zone.zone_name}</option>`
                    ).join('');

                // Pre-select current zone if available
                if (bookingData.zone.id) {
                    zoneSelect.value = bookingData.zone.id;
                }
            }

            // Focus on first input
            setTimeout(() => {
                const firstInput = document.getElementById('manual-house-no');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    /**
     * Hide manual address entry form
     */
    function hideManualEntry() {
        const container = document.getElementById('manual-entry-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Validate manual entry and proceed to next step
     */
    function validateAndProceed() {
        // Check if manual entry is visible (user is entering address manually)
        const manualContainer = document.getElementById('manual-entry-container');
        const isManualEntryVisible = manualContainer && manualContainer.style.display !== 'none';

        if (isManualEntryVisible) {
            // Validate manual entry fields
            const zoneId = document.getElementById('manual-zone-select').value;
            const houseNo = document.getElementById('manual-house-no').value.trim();
            const street = document.getElementById('manual-street').value.trim();
            const area = document.getElementById('manual-area').value.trim();
            const city = document.getElementById('manual-city').value.trim();
            const pincode = document.getElementById('manual-pincode').value.trim();

            // Validate required fields
            if (!zoneId) {
                alert('Please select a service zone');
                document.getElementById('manual-zone-select').focus();
                return;
            }
            if (!houseNo) {
                alert('Please enter house/building number');
                document.getElementById('manual-house-no').focus();
                return;
            }
            if (!street) {
                alert('Please enter street/road name');
                document.getElementById('manual-street').focus();
                return;
            }
            if (!area) {
                alert('Please enter area/locality');
                document.getElementById('manual-area').focus();
                return;
            }
            if (!city) {
                alert('Please enter city');
                document.getElementById('manual-city').focus();
                return;
            }
            if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
                alert('Please enter a valid 6-digit pincode');
                document.getElementById('manual-pincode').focus();
                return;
            }

            // Construct full address
            const addressParts = [houseNo, street, area, city, pincode];
            const fullAddress = addressParts.join(', ');

            // Store zone
            const selectedZone = availableZones.find(z => z.id === parseInt(zoneId));
            if (selectedZone) {
                bookingData.zone.id = selectedZone.id;
                bookingData.zone.name = selectedZone.zone_name;
            }

            // Store address with manual entry flag
            bookingData.location.address = fullAddress;
            bookingData.location.pincode = pincode;
            bookingData.location.isManualEntry = true;
            bookingData.location.manualAddressPreferred = true;
            bookingData.location.manualAddressDetails = {
                houseNo,
                street,
                area,
                city,
                pincode
            };

            // Update status
            updateLocationStatusWithAddress(fullAddress);

            console.log('📍 Manual address validated:', fullAddress);
            console.log('📍 Zone:', selectedZone?.zone_name);
        }

        // Proceed to Step 2
        goToStep(2);
    }

    /**
     * Confirm manual address entry
     */
    function confirmManualAddress() {
        // This function is no longer used as validation is handled by validateAndProceed
        // Keeping for backward compatibility
        console.log('⚠️ confirmManualAddress is deprecated. Use validateAndProceed instead.');
    }

    /**
     * Select landmark
     */
    function selectLandmark(landmarkId, landmarkLabel) {
        // Update button states
        document.querySelectorAll('.landmark-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-landmark="${landmarkId}"]`).classList.add('selected');

        // Store selection
        bookingData.location.landmarkType = landmarkId;

        // Find the landmark icon
        const landmark = LANDMARKS.find(l => l.id === landmarkId);
        const icon = landmark ? landmark.icon : '📍';

        // Get form sections
        const nameSection = document.getElementById('landmark-name-section');
        const manualForm = document.getElementById('manual-address-form');
        const iconEl = document.getElementById('landmark-selected-icon');
        const inputEl = document.getElementById('landmark-name-input');

        // Show different form based on selection
        if (landmarkId === 'other') {
            // Show manual address form for "Other"
            if (nameSection) nameSection.style.display = 'none';
            if (manualForm) {
                manualForm.style.display = 'block';
                document.getElementById('manual-address').focus();
            }
        } else {
            // Show landmark name input for all other selections
            if (manualForm) manualForm.style.display = 'none';
            if (nameSection) {
                nameSection.style.display = 'block';
                iconEl.textContent = icon;

                // Update placeholder based on landmark type
                const placeholders = {
                    'temple': 'e.g., Shiv Mandir, Kali Temple, Durga Mandir',
                    'mosque': 'e.g., Jama Masjid, Central Mosque',
                    'school': 'e.g., City High School, DAV Public School',
                    'market': 'e.g., Main Bazaar, Daily Market, Town Market',
                    'petrol': 'e.g., Indian Oil, HP Petrol Pump, Bharat Petroleum',
                    'medical': 'e.g., City Hospital, Apollo Pharmacy, Health Point'
                };
                inputEl.placeholder = placeholders[landmarkId] || 'Enter landmark name';
                inputEl.value = '';
                inputEl.focus();
            }
        }

        // Keep next button disabled until required fields are entered
        const nextBtn = document.getElementById('btn-next-step2');
        if (nextBtn) nextBtn.disabled = true;
    }

    /**
     * Handle landmark name input
     */
    function onLandmarkNameInput() {
        const input = document.getElementById('landmark-name-input');
        const name = input.value.trim();

        // Store the full landmark description
        const landmark = LANDMARKS.find(l => l.id === bookingData.location.landmarkType);
        const type = landmark ? landmark.label : 'Other';
        bookingData.location.landmark = name ? `${type} - ${name}` : null;

        // Enable/disable next button based on input
        const nextBtn = document.getElementById('btn-next-step2');
        if (nextBtn) {
            nextBtn.disabled = name.length < 3; // Minimum 3 characters
        }
    }

    /**
     * Handle manual address input (for Other selection)
     */
    function onManualAddressInput() {
        const addressInput = document.getElementById('manual-address');
        const landmarkInput = document.getElementById('manual-landmark');
        const address = addressInput.value.trim();
        const nearbyLandmark = landmarkInput ? landmarkInput.value.trim() : '';

        // Build full address
        let fullAddress = address;
        if (nearbyLandmark) {
            fullAddress += ` (Near: ${nearbyLandmark})`;
        }

        // Store as landmark since we're using the Other option
        bookingData.location.landmark = fullAddress ? `Manual Address - ${fullAddress}` : null;
        bookingData.location.address = address; // Also store in address field

        // Enable/disable next button based on address
        const nextBtn = document.getElementById('btn-next-step2');
        if (nextBtn) {
            nextBtn.disabled = address.length < 10; // Minimum 10 characters for address
        }
    }

    /**
     * Handle date change
     */
    function onDateChange() {
        const dateInput = document.getElementById('booking-date');
        bookingData.schedule.date = dateInput.value;

        // Clear quick button selection
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        updateSchedulePreview();
        checkScheduleComplete();
    }

    /**
     * Select quick date (Today or Tomorrow)
     */
    function selectQuickDate(which) {
        const today = new Date();
        let selectedDate;

        if (which === 'today') {
            selectedDate = today;
        } else if (which === 'tomorrow') {
            selectedDate = new Date(today);
            selectedDate.setDate(today.getDate() + 1);
        }

        // Format as YYYY-MM-DD for input
        const dateStr = selectedDate.toISOString().split('T')[0];

        // Update the date input
        const dateInput = document.getElementById('booking-date');
        if (dateInput) {
            dateInput.value = dateStr;
        }

        // Store in booking data
        bookingData.schedule.date = dateStr;

        // Update button states
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById(`btn-${which}`).classList.add('selected');

        updateSchedulePreview();
        checkScheduleComplete();
    }

    /**
     * Select time slot
     */
    function selectTimeSlot(timeValue, timeLabel) {
        document.querySelectorAll('.time-slot-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-time="${timeValue}"]`).classList.add('selected');

        bookingData.schedule.time = timeValue;
        bookingData.schedule.timeLabel = timeLabel;
        updateSchedulePreview();
        checkScheduleComplete();
    }

    /**
     * Update schedule preview
     */
    function updateSchedulePreview() {
        const preview = document.getElementById('schedule-preview');
        const previewDate = document.getElementById('preview-date');
        const previewTime = document.getElementById('preview-time');

        if (bookingData.schedule.date && bookingData.schedule.time) {
            previewDate.textContent = formatDateForDisplay(bookingData.schedule.date);
            previewTime.textContent = bookingData.schedule.timeLabel;
            preview.style.display = 'flex';
        } else {
            preview.style.display = 'none';
        }
    }

    /**
     * Check if schedule is complete
     */
    function checkScheduleComplete() {
        const nextBtn = document.getElementById('btn-next-step3');
        if (nextBtn) {
            nextBtn.disabled = !(bookingData.schedule.date && bookingData.schedule.time);
        }
    }

    /**
     * Show step
     */
    function showStep(step) {
        currentStep = step;

        document.querySelectorAll('.progress-step').forEach((el, i) => {
            el.classList.toggle('active', i < step);
            el.classList.toggle('completed', i < step - 1);
        });

        document.querySelectorAll('.location-booking-step').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById(`booking-step-${step}`).classList.add('active');

        const backBtn = document.getElementById('booking-back-btn');
        if (backBtn) {
            backBtn.style.visibility = step > 1 ? 'visible' : 'hidden';
        }

        const titles = {
            1: 'Confirm Your Location',
            2: 'Select Nearby Landmark',
            3: 'Choose Date & Time',
            4: 'Review Your Booking'
        };
        document.querySelector('.location-booking-title').textContent = titles[step] || 'Booking';
    }

    /**
     * Go to specific step
     */
    function goToStep(step) {
        if (step === 2) {
            if (!bookingData.location.lat || !bookingData.location.lng) {
                updateLocationStatus('Please wait for location detection', 'warning');
                return;
            }
        }

        if (step === 3) {
            if (bookingData.location.landmarkType === 'other') {
                const customLandmark = document.getElementById('custom-landmark').value.trim();
                if (!customLandmark) {
                    alert('Please describe the landmark');
                    return;
                }
                bookingData.location.landmark = customLandmark;
            }
            bookingData.location.notes = document.getElementById('driver-notes').value.trim();
        }

        if (step === 4) {
            if (!bookingData.schedule.date || !bookingData.schedule.time) {
                alert('Please select date and time');
                return;
            }
            updateBookingSummary();

            // Check if user is already logged in and auto-fill phone
            autoFillLoggedInUser();
        }

        showStep(step);
    }

    /**
     * Auto-fill phone for logged-in users (called when entering Step 4)
     */
    function autoFillLoggedInUser() {
        // Check if AuthSystem is available and user is logged in
        if (typeof window.AuthSystem !== 'undefined' && typeof window.AuthSystem.checkLoginStatus === 'function') {
            const isLoggedIn = window.AuthSystem.checkLoginStatus();
            console.log('🔍 Checking login status for booking:', isLoggedIn);

            if (isLoggedIn) {
                const customerData = window.AuthSystem.getCustomerData();
                console.log('✅ User is logged in, auto-filling customer data:', customerData);

                if (customerData && customerData.phone) {
                    // Store customer data in booking
                    bookingData.customer = {
                        name: customerData.name || '',
                        phone: customerData.phone,
                        id: customerData.id
                    };
                    bookingData.isVerified = true;

                    // Update UI to show verified state
                    setTimeout(() => {
                        const phoneInput = document.getElementById('phone-input-container');
                        const otpContainer = document.getElementById('otp-container');
                        const phoneVerified = document.getElementById('phone-verified');
                        const verifiedNumber = document.getElementById('verified-number');
                        const confirmBtn = document.getElementById('confirm-booking-btn');
                        const verifyHint = document.getElementById('verify-hint');

                        // Hide phone input and OTP sections
                        if (phoneInput) phoneInput.style.display = 'none';
                        if (otpContainer) otpContainer.style.display = 'none';

                        // Show verified section
                        if (phoneVerified) {
                            phoneVerified.style.display = 'flex';
                            if (verifiedNumber) verifiedNumber.textContent = customerData.phone;
                        }

                        // Enable confirm button and update hint
                        if (confirmBtn) confirmBtn.disabled = false;
                        if (verifyHint) {
                            verifyHint.textContent = '✅ Logged in - Phone verified';
                            verifyHint.style.color = '#22c55e';
                        }

                        console.log('✅ Auto-filled customer data for logged-in user');
                    }, 100);
                }
            } else {
                console.log('📱 User not logged in, showing phone verification');
            }
        }
    }

    /**
     * Go back
     */
    function goBack() {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    }

    /**
     * Update booking summary
     */
    function updateBookingSummary() {
        document.getElementById('summary-service').textContent = bookingData.service?.name || '-';
        document.getElementById('summary-vehicle').textContent = capitalizeFirst(bookingData.vehicleType) || '-';

        // Prioritize manual address if entered
        let locationDisplay = 'GPS Location';
        if (bookingData.location.manualAddressPreferred && bookingData.location.address) {
            locationDisplay = bookingData.location.address;
        } else if (bookingData.location.address) {
            locationDisplay = bookingData.location.address;
        } else if (bookingData.location.pincode) {
            locationDisplay = bookingData.location.pincode;
        }

        document.getElementById('summary-location').textContent = locationDisplay;
        document.getElementById('summary-landmark').textContent = bookingData.location.landmark || '-';
        document.getElementById('summary-schedule').textContent =
            `${formatDateForDisplay(bookingData.schedule.date)} at ${bookingData.schedule.timeLabel}`;
        document.getElementById('summary-price').textContent = `₹${bookingData.price || 0}`;
    }

    /**
     * Confirm booking
     */
    async function confirmBooking() {
        const confirmBtn = document.querySelector('.btn-confirm');
        const btnText = confirmBtn.querySelector('.btn-text');
        const btnLoading = confirmBtn.querySelector('.btn-loading');

        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        confirmBtn.disabled = true;

        try {
            // Get customer data if logged in
            const customerData = getCustomerData();

            const finalBookingData = {
                service: {
                    id: bookingData.service?.id,
                    name: bookingData.service?.name
                },
                serviceId: bookingData.service?.id,
                serviceName: bookingData.service?.name,
                vehicleType: bookingData.vehicleType,
                price: bookingData.price,
                location: {
                    lat: bookingData.location.lat,
                    lng: bookingData.location.lng,
                    address: bookingData.location.address, // Manual address gets preference
                    isManualEntry: bookingData.location.isManualEntry || false,
                    manualAddressPreferred: bookingData.location.manualAddressPreferred || false,
                    landmark: bookingData.location.landmark,
                    landmarkType: bookingData.location.landmarkType,
                    notes: bookingData.location.notes,
                    pincode: bookingData.location.pincode
                },
                schedule: {
                    date: bookingData.schedule.date,
                    time: bookingData.schedule.time,
                    timeLabel: bookingData.schedule.timeLabel
                },
                // Include customer_id if logged in
                customer_id: customerData?.id || null,
                customer_phone: customerData?.phone || bookingData.customer?.phone || null,
                customer_name: customerData?.name || bookingData.customer?.name || null,
                timestamp: Date.now()
            };

            // Log for clarity on what's being sent
            if (bookingData.location.manualAddressPreferred) {
                console.log('📍 Service Location: Manual Address (Preferred) -', bookingData.location.address);
                console.log('📍 GPS Coordinates: Backup for driver navigation -', bookingData.location.lat, bookingData.location.lng);
            } else {
                console.log('📍 Service Location: GPS Detected -', bookingData.location.lat, bookingData.location.lng);
                if (bookingData.location.address) {
                    console.log('📍 Address:', bookingData.location.address);
                }
            }

            console.log('📤 Submitting booking:', finalBookingData);

            if (NetworkMonitor && NetworkMonitor.isOnline()) {
                try {
                    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKING.CREATE}`, {
                        method: 'POST',
                        headers: getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' },
                        body: JSON.stringify(finalBookingData)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        showSuccess(result.booking?.id || result.bookingId, false);
                        return;
                    }
                } catch (e) {
                    console.warn('Online submission failed, saving offline:', e);
                }
            }

            if (window.OfflineDB) {
                const result = await OfflineDB.saveBooking(finalBookingData);
                showSuccess(result.localId, true);
            } else {
                const bookings = JSON.parse(localStorage.getItem('pending_bookings') || '[]');
                const localId = 'CW-' + Date.now();
                bookings.push({ ...finalBookingData, localId, status: 'pending' });
                localStorage.setItem('pending_bookings', JSON.stringify(bookings));
                showSuccess(localId, true);
            }

        } catch (error) {
            console.error('Booking error:', error);

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            confirmBtn.disabled = false;

            alert('Booking failed. Please try again.');
        }
    }

    /**
     * Show success state
     */
    function showSuccess(bookingId, isOffline) {
        document.querySelectorAll('.location-booking-step').forEach(el => {
            el.classList.remove('active');
        });

        document.getElementById('booking-step-success').classList.add('active');

        if (bookingId) {
            document.getElementById('booking-id-display').style.display = 'block';
            document.getElementById('booking-id-value').textContent = bookingId;
        }

        // Show scheduled time
        document.getElementById('success-schedule-text').textContent =
            `${formatDateForDisplay(bookingData.schedule.date)} at ${bookingData.schedule.timeLabel}`;

        if (isOffline) {
            document.getElementById('offline-notice').style.display = 'flex';
            document.getElementById('success-message').textContent = 'Your booking has been saved and will be confirmed when you\'re back online.';
        }

        document.querySelector('.location-booking-progress').style.display = 'none';
        document.getElementById('booking-back-btn').style.visibility = 'hidden';
        document.querySelector('.location-booking-title').textContent = 'Booking Confirmed!';
    }

    /**
     * Close modal
     */
    function closeModal() {
        const modal = document.getElementById('location-booking-modal');
        if (modal) {
            modal.remove();
        }
        document.body.style.overflow = '';

        if (map) {
            map.remove();
            map = null;
            marker = null;
        }
    }

    /**
     * Utility: Capitalize first letter
     */
    function capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
    }

    // ================================
    // PHONE & OTP FUNCTIONS
    // ================================

    /**
     * Handle phone input
     */
    function onPhoneInput(input) {
        // Only allow digits
        input.value = input.value.replace(/\D/g, '');

        const phone = input.value;
        const sendBtn = document.getElementById('btn-send-otp');

        // Enable send button if 10 digits
        if (sendBtn) {
            sendBtn.disabled = phone.length !== 10;
        }
    }

    /**
     * Send OTP to phone number
     */
    async function sendOTP() {
        const phoneInput = document.getElementById('phone-input');
        const phone = phoneInput.value.trim();

        if (phone.length !== 10) {
            alert('Please enter a valid 10-digit mobile number');
            return;
        }

        const sendBtn = document.getElementById('btn-send-otp');
        const btnText = sendBtn.querySelector('.btn-text');
        const btnLoading = sendBtn.querySelector('.btn-loading');

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        sendBtn.disabled = true;

        try {
            // In production, call your backend API:
            // const response = await fetch('/api/otp/send', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ phone: '+91' + phone })
            // });

            // For demo/testing, generate random 6-digit OTP
            generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
            console.log('🔐 Demo OTP:', generatedOTP); // Remove in production!

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Store phone in booking data
            bookingData.customer.phone = '+91' + phone;

            // Hide phone input, show OTP input
            document.getElementById('phone-input-container').style.display = 'none';
            document.getElementById('otp-container').style.display = 'block';
            document.getElementById('otp-sent-msg').textContent = `OTP sent to +91 ${phone.slice(0, 2)}****${phone.slice(-2)}`;

            // Focus first OTP box
            document.querySelector('.otp-box[data-index="0"]').focus();

            // Start countdown timer
            startOTPTimer();

        } catch (error) {
            console.error('OTP send error:', error);
            alert('Failed to send OTP. Please try again.');

            // Reset button
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            sendBtn.disabled = false;
        }
    }

    /**
     * Start OTP resend timer
     */
    function startOTPTimer() {
        otpCountdown = 30;
        const timerEl = document.getElementById('otp-timer');
        const resendBtn = document.getElementById('btn-resend-otp');

        timerEl.style.display = 'inline';
        resendBtn.style.display = 'none';

        otpTimer = setInterval(() => {
            otpCountdown--;
            timerEl.textContent = `Resend OTP in ${otpCountdown}s`;

            if (otpCountdown <= 0) {
                clearInterval(otpTimer);
                timerEl.style.display = 'none';
                resendBtn.style.display = 'inline';
            }
        }, 1000);
    }

    /**
     * Handle OTP box input
     */
    function handleOTPInput(input) {
        // Only allow digits
        input.value = input.value.replace(/\D/g, '');

        const index = parseInt(input.getAttribute('data-index'));
        const boxes = document.querySelectorAll('.otp-box');

        // Move to next box if digit entered
        if (input.value.length === 1 && index < 5) {
            boxes[index + 1].focus();
        }

        // Check if all boxes filled
        const otp = Array.from(boxes).map(b => b.value).join('');
        const verifyBtn = document.getElementById('btn-verify-otp');
        verifyBtn.disabled = otp.length !== 6;
    }

    /**
     * Handle OTP keydown (backspace)
     */
    function handleOTPKeydown(event, input) {
        const index = parseInt(input.getAttribute('data-index'));
        const boxes = document.querySelectorAll('.otp-box');

        // Move to previous box on backspace if empty
        if (event.key === 'Backspace' && input.value === '' && index > 0) {
            boxes[index - 1].focus();
        }
    }

    /**
     * Verify OTP
     */
    async function verifyOTP() {
        const boxes = document.querySelectorAll('.otp-box');
        const enteredOTP = Array.from(boxes).map(b => b.value).join('');

        if (enteredOTP.length !== 6) {
            alert('Please enter the complete 6-digit OTP');
            return;
        }

        const verifyBtn = document.getElementById('btn-verify-otp');
        const btnText = verifyBtn.querySelector('.btn-text');
        const btnLoading = verifyBtn.querySelector('.btn-loading');

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        verifyBtn.disabled = true;

        try {
            // In production, call your backend API:
            // const response = await fetch('/api/otp/verify', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ phone: bookingData.customer.phone, otp: enteredOTP })
            // });

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // For demo, check against generated OTP
            if (enteredOTP !== generatedOTP) {
                alert('Invalid OTP. Please try again.');
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                verifyBtn.disabled = false;
                return;
            }

            // OTP verified!
            bookingData.customer.isVerified = true;
            clearInterval(otpTimer);

            // Hide OTP section, show verified badge
            document.getElementById('otp-container').style.display = 'none';
            document.getElementById('phone-verified').style.display = 'flex';
            document.getElementById('verified-number').textContent = bookingData.customer.phone;

            // Enable confirm booking button
            const confirmBtn = document.getElementById('btn-confirm-booking');
            const verifyHint = document.getElementById('verify-hint');
            if (confirmBtn) confirmBtn.disabled = false;
            if (verifyHint) verifyHint.style.display = 'none';

            console.log('✅ Phone verified:', bookingData.customer.phone);

        } catch (error) {
            console.error('OTP verify error:', error);
            alert('Verification failed. Please try again.');

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            verifyBtn.disabled = false;
        }
    }

    /**
     * Resend OTP
     */
    function resendOTP() {
        // Clear OTP boxes
        document.querySelectorAll('.otp-box').forEach(box => {
            box.value = '';
        });
        document.getElementById('btn-verify-otp').disabled = true;

        // Send new OTP
        generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('🔐 New Demo OTP:', generatedOTP);

        // Start timer again
        startOTPTimer();

        // Focus first box
        document.querySelector('.otp-box[data-index="0"]').focus();
    }

    /**
     * Change phone number (go back to phone input)
     */
    function changePhoneNumber() {
        // Reset state
        bookingData.customer.phone = null;
        bookingData.customer.isVerified = false;
        clearInterval(otpTimer);

        // Reset UI
        document.getElementById('phone-input').value = '';
        document.getElementById('btn-send-otp').disabled = true;
        document.getElementById('btn-send-otp').querySelector('.btn-text').style.display = 'inline';
        document.getElementById('btn-send-otp').querySelector('.btn-loading').style.display = 'none';

        // Clear OTP boxes
        document.querySelectorAll('.otp-box').forEach(box => {
            box.value = '';
        });

        // Show phone input, hide others
        document.getElementById('phone-input-container').style.display = 'flex';
        document.getElementById('otp-container').style.display = 'none';
        document.getElementById('phone-verified').style.display = 'none';

        // Disable confirm button
        const confirmBtn = document.getElementById('btn-confirm-booking');
        const verifyHint = document.getElementById('verify-hint');
        if (confirmBtn) confirmBtn.disabled = true;
        if (verifyHint) verifyHint.style.display = 'block';

        // Focus phone input
        document.getElementById('phone-input').focus();
    }

    // ================================
    // AUTHENTICATION INTEGRATION
    // ================================

    /**
     * Open Quick Rebook modal for returning customers
     */
    async function openQuickRebook(customerData) {
        console.log('🚀 Opening Quick Rebook for customer:', customerData);

        try {
            // Fetch last booking
            const lastBooking = await fetchLastBooking(customerData.id);

            if (!lastBooking) {
                alert('No previous booking found. Starting new booking...');
                openBookingModal({});
                return;
            }

            // Pre-fill booking data
            bookingData.service = {
                id: lastBooking.service_id,
                name: lastBooking.service_name,
                price: lastBooking.price
            };
            bookingData.vehicleType = lastBooking.vehicle_type;
            bookingData.price = lastBooking.price;
            bookingData.location = {
                lat: lastBooking.latitude,
                lng: lastBooking.longitude,
                landmark: lastBooking.landmark,
                landmarkType: lastBooking.landmark_type,
                notes: lastBooking.location_notes || '',
                pincode: lastBooking.pincode || '',
                address: lastBooking.address || '',
                manualAddress: lastBooking.manual_address || ''
            };
            bookingData.customer = {
                id: customerData.id,
                phone: customerData.phone,
                name: customerData.name
            };

            // Create and show modal
            createModal();

            // Skip to Step 3 (Schedule)
            currentStep = 3;
            showStep(3);

            // Update location status
            updateLocationStatus('Using your last booking location', 'success');

            console.log('✅ Quick Rebook loaded successfully');

        } catch (error) {
            console.error('Quick Rebook error:', error);
            alert('Failed to load quick rebook. Starting new booking...');
            openBookingModal({});
        }
    }

    /**
     * Fetch last booking for customer
     */
    async function fetchLastBooking(customerId) {
        try {
            const url = `${API_CONFIG.BASE_URL}/routes/customers.php/${customerId}/last-booking`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            const data = await response.json();

            if (data.success && data.data) {
                return data.data;
            }
            return null;

        } catch (error) {
            console.error('Fetch last booking error:', error);
            return null;
        }
    }

    /**
     * Get customer data from AuthSystem
     */
    function getCustomerData() {
        if (window.AuthSystem && typeof window.AuthSystem.getCustomerData === 'function') {
            return window.AuthSystem.getCustomerData();
        }
        return null;
    }

    /**
     * Enhanced openBookingModal with auth check
     */
    function openBookingModalWithAuth(serviceData) {
        // Check if logged in
        const customerData = getCustomerData();

        if (customerData) {
            // User is logged in, pre-fill customer data
            bookingData.customer = {
                id: customerData.id,
                phone: customerData.phone,
                name: customerData.name
            };

            // Open booking normally
            openBookingModal(serviceData);

        } else {
            // Not logged in, store service and open auth modal
            sessionStorage.setItem('pending_booking_service', JSON.stringify(serviceData));

            if (window.AuthSystem && typeof window.AuthSystem.openAuthModal === 'function') {
                window.AuthSystem.openAuthModal();
            } else {
                // Fallback: open booking normally
                openBookingModal(serviceData);
            }
        }
    }

    return {
        openBookingModal,
        openBookingModalWithAuth,
        openQuickRebook,
        fetchLastBooking,
        getCustomerData,
        closeModal,
        goBack,
        goToStep,
        validateAndProceed,
        adjustLocation,
        showManualEntry,
        hideManualEntry,
        confirmManualAddress,
        selectLandmark,
        onLandmarkNameInput,
        onManualAddressInput,
        onZoneChange,
        onDateChange,
        selectQuickDate,
        selectTimeSlot,
        onPhoneInput,
        sendOTP,
        verifyOTP,
        handleOTPInput,
        handleOTPKeydown,
        resendOTP,
        changePhoneNumber,
        confirmBooking
    };
})();

// Export for global access
window.LocationBooking = LocationBooking;

/**
 * Override the existing bookService function
 */
window.openLocationBooking = function (serviceData) {
    LocationBooking.openBookingModal(serviceData);
};
