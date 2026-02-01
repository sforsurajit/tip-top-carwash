/**
 * Active Navigation Link Highlighter
 * Automatically highlights the current page in the navigation menu
 */

function setActiveNavLink() {
    // Get current page path
    const currentPath = window.location.pathname;

    // Get all nav links (both desktop and mobile)
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-link');

    // If no nav links found, navbar might not be loaded yet
    if (navLinks.length === 0) {
        console.log('⚠️ No nav links found, navbar not loaded yet');
        return false;
    }

    // Remove all active classes and inline styles first
    navLinks.forEach(link => {
        link.classList.remove('active');
        // Remove any inline styles we might have added
        link.style.color = '';
        link.style.fontWeight = '';
    });

    // Determine which page we're on
    let activePage = '';

    // Normalize the path for comparison
    const normalizedPath = currentPath.toLowerCase();

    // Check for specific pages first
    if (normalizedPath.includes('/pages/services.html') || normalizedPath.includes('services.html')) {
        activePage = 'services';
    } else if (normalizedPath.includes('/pages/how-it-works.html') || normalizedPath.includes('how-it-works.html')) {
        activePage = 'how-it-works';
    } else if (normalizedPath.includes('/pages/contact.html') || normalizedPath.includes('contact.html')) {
        activePage = 'contact';
    } else if (
        normalizedPath.includes('/carwash1/index.html') ||
        normalizedPath === '/carwash1/' ||
        normalizedPath === '/carwash1' ||
        normalizedPath.endsWith('index.html') ||
        normalizedPath === '/' ||
        normalizedPath === ''
    ) {
        // All these paths indicate we're on the home page
        activePage = 'home';
    } else {
        // Default to home if no specific page is matched
        activePage = 'home';
    }

    // Add active class AND inline styles to matching links (belt and suspenders approach)
    let activeLinksSet = 0;
    if (activePage) {
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            if (linkPage === activePage) {
                link.classList.add('active');
                // Add inline styles as fallback to ensure visibility
                link.style.color = '#f97316';
                link.style.fontWeight = '600';
                activeLinksSet++;
            }
        });
    }

    console.log('✅ Active page set:', activePage, '| Path:', currentPath, '| Links updated:', activeLinksSet);
    return true;
}

// Retry logic with multiple attempts
function initActiveNav() {
    let attempts = 0;
    const maxAttempts = 10;

    const trySetActive = () => {
        attempts++;
        const success = setActiveNavLink();

        if (!success && attempts < maxAttempts) {
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} - Retrying in 100ms...`);
            setTimeout(trySetActive, 100);
        } else if (success) {
            console.log('✅ Active nav link set successfully!');
        } else {
            console.warn('⚠️ Failed to set active nav link after', maxAttempts, 'attempts');
        }
    };

    trySetActive();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActiveNav);
} else {
    initActiveNav();
}

// Re-run when page becomes visible (handles browser back/forward navigation)
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        console.log('🔄 Page became visible - re-checking active nav state');
        setTimeout(initActiveNav, 100);
    }
});

// Re-run when page is shown from cache (bfcache)
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        console.log('🔄 Page restored from cache - re-checking active nav state');
        setTimeout(initActiveNav, 100);
    }
});

// Re-run when hash changes (for single-page navigation)
window.addEventListener('hashchange', function () {
    console.log('🔄 Hash changed - re-checking active nav state');
    setTimeout(initActiveNav, 100);
});

// Export for manual calling if needed
window.setActiveNavLink = setActiveNavLink;
window.initActiveNav = initActiveNav;
