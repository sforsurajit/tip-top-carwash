/**
 * Authentication Module
 * Handles user authentication securely
 */

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    const modalContent = `
        <div class="modal-content">
            <span class="close-modal" onclick="closeAuthModal()">&times;</span>
            <h2 id="auth-modal-title">Login / Register</h2>
            
            <div class="auth-tabs">
                <button class="auth-tab active" data-tab="login">Login</button>
                <button class="auth-tab" data-tab="register">Register</button>
            </div>
            
            <div id="login-form" class="auth-form-container">
                <form id="loginForm" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="login-email" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" required autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn-primary btn-block">Login</button>
                </form>
            </div>
            
            <div id="register-form" class="auth-form-container" style="display: none;">
                <form id="registerForm" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="register-name" required autocomplete="name">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="register-email" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="register-phone" required autocomplete="tel">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="register-password" required autocomplete="new-password">
                        <div class="password-strength" id="password-strength"></div>
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="register-password-confirm" required autocomplete="new-password">
                    </div>
                    <button type="submit" class="btn-primary btn-block">Register</button>
                </form>
            </div>
        </div>
    `;

    modal.innerHTML = modalContent;
    modal.classList.add('active');

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabName = this.getAttribute('data-tab');
            document.getElementById('login-form').style.display = tabName === 'login' ? 'block' : 'none';
            document.getElementById('register-form').style.display = tabName === 'register' ? 'block' : 'none';
        });
    });

    // Password strength indicator
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function updatePasswordStrength(password) {
    const strengthDiv = document.getElementById('password-strength');
    if (!strengthDiv) return;

    const strength = Validator.getPasswordStrength(password);
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];

    strengthDiv.innerHTML = `
        <div class="strength-bar">
            <div class="strength-fill" style="width: ${(strength / 5) * 100}%; background-color: ${colors[strength - 1] || '#e5e7eb'}"></div>
        </div>
        <div class="strength-label">${labels[strength - 1] || ''}</div>
    `;
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Validate inputs
    if (!Validator.isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }

    // Sanitize inputs
    const sanitizedEmail = Security.sanitizeHtml(email);

    try {
        // Check rate limit
        await authRateLimiter.throttle('login', async () => {
            showLoader();

            const response = await secureFetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email: sanitizedEmail,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                // Set authentication indicator (not the token itself)
                sessionStorage.setItem('authenticated', 'true');
                sessionStorage.setItem('userId', data.user.id);
                
                showNotification('Login successful!', 'success');
                closeAuthModal();
                
                // Reload or redirect
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showNotification(data.message || 'Login failed', 'error');
            }

            hideLoader();
        });
    } catch (error) {
        hideLoader();
        handleApiError(error, 'Login');
    }

    // Clear password from memory
    document.getElementById('login-password').value = '';
}

async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    // Validate all fields
    const validation = Validator.validateForm(
        { name, email, phone, password },
        {
            name: { required: true, type: 'name' },
            email: { required: true, type: 'email' },
            phone: { required: true, type: 'phone' },
            password: { required: true, type: 'password' }
        }
    );

    if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        showNotification(firstError, 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    // Sanitize inputs
    const sanitizedName = Security.sanitizeHtml(name);
    const sanitizedEmail = Security.sanitizeHtml(email);
    const sanitizedPhone = Security.sanitizeHtml(phone);

    try {
        await authRateLimiter.throttle('register', async () => {
            showLoader();

            const response = await secureFetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        name: sanitizedName,
                        email: sanitizedEmail,
                        phone: sanitizedPhone,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem('authenticated', 'true');
                sessionStorage.setItem('userId', data.user.id);
                
                showNotification('Registration successful!', 'success');
                closeAuthModal();
                
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showNotification(data.message || 'Registration failed', 'error');
            }

            hideLoader();
        });
    } catch (error) {
        hideLoader();
        handleApiError(error, 'Register');
    }

    // Clear passwords from memory
    document.getElementById('register-password').value = '';
    document.getElementById('register-password-confirm').value = '';
}

async function logout() {
    try {
        showLoader();

        await secureFetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`,
            {
                method: 'POST'
            }
        );

        // Clear session
        sessionStorage.clear();
        
        showNotification('Logged out successfully', 'success');
        setTimeout(() => window.location.href = '/', 1000);

        hideLoader();
    } catch (error) {
        hideLoader();
        handleApiError(error, 'Logout');
    }
}