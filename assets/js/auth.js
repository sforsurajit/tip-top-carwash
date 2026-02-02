/**
 * Authentication System
 * Handles phone-based login/register with OTP verification
 * Detects returning customers and enables quick rebook
 * 
 * @package TipTop Car Wash
 * @version 1.0
 */

const AuthSystem = (function () {
    'use strict';

    // Check if API_CONFIG is available (it should be loaded from config.js or new-config.js)
    if (typeof API_CONFIG === 'undefined') {
        console.warn('⚠️ API_CONFIG not found. Auth system may not work correctly.');
    }

    // ================================
    // STATE MANAGEMENT
    // ================================

    let currentAuthStep = 'phone';
    let authPhone = null;
    let authOTP = null;
    let authOTPTimer = null;
    let authOTPCountdown = 30;
    let customerData = null;
    let isLoggedIn = false;
    let pendingBookingService = null;

    // ================================
    // INITIALIZATION
    // ================================

    /**
     * Initialize authentication system
     */
    function init() {
        console.log('🔐 Initializing Authentication System...');

        // Check for existing session
        checkExistingSession();

        // Attach event listeners to login buttons
        attachLoginButtonListeners();

        // Update UI based on login status
        updateAuthUI();

        // Check for pending booking after login
        checkPendingBooking();

        // Check if we need to auto-open auth modal (from auth-guard redirect)
        checkAutoOpenModal();

        console.log('✅ Authentication System initialized');
    }

    /**
     * Check if user has existing session
     */
    function checkExistingSession() {
        const savedCustomer = localStorage.getItem('customer_data');
        const savedPhone = localStorage.getItem('customer_phone');

        if (savedCustomer && savedPhone) {
            try {
                customerData = JSON.parse(savedCustomer);
                authPhone = savedPhone;
                isLoggedIn = true;
                console.log('✅ Existing session found:', customerData.phone);
            } catch (e) {
                console.error('Invalid session data, clearing...');
                localStorage.removeItem('customer_data');
                localStorage.removeItem('customer_phone');
            }
        }
    }

    /**
     * Attach event listeners to login buttons
     */
    function attachLoginButtonListeners() {
        console.log('🔗 Attaching login button listeners...');

        // Desktop login button
        const loginBtn = document.getElementById('login-btn');
        console.log('🔍 Desktop login button:', loginBtn);

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🖱️ Login button clicked! isLoggedIn:', isLoggedIn);
                if (isLoggedIn) {
                    showUserMenu();
                } else {
                    console.log('📱 Opening auth modal...');
                    openAuthModal();
                }
            });
            console.log('✅ Desktop login button listener attached');
        } else {
            console.warn('⚠️ Desktop login button not found!');
        }

        // Mobile login button
        const mobileLoginBtn = document.getElementById('mobile-login-btn');
        console.log('🔍 Mobile login button:', mobileLoginBtn);

        if (mobileLoginBtn) {
            mobileLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🖱️ Mobile login button clicked! isLoggedIn:', isLoggedIn);
                if (isLoggedIn) {
                    showUserMenu();
                } else {
                    console.log('📱 Opening auth modal...');
                    openAuthModal();
                }
            });
            console.log('✅ Mobile login button listener attached');
        } else {
            console.warn('⚠️ Mobile login button not found!');
        }
    }

    /**
     * Update UI based on login status
     */
    function updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const mobileLoginBtn = document.getElementById('mobile-login-btn');

        if (isLoggedIn && customerData) {
            // Show customer name or phone
            const displayName = customerData.name || formatPhoneDisplay(authPhone);

            if (loginBtn) {
                loginBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    ${displayName}
                `;
            }

            if (mobileLoginBtn) {
                const span = mobileLoginBtn.querySelector('span');
                if (span) {
                    span.textContent = displayName;
                }
            }
        } else {
            // Show "Login / Register"
            if (loginBtn) {
                loginBtn.textContent = 'Login / Register';
            }
            if (mobileLoginBtn) {
                const span = mobileLoginBtn.querySelector('span');
                if (span) {
                    span.textContent = 'Login / Register';
                }
            }
        }
    }

    // ================================
    // MODAL MANAGEMENT
    // ================================

    /**
     * Open authentication modal
     */
    function openAuthModal() {
        console.log('📱 Opening authentication modal');

        // Reset to phone step
        showAuthStep('phone');

        // Clear inputs
        const phoneInput = document.getElementById('auth-phone-input');
        console.log('🔍 Phone input element:', phoneInput);

        if (phoneInput) {
            phoneInput.value = '';
            phoneInput.disabled = false;
        }

        // Show modal
        const modal = document.getElementById('phone-auth-modal');
        console.log('🔍 Modal element:', modal);

        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            console.log('✅ Modal display set to flex');

            // Focus phone input after animation
            setTimeout(() => {
                if (phoneInput) phoneInput.focus();
            }, 300);
        } else {
            console.error('❌ Modal element not found! ID: phone-auth-modal');
        }
    }

    /**
     * Close authentication modal
     */
    function closeAuthModal() {
        const modal = document.getElementById('phone-auth-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        // Clear OTP timer
        if (authOTPTimer) {
            clearInterval(authOTPTimer);
            authOTPTimer = null;
        }

        // Clear OTP boxes
        document.querySelectorAll('.otp-box-auth').forEach(box => {
            box.value = '';
        });

        console.log('✅ Authentication modal closed');
    }

    /**
     * Show specific authentication step
     */
    function showAuthStep(step) {
        currentAuthStep = step;

        // Hide all steps
        document.querySelectorAll('.auth-step').forEach(el => {
            el.classList.remove('active');
        });

        // Show current step
        const stepMap = {
            'phone': 'auth-step-phone',
            'otp': 'auth-step-otp',
            'register': 'auth-step-register',
            'welcome-new': 'auth-step-welcome-new',
            'welcome-back': 'auth-step-welcome-back'
        };

        const stepEl = document.getElementById(stepMap[step]);
        if (stepEl) {
            stepEl.classList.add('active');
        }

        console.log('📍 Auth step:', step);
    }

    // ================================
    // PHONE INPUT HANDLING
    // ================================

    /**
     * Handle phone input
     */
    function onAuthPhoneInput(input) {
        // Only allow digits
        input.value = input.value.replace(/\D/g, '');

        const phone = input.value;
        const sendBtn = document.getElementById('btn-auth-send-otp');

        // Enable send button if 10 digits
        if (sendBtn) {
            sendBtn.disabled = phone.length !== 10;
        }
    }

    /**
     * Send OTP to phone number (using real API)
     */
    async function sendAuthOTP() {
        const phoneInput = document.getElementById('auth-phone-input');
        const phone = phoneInput.value.trim();

        if (phone.length !== 10) {
            alert('Please enter a valid 10-digit mobile number');
            return;
        }

        // Store phone without country code for API
        authPhone = phone;

        const sendBtn = document.getElementById('btn-auth-send-otp');
        const btnText = sendBtn.querySelector('.btn-text');
        const btnLoading = sendBtn.querySelector('.btn-loader');

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        sendBtn.disabled = true;

        try {
            // Call real API to send OTP
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.SEND_OTP}`;
            console.log('📤 Sending OTP to:', phone);
            console.log('🔗 API URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ phone: phone })
            });

            const data = await response.json();
            console.log('📥 OTP Response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            // OTP sent successfully
            console.log('✅ OTP sent successfully. Expires in:', data.data.expires_in, 'seconds');

            // Update OTP sent message
            const otpMsg = document.getElementById('auth-otp-sent-msg');
            if (otpMsg) {
                otpMsg.textContent = `Code sent to +91 ${phone.slice(0, 2)}****${phone.slice(-2)}`;
            }

            // Show OTP step
            showAuthStep('otp');

            // Start countdown timer (use expires_in from API or default 30s for resend)
            startAuthOTPTimer();

            // Focus first OTP box
            const firstBox = document.querySelector('.otp-box-auth[data-index="0"]');
            if (firstBox) firstBox.focus();

        } catch (error) {
            console.error('OTP send error:', error);

            // Check for network/CORS errors
            let errorMessage = 'Failed to send OTP. Please try again.';
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                errorMessage = 'Network error. Please check your internet connection.';
                console.error('⚠️ This might be a CORS issue. Check browser console for details.');
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);

            // Reset button
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            sendBtn.disabled = false;
        }
    }

    // ================================
    // OTP HANDLING
    // ================================

    /**
     * Handle OTP input
     */
    function handleAuthOTPInput(input) {
        // Only allow digits
        input.value = input.value.replace(/\D/g, '');

        if (input.value.length === 1) {
            // Move to next box
            const nextIndex = parseInt(input.dataset.index) + 1;
            const nextBox = document.querySelector(`.otp-box-auth[data-index="${nextIndex}"]`);
            if (nextBox) {
                nextBox.focus();
            }
        }

        // Check if all boxes are filled
        const allBoxes = document.querySelectorAll('.otp-box-auth');
        const allFilled = Array.from(allBoxes).every(box => box.value.length === 1);

        const verifyBtn = document.getElementById('btn-auth-verify-otp');
        if (verifyBtn) {
            verifyBtn.disabled = !allFilled;
        }

        // Auto-verify if all filled
        if (allFilled) {
            setTimeout(() => verifyAuthOTP(), 300);
        }
    }

    /**
     * Handle OTP keydown (backspace)
     */
    function handleAuthOTPKeydown(event, input) {
        if (event.key === 'Backspace' && input.value === '') {
            // Move to previous box
            const prevIndex = parseInt(input.dataset.index) - 1;
            if (prevIndex >= 0) {
                const prevBox = document.querySelector(`.otp-box-auth[data-index="${prevIndex}"]`);
                if (prevBox) {
                    prevBox.focus();
                    prevBox.value = '';
                }
            }
        }
    }

    /**
     * Verify OTP (using real API)
     */
    async function verifyAuthOTP() {
        const otpBoxes = document.querySelectorAll('.otp-box-auth');
        const enteredOTP = Array.from(otpBoxes).map(box => box.value).join('');

        if (enteredOTP.length !== 6) {
            alert('Please enter complete OTP');
            return;
        }

        const verifyBtn = document.getElementById('btn-auth-verify-otp');
        const btnText = verifyBtn.querySelector('.btn-text');
        const btnLoading = verifyBtn.querySelector('.btn-loader');

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        verifyBtn.disabled = true;

        try {
            // Call real API to verify OTP
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP}`;
            console.log('📤 Verifying OTP for:', authPhone);
            console.log('🔗 API URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    phone: authPhone,
                    otp: enteredOTP
                })
            });

            const data = await response.json();
            console.log('📥 Verify Response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Invalid OTP');
            }

            // Save JWT token
            if (data.data.token) {
                localStorage.setItem('auth_token', data.data.token);
                console.log('✅ Auth token saved');
            }

            // Save customer_id if available
            if (data.data.customer_id) {
                localStorage.setItem('customer_id', data.data.customer_id);
                console.log('✅ Customer ID saved:', data.data.customer_id);
            }

            // Check next step
            if (data.data.next_step === 'complete_registration') {
                // New user - skip immediate registration, let them book first
                console.log('👤 New user - will complete registration at booking confirmation');

                // Mark as incomplete registration
                localStorage.setItem('registration_incomplete', 'true');
                localStorage.setItem('customer_phone', authPhone);

                // Create minimal customer data with customer_id
                customerData = {
                    id: data.data.customer_id || null,
                    phone: authPhone,
                    registration_incomplete: true
                };
                localStorage.setItem('customer_data', JSON.stringify(customerData));

                isLoggedIn = true;

                // Update UI
                updateAuthUI();

                // Dispatch auth success event for booking flow
                window.dispatchEvent(new CustomEvent('authSuccess', {
                    detail: {
                        user: customerData,
                        registrationIncomplete: true
                    }
                }));

                // Show welcome screen for new users
                showWelcomeNew();

            } else if (data.data.user) {
                // Existing user - login successful
                console.log('✅ Login successful:', data.data.user);

                // Save complete user data
                customerData = {
                    id: data.data.customer_id || data.data.user.id,
                    phone: authPhone,
                    name: data.data.user.name,
                    email: data.data.user.email,
                    ...data.data.user
                };
                localStorage.setItem('customer_data', JSON.stringify(customerData));
                localStorage.setItem('customer_phone', authPhone);

                isLoggedIn = true;
                updateAuthUI();

                // Show welcome back screen
                showWelcomeBack(customerData);
            } else {
                // Fallback - show welcome for new user
                showWelcomeNew();
            }

        } catch (error) {
            console.error('OTP verify error:', error);
            alert(error.message || 'Verification failed. Please try again.');

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            verifyBtn.disabled = false;
        }
    }

    /**
     * Start OTP countdown timer
     */
    function startAuthOTPTimer() {
        authOTPCountdown = 30;
        const timerEl = document.getElementById('auth-otp-timer');
        const resendBtn = document.getElementById('btn-auth-resend');

        if (timerEl) timerEl.style.display = 'inline';
        if (resendBtn) resendBtn.style.display = 'none';

        authOTPTimer = setInterval(() => {
            authOTPCountdown--;
            if (timerEl) {
                timerEl.textContent = `Resend in ${authOTPCountdown}s`;
            }

            if (authOTPCountdown <= 0) {
                clearInterval(authOTPTimer);
                if (timerEl) timerEl.style.display = 'none';
                if (resendBtn) resendBtn.style.display = 'inline';
            }
        }, 1000);
    }

    /**
     * Resend OTP (using real API)
     */
    async function resendAuthOTP() {
        // Clear OTP boxes
        document.querySelectorAll('.otp-box-auth').forEach(box => {
            box.value = '';
        });
        document.getElementById('btn-auth-verify-otp').disabled = true;

        // Hide resend button, show timer
        const resendBtn = document.getElementById('btn-auth-resend');
        if (resendBtn) resendBtn.style.display = 'none';

        try {
            // Call real API to resend OTP
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.RESEND_OTP}`;
            console.log('📤 Resending OTP to:', authPhone);

            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    phone: authPhone,
                    type: 'register'
                })
            });

            const data = await response.json();
            console.log('📥 Resend Response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Failed to resend OTP');
            }

            console.log('✅ OTP resent successfully');

            // Start timer again
            startAuthOTPTimer();

            // Focus first box
            const firstBox = document.querySelector('.otp-box-auth[data-index="0"]');
            if (firstBox) firstBox.focus();

        } catch (error) {
            console.error('OTP resend error:', error);
            alert(error.message || 'Failed to resend OTP. Please try again.');

            // Show resend button again on error
            if (resendBtn) resendBtn.style.display = 'inline';
        }
    }

    /**
     * Change phone number (go back to phone input)
     */
    function changeAuthNumber() {
        showAuthStep('phone');

        // Clear phone input
        const phoneInput = document.getElementById('auth-phone-input');
        if (phoneInput) {
            phoneInput.value = '';
            phoneInput.focus();
        }

        // Clear OTP timer
        if (authOTPTimer) {
            clearInterval(authOTPTimer);
        }
    }

    // ================================
    // CUSTOMER STATUS CHECK
    // ================================

    /**
     * Check if customer exists in database
     */
    async function checkCustomerStatus(phone) {
        try {
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CUSTOMERS.CHECK_PHONE}?phone=${encodeURIComponent(phone)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            const data = await response.json();

            if (data.success && data.data.is_returning) {
                // Returning customer
                customerData = data.data.customer;
                isLoggedIn = true;

                // Save to localStorage
                localStorage.setItem('customer_data', JSON.stringify(customerData));
                localStorage.setItem('customer_phone', phone);

                // Update UI
                updateAuthUI();

                // Show welcome back screen
                showWelcomeBack(customerData);

            } else {
                // New customer - create account
                await createNewCustomer(phone);
            }

        } catch (error) {
            console.error('Customer check error:', error);
            // Fallback: treat as new customer
            await createNewCustomer(phone);
        }
    }

    /**
     * Create new customer account
     */
    async function createNewCustomer(phone) {
        try {
            const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CUSTOMERS.CREATE}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (data.success) {
                customerData = data.data.customer;
                customerData.is_new = true;
                isLoggedIn = true;

                // Save to localStorage
                localStorage.setItem('customer_data', JSON.stringify(customerData));
                localStorage.setItem('customer_phone', phone);

                // Update UI
                updateAuthUI();

                // Show welcome screen
                showWelcomeNew();
            } else {
                throw new Error(data.message || 'Failed to create customer');
            }

        } catch (error) {
            console.error('Create customer error:', error);

            // Fallback: save minimal data locally
            customerData = {
                phone: phone,
                is_new: true,
                offline: true
            };
            isLoggedIn = true;

            localStorage.setItem('customer_phone', phone);
            updateAuthUI();
            showWelcomeNew();
        }
    }

    // ================================
    // WELCOME SCREENS
    // ================================

    /**
     * Show welcome screen for new customer
     */
    function showWelcomeNew() {
        showAuthStep('welcome-new');
    }

    /**
     * Show welcome back screen for returning customer
     */
    function showWelcomeBack(customer) {
        // Update stats
        const totalBookings = document.getElementById('auth-total-bookings');
        if (totalBookings) {
            totalBookings.textContent = customer.total_bookings || 0;
        }

        const lastBooking = document.getElementById('auth-last-booking');
        if (lastBooking && customer.last_booking_at) {
            const lastDate = new Date(customer.last_booking_at);
            const daysAgo = Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24));
            lastBooking.textContent = daysAgo === 0 ? 'Today' : `${daysAgo} days ago`;
        } else if (lastBooking) {
            lastBooking.textContent = '-';
        }

        // Update customer name
        const nameEl = document.getElementById('auth-customer-name');
        if (nameEl && customer.name) {
            nameEl.textContent = `Welcome back, ${customer.name}!`;
        }

        showAuthStep('welcome-back');
    }

    /**
     * Show registration step for new users (after OTP verification)
     */
    function showRegistrationStep(requiredFields) {
        console.log('📝 Showing registration step. Required fields:', requiredFields);

        // Store required fields for later
        window.authRequiredFields = requiredFields;

        // Show the registration step
        showAuthStep('register');

        // Focus name input
        const nameInput = document.getElementById('auth-register-name');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 300);
        }
    }

    /**
     * Complete registration for new user
     */
    async function completeRegistration() {
        const nameInput = document.getElementById('auth-register-name');
        const emailInput = document.getElementById('auth-register-email');
        const name = nameInput?.value?.trim();
        const email = emailInput?.value?.trim();

        if (!name || name.length < 2) {
            alert('Please enter your name (at least 2 characters)');
            nameInput?.focus();
            return;
        }

        // Email is optional, but if provided, validate format
        if (email && !isValidEmail(email)) {
            alert('Please enter a valid email address');
            emailInput?.focus();
            return;
        }

        const submitBtn = document.getElementById('btn-auth-complete-register');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loader');

        // Show loading
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'flex';
        if (submitBtn) submitBtn.disabled = true;

        try {
            console.log('📤 Registering user:', { phone: authPhone, name, email });

            // Call the new apiRegister function
            const result = await apiRegister(authPhone, name, email || '');

            if (!result.success) {
                throw new Error(result.error || 'Registration failed');
            }

            console.log('✅ Registration successful:', result.data);

            // Handle successful registration
            handleLoginSuccess(result.data);

        } catch (error) {
            console.error('Registration error:', error);
            alert(error.message || 'Registration failed. Please try again.');

            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    /**
     * Validate email format
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Handle successful login (both new and returning users)
     */
    function handleLoginSuccess(data) {
        console.log('🎉 Login successful:', data);

        // Save token if present
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        // Save user data
        const user = data.user;
        if (user) {
            customerData = {
                id: user.id,
                name: user.name,
                phone: user.phone,
                profile_image: user.profile_image,
                subscription_status: user.subscription_status,
                last_login: user.last_login,
                status: user.status
            };
            isLoggedIn = true;

            // Save to localStorage
            localStorage.setItem('customer_data', JSON.stringify(customerData));
            localStorage.setItem('customer_phone', user.phone);

            // Update UI
            updateAuthUI();

            // Dispatch custom event for other parts of the app to listen
            window.dispatchEvent(new CustomEvent('authSuccess', {
                detail: { user: customerData }
            }));

            // Show appropriate welcome screen
            if (user.total_bookings && user.total_bookings > 0) {
                showWelcomeBack(customerData);
            } else {
                showWelcomeNew();
            }
        } else {
            // Fallback
            showWelcomeNew();
        }
    }

    // ================================
    // QUICK REBOOK & BOOKING FLOW
    // ================================

    /**
     * Show quick rebook modal
     */
    function showQuickRebook() {
        closeAuthModal();

        // Open booking modal with quick rebook mode
        if (window.LocationBooking && typeof window.LocationBooking.openQuickRebook === 'function') {
            window.LocationBooking.openQuickRebook(customerData);
        } else {
            console.error('LocationBooking.openQuickRebook not found');
            alert('Quick rebook feature is not available. Please book normally.');
        }
    }

    /**
     * Show booking history
     */
    function showBookingHistory() {
        closeAuthModal();
        // TODO: Implement booking history page
        alert('Booking history feature coming soon!');
    }

    /**
     * Check for pending booking after login
     */
    function checkPendingBooking() {
        const pendingService = sessionStorage.getItem('pending_booking_service');
        if (pendingService && isLoggedIn) {
            try {
                const serviceData = JSON.parse(pendingService);
                sessionStorage.removeItem('pending_booking_service');

                // Open booking modal with service
                if (window.LocationBooking && typeof window.LocationBooking.openBookingModal === 'function') {
                    setTimeout(() => {
                        window.LocationBooking.openBookingModal(serviceData);
                    }, 500);
                }
            } catch (e) {
                console.error('Error loading pending booking:', e);
            }
        }
    }

    // ================================
    // USER MENU & LOGOUT
    // ================================

    /**
     * Show user menu (when clicking on name)
     */
    function showUserMenu() {
        // TODO: Implement dropdown menu with options
        const options = confirm('Logged in as ' + (customerData.name || authPhone) + '\n\nDo you want to logout?');
        if (options) {
            logout();
        }
    }

    /**
     * Logout user
     */
    function logout() {
        isLoggedIn = false;
        customerData = null;
        authPhone = null;

        localStorage.removeItem('customer_data');
        localStorage.removeItem('customer_phone');
        localStorage.removeItem('auth_token');

        updateAuthUI();

        console.log('✅ Logged out successfully');
        alert('You have been logged out successfully');
    }


    /**
     * Start booking flow after authentication
     */
    function startBookingAfterAuth() {
        console.log('📍 Redirecting to booking page after authentication...');

        // Close the auth modal
        closeAuthModal();

        // Check if there's a stored redirect destination
        const redirectPath = localStorage.getItem('auth_redirect_after_login');

        if (redirectPath) {
            console.log('📍 Found stored redirect destination:', redirectPath);
            localStorage.removeItem('auth_redirect_after_login');

            // Handle relative path from root
            if (redirectPath.includes('book-service-v2.html')) {
                window.location.href = 'pages/book-service-v2.html';
            } else {
                window.location.href = redirectPath;
            }
        } else {
            // Default: redirect to booking page
            window.location.href = 'pages/book-service-v2.html';
        }
    }

    /**
     * Require authentication before accessing booking page
     * Called by "Book Now" buttons throughout the site
     */
    function requireAuthForBooking(event) {
        if (event) {
            event.preventDefault();
        }

        console.log('🔐 Checking authentication for booking...');

        if (isLoggedIn && customerData) {
            // User is logged in, navigate to booking page
            console.log('✅ User authenticated, navigating to booking page');
            window.location.href = 'pages/book-service-v2.html';
        } else {
            // User not logged in, open auth modal
            console.log('🔒 User not authenticated, opening auth modal');

            // Store booking page as redirect destination
            localStorage.setItem('auth_redirect_after_login', '/carwash1/pages/book-service-v2.html');

            // Open auth modal
            openAuthModal();
        }
    }

    /**
     * Check if auth modal should auto-open (from auth-guard redirect)
     */
    function checkAutoOpenModal() {
        const shouldOpenModal = localStorage.getItem('open_auth_modal_on_load');

        if (shouldOpenModal === 'true') {
            console.log('🔓 Auto-opening auth modal from redirect...');
            localStorage.removeItem('open_auth_modal_on_load');

            // Delay to ensure DOM is ready
            setTimeout(() => {
                openAuthModal();
            }, 500);
        }
    }

    // ================================
    // UTILITY FUNCTIONS
    // ================================

    /**
     * Format phone number for display
     */
    function formatPhoneDisplay(phone) {
        if (!phone) return '';
        // +919876543210 -> +91 98765 43210
        return phone.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');
    }

    /**
     * Get customer data
     */
    function getCustomerData() {
        return customerData;
    }

    /**
     * Check if user is logged in
     */
    function checkLoginStatus() {
        return isLoggedIn;
    }

    // ================================
    // PUBLIC API
    // ================================

    return {
        init,
        openAuthModal,
        closeAuthModal,
        onAuthPhoneInput,
        sendAuthOTP,
        handleAuthOTPInput,
        handleAuthOTPKeydown,
        verifyAuthOTP,
        resendAuthOTP,
        changeAuthNumber,
        completeRegistration,
        showQuickRebook,
        showBookingHistory,
        startBookingAfterAuth,
        requireAuthForBooking,
        logout,
        getCustomerData,
        checkLoginStatus
    };
})();

// Initialize on DOM ready with retry logic
function initializeWithRetry() {
    const maxAttempts = 20;
    let attempts = 0;

    const tryInit = () => {
        attempts++;
        const loginBtn = document.getElementById('login-btn');
        const modal = document.getElementById('phone-auth-modal');

        // Check if critical elements exist
        if (loginBtn || modal || attempts >= maxAttempts) {
            console.log(`🔄 AuthSystem initializing (attempt ${attempts}/${maxAttempts})`);
            AuthSystem.init();
        } else {
            // Retry after 100ms
            setTimeout(tryInit, 100);
        }
    };

    tryInit();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWithRetry);
} else {
    initializeWithRetry();
}

// Export for global access
window.AuthSystem = AuthSystem;

// Global initialization function for component-loader callback
window.initializeAuthSystem = function () {
    console.log('🔄 Re-initializing AuthSystem after component load...');
    // Re-attach event listeners after components are loaded
    if (window.AuthSystem && typeof window.AuthSystem.init === 'function') {
        window.AuthSystem.init();
    }
};

