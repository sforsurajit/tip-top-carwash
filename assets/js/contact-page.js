/**
 * Contact Page JavaScript
 * Handles form validation, submission, and page interactions
 */

(function () {
    'use strict';

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initContactForm();
        console.log('Contact page initialized');
    }

    /**
     * Contact Form validation and submission
     */
    function initContactForm() {
        const form = document.getElementById('contact-form');
        const successMessage = document.getElementById('form-success');
        const errorMessage = document.getElementById('form-error');

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Hide any previous messages
            if (successMessage) successMessage.style.display = 'none';
            if (errorMessage) errorMessage.style.display = 'none';

            // Get form data
            const formData = {
                name: form.name.value.trim(),
                phone: form.phone.value.trim(),
                email: form.email.value.trim(),
                subject: form.subject.value,
                message: form.message.value.trim()
            };

            // Validate form
            if (!validateForm(formData)) {
                return;
            }

            // Disable submit button while processing
            const submitBtn = form.querySelector('.form-submit');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Sending...</span>';

            try {
                // In a real implementation, you would send to your backend API
                // For now, we'll simulate a successful submission
                await simulateSubmission(formData);

                // Show success message
                if (successMessage) {
                    successMessage.style.display = 'flex';
                    form.reset();

                    // Scroll to success message
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

            } catch (error) {
                console.error('Form submission error:', error);

                // Show error message
                if (errorMessage) {
                    errorMessage.style.display = 'flex';
                    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } finally {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    /**
     * Validate form data
     */
    function validateForm(data) {
        // Name validation
        if (!data.name || data.name.length < 2) {
            alert('Please enter your full name (at least 2 characters)');
            return false;
        }

        // Phone validation (basic Indian phone number format)
        const phoneRegex = /^[+]?[0-9]{10,13}$/;
        if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ''))) {
            alert('Please enter a valid phone number');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            alert('Please enter a valid email address');
            return false;
        }

        // Subject validation
        if (!data.subject) {
            alert('Please select a subject');
            return false;
        }

        // Message validation
        if (!data.message || data.message.length < 10) {
            alert('Please enter a message (at least 10 characters)');
            return false;
        }

        return true;
    }

    /**
     * Simulate form submission
     * In production, replace this with actual API call
     */
    function simulateSubmission(data) {
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => {
                console.log('Form submitted with data:', data);
                resolve({ success: true });
            }, 1500);
        });
    }

    /**
     * Real API submission (template for actual implementation)
     */
    async function submitToAPI(data) {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to submit form');
        }

        return await response.json();
    }

})();
