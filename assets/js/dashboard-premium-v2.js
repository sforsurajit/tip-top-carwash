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
     * Initialize profile avatar
     */
    function initProfile() {
        const customerData = localStorage.getItem('customer_data');
        if (customerData) {
            try {
                const customer = JSON.parse(customerData);
                const profileImage = document.getElementById('profile-image');
                const greetingName = document.getElementById('greeting-name');

                if (customer.name) {
                    // Update profile image
                    if (profileImage) {
                        profileImage.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=ff6b35&color=fff&size=128`;
                    }

                    // Update greeting name
                    if (greetingName) {
                        greetingName.textContent = customer.name.split(' ')[0] || customer.name;
                    }
                } else if (customer.phone) {
                    // Use phone number
                    if (greetingName) {
                        greetingName.textContent = formatPhoneDisplay(customer.phone);
                    }
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
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.slice(0, 5)}...${cleaned.slice(-2)}`;
        }
        return phone;
    }

    // Expose functions globally if needed
    window.PremiumDashboardUI = {
        switchSection,
        updateNotificationCount
    };
})();
