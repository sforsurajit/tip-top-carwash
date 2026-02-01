/**
 * Rate Limiter Module
 * Prevents excessive API calls and abuse
 */

class RateLimiter {
    constructor(maxRequests = 10, timeWindow = 60000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow; // in milliseconds
        this.requests = new Map();
    }

    /**
     * Check if request is allowed
     */
    isAllowed(key) {
        const now = Date.now();
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const timestamps = this.requests.get(key);
        
        // Remove old timestamps outside the time window
        const validTimestamps = timestamps.filter(time => now - time < this.timeWindow);
        this.requests.set(key, validTimestamps);

        // Check if limit exceeded
        if (validTimestamps.length >= this.maxRequests) {
            return false;
        }

        // Add current timestamp
        validTimestamps.push(now);
        this.requests.set(key, validTimestamps);

        return true;
    }

    /**
     * Get remaining requests
     */
    getRemaining(key) {
        if (!this.requests.has(key)) {
            return this.maxRequests;
        }

        const now = Date.now();
        const timestamps = this.requests.get(key);
        const validTimestamps = timestamps.filter(time => now - time < this.timeWindow);

        return Math.max(0, this.maxRequests - validTimestamps.length);
    }

    /**
     * Get time until reset
     */
    getResetTime(key) {
        if (!this.requests.has(key)) {
            return 0;
        }

        const timestamps = this.requests.get(key);
        if (timestamps.length === 0) {
            return 0;
        }

        const oldestTimestamp = Math.min(...timestamps);
        const resetTime = oldestTimestamp + this.timeWindow;
        const now = Date.now();

        return Math.max(0, resetTime - now);
    }

    /**
     * Clear all rate limit data for a key
     */
    clear(key) {
        this.requests.delete(key);
    }

    /**
     * Clear all rate limit data
     */
    clearAll() {
        this.requests.clear();
    }

    /**
     * Throttle a function
     */
    async throttle(key, fn) {
        if (!this.isAllowed(key)) {
            const resetTime = Math.ceil(this.getResetTime(key) / 1000);
            throw new Error(`Rate limit exceeded. Try again in ${resetTime} seconds.`);
        }

        return await fn();
    }
}

// Create global rate limiters
const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
const authRateLimiter = new RateLimiter(5, 300000); // 5 login attempts per 5 minutes
const bookingRateLimiter = new RateLimiter(10, 60000); // 10 bookings per minute

// Export for use in other modules
window.RateLimiter = RateLimiter;
window.apiRateLimiter = apiRateLimiter;
window.authRateLimiter = authRateLimiter;
window.bookingRateLimiter = bookingRateLimiter;