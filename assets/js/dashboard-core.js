/**
 * Premium Customer Dashboard - Core JavaScript
 * Handles state management, API integration, and UI rendering
 * 
 * @package TipTop Car Wash
 * @version 1.0
 */

const DashboardCore = (function () {
    'use strict';

    // ================================
    // STATE MANAGEMENT
    // ================================

    let state = {
        user: null,
        bookings: [],
        vehicles: [],
        locations: [],
        stats: {
            totalSpend: 0,
            totalBookings: 0,
            avgCost: 0
        },
        loading: {
            bookings: false,
            vehicles: false,
            locations: false
        },
        currentSection: 'overview',
        cancelBookingId: null
    };

    // ================================
    // INITIALIZATION
    // ================================

    /**
     * Initialize dashboard
     */
    function init() {
        console.log('🎯 Initializing Premium Dashboard...');

        // Check authentication
        if (!checkAuthentication()) {
            return;
        }

        // Load user data
        loadUserData();

        // Set up greeting
        updateGreeting();

        // Fetch dashboard data
        fetchAllData();

        // Attach event listeners
        attachEventListeners();

        console.log('✅ Dashboard initialized');
    }

    /**
     * Check if user is authenticated
     */
    function checkAuthentication() {
        const customerData = localStorage.getItem('customer_data');
        const authToken = localStorage.getItem('auth_token');

        if (!customerData || !authToken) {
            console.warn('⚠️ User not authenticated, redirecting...');
            // Redirect to home and open auth modal
            window.location.href = '../index.html?auth=required';
            return false;
        }

        try {
            state.user = JSON.parse(customerData);
            console.log('✅ User authenticated:', state.user);
            return true;
        } catch (e) {
            console.error('❌ Invalid customer data');
            localStorage.removeItem('customer_data');
            window.location.href = '../index.html?auth=required';
            return false;
        }
    }

    /**
     * Load user data from localStorage
     */
    function loadUserData() {
        const customerData = localStorage.getItem('customer_data');
        if (customerData) {
            try {
                state.user = JSON.parse(customerData);
            } catch (e) {
                console.error('Error parsing customer data:', e);
            }
        }
    }

    /**
     * Fetch all dashboard data
     */
    async function fetchAllData() {
        if (!state.user || !state.user.id) {
            console.error('❌ No user ID available');
            return;
        }

        // Fetch in parallel
        await Promise.all([
            fetchBookings(state.user.id),
            fetchVehicles(state.user.id),
            fetchLocations(state.user.id)
        ]);
    }

    // ================================
    // API INTEGRATION
    // ================================

    /**
     * Get authentication headers
     */
    function getAuthHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Fetch customer bookings
     */
    async function fetchBookings(customerId) {
        state.loading.bookings = true;

        try {
            // Use main_erp API base URL to match booking flow
            const url = `https://tip-topcarwash.in/main_erp/api_v1/bookings/customer-bookings`;
            console.log('📤 Fetching bookings for customer:', customerId);

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ customer_id: customerId })
            });

            const data = await response.json();
            console.log('📥 Bookings response:', data);

            if (data.success && data.data && data.data.bookings) {
                state.bookings = data.data.bookings;

                // Sort by date (newest first)
                state.bookings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

                // Calculate stats
                calculateStats();

                // Render UI
                renderBookingHistory();
                renderRecentBookings();
                renderQuickActions();
                renderStats();
            } else {
                console.warn('⚠️ No bookings found');
                state.bookings = [];
                renderBookingHistory();
                renderRecentBookings();
                renderStats();
            }
        } catch (error) {
            console.error('❌ Error fetching bookings:', error);
            showError('Failed to load bookings. Please try again.');
        } finally {
            state.loading.bookings = false;
        }
    }

    /**
     * Cancel a booking
     */
    async function cancelBooking(bookingId) {
        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/bookings/${bookingId}/status`;
            console.log('📤 Cancelling booking:', bookingId);

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: 'cancelled' })
            });

            const data = await response.json();
            console.log('📥 Cancel response:', data);

            if (data.success) {
                // Update local state
                const booking = state.bookings.find(b => b.id === bookingId);
                if (booking) {
                    booking.status = 'cancelled';
                }

                // Re-render
                renderBookingHistory();
                renderRecentBookings();
                renderQuickActions();
                calculateStats();
                renderStats();

                // Close modal
                closeCancelModal();

                // Show success message
                showSuccess('Booking cancelled successfully');
            } else {
                throw new Error(data.message || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('❌ Error cancelling booking:', error);
            showError(error.message || 'Failed to cancel booking. Please try again.');
        }
    }

    /**
     * Fetch customer vehicles
     */
    async function fetchVehicles(customerId) {
        state.loading.vehicles = true;

        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/vehicles/${customerId}`;
            console.log('📤 Fetching vehicles for customer:', customerId);

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            console.log('📥 Vehicles response:', data);

            if (data.success && data.data) {
                // Handle both array and object with vehicles property
                state.vehicles = Array.isArray(data.data) ? data.data : (data.data.vehicles || []);
                renderVehicles();
            } else {
                console.warn('⚠️ No vehicles found');
                state.vehicles = [];
                renderVehicles();
            }
        } catch (error) {
            console.error('❌ Error fetching vehicles:', error);
            showError('Failed to load vehicles. Please try again.');
        } finally {
            state.loading.vehicles = false;
        }
    }

    /**
     * Fetch customer locations
     */
    async function fetchLocations(customerId) {
        state.loading.locations = true;

        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/customer-locations/${customerId}`;
            console.log('📤 Fetching locations for customer:', customerId);

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            console.log('📥 Locations response:', data);

            if (data.success && data.data) {
                // Handle both array and object with locations property
                state.locations = Array.isArray(data.data) ? data.data : (data.data.locations || []);
                renderLocations();
            } else {
                console.warn('⚠️ No locations found');
                state.locations = [];
                renderLocations();
            }
        } catch (error) {
            console.error('❌ Error fetching locations:', error);
            // Don't show error for locations as it's not critical
            state.locations = [];
            renderLocations();
        } finally {
            state.loading.locations = false;
        }
    }

    /**
     * Add new location
     */
    async function addLocation(locationData) {
        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/customer-locations/`;
            console.log('📤 Adding location:', locationData);

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(locationData)
            });

            const data = await response.json();
            console.log('📥 Add location response:', data);

            if (data.success) {
                // Refresh locations
                await fetchLocations(state.user.id);

                // Close modal
                closeAddLocationModal();

                // Show success message
                showSuccess('Location added successfully');
            } else {
                throw new Error(data.message || 'Failed to add location');
            }
        } catch (error) {
            console.error('❌ Error adding location:', error);
            showError(error.message || 'Failed to add location. Please try again.');
        }
    }

    // ================================
    // UI RENDERING
    // ================================

    /**
     * Update greeting based on time of day
     */
    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';

        if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
        } else if (hour >= 17) {
            greeting = 'Good Evening';
        }

        const greetingTimeEl = document.getElementById('greeting-time');
        const greetingNameEl = document.getElementById('greeting-name');

        if (greetingTimeEl) {
            greetingTimeEl.textContent = greeting;
        }

        if (greetingNameEl && state.user) {
            const displayName = state.user.name || formatPhoneDisplay(state.user.phone);
            greetingNameEl.textContent = displayName;
        }
    }

    /**
     * Render quick actions (Quick Rebook & Live Status)
     */
    function renderQuickActions() {
        // Find last completed booking for Quick Rebook
        const lastBooking = state.bookings.find(b => b.status === 'completed');

        // Find active booking for Live Status
        const activeBooking = state.bookings.find(b =>
            b.status === 'allocated' || b.status === 'in_progress'
        );

        // Render Quick Rebook
        const quickRebookContainer = document.getElementById('quick-rebook-container');
        if (quickRebookContainer) {
            if (lastBooking) {
                quickRebookContainer.innerHTML = renderQuickRebookCard(lastBooking);
                quickRebookContainer.classList.remove('hidden');
            } else {
                quickRebookContainer.classList.add('hidden');
            }
        }

        // Render Live Status
        const liveStatusContainer = document.getElementById('live-status-container');
        if (liveStatusContainer) {
            if (activeBooking) {
                liveStatusContainer.innerHTML = renderLiveStatusCard(activeBooking);
                liveStatusContainer.classList.remove('hidden');
            } else {
                liveStatusContainer.classList.add('hidden');
            }
        }
    }

    /**
     * Render Quick Rebook card
     */
    function renderQuickRebookCard(booking) {
        return `
            <div class="last-booking-card">
                <div class="card-header">
                    <div class="card-label">Last Booking</div>
                    <div class="card-title">${escapeHtml(booking.service_name || 'Car Wash')}</div>
                </div>
                <div class="card-meta">
                    <div class="meta-item">
                        <div class="meta-icon">🚗</div>
                        <span>${escapeHtml(booking.vehicle_name || 'Vehicle')}</span>
                    </div>
                    <div class="meta-item">
                        <div class="meta-icon">📅</div>
                        <span>${formatDate(booking.start_time)}</span>
                    </div>
                </div>
                <button class="book-again-btn" onclick="DashboardCore.handleRebook(${booking.id})">
                    ↻ Book Again
                </button>
            </div>
        `;
    }

    /**
     * Render Live Status card
     */
    function renderLiveStatusCard(booking) {
        const washerName = booking.washer_name || 'Washer';
        const washerInitial = washerName.charAt(0).toUpperCase();
        const progress = booking.status === 'in_progress' ? 60 : 30;

        return `
            <div class="dashboard-card live-status-card fade-in" style="margin-top: 1.5rem;">
                <div class="live-status-badge">
                    <span class="live-status-pulse"></span>
                    ${booking.status === 'in_progress' ? 'In Progress' : 'Allocated'}
                </div>
                <h3 class="live-status-service">${escapeHtml(booking.service_name || 'Car Wash')}</h3>
                ${booking.washer_name ? `
                    <div class="live-status-washer">
                        <div class="live-status-washer-avatar">${washerInitial}</div>
                        <div class="live-status-washer-info">
                            <h4>${escapeHtml(booking.washer_name)}</h4>
                            <p>Washer ID: ${booking.washer_id || 'N/A'}</p>
                        </div>
                    </div>
                ` : ''}
                <div class="live-status-progress">
                    <div class="live-status-progress-bar">
                        <div class="live-status-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span>${progress}%</span>
                </div>
            </div>
        `;
    }

    /**
     * Calculate statistics
     */
    function calculateStats() {
        const completedBookings = state.bookings.filter(b => b.status === 'completed');

        state.stats.totalBookings = state.bookings.length;
        state.stats.totalSpend = completedBookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
        state.stats.avgCost = completedBookings.length > 0
            ? state.stats.totalSpend / completedBookings.length
            : 0;
    }

    /**
     * Render statistics
     */
    function renderStats() {
        const container = document.getElementById('stats-container');
        if (!container) return;

        container.innerHTML = `
            <div class="financial-card">
                <div class="financial-icon">💵</div>
                <div class="financial-value">${formatCurrency(state.stats.totalSpend)}</div>
                <div class="financial-label">Total Spend</div>
            </div>
            
            <div class="financial-card">
                <div class="financial-icon">📅</div>
                <div class="financial-value">${state.stats.totalBookings}</div>
                <div class="financial-label">Total Bookings</div>
            </div>
            
            <div class="financial-card">
                <div class="financial-icon">📊</div>
                <div class="financial-value">${formatCurrency(state.stats.avgCost)}</div>
                <div class="financial-label">Average Cost</div>
            </div>
        `;
    }

    /**
     * Render recent bookings (for overview)
     */
    function renderRecentBookings() {
        const container = document.getElementById('recent-bookings-container');
        if (!container) return;

        const recentBookings = state.bookings.slice(0, 3);

        if (recentBookings.length === 0) {
            container.innerHTML = renderEmptyState(
                'No bookings yet',
                'Start by booking your first car wash service',
                '../pages/book-service-v2.html',
                'Book Now'
            );
            return;
        }

        container.innerHTML = recentBookings.map(booking => renderBookingCard(booking)).join('');
    }

    /**
     * Render all bookings
     */
    function renderBookingHistory() {
        const container = document.getElementById('all-bookings-container');
        if (!container) return;

        if (state.bookings.length === 0) {
            container.innerHTML = renderEmptyState(
                'No bookings yet',
                'Start by booking your first car wash service',
                '../pages/book-service-v2.html',
                'Book Now'
            );
            return;
        }

        container.innerHTML = state.bookings.map(booking => renderBookingCard(booking)).join('');
    }

    /**
     * Render a single booking card
     */
    function renderBookingCard(booking) {
        const statusClass = booking.status === 'completed' ? '' :
            booking.status === 'pending' ? 'pending' :
                booking.status === 'cancelled' ? 'cancelled' : '';
        const canCancel = booking.status === 'pending' || booking.status === 'allocated';

        return `
            <div class="booking-item">
                <div class="booking-left">
                    <div class="booking-icon">🧼</div>
                    <div class="booking-details">
                        <div class="booking-name">${escapeHtml(booking.service_name || 'Car Wash')}</div>
                        <div class="booking-info">
                            <div class="booking-info-item">🚗 ${escapeHtml(booking.vehicle_name || 'Vehicle')} • ${escapeHtml(booking.vehicle_type || 'Car')}</div>
                            <div class="booking-info-item">⏰ ${booking.start_time_formatted || formatDate(booking.start_time)}</div>
                            <div class="booking-info-item">📍 ${escapeHtml(booking.location_address || 'Location')}</div>
                            <div class="booking-info-item">💰 ${formatCurrency(booking.total_amount)}</div>
                        </div>
                    </div>
                </div>
                <div class="booking-right">
                    <span class="status-badge ${statusClass}">✓ ${formatStatus(booking.status).toUpperCase()}</span>
                    <button class="rebook-btn" onclick="DashboardCore.handleRebook(${booking.id})">↻ Rebook</button>
                </div>
            </div>
        `;
    }

    /**
     * Render vehicles
     */
    function renderVehicles() {
        const container = document.getElementById('vehicles-container');
        if (!container) return;

        if (state.vehicles.length === 0) {
            container.innerHTML = renderEmptyState(
                'No vehicles added',
                'Add your vehicle to start booking services',
                '../pages/book-service-v2.html',
                'Add Vehicle'
            );
            return;
        }

        container.innerHTML = state.vehicles.map(vehicle => renderVehicleCard(vehicle)).join('');
    }

    /**
     * Render a single vehicle card
     */
    function renderVehicleCard(vehicle) {
        const vehicleType = vehicle.vehicle_type || vehicle.type || 'Car';
        const vehicleName = vehicle.vehicle_name || vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

        // Get emoji based on vehicle type
        const vehicleEmoji = vehicleType.toLowerCase().includes('bike') ? '🏍️' :
            vehicleType.toLowerCase().includes('suv') ? '🚙' :
                vehicleType.toLowerCase().includes('sedan') ? '🚗' : '🚗';

        return `
            <div class="vehicle-card">
                <div class="vehicle-card-icon">
                    <div class="vehicle-icon-wrapper">
                        ${vehicleEmoji}
                    </div>
                </div>
                <div class="vehicle-card-content">
                    <h3 class="vehicle-card-name">${escapeHtml(vehicleName)}</h3>
                    <span class="vehicle-card-type">${escapeHtml(vehicleType)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render locations
     */
    function renderLocations() {
        const container = document.getElementById('locations-container');
        if (!container) return;

        if (state.locations.length === 0) {
            container.innerHTML = renderEmptyState(
                'No saved locations',
                'Add your frequently used locations for faster booking',
                null,
                'Add Location',
                'DashboardCore.openAddLocationModal()'
            );
            return;
        }

        container.innerHTML = state.locations.map(location => renderLocationCard(location)).join('');
    }

    /**
     * Render a single location card
     */
    function renderLocationCard(location) {
        const isDefault = location.is_default || false;
        const locationName = location.name || location.label || 'Location';
        const address = location.address || 'No address provided';

        return `
            <div class="location-card">
                <div class="location-card-icon">
                    <div class="location-icon-wrapper">
                        📍
                    </div>
                </div>
                <div class="location-card-content">
                    <div class="location-card-header">
                        <h3 class="location-card-name">${escapeHtml(locationName)}</h3>
                        ${isDefault ? '<span class="location-default-badge">⭐ Default</span>' : ''}
                    </div>
                    <p class="location-card-address">${escapeHtml(address)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    function renderEmptyState(title, text, href = null, buttonText = 'Get Started', onclick = null) {
        const buttonHtml = onclick
            ? `<button class="empty-state-button" onclick="${onclick}">${buttonText}</button>`
            : `<a href="${href}" class="empty-state-button">${buttonText}</a>`;

        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-text">${text}</p>
                ${buttonHtml}
            </div>
        `;
    }

    // ================================
    // EVENT HANDLERS
    // ================================

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Navigation items (sidebar)
        document.querySelectorAll('.dashboard-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                switchSection(section);
            });
        });

        // Navigation items (bottom nav)
        document.querySelectorAll('.dashboard-bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                switchSection(section);
            });
        });

        // Add location button
        const addLocationBtn = document.getElementById('btn-add-location');
        if (addLocationBtn) {
            addLocationBtn.addEventListener('click', openAddLocationModal);
        }

        // Add location form
        const addLocationForm = document.getElementById('add-location-form');
        if (addLocationForm) {
            addLocationForm.addEventListener('submit', handleAddLocationSubmit);
        }
    }

    /**
     * Switch dashboard section
     */
    function switchSection(section) {
        state.currentSection = section;

        // Update nav items
        document.querySelectorAll('.dashboard-nav-item, .dashboard-bottom-nav-item').forEach(item => {
            if (item.dataset.section === section) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update sections
        document.querySelectorAll('.dashboard-section').forEach(sec => {
            if (sec.id === `section-${section}`) {
                sec.classList.remove('hidden');
                sec.classList.add('fade-in');
            } else {
                sec.classList.add('hidden');
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Handle rebook
     */
    function handleRebook(bookingId) {
        const booking = state.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        // Redirect to booking page with pre-filled data
        const params = new URLSearchParams();

        if (booking.vehicle_id) params.append('vehicle_id', booking.vehicle_id);
        if (booking.service_id) params.append('service_id', booking.service_id);
        if (booking.location_id) params.append('location_id', booking.location_id);

        window.location.href = `book-service-v2.html?${params.toString()}`;
    }

    /**
     * Open cancel booking modal
     */
    function openCancelModal(bookingId) {
        state.cancelBookingId = bookingId;
        const modal = document.getElementById('cancel-booking-modal');
        if (modal) {
            modal.classList.add('active');

            // Attach confirm handler
            const confirmBtn = document.getElementById('confirm-cancel-btn');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    if (state.cancelBookingId) {
                        cancelBooking(state.cancelBookingId);
                    }
                };
            }
        }
    }

    /**
     * Close cancel booking modal
     */
    function closeCancelModal() {
        const modal = document.getElementById('cancel-booking-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        state.cancelBookingId = null;
    }

    /**
     * Open add location modal
     */
    function openAddLocationModal() {
        const modal = document.getElementById('add-location-modal');
        if (modal) {
            modal.classList.add('active');

            // Clear form
            const form = document.getElementById('add-location-form');
            if (form) form.reset();
        }
    }

    /**
     * Close add location modal
     */
    function closeAddLocationModal() {
        const modal = document.getElementById('add-location-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Handle add location form submit
     */
    function handleAddLocationSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('location-name').value.trim();
        const address = document.getElementById('location-address').value.trim();
        const isDefault = document.getElementById('location-default').checked;

        if (!name || !address) {
            showError('Please fill in all required fields');
            return;
        }

        // For now, we'll add without coordinates
        // In a real implementation, you'd use geocoding or location detection
        const locationData = {
            customer_id: state.user.id,
            name: name,
            address: address,
            is_default: isDefault,
            latitude: 0, // Would be populated by geocoding
            longitude: 0, // Would be populated by geocoding
            zone_id: 1 // Would be determined by location
        };

        addLocation(locationData);
    }

    // ================================
    // HELPER FUNCTIONS
    // ================================

    /**
     * Format currency
     */
    function formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return date.toLocaleDateString('en-IN', options);
    }

    /**
     * Format phone display
     */
    function formatPhoneDisplay(phone) {
        if (!phone) return 'Guest';
        return `+91 ${phone}`;
    }

    /**
     * Format status
     */
    function formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'allocated': 'Allocated',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    /**
     * Get status badge class
     */
    function getStatusBadgeClass(status) {
        const statusMap = {
            'pending': 'badge-pending',
            'allocated': 'badge-allocated',
            'in_progress': 'badge-in_progress',
            'completed': 'badge-completed',
            'cancelled': 'badge-cancelled'
        };
        return statusMap[status] || 'badge-pending';
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert(message);
    }

    /**
     * Show error message
     */
    function showError(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert(message);
    }

    // ================================
    // PUBLIC API
    // ================================

    return {
        init,
        handleRebook,
        openCancelModal,
        closeCancelModal,
        openAddLocationModal,
        closeAddLocationModal
    };
})();

// Initialize dashboard on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    DashboardCore.init();
});
