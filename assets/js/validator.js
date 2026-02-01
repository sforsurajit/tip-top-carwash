/**
 * Input Validation Module
 * Validates user inputs before processing
 */

const Validator = {
    /**
     * Validate email address
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return re.test(email) && email.length <= 254;
    },

    /**
     * Validate Indian mobile number
     */
    isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove spaces and dashes
        const cleaned = phone.replace(/[\s-]/g, '');
        
        // Indian mobile number: starts with 6-9, 10 digits
        const re = /^[6-9]\d{9}$/;
        return re.test(cleaned);
    },

    /**
     * Validate password strength
     */
    isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;
        
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|\\:;"'<>,.\/])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|\\:;"'<>,.\/]{8,}$/;
        return re.test(password);
    },

    /**
     * Get password strength level
     */
    getPasswordStrength(password) {
        if (!password) return 0;
        
        let strength = 0;
        
        // Length
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (password.length >= 16) strength++;
        
        // Character variety
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[@$!%*?&#^()_+=\-\[\]{}|\\:;"'<>,.\/]/.test(password)) strength++;
        
        return Math.min(strength, 5);
    },

    /**
     * Validate name (letters, spaces, hyphens only)
     */
    isValidName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const re = /^[a-zA-Z\s\-']{2,50}$/;
        return re.test(name.trim());
    },

    /**
     * Validate Indian PIN code
     */
    isValidPinCode(pinCode) {
        if (!pinCode) return false;
        
        const re = /^[1-9][0-9]{5}$/;
        return re.test(pinCode.toString());
    },

    /**
     * Validate date (not in past, not too far in future)
     */
    isValidDate(dateString, options = {}) {
        const {
            allowPast = false,
            maxFutureDays = 365
        } = options;

        const date = new Date(dateString);
        const now = new Date();
        const maxFuture = new Date();
        maxFuture.setDate(maxFuture.getDate() + maxFutureDays);

        if (isNaN(date.getTime())) return false;
        if (!allowPast && date < now) return false;
        if (date > maxFuture) return false;

        return true;
    },

    /**
     * Validate time (HH:MM format)
     */
    isValidTime(time) {
        if (!time || typeof time !== 'string') return false;
        
        const re = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return re.test(time);
    },

    /**
     * Validate URL
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (e) {
            return false;
        }
    },

    /**
     * Validate numeric input
     */
    isValidNumber(value, options = {}) {
        const {
            min = null,
            max = null,
            allowDecimals = true
        } = options;

        const num = Number(value);
        
        if (isNaN(num)) return false;
        if (!allowDecimals && num % 1 !== 0) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;

        return true;
    },

    /**
     * Validate string length
     */
    isValidLength(str, min = 0, max = Infinity) {
        if (typeof str !== 'string') return false;
        const length = str.trim().length;
        return length >= min && length <= max;
    },

    /**
     * Validate car registration number (Indian)
     */
    isValidCarNumber(carNumber) {
        if (!carNumber || typeof carNumber !== 'string') return false;
        
        // Indian format: XX-00-XX-0000 or XX00XX0000
        const re = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{4}$/i;
        return re.test(carNumber.trim());
    },

    /**
     * Sanitize and validate car model name
     */
    isValidCarModel(model) {
        if (!model || typeof model !== 'string') return false;
        
        const re = /^[a-zA-Z0-9\s\-\.]{2,50}$/;
        return re.test(model.trim());
    },

    /**
     * Validate address
     */
    isValidAddress(address) {
        if (!address || typeof address !== 'string') return false;
        
        return address.trim().length >= 10 && address.trim().length <= 200;
    },

    /**
     * Validate form data
     */
    validateForm(formData, rules) {
        const errors = {};

        Object.keys(rules).forEach(field => {
            const value = formData[field];
            const fieldRules = rules[field];

            if (fieldRules.required && !value) {
                errors[field] = `${field} is required`;
                return;
            }

            if (value && fieldRules.type) {
                switch (fieldRules.type) {
                    case 'email':
                        if (!this.isValidEmail(value)) {
                            errors[field] = 'Invalid email address';
                        }
                        break;
                    case 'phone':
                        if (!this.isValidPhone(value)) {
                            errors[field] = 'Invalid phone number';
                        }
                        break;
                    case 'password':
                        if (!this.isValidPassword(value)) {
                            errors[field] = 'Password must be at least 8 characters with uppercase, lowercase, number and special character';
                        }
                        break;
                    case 'name':
                        if (!this.isValidName(value)) {
                            errors[field] = 'Invalid name format';
                        }
                        break;
                }
            }

            if (value && fieldRules.minLength) {
                if (value.length < fieldRules.minLength) {
                    errors[field] = `Minimum length is ${fieldRules.minLength} characters`;
                }
            }

            if (value && fieldRules.maxLength) {
                if (value.length > fieldRules.maxLength) {
                    errors[field] = `Maximum length is ${fieldRules.maxLength} characters`;
                }
            }

            if (value && fieldRules.custom) {
                const customError = fieldRules.custom(value);
                if (customError) {
                    errors[field] = customError;
                }
            }
        });

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// Export for use in other modules
window.Validator = Validator;