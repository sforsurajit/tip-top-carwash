/**
 * Testimonials Section JavaScript
 * Handles animations and interactions for the "Testimonials" section
 */

/**
 * Initialize the Testimonials section
 */
function initializeTestimonials() {
    console.log('Initializing Testimonials section...');

    // Add intersection observer for scroll animations
    initializeScrollAnimations();

    // Initialize card hover effects
    initializeCardEffects();
}

// Make function globally available
if (typeof window.initializeTestimonials === 'undefined') {
    window.initializeTestimonials = initializeTestimonials;
}

/**
 * Initialize scroll-triggered animations using Intersection Observer
 */
function initializeScrollAnimations() {
    const cards = document.querySelectorAll('.testimonials .testimonial-card');

    if (!cards.length) {
        console.log('No testimonial cards found for animation');
        return;
    }

    // Observer options
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    // Callback function for intersection
    const observerCallback = (entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add a staggered delay for each card
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 100); // 100ms delay between each card

                // Unobserve after animation to prevent re-triggering
                observer.unobserve(entry.target);
            }
        });
    };

    // Create observer
    const observer = new IntersectionObserver(observerCallback, options);

    // Observe each card
    cards.forEach((card) => {
        card.classList.add('will-animate'); // Add class for CSS transitions
        observer.observe(card);
    });

    console.log(`Scroll animations initialized for ${cards.length} testimonial cards`);
}

/**
 * Initialize interactive card effects
 */
function initializeCardEffects() {
    const cards = document.querySelectorAll('.testimonials .testimonial-card');

    if (!cards.length) {
        return;
    }

    cards.forEach((card, index) => {
        // Add data attributes for tracking
        card.setAttribute('data-testimonial', index + 1);

        // Enhanced hover effects
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });

        // Add click handler (optional - can be expanded for full testimonial view)
        card.addEventListener('click', function () {
            const authorName = this.querySelector('.author-name')?.textContent;
            console.log(`Clicked on testimonial from: ${authorName}`);
        });
    });
}

/**
 * Optional: Function to manually trigger animations
 */
function triggerAnimations() {
    const cards = document.querySelectorAll('.testimonials .testimonial-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate-in');
        }, index * 100);
    });
}

// Make additional functions available globally if needed
window.triggerTestimonialsAnimations = triggerAnimations;

// Auto-initialize if the section is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        // Wait a bit for the component to be loaded
        setTimeout(() => {
            if (document.querySelector('.testimonials')) {
                initializeTestimonials();
            }
        }, 100);
    });
} else {
    // Document is already loaded
    if (document.querySelector('.testimonials')) {
        initializeTestimonials();
    }
}

/**
 * Observer to detect dynamically loaded testimonials section
 */
const testimonialsObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('testimonials') || node.querySelector('.testimonials'))) {
                        console.log('Testimonials section detected in DOM, initializing...');
                        setTimeout(initializeTestimonials, 100);
                    }
                }
            });
        }
    });
});

// Start observing if container exists
const testimonialsContainer = document.getElementById('testimonials');
if (testimonialsContainer) {
    testimonialsObserver.observe(testimonialsContainer, { childList: true, subtree: true });
}
