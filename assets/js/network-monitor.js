/**
 * Network Monitor
 * Handles network status detection and offline banner
 */

const NetworkMonitor = (function () {
    let isOnline = navigator.onLine;
    let listeners = [];
    let bannerElement = null;

    /**
     * Initialize network monitoring
     */
    function init() {
        // Listen to browser online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Create offline banner
        createBanner();

        // Initial state check
        if (!navigator.onLine) {
            showBanner();
        }

        console.log('📡 Network monitor initialized. Status:', isOnline ? 'Online' : 'Offline');
    }

    /**
     * Handle coming online
     */
    function handleOnline() {
        isOnline = true;
        hideBanner();
        notifyListeners('online');
        console.log('🌐 Network: Online');

        // Trigger sync of pending bookings
        if (window.BookingSync) {
            BookingSync.syncPendingBookings();
        }
    }

    /**
     * Handle going offline
     */
    function handleOffline() {
        isOnline = false;
        showBanner();
        notifyListeners('offline');
        console.log('📴 Network: Offline');
    }

    /**
     * Create offline banner element
     */
    function createBanner() {
        if (document.getElementById('offline-banner')) {
            bannerElement = document.getElementById('offline-banner');
            return;
        }

        bannerElement = document.createElement('div');
        bannerElement.id = 'offline-banner';
        bannerElement.className = 'offline-banner';
        bannerElement.innerHTML = `
            <div class="offline-banner-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
                <span>You're offline. Bookings will sync when connected.</span>
            </div>
            <button class="offline-banner-close" onclick="NetworkMonitor.hideBanner()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        document.body.insertBefore(bannerElement, document.body.firstChild);
    }

    /**
     * Show offline banner
     */
    function showBanner() {
        if (bannerElement) {
            bannerElement.classList.add('visible');
        }
    }

    /**
     * Hide offline banner
     */
    function hideBanner() {
        if (bannerElement) {
            bannerElement.classList.remove('visible');
        }
    }

    /**
     * Add status change listener
     */
    function addListener(callback) {
        listeners.push(callback);
    }

    /**
     * Remove listener
     */
    function removeListener(callback) {
        listeners = listeners.filter(l => l !== callback);
    }

    /**
     * Notify all listeners
     */
    function notifyListeners(status) {
        listeners.forEach(callback => {
            try {
                callback(status);
            } catch (e) {
                console.error('Network listener error:', e);
            }
        });
    }

    /**
     * Get current network status
     */
    function getStatus() {
        return isOnline;
    }

    /**
     * Check if really online (with fetch test)
     */
    async function checkRealConnection() {
        try {
            const response = await fetch('/api/ping', {
                method: 'HEAD',
                cache: 'no-store',
                timeout: 5000
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    return {
        init,
        getStatus,
        isOnline: () => isOnline,
        addListener,
        removeListener,
        showBanner,
        hideBanner,
        checkRealConnection
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NetworkMonitor.init());
} else {
    NetworkMonitor.init();
}

// Export for global access
window.NetworkMonitor = NetworkMonitor;
