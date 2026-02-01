/**
 * Header Initialization - Scroll behavior and mobile menu
 */

function initializeHeader() {
    console.log('Initializing header...');

    const navbar = document.querySelector('.navbar');
    const topbar = document.querySelector('.top-bar');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const closeMenuBtn = document.getElementById('close-menu');

    if (!navbar) {
        console.log('Navbar not found, retrying...');
        setTimeout(initializeHeader, 100);
        return;
    }

    console.log('Header elements found, setting up...');

    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            openMobileMenu();
        });
    }

    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', function (e) {
            e.preventDefault();
            closeMobileMenu();
        });
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', function (e) {
            e.preventDefault();
            closeMobileMenu();
        });
    }

    // Scroll handler - hide topbar, keep navbar sticky
    let lastScroll = 0;
    let ticking = false;

    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(function () {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    function handleScroll() {
        const currentScroll = window.pageYOffset;

        // Add scrolled class to navbar for shadow effect
        if (navbar) {
            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Hide/show topbar on scroll (desktop only)
        if (window.innerWidth > 768 && topbar) {
            if (currentScroll > 50) {
                topbar.classList.add('hidden');
            } else {
                topbar.classList.remove('hidden');
            }
        } else if (window.innerWidth <= 768 && topbar) {
            // Keep topbar hidden on mobile
            topbar.classList.add('hidden');
        }

        lastScroll = currentScroll;
    }

    // Run initial scroll check
    setTimeout(handleScroll, 100);

    // Handle window resize
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });

    function openMobileMenu() {
        if (mobileMenu && mobileMenuOverlay) {
            mobileMenu.classList.add('active');
            mobileMenuOverlay.classList.add('active');
            if (mobileMenuToggle) mobileMenuToggle.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeMobileMenu() {
        if (mobileMenu && mobileMenuOverlay) {
            mobileMenu.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    console.log('Header initialized successfully!');
}

// Export function
window.initializeHeader = initializeHeader;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Wait a bit for components to load
    setTimeout(initializeHeader, 200);
});
