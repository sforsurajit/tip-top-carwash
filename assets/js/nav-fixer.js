/**
 * Navigation Path Fixer
 * Dynamically fixes navbar link paths based on current page location
 * and highlights the active page
 */

(function () {
    'use strict';

    // Wait for navbar to be loaded
    function initNavigationFixer() {
        const navbar = document.querySelector('.navbar');
        const mobileMenu = document.querySelector('.mobile-menu');

        if (!navbar || !mobileMenu) {
            console.log('Navbar not loaded yet, retrying...');
            setTimeout(initNavigationFixer, 100);
            return;
        }

        console.log('Navigation fixer initializing...');

        // Detect if we're in a subdirectory (pages/)
        const currentPath = window.location.pathname;
        const isInPagesDir = currentPath.includes('/pages/');
        const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);

        console.log('Current path:', currentPath);
        console.log('Is in pages dir:', isInPagesDir);
        console.log('Current page:', currentPage);

        // Fix navbar links
        fixNavigationLinks(isInPagesDir, currentPage);

        console.log('Navigation links fixed successfully!');
    }

    function fixNavigationLinks(isInPagesDir, currentPage) {
        // Get all nav links (desktop and mobile)
        const desktopLinks = document.querySelectorAll('.nav-links a');
        const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

        // Define the correct paths
        const pathConfig = {
            'home': {
                rootPath: 'index.html',
                pagesPath: '../index.html',
                pattern: /index\.html|^\/$|^$/
            },
            'services': {
                rootPath: 'pages/services.html',
                pagesPath: 'services.html',
                pattern: /services\.html/
            },
            'how-it-works': {
                rootPath: 'pages/how-it-works.html',
                pagesPath: 'how-it-works.html',
                pattern: /how-it-works\.html/
            },
            'contact': {
                rootPath: 'pages/contact.html',
                pagesPath: 'contact.html',
                pattern: /contact\.html/
            }
        };

        // Fix desktop nav links
        desktopLinks.forEach(link => {
            const href = link.getAttribute('href');

            // Skip anchor links (#why-choose-us, etc.)
            if (href.startsWith('#')) {
                // For anchor links, go to index page first if we're in pages dir
                if (isInPagesDir) {
                    link.setAttribute('href', '../index.html' + href);
                }
                return;
            }

            // Update paths based on location
            Object.keys(pathConfig).forEach(key => {
                const config = pathConfig[key];
                if (config.pattern.test(href)) {
                    const newPath = isInPagesDir ? config.pagesPath : config.rootPath;
                    link.setAttribute('href', newPath);

                    // Check if this is the active page
                    if (config.pattern.test(currentPage)) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                }
            });
        });

        // Fix mobile nav links
        mobileLinks.forEach(link => {
            const href = link.getAttribute('href');

            // Skip anchor links
            if (href.startsWith('#')) {
                // For anchor links, go to index page first if we're in pages dir
                if (isInPagesDir) {
                    link.setAttribute('href', '../index.html' + href);
                }
                return;
            }

            // Update paths based on location
            Object.keys(pathConfig).forEach(key => {
                const config = pathConfig[key];
                if (config.pattern.test(href)) {
                    const newPath = isInPagesDir ? config.pagesPath : config.rootPath;
                    link.setAttribute('href', newPath);

                    // Check if this is the active page
                    if (config.pattern.test(currentPage)) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                }
            });
        });

        // Special case: if on index page, highlight Home
        if (currentPage === '' || currentPage === 'index.html' || currentPage === '/') {
            document.querySelectorAll('.nav-links a, .mobile-nav-links a').forEach(link => {
                const href = link.getAttribute('href');
                if (href === 'index.html' || href === '../index.html') {
                    link.classList.add('active');
                } else if (!href.startsWith('#')) {
                    link.classList.remove('active');
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigationFixer);
    } else {
        initNavigationFixer();
    }
})();
