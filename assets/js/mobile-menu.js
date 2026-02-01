/**
 * Mobile Menu Toggle Functionality
 */

(function () {
    'use strict';

    // Wait for DOM to be ready
    function initMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const closeMenuBtn = document.getElementById('close-menu');
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

        if (!menuToggle || !mobileMenu || !mobileMenuOverlay) {
            console.log('Mobile menu elements not found');
            return;
        }

        // Open mobile menu
        function openMenu() {
            menuToggle.classList.add('active');
            mobileMenu.classList.add('active');
            mobileMenuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
        }

        // Close mobile menu
        function closeMenu() {
            menuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }

        // Toggle menu
        menuToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            if (mobileMenu.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Close menu when clicking overlay
        mobileMenuOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking close button
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', closeMenu);
        }

        // Close menu when clicking a nav link
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function () {
                closeMenu();
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                closeMenu();
            }
        });

        // Close menu when window is resized to desktop size
        window.addEventListener('resize', function () {
            if (window.innerWidth > 1024 && mobileMenu.classList.contains('active')) {
                closeMenu();
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

    // Expose globally for component loader
    window.initializeMobileMenu = initMobileMenu;
})();
