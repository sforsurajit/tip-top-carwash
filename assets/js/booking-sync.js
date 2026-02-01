/**
 * Booking Sync Service
 * Handles syncing offline bookings with server
 */

const BookingSync = (function () {
    const SYNC_INTERVALS = [60000, 300000, 900000, 1800000]; // 1min, 5min, 15min, 30min
    let syncInProgress = false;

    /**
     * Sync all pending bookings
     */
    async function syncPendingBookings() {
        if (syncInProgress) {
            console.log('⏳ Sync already in progress');
            return;
        }

        if (!NetworkMonitor.isOnline()) {
            console.log('📴 Cannot sync: offline');
            return;
        }

        syncInProgress = true;
        console.log('🔄 Starting booking sync...');

        try {
            const pendingBookings = await OfflineDB.getPendingBookings();

            if (pendingBookings.length === 0) {
                console.log('✅ No pending bookings to sync');
                syncInProgress = false;
                return;
            }

            console.log(`📤 Syncing ${pendingBookings.length} pending bookings`);

            for (const booking of pendingBookings) {
                await syncSingleBooking(booking);
            }

        } catch (error) {
            console.error('❌ Sync error:', error);
        } finally {
            syncInProgress = false;
        }
    }

    /**
     * Sync a single booking
     */
    async function syncSingleBooking(booking) {
        try {
            // Update status to syncing
            await OfflineDB.updateBookingStatus(booking.id, 'syncing');

            // Prepare booking data for API
            const apiData = prepareBookingForAPI(booking.bookingData);

            // Send to server
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKING.CREATE}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(apiData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                await OfflineDB.markAsSynced(booking.id, result.booking?.id || result.bookingId);
                console.log(`✅ Booking ${booking.localId} synced successfully`);

                // Show success notification if available
                if (typeof showNotification === 'function') {
                    showNotification('Booking confirmed!', 'success');
                }
            } else {
                throw new Error(result.message || 'Sync failed');
            }

        } catch (error) {
            console.error(`❌ Failed to sync booking ${booking.localId}:`, error);

            // Retry with exponential backoff
            const retryIndex = Math.min(booking.syncAttempts, SYNC_INTERVALS.length - 1);
            const retryDelay = SYNC_INTERVALS[retryIndex];

            if (booking.syncAttempts < 10) {
                await OfflineDB.updateBookingStatus(booking.id, 'pending');
                console.log(`⏰ Will retry in ${retryDelay / 1000}s`);

                setTimeout(() => {
                    if (NetworkMonitor.isOnline()) {
                        syncSingleBooking(booking);
                    }
                }, retryDelay);
            } else {
                await OfflineDB.markAsFailed(booking.id);
                console.log(`❌ Booking ${booking.localId} marked as failed after 10 attempts`);
            }
        }
    }

    /**
     * Prepare booking data for API
     */
    function prepareBookingForAPI(bookingData) {
        return {
            service_id: bookingData.service?.id || bookingData.serviceId,
            service_name: bookingData.service?.name || bookingData.serviceName,
            vehicle_type: bookingData.vehicleType,
            price: bookingData.price,
            location: {
                coordinates: {
                    lat: bookingData.location.lat,
                    lng: bookingData.location.lng
                },
                landmark: bookingData.location.landmark,
                landmark_type: bookingData.location.landmarkType,
                notes: bookingData.location.notes || '',
                pincode: bookingData.location.pincode || ''
            },
            customer: {
                name: bookingData.customer?.name || '',
                phone: bookingData.customer?.phone || '',
                language: bookingData.customer?.language || 'Hindi'
            },
            offline_booking: true,
            local_id: bookingData.localId,
            created_at: new Date(bookingData.timestamp || Date.now()).toISOString()
        };
    }

    /**
     * Initialize sync service
     */
    function init() {
        // Listen for network changes
        NetworkMonitor.addListener((status) => {
            if (status === 'online') {
                // Delay sync slightly to ensure stable connection
                setTimeout(syncPendingBookings, 2000);
            }
        });

        // Initial sync check
        if (NetworkMonitor.isOnline()) {
            setTimeout(syncPendingBookings, 3000);
        }

        // Periodic sync check every 5 minutes
        setInterval(() => {
            if (NetworkMonitor.isOnline()) {
                syncPendingBookings();
            }
        }, 300000);

        console.log('🔄 Booking sync service initialized');
    }

    return {
        init,
        syncPendingBookings,
        syncSingleBooking
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BookingSync.init());
} else {
    setTimeout(() => BookingSync.init(), 1000);
}

// Export for global access
window.BookingSync = BookingSync;
