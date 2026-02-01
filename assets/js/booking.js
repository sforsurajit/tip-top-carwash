/**
 * Booking Module
 * Handles car wash booking with security
 */

function handleBooking(serviceId = null) {
    if (!isAuthenticated()) {
        showNotification('Please login to book a service', 'info');
        openAuthModal();
        return;
    }
    
    openBookingModal(serviceId);
}

function openBookingModal(serviceId) {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    const modalContent = `
        <div class="modal-content">
            <span class="close-modal" onclick="closeBookingModal()">&times;</span>
            <h2 id="booking-modal-title">Book Car Wash Service</h2>
            
            <form id="bookingForm" onsubmit="submitBooking(event)">
                <input type="hidden" id="booking-service-id" value="${serviceId || ''}">
                
                <div class="form-group">
                    <label>Select Service *</label>
                    <select id="booking-service" required>
                        <option value="">Choose a service</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Car Type *</label>
                    <select id="booking-car-type" required>
                        <option value="">Select car type</option>
                        <option value="hatchback">Hatchback</option>
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="luxury">Luxury</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Car Model *</label>
                    <input type="text" id="booking-car-model" placeholder="e.g., Maruti Swift" required>
                </div>
                
                <div class="form-group">
                    <label>Car Number (Optional)</label>
                    <input type="text" id="booking-car-number" placeholder="e.g., AS-01-AB-1234">
                </div>
                
                <div class="form-group">
                    <label>Location/Address *</label>
                    <textarea id="booking-location" rows="3" placeholder="Enter your full address" required></textarea>
                </div>
                
                <div class="form-group">
                    <label>Preferred Date *</label>
                    <input type="date" id="booking-date" required>
                </div>
                
                <div class="form-group">
                    <label>Preferred Time *</label>
                    <select id="booking-time" required>
                        <option value="">Select time slot</option>
                        <option value="07:00">7:00 AM</option>
                        <option value="08:00">8:00 AM</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Special Instructions (Optional)</label>
                    <textarea id="booking-notes" rows="2" maxlength="500" placeholder="Any special requirements or notes"></textarea>
                </div>
                
                <div class="booking-summary" id="booking-summary" style="display:none;">
                    <h3>Booking Summary</h3>
                    <div class="summary-item">
                        <span>Service:</span>
                        <span id="summary-service"></span>
                    </div>
                    <div class="summary-item">
                        <span>Date & Time:</span>
                        <span id="summary-datetime"></span>
                    </div>
                    <div class="summary-item">
                        <span>Total Amount:</span>
                        <span class="price" id="summary-price">₹0</span>
                    </div>
                </div>
                
                <button type="submit" class="btn-primary btn-block">Confirm Booking</button>
            </form>
        </div>
    `;

    modal.innerHTML = modalContent;
    modal.classList.add('active');
    
    // Load services
    loadServicesForBooking(serviceId);
    
    // Set minimum date to today
    const dateInput = document.getElementById('booking-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    // Update summary on change
    const formInputs = ['booking-service', 'booking-date', 'booking-time'];
    formInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', updateBookingSummary);
        }
    });
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function loadServicesForBooking(selectedServiceId) {
    try {
        const response = await secureFetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SERVICES.LIST}`
        );
        
        const data = await response.json();
        
        if (data.success && data.services) {
            const select = document.getElementById('booking-service');
            
            data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.name} - ₹${service.price}`;
                option.dataset.price = service.price;
                option.dataset.name = service.name;
                
                if (service.id == selectedServiceId) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
            if (selectedServiceId) {
                updateBookingSummary();
            }
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function updateBookingSummary() {
    const serviceSelect = document.getElementById('booking-service');
    const dateInput = document.getElementById('booking-date');
    const timeInput = document.getElementById('booking-time');
    const summaryDiv = document.getElementById('booking-summary');
    
    if (!serviceSelect.value || !dateInput.value || !timeInput.value) {
        summaryDiv.style.display = 'none';
        return;
    }
    
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const serviceName = selectedOption.dataset.name;
    const price = selectedOption.dataset.price;
    
    const date = new Date(dateInput.value);
    const formattedDate = date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const timeValue = timeInput.value;
    const timeOption = timeInput.options[timeInput.selectedIndex];
    const timeLabel = timeOption.textContent;
    
    document.getElementById('summary-service').textContent = serviceName;
    document.getElementById('summary-datetime').textContent = `${formattedDate} at ${timeLabel}`;
    document.getElementById('summary-price').textContent = `₹${price}`;
    
    summaryDiv.style.display = 'block';
}

async function submitBooking(event) {
    event.preventDefault();
    
    const formData = {
        service_id: document.getElementById('booking-service').value,
        car_type: document.getElementById('booking-car-type').value,
        car_model: document.getElementById('booking-car-model').value.trim(),
        car_number: document.getElementById('booking-car-number').value.trim(),
        location: document.getElementById('booking-location').value.trim(),
        booking_date: document.getElementById('booking-date').value,
        booking_time: document.getElementById('booking-time').value,
        notes: document.getElementById('booking-notes').value.trim()
    };
    
    // Validate car model
    if (!Validator.isValidCarModel(formData.car_model)) {
        showNotification('Please enter a valid car model', 'error');
        return;
    }
    
    // Validate car number if provided
    if (formData.car_number && !Validator.isValidCarNumber(formData.car_number)) {
        showNotification('Please enter a valid car number (e.g., AS-01-AB-1234)', 'error');
        return;
    }
    
    // Validate address
    if (!Validator.isValidAddress(formData.location)) {
        showNotification('Please enter a complete address (minimum 10 characters)', 'error');
        return;
    }
    
    // Validate date
    if (!Validator.isValidDate(formData.booking_date)) {
        showNotification('Please select a valid date', 'error');
        return;
    }
    
    // Sanitize inputs
    formData.car_model = Security.sanitizeHtml(formData.car_model);
    formData.car_number = Security.sanitizeHtml(formData.car_number);
    formData.location = Security.sanitizeHtml(formData.location);
    formData.notes = Security.sanitizeHtml(formData.notes);
    
    try {
        await bookingRateLimiter.throttle('booking', async () => {
            showLoader();
            
            const response = await secureFetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKING.CREATE}`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Booking created successfully!', 'success');
                closeBookingModal();
                
                // Show booking confirmation
                showBookingConfirmation(data.booking);
            } else {
                showNotification(data.message || 'Booking failed', 'error');
            }
            
            hideLoader();
        });
    } catch (error) {
        hideLoader();
        handleApiError(error, 'Booking');
    }
}

function showBookingConfirmation(booking) {
    const confirmationHtml = `
        <div class="booking-confirmation">
            <div class="success-icon">✓</div>
            <h2>Booking Confirmed!</h2>
            <p>Your booking ID is: <strong>${booking.id}</strong></p>
            <p>We'll arrive at your location on ${booking.date} at ${booking.time}</p>
            <button class="btn-primary" onclick="window.location.reload()">Done</button>
        </div>
    `;
    
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.innerHTML = `<div class="modal-content">${confirmationHtml}</div>`;
    }
}