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

    const state = {
        user: null,
        bookings: [],
        locations: [],
        vehicles: [],
        zones: [],
        brands: [],
        models: [],
        selectedBrand: null,
        selectedModel: null,
        selectedVehicleType: null,
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
        cancelBookingId: null,
        zones: [],
        selectedZone: null
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
            fetchLocations(state.user.id),
            fetchZones()
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
                // API returns a single location object, convert to array
                if (Array.isArray(data.data)) {
                    state.locations = data.data;
                } else if (typeof data.data === 'object') {
                    // Single location object, wrap in array
                    state.locations = [data.data];
                } else {
                    state.locations = [];
                }
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

    /**
     * Fetch available service zones
     */
    async function fetchZones() {
        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/zones_routes/`;
            console.log('📤 Fetching zones...');

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            console.log('📥 Zones response:', data);

            if (data.success && data.data && data.data.zones) {
                state.zones = data.data.zones.filter(zone => zone.status === 'active');
                console.log(`✅ Loaded ${state.zones.length} active zones`);
            } else {
                console.warn('⚠️ No zones found');
                state.zones = [];
            }
        } catch (error) {
            console.error('❌ Error fetching zones:', error);
            state.zones = [];
        }
    }

    /**
     * Check if location coordinates are within a specific zone
     */
    async function checkLocationInZone(zoneId, latitude, longitude) {
        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/zones_routes/${zoneId}/check-location`;
            console.log(`📤 Checking location in zone ${zoneId}:`, { latitude, longitude });

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ latitude, longitude })
            });

            const data = await response.json();
            console.log('📥 Zone check response:', data);

            return data;
        } catch (error) {
            console.error('❌ Error checking zone:', error);
            return { success: false, message: 'Failed to check zone' };
        }
    }

    /**
     * Auto-detect which zone the coordinates belong to
     */
    async function autoDetectZone(latitude, longitude) {
        if (state.zones.length === 0) {
            console.warn('⚠️ No zones available for detection');
            return null;
        }

        console.log('🔍 Auto-detecting zone for coordinates:', { latitude, longitude });

        // Check each zone
        for (const zone of state.zones) {
            const result = await checkLocationInZone(zone.id, latitude, longitude);

            if (result.success && result.data && result.data.is_in_zone) {
                console.log(`✅ Location found in zone: ${zone.zone_name}`);
                return {
                    zone_id: zone.id,
                    zone_name: zone.zone_name,
                    is_in_zone: true
                };
            }
        }

        console.log('⚠️ Location not found in any serviceable zone');
        return {
            zone_id: null,
            zone_name: null,
            is_in_zone: false
        };
    }

    /**
     * Populate zone dropdown
     */
    function populateZoneDropdown() {
        const zoneSelect = document.getElementById('location-zone');
        if (!zoneSelect) return;

        // Clear existing options except the first one
        zoneSelect.innerHTML = '<option value="">Select Zone</option>';

        // Add zones
        state.zones.forEach(zone => {
            const option = document.createElement('option');
            option.value = zone.id;
            option.textContent = zone.zone_name;
            zoneSelect.appendChild(option);
        });
    }

    /**
     * Display zone validation message
     */
    function displayZoneValidation(message, type = 'info') {
        const messageDiv = document.getElementById('zone-validation-message');
        if (!messageDiv) return;

        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };

        const colors = {
            success: '#16a34a',
            warning: '#d97706',
            error: '#dc2626',
            info: '#0ea5e9'
        };

        messageDiv.innerHTML = `
            <div style="padding: 0.75rem; background: ${colors[type]}15; border: 1px solid ${colors[type]}40; border-radius: 8px; color: ${colors[type]}; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
    }

    /**
     * Clear zone validation message
     */
    function clearZoneValidation() {
        const messageDiv = document.getElementById('zone-validation-message');
        if (messageDiv) {
            messageDiv.innerHTML = '';
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
        const isDefault = location.flag === 1 || location.is_default || false;
        const fullAddress = location.address || 'No address provided';

        // Split address into name and location (if it contains " - ")
        let locationName = fullAddress;
        let locationAddress = '';

        if (fullAddress.includes(' - ')) {
            const parts = fullAddress.split(' - ');
            locationName = parts[0];
            locationAddress = parts.slice(1).join(' - ');
        }

        // Get zone name if available
        const zone = state.zones.find(z => z.id === location.zone_id);
        const zoneName = zone ? zone.name : '';

        return `
            <div class="location-card">
                <div class="location-card-icon">
                    <div class="location-icon-wrapper">
                        📍
                    </div>
                </div>
                <div class="location-card-content">
                    <div class="location-card-header">
                        ${isDefault ? '<span class="location-default-badge">⭐ Default</span>' : ''}
                    </div>
                    <h4 style="margin: 0.5rem 0; color: var(--text-primary); font-size: 1rem; font-weight: 600;">${escapeHtml(locationName)}</h4>
                    ${locationAddress ? `<p style="margin: 0.25rem 0; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.4;">${escapeHtml(locationAddress)}</p>` : ''}
                    ${zoneName ? `<p class="location-card-address" style="margin: 0.25rem 0; color: var(--text-secondary); font-size: 0.875rem;">📌 ${escapeHtml(zoneName)}</p>` : ''}
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

        // Edit profile button
        const editProfileBtn = document.getElementById('btn-edit-profile');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', openEditProfileModal);
        }

        // Logout button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Edit profile form
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', handleEditProfileSubmit);
        }

        // GPS detection button
        const detectLocationBtn = document.getElementById('btn-detect-location');
        if (detectLocationBtn) {
            detectLocationBtn.addEventListener('click', detectGPSLocation);
        }

        // Add vehicle button
        const addVehicleBtn = document.getElementById('btn-add-vehicle');
        if (addVehicleBtn) {
            addVehicleBtn.addEventListener('click', openAddVehicleModal);
        }

        // Setup vehicle search handlers
        setupVehicleSearchHandlers();
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

            // Show choice container, hide forms
            showLocationChoice();

            // Populate zone dropdown for manual form
            populateZoneDropdown();

            // Clear validation messages
            clearZoneValidation();

            // Setup choice handlers
            setupLocationChoiceHandlers();
        }
    }

    /**
     * Close add location modal
     */
    function closeAddLocationModal() {
        const modal = document.getElementById('add-location-modal');
        if (modal) {
            modal.classList.remove('active');
            // Reset to choice view
            showLocationChoice();
        }
    }

    /**
     * Show location choice container
     */
    function showLocationChoice() {
        const choiceContainer = document.getElementById('location-choice-container');
        const autoForm = document.getElementById('add-location-form-auto');
        const manualForm = document.getElementById('add-location-form-manual');

        if (choiceContainer) choiceContainer.style.display = 'block';
        if (autoForm) autoForm.style.display = 'none';
        if (manualForm) manualForm.style.display = 'none';
    }

    /**
     * Reset to location choice
     */
    function resetLocationChoice() {
        showLocationChoice();

        // Reset auto-detect form
        const autoDetectStatus = document.getElementById('auto-detect-status');
        const autoDetectSuccess = document.getElementById('auto-detect-success');
        const autoDetectError = document.getElementById('auto-detect-error');

        if (autoDetectStatus) autoDetectStatus.style.display = 'block';
        if (autoDetectSuccess) autoDetectSuccess.style.display = 'none';
        if (autoDetectError) autoDetectError.style.display = 'none';

        // Clear forms
        const autoForm = document.getElementById('add-location-form-auto');
        const manualForm = document.getElementById('add-location-form-manual');
        if (autoForm) autoForm.reset();
        if (manualForm) manualForm.reset();

        clearZoneValidation();
    }

    /**
     * Switch to manual entry
     */
    function switchToManualEntry() {
        const choiceContainer = document.getElementById('location-choice-container');
        const autoForm = document.getElementById('add-location-form-auto');
        const manualForm = document.getElementById('add-location-form-manual');

        if (choiceContainer) choiceContainer.style.display = 'none';
        if (autoForm) autoForm.style.display = 'none';
        if (manualForm) manualForm.style.display = 'block';
    }

    /**
     * Setup location choice handlers
     */
    function setupLocationChoiceHandlers() {
        const autoDetectBtn = document.getElementById('dashboard-choose-auto-detect');
        const manualEntryBtn = document.getElementById('dashboard-choose-manual-entry');

        if (autoDetectBtn) {
            autoDetectBtn.onclick = () => {
                startAutoDetect();
            };
        }

        if (manualEntryBtn) {
            manualEntryBtn.onclick = () => {
                switchToManualEntry();
            };
        }

        // Setup form submissions
        const autoForm = document.getElementById('add-location-form-auto');
        const manualForm = document.getElementById('add-location-form-manual');

        if (autoForm) {
            autoForm.onsubmit = handleAutoDetectSubmit;
        }

        if (manualForm) {
            manualForm.onsubmit = handleAddLocationSubmit;
        }
    }

    /**
     * Start auto-detect location flow
     */
    async function startAutoDetect() {
        const choiceContainer = document.getElementById('location-choice-container');
        const autoForm = document.getElementById('add-location-form-auto');
        const autoDetectStatus = document.getElementById('auto-detect-status');
        const autoDetectSuccess = document.getElementById('auto-detect-success');
        const autoDetectError = document.getElementById('auto-detect-error');

        // Hide choice, show auto form with loading
        if (choiceContainer) choiceContainer.style.display = 'none';
        if (autoForm) autoForm.style.display = 'block';
        if (autoDetectStatus) autoDetectStatus.style.display = 'block';
        if (autoDetectSuccess) autoDetectSuccess.style.display = 'none';
        if (autoDetectError) autoDetectError.style.display = 'none';

        // Check geolocation support
        if (!navigator.geolocation) {
            showAutoDetectError();
            return;
        }

        // Get current position
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude.toFixed(8);
                const lng = position.coords.longitude.toFixed(8);

                // Auto-detect zone
                const zoneResult = await autoDetectZone(parseFloat(lat), parseFloat(lng));

                if (zoneResult && zoneResult.is_in_zone) {
                    // Fetch actual address using reverse geocoding
                    let fetchedAddress = `Detected in ${zoneResult.zone_name} zone`;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const data = await response.json();
                        if (data && data.display_name) {
                            fetchedAddress = data.display_name;
                        }
                    } catch (error) {
                        console.error('Reverse geocoding failed:', error);
                        // Fallback to zone name if geocoding fails
                    }

                    // Success - show form with detected data
                    const latInput = document.getElementById('location-latitude-auto');
                    const lngInput = document.getElementById('location-longitude-auto');
                    const zoneInput = document.getElementById('location-zone-auto');
                    const zoneIdInput = document.getElementById('location-zone-id-auto');
                    const addressInput = document.getElementById('location-address-auto');

                    if (latInput) latInput.value = lat;
                    if (lngInput) lngInput.value = lng;
                    if (zoneInput) zoneInput.value = zoneResult.zone_name;
                    if (zoneIdInput) zoneIdInput.value = zoneResult.zone_id;
                    // Show fetched address
                    if (addressInput) addressInput.value = fetchedAddress;

                    // Show success form
                    if (autoDetectStatus) autoDetectStatus.style.display = 'none';
                    if (autoDetectSuccess) autoDetectSuccess.style.display = 'block';
                } else {
                    // Error - not in service area
                    showAutoDetectError();
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                showAutoDetectError();
            }
        );
    }

    /**
     * Show auto-detect error
     */
    function showAutoDetectError() {
        const autoDetectStatus = document.getElementById('auto-detect-status');
        const autoDetectSuccess = document.getElementById('auto-detect-success');
        const autoDetectError = document.getElementById('auto-detect-error');

        if (autoDetectStatus) autoDetectStatus.style.display = 'none';
        if (autoDetectSuccess) autoDetectSuccess.style.display = 'none';
        if (autoDetectError) autoDetectError.style.display = 'block';
    }

    /**
     * Handle auto-detect form submit
     */
    async function handleAutoDetectSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('location-name-auto').value.trim();
        const fetchedAddress = document.getElementById('location-address-auto').value.trim();
        const latitude = document.getElementById('location-latitude-auto').value.trim();
        const longitude = document.getElementById('location-longitude-auto').value.trim();
        const zoneId = document.getElementById('location-zone-id-auto').value;
        const isDefault = document.getElementById('location-default-auto').checked;

        if (!name) {
            showError('Please enter a location name');
            return;
        }

        // Combine location name and fetched address
        const fullAddress = `${name} - ${fetchedAddress}`;

        const locationData = {
            customer_id: state.user.id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: fullAddress,
            flag: isDefault ? 1 : 0,
            zone_id: parseInt(zoneId)
        };

        addLocation(locationData);
    }

    /**
     * Handle add location form submit
     */
    async function handleAddLocationSubmit(e) {
        e.preventDefault();

        // Collect structured address fields
        const locationName = document.getElementById('location-name')?.value.trim();
        const zoneId = document.getElementById('location-zone')?.value;
        const houseNumber = document.getElementById('location-house-number')?.value.trim();
        const streetName = document.getElementById('location-street')?.value.trim();
        const landmark = document.getElementById('location-landmark')?.value.trim();
        const areaLocality = document.getElementById('location-area')?.value.trim();
        const isDefault = document.getElementById('location-default')?.checked;

        // Validate required fields
        if (!locationName) {
            showError('Please enter a location name');
            return;
        }

        if (!zoneId) {
            showError('Please select a service zone');
            return;
        }

        if (!houseNumber || !streetName || !areaLocality) {
            showError('Please fill in all required address fields');
            return;
        }

        // Combine all address fields into a single address string
        const addressParts = [houseNumber, streetName];
        if (landmark) {
            addressParts.push(landmark);
        }
        addressParts.push(areaLocality);

        const fullAddress = addressParts.join(', ');

        // Get zone details to extract coordinates from zone center
        const selectedZone = state.zones.find(z => z.id == zoneId);
        if (!selectedZone || !selectedZone.coordinates || selectedZone.coordinates.length === 0) {
            showError('Invalid zone selected');
            return;
        }

        // Calculate zone center coordinates
        let totalLat = 0;
        let totalLng = 0;
        selectedZone.coordinates.forEach(coord => {
            totalLat += coord.lat;
            totalLng += coord.lng;
        });
        const lat = totalLat / selectedZone.coordinates.length;
        const lng = totalLng / selectedZone.coordinates.length;

        const locationData = {
            customer_id: state.user.id,
            latitude: null,
            longitude: null,
            address: fullAddress,
            flag: isDefault ? 1 : 0,
            zone_id: parseInt(zoneId)
        };

        addLocation(locationData);
    }

    /**
     * Detect current GPS location
     */
    async function detectGPSLocation() {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser');
            return;
        }

        const latInput = document.getElementById('location-latitude');
        const lngInput = document.getElementById('location-longitude');
        const zoneSelect = document.getElementById('location-zone');
        const detectBtn = document.getElementById('btn-detect-location');

        // Show loading state
        if (detectBtn) {
            detectBtn.textContent = '🔄 Detecting...';
            detectBtn.disabled = true;
        }

        clearZoneValidation();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude.toFixed(8);
                const lng = position.coords.longitude.toFixed(8);

                if (latInput) latInput.value = lat;
                if (lngInput) lngInput.value = lng;

                // Auto-detect zone
                displayZoneValidation('Checking service zone...', 'info');
                const zoneResult = await autoDetectZone(parseFloat(lat), parseFloat(lng));

                if (zoneResult && zoneResult.is_in_zone) {
                    // Auto-select zone in dropdown
                    if (zoneSelect) {
                        zoneSelect.value = zoneResult.zone_id;
                    }
                    displayZoneValidation(`Location is in ${zoneResult.zone_name} service area`, 'success');
                } else {
                    displayZoneValidation('Location not in any serviceable area. Please select a zone manually or choose a different location.', 'warning');
                }

                // Reset button
                if (detectBtn) {
                    detectBtn.textContent = '✅ Location Detected';
                    setTimeout(() => {
                        detectBtn.textContent = '📍 Detect Location';
                        detectBtn.disabled = false;
                    }, 2000);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Failed to detect location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }

                showError(errorMessage);

                // Reset button
                if (detectBtn) {
                    detectBtn.textContent = '📍 Detect Location';
                    detectBtn.disabled = false;
                }
            }
        );
    }

    /**
     * Open edit profile modal
     */
    function openEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal && state.user) {
            modal.classList.add('active');

            // Populate form with current data
            const nameInput = document.getElementById('profile-name');
            const emailInput = document.getElementById('profile-email');
            const phoneInput = document.getElementById('profile-phone');

            if (nameInput) nameInput.value = state.user.name || '';
            if (emailInput) emailInput.value = state.user.email || '';
            if (phoneInput) phoneInput.value = state.user.phone || '';
        }
    }

    /**
     * Close edit profile modal
     */
    function closeEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Handle edit profile form submit
     */
    function handleEditProfileSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('profile-name').value.trim();
        const email = document.getElementById('profile-email').value.trim();

        if (!name) {
            showError('Please enter your name');
            return;
        }

        // Email validation (optional field)
        if (email && !isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        const profileData = {
            id: state.user.id,
            name: name,
            email: email || null
        };

        updateProfile(profileData);
    }

    /**
     * Update customer profile
     */
    async function updateProfile(profileData) {
        try {
            const url = `https://tip-topcarwash.in/main_erp/api_v1/customers/${profileData.id}`;
            console.log('📤 Updating profile:', profileData);

            const response = await fetch(url, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(profileData)
            });

            const data = await response.json();
            console.log('📥 Update profile response:', data);

            if (data.success) {
                // Update local state and localStorage
                state.user.name = profileData.name;
                state.user.email = profileData.email;
                localStorage.setItem('customer_data', JSON.stringify(state.user));

                // Update UI
                updateProfileDisplay();

                // Close modal
                closeEditProfileModal();

                // Show success message
                showSuccess('Profile updated successfully');
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            showError(error.message || 'Failed to update profile. Please try again.');
        }
    }

    /**
     * Update profile display across dashboard
     */
    function updateProfileDisplay() {
        if (!state.user) return;

        // Update greeting
        updateGreeting();

        // Update header user name
        const headerUserName = document.getElementById('header-user-name');
        if (headerUserName && state.user.name) {
            headerUserName.textContent = state.user.name.split(' ')[0];
        }

        // Update avatar letter
        const avatarLetter = document.getElementById('user-avatar-letter');
        if (avatarLetter && state.user.name) {
            avatarLetter.textContent = state.user.name.charAt(0).toUpperCase();
        }

        // Update dropdown header
        const dropdownUserName = document.getElementById('dropdown-user-name');
        if (dropdownUserName && state.user.name) {
            dropdownUserName.textContent = state.user.name;
        }

        const dropdownUserPhone = document.getElementById('dropdown-user-phone');
        if (dropdownUserPhone && state.user.phone) {
            dropdownUserPhone.textContent = formatPhoneDisplay(state.user.phone);
        }
    }

    /**
     * Handle logout
     */
    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            console.log('🚪 Logging out...');

            // Clear localStorage
            localStorage.removeItem('customer_data');
            localStorage.removeItem('auth_token');

            // Redirect to homepage
            window.location.href = '../index.html';
        }
    }

    /**
     * Validate email format
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
    // UTILITY FUNCTIONS
    // ================================

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ================================
    // VEHICLE MANAGEMENT
    // ================================

    /**
     * Open add vehicle modal
     */
    function openAddVehicleModal() {
        const modal = document.getElementById('add-vehicle-modal');
        if (!modal) return;

        // Reset state
        state.selectedBrand = null;
        state.selectedModel = null;
        state.selectedVehicleType = null;

        // Show brand selection view
        showBrandSelection();

        // Fetch and display brands
        fetchBrands();

        // Show modal
        modal.style.display = 'flex';
    }

    /**
     * Close add vehicle modal
     */
    function closeAddVehicleModal() {
        const modal = document.getElementById('add-vehicle-modal');
        if (!modal) return;

        modal.style.display = 'none';

        // Reset state
        state.selectedBrand = null;
        state.selectedModel = null;
        state.selectedVehicleType = null;
    }

    /**
     * Show brand selection view
     */
    function showBrandSelection() {
        document.getElementById('brand-selection-view').style.display = 'block';
        document.getElementById('model-selection-view').style.display = 'none';
        document.getElementById('vehicle-type-view').style.display = 'none';
    }

    /**
     * Show model selection view
     */
    function showModelSelection() {
        document.getElementById('brand-selection-view').style.display = 'none';
        document.getElementById('model-selection-view').style.display = 'block';
        document.getElementById('vehicle-type-view').style.display = 'none';
    }

    /**
     * Show vehicle type selection view
     */
    function showVehicleTypeView() {
        document.getElementById('brand-selection-view').style.display = 'none';
        document.getElementById('model-selection-view').style.display = 'none';
        document.getElementById('vehicle-type-view').style.display = 'block';
    }

    /**
     * Fetch brands from API
     */
    async function fetchBrands() {
        try {
            const response = await fetch('https://tip-topcarwash.in/main_erp/api_v1/brands', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch brands');

            const result = await response.json();
            console.log('✅ Brands API response:', result);

            // Brands are in result.data.brands, not result.data
            state.brands = result.data?.brands || [];
            console.log('✅ Brands stored in state:', state.brands);

            renderBrands(state.brands);
        } catch (error) {
            console.error('❌ Error fetching brands:', error);
            document.getElementById('brand-grid').innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary); grid-column: 1 / -1;">
                    Failed to load brands. Please try again.
                </div>
            `;
        }
    }

    async function fetchModels(brandId) {
        try {
            // Correct endpoint: /brands/Allcars/{brand_id}
            let response = await fetch(`https://tip-topcarwash.in/main_erp/api_v1/brands/Allcars/${brandId}`);


            if (!response.ok) throw new Error('Failed to fetch models');

            const result = await response.json();
            console.log('✅ Models API response:', result);

            // Models are in result.data.cars (API returns {cars: Array, total: number, brand_id: string})
            state.models = result.data?.cars || result.data?.models || result.data || [];
            console.log('✅ Models stored in state:', state.models);

            renderModels(state.models);
        } catch (error) {
            console.error('❌ Error fetching models:', error);
            document.getElementById('model-grid').innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary); grid-column: 1 / -1;">
                    Failed to load models. Please try again.
                </div>
            `;
        }
    }

    /**
     * Render brands
     */
    function renderBrands(brands, searchTerm = '') {
        const brandGrid = document.getElementById('brand-grid');
        console.log('🎨 renderBrands called with:', brands);
        console.log('🎨 brandGrid element:', brandGrid);

        if (!brandGrid) {
            console.error('❌ brand-grid element not found!');
            return;
        }

        const filtered = brands.filter(brand =>
            brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        console.log('🎨 Filtered brands:', filtered);

        if (filtered.length === 0) {
            brandGrid.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary); grid-column: 1 / -1;">
                    No brands found
                </div>
            `;
            return;
        }

        const html = filtered.map(brand => `
            <div class="brand-card" onclick="DashboardCore.handleBrandSelect(${brand.id}, '${escapeHtml(brand.brand_name)}')">
                <div class="brand-card-logo">🚗</div>
                <div class="brand-card-name">${escapeHtml(brand.brand_name)}</div>
            </div>
        `).join('');

        console.log('🎨 Generated HTML length:', html.length);
        brandGrid.innerHTML = html;
        console.log('✅ Brands rendered successfully');
    }

    function renderModels(models, searchTerm = '') {
        const modelGrid = document.getElementById('model-grid');
        console.log('🎨 renderModels called with:', models);

        if (!modelGrid) {
            console.error('❌ model-grid element not found!');
            return;
        }

        const filtered = models.filter(model => {
            // API returns car_name field
            const name = model.car_name || model.model_name || model.name || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });

        console.log('🎨 Filtered models:', filtered);

        if (filtered.length === 0) {
            modelGrid.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary); grid-column: 1 / -1;">
                    No models found
                </div>
            `;
            return;
        }

        const html = filtered.map(model => {
            // API returns car_name field
            const modelName = model.car_name || model.model_name || model.name || 'Unknown';
            return `
                <div class="model-card" onclick="DashboardCore.handleModelSelect(${model.id}, '${escapeHtml(modelName)}')">
                    <div class="model-card-name">${escapeHtml(modelName)}</div>
                </div>
            `;
        }).join('');

        console.log('🎨 Generated models HTML length:', html.length);
        modelGrid.innerHTML = html;
        console.log('✅ Models rendered successfully');
    }

    /**
     * Handle brand selection
     */
    function handleBrandSelect(brandId, brandName) {
        state.selectedBrand = { id: brandId, name: brandName };

        // Update selected brand display
        const selectedBrandName = document.getElementById('selected-brand-name');
        if (selectedBrandName) {
            selectedBrandName.textContent = brandName;
        }

        // Fetch models for this brand
        fetchModels(brandId);

        // Show model selection view
        showModelSelection();
    }

    /**
     * Handle model selection
     */
    function handleModelSelect(modelId, modelName) {
        // Find the full model object to get car_type
        const selectedModelObj = state.models.find(m => m.id === modelId);

        if (!selectedModelObj) {
            showError('Model not found');
            return;
        }

        state.selectedModel = {
            id: modelId,
            name: modelName,
            car_type: selectedModelObj.car_type
        };

        // Map car_type to category_id
        const categoryMap = {
            'Hatchback': 1,
            'Sedan': 2,
            'SUV': 3,
            'Bike': 4
        };

        const categoryId = categoryMap[selectedModelObj.car_type];

        if (!categoryId) {
            showError('Invalid vehicle type. Please contact support.');
            return;
        }

        // Auto-submit with the detected category
        const vehicleData = {
            customer_id: state.user.id,
            brand_id: state.selectedBrand.id,
            model_id: state.selectedModel.id,
            category_id: categoryId
        };

        console.log('🚗 Auto-submitting vehicle with type:', selectedModelObj.car_type);
        addVehicle(vehicleData);
    }

    /**
     * Add vehicle via API
     */
    async function addVehicle(vehicleData) {
        try {
            showLoading('Adding vehicle...');

            const response = await fetch(`https://tip-topcarwash.in/main_erp/api_v1/bookings/customer-vehicles/${state.user.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(vehicleData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to add vehicle');
            }

            showSuccess('Vehicle added successfully!');
            closeAddVehicleModal();

            // Refresh vehicles list
            await fetchVehicles();

        } catch (error) {
            console.error('Error adding vehicle:', error);
            showError(error.message || 'Failed to add vehicle');
        } finally {
            hideLoading();
        }
    }

    /**
     * Setup vehicle search handlers
     */
    function setupVehicleSearchHandlers() {
        const brandSearch = document.getElementById('brand-search');
        const modelSearch = document.getElementById('model-search');

        if (brandSearch) {
            brandSearch.addEventListener('input', (e) => {
                renderBrands(state.brands, e.target.value);
            });
        }

        if (modelSearch) {
            modelSearch.addEventListener('input', (e) => {
                renderModels(state.models, e.target.value);
            });
        }
    }

    // ================================
    // PUBLIC API
    // ================================

    return {
        init,
        handleRebook,
        openEditProfileModal,
        closeEditProfileModal,
        openAddLocationModal,
        closeAddLocationModal,
        resetLocationChoice,
        switchToManualEntry,
        openAddVehicleModal,
        closeAddVehicleModal,
        showBrandSelection,
        showModelSelection,
        handleBrandSelect,
        handleModelSelect,
        handleLogout
    };
})();

// Initialize dashboard on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    DashboardCore.init();
});
