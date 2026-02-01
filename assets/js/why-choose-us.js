/**
 * Why Choose Us Section JavaScript
 * Handles animations and interactions for the "Why Choose Us" section
 */

/**
 * Initialize the Why Choose Us section
 */
function initializeWhyChooseUs() {
    console.log('Initializing Why Choose Us section...');

    // Add intersection observer for scroll animations
    initializeScrollAnimations();

    // Initialize card hover effects
    initializeCardEffects();
}

// Make function globally available
if (typeof window.initializeWhyChooseUs === 'undefined') {
    window.initializeWhyChooseUs = initializeWhyChooseUs;
}

/**
 * Initialize scroll-triggered animations using Intersection Observer
 */
function initializeScrollAnimations() {
    const cards = document.querySelectorAll('.why-choose-us .feature-card');

    if (!cards.length) {
        console.log('No feature cards found for animation');
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
                }, index * 80); // 80ms delay between each card

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

    console.log(`Scroll animations initialized for ${cards.length} feature cards`);
}

/**
 * Initialize interactive card effects
 */
function initializeCardEffects() {
    const cards = document.querySelectorAll('.why-choose-us .feature-card');

    if (!cards.length) {
        return;
    }

    cards.forEach((card, index) => {
        // Add data attributes for tracking
        card.setAttribute('data-feature', index + 1);

        // Enhanced hover effects
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });

        // Add click handler (optional - can be expanded for modals/details)
        card.addEventListener('click', function () {
            const title = this.querySelector('.feature-title')?.textContent;
            console.log(`Clicked on feature ${index + 1}: ${title}`);
        });
    });
}

/**
 * Optional: Function to manually trigger animations
 */
function triggerAnimations() {
    const cards = document.querySelectorAll('.why-choose-us .feature-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate-in');
        }, index * 80);
    });
}

// Make additional functions available globally if needed
window.triggerWhyChooseUsAnimations = triggerAnimations;

// Auto-initialize if the section is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        // Wait a bit for the component to be loaded
        setTimeout(() => {
            if (document.querySelector('.why-choose-us')) {
                initializeWhyChooseUs();
            }
        }, 100);
    });
} else {
    // Document is already loaded
    if (document.querySelector('.why-choose-us')) {
        initializeWhyChooseUs();
    }
}

/**
 * Observer to detect dynamically loaded why-choose-us section
 */
const whyChooseUsObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('why-choose-us') || node.querySelector('.why-choose-us'))) {
                        console.log('Why Choose Us section detected in DOM, initializing...');
                        setTimeout(initializeWhyChooseUs, 100);
                    }
                }
            });
        }
    });
});

// Start observing if container exists
const whyChooseUsContainer = document.getElementById('why-choose-us');
if (whyChooseUsContainer) {
    whyChooseUsObserver.observe(whyChooseUsContainer, { childList: true, subtree: true });
}
