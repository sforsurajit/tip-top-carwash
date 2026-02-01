async function apiLogin(email, password) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userSession', JSON.stringify(data));
            return { success: true, data };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Register a new user with phone, name, and email
 * @param {string} phone - 10-digit phone number
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function apiRegister(phone, name, email) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({ phone, name, email })
        });

        const data = await response.json();

        if (data.success && data.data) {
            // Store JWT token
            if (data.data.token) {
                localStorage.setItem('auth_token', data.data.token);
                console.log('✅ Auth token saved');
            }

            // Store user data
            if (data.data.user) {
                localStorage.setItem('customer_data', JSON.stringify(data.data.user));
                localStorage.setItem('customer_phone', data.data.user.phone);
                console.log('✅ User data saved:', data.data.user);
            }

            return { success: true, data: data.data };
        } else {
            return { success: false, error: data.message || 'Registration failed' };
        }
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message || 'Network error occurred' };
    }
}


async function apiLogout() {
    try {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        localStorage.removeItem('userSession');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}