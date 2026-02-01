/**
 * IndexedDB Offline Persistence Layer
 * Handles offline booking storage and sync
 */

const OfflineDB = (function () {
    const DB_NAME = 'CarWashBookings';
    const DB_VERSION = 1;
    const STORE_NAME = 'bookings';

    let db = null;

    /**
     * Initialize IndexedDB
     */
    async function init() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('❌ IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('✅ IndexedDB initialized');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('localId', 'localId', { unique: true });

                    console.log('📦 IndexedDB store created');
                }
            };
        });
    }

    /**
     * Generate unique local booking ID
     */
    function generateLocalId() {
        return 'CW-LOCAL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Save booking to IndexedDB
     */
    async function saveBooking(bookingData) {
        await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const booking = {
                localId: generateLocalId(),
                status: 'pending', // pending, syncing, synced, failed
                timestamp: Date.now(),
                syncAttempts: 0,
                lastSyncAttempt: null,
                bookingData: bookingData
            };

            const request = store.add(booking);

            request.onsuccess = () => {
                console.log('💾 Booking saved offline:', booking.localId);
                resolve({
                    success: true,
                    localId: booking.localId,
                    id: request.result
                });
            };

            request.onerror = () => {
                console.error('❌ Failed to save booking:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all pending bookings
     */
    async function getPendingBookings() {
        await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Update booking status
     */
    async function updateBookingStatus(id, status, serverBookingId = null) {
        await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const booking = getRequest.result;
                if (booking) {
                    booking.status = status;
                    booking.lastSyncAttempt = Date.now();
                    booking.syncAttempts++;

                    if (serverBookingId) {
                        booking.serverBookingId = serverBookingId;
                    }

                    const updateRequest = store.put(booking);
                    updateRequest.onsuccess = () => resolve(true);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Booking not found'));
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Mark booking as synced
     */
    async function markAsSynced(id, serverBookingId) {
        return updateBookingStatus(id, 'synced', serverBookingId);
    }

    /**
     * Mark booking as failed
     */
    async function markAsFailed(id) {
        return updateBookingStatus(id, 'failed');
    }

    /**
     * Get booking by local ID
     */
    async function getBookingByLocalId(localId) {
        await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('localId');
            const request = index.get(localId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete synced bookings older than 24 hours
     */
    async function cleanupOldBookings() {
        await init();

        const cutoff = Date.now() - (24 * 60 * 60 * 1000);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();
            let deleted = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const booking = cursor.value;
                    if (booking.status === 'synced' && booking.timestamp < cutoff) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                } else {
                    console.log(`🧹 Cleaned up ${deleted} old bookings`);
                    resolve(deleted);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    return {
        init,
        saveBooking,
        getPendingBookings,
        markAsSynced,
        markAsFailed,
        getBookingByLocalId,
        cleanupOldBookings,
        updateBookingStatus
    };
})();

// Export for global access
window.OfflineDB = OfflineDB;
