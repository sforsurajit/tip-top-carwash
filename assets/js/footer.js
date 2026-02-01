/**
 * Footer Section JavaScript
 * Handles animations and interactions for the footer
 */

/**
 * Initialize the Footer section
 */
function initializeFooter() {
    console.log('Initializing Footer section...');

    // Add scroll to top functionality
    initializeScrollToTop();

    // Initialize link interactions
    initializeLinkInteractions();

    // Add current year
    updateCopyrightYear();

    // Initialize scroll animations
    initializeScrollAnimations();
}

// Make function globally available
if (typeof window.initializeFooter === 'undefined') {
    window.initializeFooter = initializeFooter;
}

/**
 * Update copyright year to current year
 */
function updateCopyrightYear() {
    const copyrightElement = document.querySelector('.footer-bottom p');
    if (copyrightElement) {
        const currentYear = new Date().getFullYear();
        copyrightElement.textContent = `© ${currentYear} Tip-Top Car Wash. All rights reserved.`;
    }
}

/**
 * Initialize scroll to top functionality
 */
function initializeScrollToTop() {
    // Add click handler to logo
    const footerLogo = document.querySelector('.footer-logo');
    if (footerLogo) {
        footerLogo.style.cursor = 'pointer';
        footerLogo.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

/**
 * Initialize link interactions
 */
function initializeLinkInteractions() {
    // Add smooth scrolling for internal links
    const footerLinks = document.querySelectorAll('.footer a[href^="#"]');

    footerLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Track social link clicks
    const socialLinks = document.querySelectorAll('.footer-social a');
    socialLinks.forEach(link => {
        link.addEventListener('click', function () {
            const platform = this.getAttribute('aria-label');
            console.log(`Social link clicked: ${platform}`);
        });
    });
}

/**
 * Initialize scroll-triggered animations
 */
function initializeScrollAnimations() {
    const footer = document.querySelector('.footer');

    if (!footer) {
        console.log('Footer not found for animations');
        return;
    }

    // Observer options
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    // Callback function
    const observerCallback = (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');

                // Animate footer columns with stagger
                animateFooterColumns();

                observer.unobserve(entry.target);
            }
        });
    };

    // Create observer
    const observer = new IntersectionObserver(observerCallback, options);

    // Add initial class and observe
    footer.classList.add('will-animate');
    observer.observe(footer);

    console.log('Footer scroll animations initialized');
}

/**
 * Animate footer columns with stagger effect
 */
function animateFooterColumns() {
    const columns = document.querySelectorAll('.footer-column');

    if (!columns.length) {
        return;
    }

    columns.forEach((column, index) => {
        column.classList.add('will-animate');
        setTimeout(() => {
            column.classList.add('animate-in');
        }, index * 100); // 100ms stagger
    });
}

/**
 * Optional: Back to top button (if you want to add one)
 */
function addBackToTopButton() {
    const button = document.createElement('button');
    button.className = 'back-to-top';
    button.innerHTML = '↑';
    button.setAttribute('aria-label', 'Back to top');

    document.body.appendChild(button);

    // Show/hide based on scroll position
    window.addEventListener('scroll', function () {
        if (window.scrollY > 500) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    });

    // Click handler
    button.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Auto-initialize if the footer is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(() => {
            if (document.querySelector('.footer')) {
                initializeFooter();
            }
        }, 100);
    });
} else {
    if (document.querySelector('.footer')) {
        initializeFooter();
    }
}

/**
 * Observer to detect dynamically loaded footer
 */
const footerObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('footer') || node.querySelector('.footer'))) {
                        console.log('Footer detected in DOM, initializing...');
                        setTimeout(initializeFooter, 100);
                    }
                }
            });
        }
    });
});

// Start observing if container exists
const footerContainer = document.getElementById('footer');
if (footerContainer) {
    footerObserver.observe(footerContainer, { childList: true, subtree: true });
}
