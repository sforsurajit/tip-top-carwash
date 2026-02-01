
let servicesData = [];
let currentSlide = 0;
let autoSlideTimer = null;
let isDesktopView = false;
let isInitialized = false;

// Expose initServices globally so component-loader can call it
window.initServices = initServices;

// Auto-initialize when DOM is ready (for pages where services is hardcoded)
document.addEventListener('DOMContentLoaded', function () {
    // Wait a bit for component to load
    setTimeout(function () {
        const grid = document.getElementById('services-grid');
        if (grid && !isInitialized) {
            console.log('🚀 Starting services carousel initialization...');
            initServices();
        }
    }, 500);
});

async function initServices() {
    console.log('🔍 initServices() called');
    const grid = document.getElementById('services-grid');
    if (!grid) {
        console.error('❌ Services grid not found!');
        return;
    }

    if (isInitialized) {
        console.log('⚠️ Services already initialized, skipping...');
        return;
    }

    console.log('✅ Services grid found, starting initialization...');
    isInitialized = true;
    checkScreenSize();
    console.log('📡 Calling loadServicesFromAPI()...');
    await loadServicesFromAPI();
    console.log('✅ loadServicesFromAPI() completed');
}


function checkScreenSize() {
    isDesktopView = window.innerWidth >= 993;
    console.log('📱 Screen:', window.innerWidth, 'px - Desktop:', isDesktopView);
}


async function loadServicesFromAPI() {
    console.log('🚀 loadServicesFromAPI() started');
    const grid = document.getElementById('services-grid');

    if (!grid) {
        console.error('❌ Grid not found in loadServicesFromAPI!');
        return;
    }

    console.log('✅ Grid found, setting loading state...');
    grid.innerHTML = '<div class="loading-container"><div class="spinner"></div><p style="margin-top:15px;color:#666">Loading...</p></div>';

    try {
        let attempts = 0;
        while (!window.ServiceAPI && attempts < 20) {
            await sleep(100);
            attempts++;
        }

        if (!window.ServiceAPI) {
            throw new Error('ServiceAPI not found');
        }

        console.log('📡 Fetching services from:', API_CONFIG.BASE_URL);
        const result = await ServiceAPI.fetchServices();

        if (result.success && result.data && result.data.length > 0) {
            servicesData = result.data;
            console.log('✅ Loaded', servicesData.length, 'services from API');
            renderServices();
        } else {
            throw new Error(result.error || 'No services data');
        }

    } catch (error) {
        console.warn('⚠️ API Error:', error.message);
        console.log('🎨 Using fallback demo data for local development...');

        // Use fallback demo data
        servicesData = getDemoServices();
        console.log('✅ Loaded', servicesData.length, 'demo services');
        renderServices();
    }
}

/**
 * Get demo services for fallback (when API is unavailable)
 */
function getDemoServices() {
    return [
        {
            service_key: 'basic-wash',
            title: 'Basic Car Wash',
            description: 'Exterior wash, vacuum cleaning, and tire shine for a quick refresh.',
            price: 299,
            image_url: 'assets/images/services/basic-wash.jpg',
            badge: 'Popular',
            badge_type: 'popular',
            features: [
                { icon: '🚗', text: 'Exterior Wash' },
                { icon: '✨', text: 'Vacuum Clean' },
                { icon: '🛞', text: 'Tire Shine' }
            ]
        },
        {
            service_key: 'premium-wash',
            title: 'Premium Wash',
            description: 'Complete wash with wax polish and dashboard treatment.',
            price: 599,
            image_url: 'assets/images/services/premium-wash.jpg',
            badge: 'Best Value',
            badge_type: 'featured',
            features: [
                { icon: '💎', text: 'Premium Wash' },
                { icon: '🪣', text: 'Wax Polish' },
                { icon: '🎯', text: 'Dashboard Care' }
            ]
        },
        {
            service_key: 'detailing',
            title: 'Full Detailing',
            description: 'Complete interior & exterior detailing service for your vehicle.',
            price: 1299,
            image_url: 'assets/images/services/detailing.jpg',
            badge: 'Premium',
            badge_type: 'featured',
            features: [
                { icon: '💎', text: 'Full Detailing' },
                { icon: '✨', text: 'Interior Clean' },
                { icon: '🚗', text: 'Exterior Polish' }
            ]
        },
        {
            service_key: 'interior-clean',
            title: 'Interior Cleaning',
            description: 'Thorough interior cleaning including seat shampooing and odor removal.',
            price: 899,
            image_url: 'assets/images/services/interior.jpg',
            features: [
                { icon: '🧹', text: 'Deep Clean' },
                { icon: '🪑', text: 'Seat Shampoo' },
                { icon: '🌸', text: 'Odor Remove' }
            ]
        }
    ];
}

/**
 * Render services based on screen size
 */
function renderServices() {
    console.log('🎨 Rendering services for:', isDesktopView ? 'DESKTOP' : 'MOBILE');

    if (isDesktopView) {
        setupCarousel();
    } else {
        setupGrid();
    }

    isInitialized = true;
}

/**
 * Setup CAROUSEL for desktop
 */
function setupCarousel() {
    console.log('🎠 Setting up CAROUSEL...');

    const grid = document.getElementById('services-grid');
    const container = grid.closest('.container');

    // Create wrapper if doesn't exist
    let wrapper = container.querySelector('.services-carousel-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'services-carousel-wrapper';
        grid.parentNode.insertBefore(wrapper, grid);
        wrapper.appendChild(grid);

        // Navigation buttons removed as per user request
        // Users can click on side cards to navigate or use auto-slide
    }

    // Clear grid
    grid.innerHTML = '';

    // Reset to first slide
    currentSlide = 0;

    // Create cards
    servicesData.forEach((service, i) => {
        const card = makeCard(service, i);
        grid.appendChild(card);
    });

    // Log to verify cards exist
    console.log('🔍 Cards created:', grid.children.length);

    // Position cards after DOM update
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            console.log('📍 Positioning cards...');
            const cardsCheck = document.querySelectorAll('.service-card');
            console.log('🔍 Cards found for positioning:', cardsCheck.length);

            positionCards();
            addDots();

            setTimeout(() => {
                console.log('⏰ Starting AUTO-SLIDE timer (5 seconds)...');
                startAutoSlide();
                console.log('✅ Carousel setup complete!');
            }, 100);
        });
    });
}

/**
 * Create service card
 */
function makeCard(service, index) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.index = index;

    const badge = service.badge ?
        `<div class="service-badge ${service.badge_type === 'featured' ? 'featured' : ''}">${service.badge}</div>`
        : '';

    const features = (service.features || []).map(f =>
        `<span class="feature">${f.icon || ''} ${f.text || ''}</span>`
    ).join('');

    card.innerHTML = `
        <div class="service-image">
            <img src="${service.image_url || 'assets/images/services/default.jpg'}" 
                 alt="${service.title}" 
                 onerror="this.src='assets/images/services/default.jpg'"
                 loading="eager">
            ${badge}
        </div>
        <div class="service-content">
            <h3 class="service-title">${service.title}</h3>
            <p class="service-description">${service.description}</p>
            <div class="service-features">${features}</div>
            <div class="service-footer">
                <span class="service-price">₹${formatPrice(service.price)}</span>
                <button class="btn-service" onclick="bookService('${service.service_key}')">Book Now</button>
            </div>
        </div>
    `;

    // Click side cards to slide
    card.addEventListener('click', function (e) {
        // Don't handle if clicking button
        if (e.target.closest('.btn-service')) return;

        const idx = parseInt(this.dataset.index);
        if (idx === getPrevIndex()) {
            slidePrev();
        } else if (idx === getNextIndex()) {
            slideNext();
        }
    });

    return card;
}

/**
 * Position all cards - FIXED VERSION
 */
function positionCards() {
    const cards = document.querySelectorAll('.service-card');
    const total = cards.length;

    if (total === 0) {
        console.log('⚠️ No cards to position');
        return;
    }

    console.log('📍 Positioning', total, 'cards at index', currentSlide);

    // Force reflow to ensure DOM is ready
    void cards[0].offsetHeight;

    cards.forEach((card, i) => {
        // Remove all position classes
        card.classList.remove('carousel-center', 'carousel-left', 'carousel-right', 'carousel-hidden-left', 'carousel-hidden-right');

        // Calculate relative position
        let pos = i - currentSlide;

        // Wrap around
        if (pos < -Math.floor(total / 2)) pos += total;
        if (pos > Math.floor(total / 2)) pos -= total;

        // Add position class
        if (pos === 0) {
            card.classList.add('carousel-center');
            console.log('Card', i, '→ CENTER');
        } else if (pos === -1) {
            card.classList.add('carousel-left');
            console.log('Card', i, '→ LEFT');
        } else if (pos === 1) {
            card.classList.add('carousel-right');
            console.log('Card', i, '→ RIGHT');
        } else if (pos < -1) {
            card.classList.add('carousel-hidden-left');
            console.log('Card', i, '→ HIDDEN LEFT');
        } else {
            card.classList.add('carousel-hidden-right');
            console.log('Card', i, '→ HIDDEN RIGHT');
        }
    });

    updateDots();
}

/**
 * Get previous index
 */
function getPrevIndex() {
    return (currentSlide - 1 + servicesData.length) % servicesData.length;
}

/**
 * Get next index
 */
function getNextIndex() {
    return (currentSlide + 1) % servicesData.length;
}

/**
 * Slide to previous
 */
function slidePrev() {
    console.log('⬅️ Previous slide');
    currentSlide = getPrevIndex();
    positionCards();
    resetAutoSlide();
}

/**
 * Slide to next
 */
function slideNext() {
    console.log('➡️ Next slide');
    currentSlide = getNextIndex();
    positionCards();
    resetAutoSlide();
}

/**
 * Go to specific slide
 */
function goToSlide(index) {
    console.log('🎯 Go to slide', index);
    currentSlide = index;
    positionCards();
    resetAutoSlide();
}

/**
 * Start auto-slide
 */
function startAutoSlide() {
    stopAutoSlide();

    if (!isDesktopView) {
        console.log('⏸️ Not desktop - skipping auto-slide');
        return;
    }

    console.log('▶️ AUTO-SLIDE STARTED (every 5 seconds)');

    autoSlideTimer = setInterval(function () {
        console.log('⏰ Auto-slide tick → Next slide');
        currentSlide = getNextIndex();
        positionCards();
    }, 5000);
}

/**
 * Stop auto-slide
 */
function stopAutoSlide() {
    if (autoSlideTimer) {
        console.log('⏹️ Stopping auto-slide');
        clearInterval(autoSlideTimer);
        autoSlideTimer = null;
    }
}

/**
 * Reset auto-slide (restart timer)
 */
function resetAutoSlide() {
    if (!isDesktopView) return;
    stopAutoSlide();
    startAutoSlide();
}

/**
 * Add dots indicator
 */
function addDots() {
    const wrapper = document.querySelector('.services-carousel-wrapper');
    if (!wrapper) return;

    let dots = wrapper.querySelector('.carousel-dots');
    if (!dots) {
        dots = document.createElement('div');
        dots.className = 'carousel-dots';
        wrapper.appendChild(dots);
    }

    dots.innerHTML = '';
    servicesData.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        if (i === currentSlide) dot.classList.add('active');
        dot.onclick = () => goToSlide(i);
        dots.appendChild(dot);
    });
}

/**
 * Update dots
 */
function updateDots() {
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

/**
 * Setup GRID for mobile/tablet
 */
function setupGrid() {
    console.log('📱 Setting up GRID...');

    const grid = document.getElementById('services-grid');
    const wrapper = document.querySelector('.services-carousel-wrapper');

    // Remove wrapper if exists
    if (wrapper) {
        const container = wrapper.parentNode;
        container.insertBefore(grid, wrapper);
        wrapper.remove();
    }

    stopAutoSlide();

    grid.innerHTML = '';

    servicesData.forEach((service, i) => {
        const card = makeCard(service, i);
        card.className = 'service-card';
        grid.appendChild(card);
    });

    console.log('✅ Grid setup complete!');
}

/**
 * Format price
 */
function formatPrice(price) {
    return parseFloat(price).toFixed(2).replace(/\.00$/, '');
}

/**
 * Book service - Opens booking modal with service data
 */
function bookService(key) {
    console.log('📝 Booking service:', key);

    // Find service data from loaded services
    const service = servicesData.find(s => s.service_key === key);

    if (!service) {
        console.warn('⚠️ Service not found:', key);
        // Fallback to generic booking
        if (window.LocationBooking && typeof window.LocationBooking.openBookingModal === 'function') {
            window.LocationBooking.openBookingModal({ id: key, name: key, price: 0 });
        } else {
            window.location.href = `pages/booking.html?service=${key}`;
        }
        return;
    }

    // Prepare service data for booking modal
    const serviceData = {
        id: service.service_key,
        name: service.title,
        price: service.price,
        description: service.description || '',
        vehicleType: 'sedan' // Default, user can change if needed
    };

    console.log('📦 Service data:', serviceData);

    // Open LocationBooking modal with service data
    if (window.LocationBooking && typeof window.LocationBooking.openBookingModal === 'function') {
        console.log('✅ Opening LocationBooking modal');
        window.LocationBooking.openBookingModal(serviceData);
    } else {
        // Fallback to booking page
        console.warn('⚠️ LocationBooking not available, redirecting to booking page');
        window.location.href = `pages/booking.html?service=${key}`;
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle resize with debounce
let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
        const wasDesktop = isDesktopView;
        checkScreenSize();

        if (wasDesktop !== isDesktopView && servicesData.length > 0) {
            console.log('📐 Screen size changed - re-rendering');
            renderServices();
        }
    }, 250);
});

// Pause when page hidden
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        stopAutoSlide();
    } else if (isDesktopView && servicesData.length > 0 && isInitialized) {
        startAutoSlide();
    }
});

// Export functions
window.slidePrev = slidePrev;
window.slideNext = slideNext;
window.goToSlide = goToSlide;
window.bookService = bookService;
window.loadServicesFromAPI = loadServicesFromAPI;

// Debug function
window.debugCarousel = function () {
    console.log('=== CAROUSEL DEBUG ===');
    console.log('Desktop:', isDesktopView);
    console.log('Initialized:', isInitialized);
    console.log('Services:', servicesData.length);
    console.log('Current:', currentSlide);
    console.log('Auto-slide:', autoSlideTimer !== null);
    console.log('Width:', window.innerWidth);
    console.log('Cards in DOM:', document.querySelectorAll('.service-card').length);

    // Check card classes
    const cards = document.querySelectorAll('.service-card');
    cards.forEach((card, i) => {
        const classes = card.className.replace('service-card', '').trim();
        console.log(`Card ${i}:`, classes || 'NO POSITION CLASS');
    });
    console.log('===================');
};

console.log('✅ Carousel script loaded - Type debugCarousel() to check status');