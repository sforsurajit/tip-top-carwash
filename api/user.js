async function fetchUserProfile() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER.PROFILE}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data: data.user };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUserProfile(userData) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER.UPDATE}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data: data.user };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchUserCars() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER.CARS}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data: data.cars };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}