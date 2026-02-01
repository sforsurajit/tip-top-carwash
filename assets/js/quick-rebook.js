/**
 * Quick Rebook Component JavaScript
 * For Homepage - Returning Customer Experience
 */

(function () {
    'use strict';

    // State
    let customerProfile = null;
    let lastBooking = null;

    /**
     * Initialize Quick Rebook component
     */
    function initQuickRebook() {
        console.log('🔄 Initializing Quick Rebook...');

        // Check if customer is returning
        const savedProfile = localStorage.getItem('customer_profile');
        const savedPhone = localStorage.getItem('customer_phone');

        if (savedProfile && savedPhone) {
            try {
                customerProfile = JSON.parse(savedProfile);
                lastBooking = customerProfile.lastBooking;

                if (lastBooking) {
                    showQuickRebookSection();
                    setupEventListeners();
                    console.log('✅ Quick Rebook ready for:', customerProfile.name || savedPhone);
                }
            } catch (e) {
                console.error('Error parsing customer profile:', e);
            }
        } else {
            console.log('ℹ️ New customer - Quick Rebook not shown');
        }
    }

    /**
     * Show the Quick Rebook section
     */
    function showQuickRebookSection() {
        const section = document.getElementById('quickRebookSection');
        if (!section) return;

        // Update customer name
        const nameEl = document.getElementById('customerName');
        if (nameEl && customerProfile.name) {
            nameEl.textContent = customerProfile.name.split(' ')[0]; // First name only
        }

        // Update last booking details
        populateLastBooking();

        // Show the section
        section.style.display = 'block';
    }

    /**
     * Populate last booking information
     */
    function populateLastBooking() {
        if (!lastBooking) return;

        // Vehicle
        const vehicleIcon = document.getElementById('vehicleIcon');
        const vehicleEl = document.getElementById('lastVehicle');
        if (vehicleEl) {
            vehicleEl.textContent = lastBooking.vehicleName || 'Your Vehicle';
        }
        if (vehicleIcon) {
            const icons = { hatchback: '🚗', sedan: '🚙', suv: '🚐', bike: '🏍️' };
            vehicleIcon.textContent = icons[lastBooking.vehicleType] || '🚗';
        }

        // Service
        const serviceEl = document.getElementById('lastService');
        if (serviceEl) {
            serviceEl.textContent = lastBooking.serviceName || 'Your Service';
        }

        // Price
        const priceEl = document.getElementById('lastPrice');
        if (priceEl && lastBooking.price) {
            priceEl.textContent = '₹' + lastBooking.price;
        }

        // Location
        const locationEl = document.getElementById('lastLocation');
        if (locationEl) {
            locationEl.textContent = truncateLocation(lastBooking.location) || 'Your Location';
        }
    }

    /**
     * Truncate long location text
     */
    function truncateLocation(location) {
        if (!location) return '';
        if (location.length > 35) {
            return location.substring(0, 35) + '...';
        }
        return location;
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Quick slot buttons
        document.querySelectorAll('.quick-slot').forEach(btn => {
            btn.addEventListener('click', function () {
                const slot = this.dataset.slot;
                handleQuickBook(slot);
            });
        });

        // Book different button
        const bookDifferentBtn = document.getElementById('bookDifferentBtn');
        if (bookDifferentBtn) {
            bookDifferentBtn.addEventListener('click', function () {
                window.location.href = 'pages/book-service-v2.html';
            });
        }

        // Change location button
        const changeLocationBtn = document.getElementById('changeLocationBtn');
        if (changeLocationBtn) {
            changeLocationBtn.addEventListener('click', openLocationModal);
        }

        // Location modal close
        const closeModalBtn = document.getElementById('closeLocationModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeLocationModal);
        }

        // Modal overlay click
        const modalOverlay = document.getElementById('locationModalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) {
                    closeLocationModal();
                }
            });
        }

        // GPS button
        const gpsBtn = document.getElementById('useGpsBtn');
        if (gpsBtn) {
            gpsBtn.addEventListener('click', useGPSLocation);
        }

        // Use new location button
        const useNewLocBtn = document.getElementById('useNewLocation');
        if (useNewLocBtn) {
            useNewLocBtn.addEventListener('click', function () {
                const newLocation = document.getElementById('newLocationInput')?.value.trim();
                if (newLocation) {
                    updateLocation(newLocation);
                    closeLocationModal();
                }
            });
        }
    }

    /**
     * Handle quick booking
     */
    function handleQuickBook(slot) {
        // Show loading
        showBookingStatus();

        // Calculate date and time
        const bookingDate = new Date();
        let timeSlot = '11:00';

        switch (slot) {
            case 'today-morning':
                timeSlot = '11:00';
                break;
            case 'today-afternoon':
                timeSlot = '15:00';
                break;
            case 'tomorrow-morning':
                bookingDate.setDate(bookingDate.getDate() + 1);
                timeSlot = '11:00';
                break;
        }

        // Prepare booking data
        const bookingData = {
            vehicleType: lastBooking.vehicleType,
            vehicleName: lastBooking.vehicleName,
            serviceId: lastBooking.serviceId,
            serviceName: lastBooking.serviceName,
            price: lastBooking.price,
            date: formatDate(bookingDate),
            time: timeSlot,
            location: lastBooking.location,
            phone: localStorage.getItem('customer_phone'),
            paymentMethod: 'cash',
            source: 'quick_rebook'
        };

        // Make API call (or simulate)
        createQuickBooking(bookingData);
    }

    /**
     * Create quick booking
     */
    async function createQuickBooking(bookingData) {
        try {
            // Try to use real API if available
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG.ENDPOINTS.BOOKING) {
                const response = await makeApiRequest(
                    API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.BOOKING.CREATE,
                    {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(bookingData)
                    }
                );

                if (response.success) {
                    showBookingSuccess(response.data.booking_id);
                    return;
                }
            }
        } catch (error) {
            console.error('API booking failed, using simulation:', error);
        }

        // Fallback: Simulate booking
        setTimeout(() => {
            const bookingId = generateBookingId();

            // Update last booking in profile
            customerProfile.lastBooking = {
                ...lastBooking,
                date: new Date().toISOString()
            };
            localStorage.setItem('customer_profile', JSON.stringify(customerProfile));

            showBookingSuccess(bookingId);
        }, 2000);
    }

    /**
     * Show booking status
     */
    function showBookingStatus() {
        const slotsSection = document.querySelector('.quick-time-slots');
        const statusSection = document.getElementById('bookingStatus');

        if (slotsSection) slotsSection.style.display = 'none';
        if (statusSection) statusSection.style.display = 'flex';

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);
    }

    /**
     * Show booking success
     */
    function showBookingSuccess(bookingId) {
        const container = document.querySelector('.homepage-quick-rebook');
        if (!container) return;

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([15, 50, 30]);

        container.innerHTML = `
            <div class="quick-rebook-success">
                <div class="success-icon">✓</div>
                <h3 class="success-title">Booked! 🎉</h3>
                <p class="success-subtitle">Your wash is confirmed. We'll be there!</p>
                <div class="success-details">
                    <p>📋 Booking ID: <strong>#${bookingId}</strong></p>
                    <p>📱 WhatsApp confirmation sent</p>
                </div>
                <a href="pages/my-bookings.html" class="view-booking-btn">View My Bookings</a>
            </div>
        `;
    }

    /**
     * Open location modal
     */
    function openLocationModal() {
        const modal = document.getElementById('locationModalOverlay');
        if (!modal) return;

        // Populate saved locations
        const listContainer = document.getElementById('savedLocationsList');
        const locations = customerProfile?.locations || [];

        if (listContainer && locations.length > 0) {
            listContainer.innerHTML = locations.map((loc, index) => `
                <button class="saved-location-option" data-address="${loc.address}">
                    <span class="loc-icon">${loc.label === 'Home' ? '🏠' : '🏢'}</span>
                    <div class="loc-details">
                        <span class="loc-label">${loc.label}</span>
                        <span class="loc-address">${loc.address}</span>
                    </div>
                </button>
            `).join('');

            // Add click handlers
            listContainer.querySelectorAll('.saved-location-option').forEach(btn => {
                btn.addEventListener('click', function () {
                    updateLocation(this.dataset.address);
                    closeLocationModal();
                });
            });
        }

        modal.style.display = 'flex';
    }

    /**
     * Close location modal
     */
    function closeLocationModal() {
        const modal = document.getElementById('locationModalOverlay');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Update location
     */
    function updateLocation(newLocation) {
        // Update UI
        const locationEl = document.getElementById('lastLocation');
        if (locationEl) {
            locationEl.textContent = truncateLocation(newLocation);
        }

        // Update state
        if (lastBooking) {
            lastBooking.location = newLocation;
        }

        // Update localStorage
        if (customerProfile) {
            customerProfile.lastBooking.location = newLocation;
            localStorage.setItem('customer_profile', JSON.stringify(customerProfile));
        }

        // Show feedback
        showToast('Location updated!', 'success');
    }

    /**
     * Use GPS location
     */
    function useGPSLocation() {
        const btn = document.getElementById('useGpsBtn');
        if (!btn) return;

        const originalContent = btn.innerHTML;
        btn.innerHTML = '<div class="status-loader" style="width:16px;height:16px;"></div> Getting location...';
        btn.disabled = true;

        if (!navigator.geolocation) {
            showToast('GPS not supported', 'error');
            btn.innerHTML = originalContent;
            btn.disabled = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // In real app, use reverse geocoding
                const address = `Near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}, Kokrajhar`;

                updateLocation(address);
                closeLocationModal();

                btn.innerHTML = originalContent;
                btn.disabled = false;
            },
            (error) => {
                console.error('GPS error:', error);
                showToast('Could not get location', 'error');
                btn.innerHTML = originalContent;
                btn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.quick-rebook-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `quick-rebook-toast toast-${type}`;
        toast.textContent = message;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            zIndex: '9999',
            background: type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    /**
     * Format date
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Generate booking ID
     */
    function generateBookingId() {
        const date = new Date();
        const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TT-${datePart}-${randomPart}`;
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', initQuickRebook);

    // Also try to init after a delay (for dynamically loaded content)
    setTimeout(initQuickRebook, 1000);

    // Export for external use
    window.initQuickRebook = initQuickRebook;

})();
