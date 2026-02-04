/**
 * TIP.TOP Premium Dashboard V2 - JavaScript
 * Handles UI interactions and integrates with dashboard-core.js
 */

(function () {
    'use strict';

    // Wait for DOM and DashboardCore to be ready
    document.addEventListener('DOMContentLoaded', function () {
        console.log('🎨 Initializing Premium Dashboard UI...');

        // Initialize navigation
        initNavigation();

        // Initialize profile
        initProfile();

        // Initialize notification count
        updateNotificationCount();

        console.log('✅ Premium Dashboard UI initialized');
    });

    /**
     * Initialize navigation (sidebar and view all links)
     */
    function initNavigation() {
        // Sidebar menu items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const section = this.dataset.section;
                switchSection(section);
            });
        });

        // View all link
        const viewAllLinks = document.querySelectorAll('.view-all-link');
        viewAllLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const section = this.dataset.section;
                if (section) {
                    switchSection(section);
                }
            });
        });
    }

    /**
     * Switch between sections
     */
    function switchSection(sectionName) {
        // Update menu items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update content sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            if (section.id === `section-${sectionName}`) {
                section.classList.add('active');
                section.classList.remove('hidden');
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Initialize profile avatar and dropdown
     */
    function initProfile() {
        const customerData = localStorage.getItem('customer_data');
        if (customerData) {
            try {
                const customer = JSON.parse(customerData);

                // Update header user name
                const headerUserName = document.getElementById('header-user-name');
                const avatarLetter = document.getElementById('user-avatar-letter');
                const greetingName = document.getElementById('greeting-name');

                if (customer.name) {
                    // Update avatar with first letter
                    if (avatarLetter) {
                        avatarLetter.textContent = customer.name.charAt(0).toUpperCase();
                    }

                    // Update header name (first name only)
                    if (headerUserName) {
                        headerUserName.textContent = customer.name.split(' ')[0];
                    }

                    // Update greeting name
                    if (greetingName) {
                        greetingName.textContent = customer.name.split(' ')[0] || customer.name;
                    }
                } else if (customer.phone) {
                    // Use phone number if no name
                    if (avatarLetter) {
                        avatarLetter.textContent = '?';
                    }
                    if (headerUserName) {
                        headerUserName.textContent = formatPhoneDisplay(customer.phone);
                    }
                    if (greetingName) {
                        greetingName.textContent = formatPhoneDisplay(customer.phone);
                    }
                }

                // Update dropdown header
                const dropdownUserName = document.getElementById('dropdown-user-name');
                const dropdownUserPhone = document.getElementById('dropdown-user-phone');

                if (dropdownUserName) {
                    dropdownUserName.textContent = customer.name || 'Guest';
                }

                if (dropdownUserPhone && customer.phone) {
                    dropdownUserPhone.textContent = formatPhoneDisplay(customer.phone);
                }
            } catch (e) {
                console.error('Error parsing customer data:', e);
            }
        }
    }

    /**
     * Update notification count
     */
    function updateNotificationCount() {
        // This would be connected to actual notification data
        // For now, we'll check if there are any pending bookings
        const notificationBadge = document.getElementById('notification-count');
        if (notificationBadge && typeof DashboardCore !== 'undefined') {
            // You can update this based on actual notification logic
            notificationBadge.textContent = '0';
        }
    }

    /**
     * Format phone number for display
     */
    function formatPhoneDisplay(phone) {
        if (!phone) return 'Guest';
        return `+91 ${phone}`;
    }

    // Expose functions globally if needed
    window.PremiumDashboardUI = {
        switchSection,
        updateNotificationCount
    };
})();
