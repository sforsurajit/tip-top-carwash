/**
 * Hero Section JavaScript
 * Handles mobile slider, desktop banner, and button interactions
 */

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hero.js: DOM Content Loaded');
    initializeHero();
});

// Backup initialization on window load
window.addEventListener('load', function() {
    console.log('Hero.js: Window Loaded');
    initializeHero();
});

/**
 * Main initialization function
 */
function initializeHero() {
    initializeMobileSlider();
    initializeHeroButtons();
}

// Make function globally available
if (typeof window.initializeHero === 'undefined') {
    window.initializeHero = initializeHero;
}

/**
 * Observer to detect dynamically loaded hero sections
 */
const heroObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('hero') || node.querySelector('.hero'))) {
                        console.log('Hero section detected in DOM, initializing...');
                        setTimeout(initializeHero, 100);
                    }
                }
            });
        }
    });
});

// Start observing if hero container exists
const heroContainer = document.getElementById('hero-container');
if (heroContainer) {
    heroObserver.observe(heroContainer, { childList: true, subtree: true });
}

/**
 * Initialize mobile slider functionality
 */
function initializeMobileSlider() {
    const mobileSlider = document.querySelector('.hero-mobile');
    if (!mobileSlider) {
        console.log('Mobile slider container not found');
        return;
    }

    const slides = document.querySelectorAll('.hero-mobile .hero-slide');
    const indicators = document.querySelectorAll('.hero-mobile .slider-indicators .indicator');
    
    if (!slides.length) {
        console.log('No slides found in mobile slider');
        return;
    }
    
    console.log(`Mobile slider initialized with ${slides.length} slides`);
    
    let currentSlide = 0;
    let slideInterval;
    let isTransitioning = false;
    
    /**
     * Show specific slide
     */
    function showSlide(index) {
        if (isTransitioning) return;
        isTransitioning = true;
        
        // Remove active class from all slides and indicators
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Handle index bounds
        currentSlide = index;
        if (currentSlide >= slides.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slides.length - 1;
        
        // Add active class to current slide and indicator
        slides[currentSlide].classList.add('active');
        if (indicators[currentSlide]) {
            indicators[currentSlide].classList.add('active');
        }
        
        // Reset transition lock
        setTimeout(() => {
            isTransitioning = false;
        }, 800);
    }
    
    /**
     * Navigate to next slide
     */
    function nextSlide() {
        showSlide(currentSlide + 1);
    }
    
    /**
     * Navigate to previous slide
     */
    function prevSlide() {
        showSlide(currentSlide - 1);
    }
    
    /**
     * Start auto-sliding
     */
    function startAutoSlide() {
        stopAutoSlide();
        slideInterval = setInterval(nextSlide, 5000); // 5 seconds
    }
    
    /**
     * Stop auto-sliding
     */
    function stopAutoSlide() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    }
    
    /**
     * Handle user interaction (pause and resume auto-slide)
     */
    function handleUserInteraction(callback) {
        stopAutoSlide();
        callback();
        startAutoSlide();
    }
    
    /**
     * Setup indicator click events
     */
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function(e) {
            e.preventDefault();
            handleUserInteraction(() => showSlide(index));
        });
    });
    
    /**
     * Touch/Swipe functionality
     */
    let touchStartX = 0;
    let touchEndX = 0;
    const sliderCard = document.querySelector('.mobile-slider-card');
    
    if (sliderCard) {
        sliderCard.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        sliderCard.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
    
    /**
     * Handle swipe gesture
     */
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left
                handleUserInteraction(nextSlide);
            } else {
                // Swiped right
                handleUserInteraction(prevSlide);
            }
        }
    }
    
    /**
     * Keyboard navigation (only on mobile)
     */
    document.addEventListener('keydown', function(e) {
        if (window.innerWidth < 768) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handleUserInteraction(prevSlide);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleUserInteraction(nextSlide);
            }
        }
    });
    
    /**
     * Pause slider when tab is hidden
     */
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoSlide();
        } else {
            startAutoSlide();
        }
    });
    
    /**
     * Pause on hover (for devices with mouse)
     */
    if (sliderCard) {
        sliderCard.addEventListener('mouseenter', stopAutoSlide);
        sliderCard.addEventListener('mouseleave', startAutoSlide);
    }
    
    // Start the auto-slide
    startAutoSlide();
}

/**
 * Initialize hero button click handlers
 */
function initializeHeroButtons() {
    // Desktop buttons
    const bookServiceDesktop = document.getElementById('book-service-btn-desktop');
    const shopProductsDesktop = document.getElementById('shop-products-btn-desktop');
    
    // Mobile buttons
    const bookServiceMobile = document.getElementById('book-service-btn-mobile');
    const shopProductsMobile = document.getElementById('shop-products-btn-mobile');
    
    // Book Service buttons
    if (bookServiceDesktop) {
        bookServiceDesktop.addEventListener('click', function(e) {
            e.preventDefault();
            handleBookService();
        });
    }
    
    if (bookServiceMobile) {
        bookServiceMobile.addEventListener('click', function(e) {
            e.preventDefault();
            handleBookService();
        });
    }
    
    // Shop Products buttons
    if (shopProductsDesktop) {
        shopProductsDesktop.addEventListener('click', function(e) {
            e.preventDefault();
            handleShopProducts();
        });
    }
    
    if (shopProductsMobile) {
        shopProductsMobile.addEventListener('click', function(e) {
            e.preventDefault();
            handleShopProducts();
        });
    }
}

/**
 * Handle Book Service button click
 */
function handleBookService() {
    console.log('Book Service clicked');
    
    // Try to open booking modal if it exists
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) {
        bookingModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        return;
    }
    
    // Otherwise scroll to services section
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        return;
    }
    
    // Fallback: redirect to booking page
    console.log('Redirecting to booking page...');
    // window.location.href = '/booking';
}

/**
 * Handle Shop Products button click
 */
function handleShopProducts() {
    console.log('Shop Products clicked');
    
    // Scroll to products section
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        return;
    }
    
    // Fallback: redirect to products page
    console.log('Redirecting to products page...');
    // window.location.href = '/products';
}

/**
 * Handle responsive changes
 */
function handleResponsiveChanges() {
    const windowWidth = window.innerWidth;
    const mobileSlider = document.querySelector('.hero-mobile');
    const desktopBanner = document.querySelector('.hero-desktop');
    
    // Log viewport changes (optional)
    console.log(`Viewport width: ${windowWidth}px`);
    
    // Additional responsive logic can be added here
    // For example: reinitialize slider if needed
    if (windowWidth < 768 && mobileSlider) {
        // Mobile view
    } else if (windowWidth >= 768 && desktopBanner) {
        // Desktop view
    }
}

/**
 * Debounced resize handler
 */
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResponsiveChanges, 250);
});

/**
 * Handle orientation changes
 */
window.addEventListener('orientationchange', function() {
    setTimeout(handleResponsiveChanges, 300);
});