/**
 * How It Works Section JavaScript
 * Handles animations and interactions for the "How It Works" section
 */

/**
 * Initialize the How It Works section
 */
function initializeHowItWorks() {
    console.log('Initializing How It Works section...');

    // Add intersection observer for scroll animations
    initializeScrollAnimations();

    // Initialize card hover effects
    initializeCardEffects();
}

// Make function globally available
if (typeof window.initializeHowItWorks === 'undefined') {
    window.initializeHowItWorks = initializeHowItWorks;
}

/**
 * Initialize scroll-triggered animations using Intersection Observer
 */
function initializeScrollAnimations() {
    const cards = document.querySelectorAll('.how-it-works .step-card');

    if (!cards.length) {
        console.log('No step cards found for animation');
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

    console.log(`Scroll animations initialized for ${cards.length} step cards`);
}

/**
 * Initialize interactive card effects
 */
function initializeCardEffects() {
    const cards = document.querySelectorAll('.how-it-works .step-card');

    if (!cards.length) {
        return;
    }

    cards.forEach((card, index) => {
        // Add data attributes for tracking
        card.setAttribute('data-step', index + 1);

        // Add hover sound effect (optional - can be removed if not desired)
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });

        // Add click handler to show more details (optional - expand if needed)
        card.addEventListener('click', function () {
            console.log(`Clicked on step ${index + 1}: ${this.querySelector('.step-title')?.textContent}`);
        });
    });
}

/**
 * Optional: Function to manually trigger animations
 */
function triggerAnimations() {
    const cards = document.querySelectorAll('.how-it-works .step-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate-in');
        }, index * 100);
    });
}

// Make additional functions available globally if needed
window.triggerHowItWorksAnimations = triggerAnimations;

// Auto-initialize if the section is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        // Wait a bit for the component to be loaded
        setTimeout(() => {
            if (document.querySelector('.how-it-works')) {
                initializeHowItWorks();
            }
        }, 100);
    });
} else {
    // Document is already loaded
    if (document.querySelector('.how-it-works')) {
        initializeHowItWorks();
    }
}

/**
 * Observer to detect dynamically loaded how-it-works section
 */
const howItWorksObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('how-it-works') || node.querySelector('.how-it-works'))) {
                        console.log('How It Works section detected in DOM, initializing...');
                        setTimeout(initializeHowItWorks, 100);
                    }
                }
            });
        }
    });
});

// Start observing if container exists
const howItWorksContainer = document.getElementById('how-it-works-container');
if (howItWorksContainer) {
    howItWorksObserver.observe(howItWorksContainer, { childList: true, subtree: true });
}
