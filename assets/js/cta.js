/**
 * CTA (Call-to-Action) Section JavaScript
 * Handles animations and interactions for the CTA section
 */

/**
 * Initialize the CTA section
 */
function initializeCTA() {
    console.log('Initializing CTA section...');

    // Add intersection observer for scroll animations
    initializeScrollAnimations();

    // Initialize button interactions
    initializeButtonInteractions();

    // Initialize feature animations
    initializeFeatureAnimations();
}

// Make function globally available
if (typeof window.initializeCTA === 'undefined') {
    window.initializeCTA = initializeCTA;
}

/**
 * Initialize scroll-triggered animations using Intersection Observer
 */
function initializeScrollAnimations() {
    const ctaSection = document.querySelector('.cta-section');

    if (!ctaSection) {
        console.log('CTA section not found');
        return;
    }

    // Observer options
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2 // Trigger when 20% of the element is visible
    };

    // Callback function for intersection
    const observerCallback = (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Add animation class
                entry.target.classList.add('animate-in');

                // Animate features with stagger
                animateFeatures();

                // Unobserve after animation
                observer.unobserve(entry.target);
            }
        });
    };

    // Create observer
    const observer = new IntersectionObserver(observerCallback, options);

    // Add initial class and observe
    ctaSection.classList.add('will-animate');
    observer.observe(ctaSection);

    console.log('CTA scroll animations initialized');
}

/**
 * Animate CTA features with stagger effect
 */
function animateFeatures() {
    const features = document.querySelectorAll('.cta-feature');

    if (!features.length) {
        return;
    }

    features.forEach((feature, index) => {
        feature.classList.add('will-animate');
        setTimeout(() => {
            feature.classList.add('animate-in');
        }, index * 100); // 100ms stagger
    });
}

/**
 * Initialize button interactions
 */
function initializeButtonInteractions() {
    const bookNowBtn = document.getElementById('cta-book-now');

    if (!bookNowBtn) {
        console.log('CTA Book Now button not found');
        return;
    }

    // Book Now button click handler
    bookNowBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('CTA: Book Now clicked');

        // Try to open booking modal if it exists
        const bookingModal = document.getElementById('booking-modal');
        if (bookingModal) {
            bookingModal.classList.add('active');
            document.body.style.overflow = 'hidden';
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
    });

    // Enhanced hover effect for buttons
    const ctaButtons = document.querySelectorAll('.cta-primary-btn, .cta-secondary-btn');
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', function () {
            this.style.transform = 'scale(1.05) translateY(-2px)';
        });

        button.addEventListener('mouseleave', function () {
            this.style.transform = 'scale(1) translateY(0)';
        });
    });
}

/**
 * Initialize feature animations on hover
 */
function initializeFeatureAnimations() {
    const features = document.querySelectorAll('.cta-feature');

    if (!features.length) {
        return;
    }

    features.forEach((feature, index) => {
        // Add data attributes
        feature.setAttribute('data-feature', index + 1);

        // Enhanced hover effect
        feature.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-3px)';
        });

        feature.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Optional: Function to manually trigger animations
 */
function triggerAnimations() {
    const ctaSection = document.querySelector('.cta-section');
    if (ctaSection) {
        ctaSection.classList.add('animate-in');
        animateFeatures();
    }
}

// Make additional functions available globally if needed
window.triggerCTAAnimations = triggerAnimations;

// Auto-initialize if the section is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        // Wait a bit for the component to be loaded
        setTimeout(() => {
            if (document.querySelector('.cta-section')) {
                initializeCTA();
            }
        }, 100);
    });
} else {
    // Document is already loaded
    if (document.querySelector('.cta-section')) {
        initializeCTA();
    }
}

/**
 * Observer to detect dynamically loaded CTA section
 */
const ctaObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('cta-section') || node.querySelector('.cta-section'))) {
                        console.log('CTA section detected in DOM, initializing...');
                        setTimeout(initializeCTA, 100);
                    }
                }
            });
        }
    });
});

// Start observing if container exists
const ctaContainer = document.getElementById('cta-section');
if (ctaContainer) {
    ctaObserver.observe(ctaContainer, { childList: true, subtree: true });
}
