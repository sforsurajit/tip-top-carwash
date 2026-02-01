async function createBookingAPI(bookingData) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKING.CREATE}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data: data.booking };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchUserBookings() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKING.LIST}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data: data.bookings };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function cancelBookingAPI(bookingId) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKING.CANCEL.replace(':id', bookingId)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}