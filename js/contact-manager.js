/**
 * Penuel Stopover - Contact & Hours Manager
 * ============================================
 * Manages contact information, operating hours, and inquiry form
 * 100% synchronized with n8n backend for dynamic hours & processing
 */

class ContactManager {
    constructor() {
        this.hoursContainer = document.getElementById('hours-container');
        this.inquiryForm = document.getElementById('inquiry-form');
        this.hoursData = null;
        this.currentStatus = {};
    }

    /**
     * Initialize contact manager
     */
    async init() {
        this.setupEventListeners();
        await this.fetchOperatingHours();
        this.checkCurrentStatus();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Inquiry form submission
        this.inquiryForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Phone input formatting
        document.getElementById('phone')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
        });

        // Back to top button
        window.addEventListener('scroll', () => this.handleBackToTop());
        document.querySelector('.back-to-top')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Update status periodically (every minute)
        setInterval(() => this.checkCurrentStatus(), 60000);
    }

    /**
     * Fetch operating hours from n8n backend
     * Returns: { hours: { restaurant: {...}, supermarket: {...}, etc } }
     */
    async fetchOperatingHours() {
        try {
            this.showHoursLoading();

            const response = await apiCall(PENUEL_CONFIG.HOURS_ENDPOINT);

            if (!response.hours) {
                throw new Error('Invalid response format from n8n');
            }

            this.hoursData = response.hours;
            console.log('✅ Fetched operating hours:', this.hoursData);

            this.renderOperatingHours();

        } catch (error) {
            console.error('❌ Error fetching hours:', error.message);
            this.showHoursEmpty('⚠️ Unable to load hours. Please call us directly.');
            showToast('Failed to load operating hours. Please refresh.', 'error');
        }
    }

    /**
     * Check if business units are currently open/closed
     */
    checkCurrentStatus() {
        if (!this.hoursData) return;

        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes(); // Format: 1430 for 2:30 PM
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

        Object.entries(this.hoursData).forEach(([unit, hours]) => {
            const dayHours = hours[dayOfWeek] || hours['default'];
            
            if (dayHours && dayHours.open && dayHours.close) {
                const openTime = this.timeStringToNumber(dayHours.open);
                const closeTime = this.timeStringToNumber(dayHours.close);
                
                const isOpen = currentTime >= openTime && currentTime < closeTime;
                this.currentStatus[unit] = isOpen ? 'open' : 'closed';
            }
        });

        // Update status display on page
        this.updateStatusDisplay();
    }

    /**
     * Convert time string (HH:MM) to number (HHMM)
     */
    timeStringToNumber(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':');
        return parseInt(hours) * 100 + parseInt(minutes);
    }

    /**
     * Render operating hours to page
     */
    renderOperatingHours() {
        if (!this.hoursContainer || !this.hoursData) return;

        this.hoursContainer.innerHTML = '';

        const unitsConfig = {
            restaurant: { icon: '🍽️', label: 'Restaurant' },
            supermarket: { icon: '🛒', label: 'Supermarket' },
            service_bay: { icon: '🔧', label: 'Service Bay' },
            car_wash: { icon: '💧', label: 'Car Wash' }
        };

        Object.entries(this.hoursData).forEach(([unit, hours]) => {
            if (!unitsConfig[unit]) return;

            const config = unitsConfig[unit];
            const card = this.createHoursCard(unit, config, hours);
            this.hoursContainer.appendChild(card);
        });
    }

    /**
     * Create operating hours card element
     */
    createHoursCard(unit, config, hours) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-3';

        const status = this.currentStatus[unit] || 'open';
        const statusClass = status === 'open' ? 'status-open' : 'status-closed';
        const statusText = status === 'open' ? '✓ Open Now' : '✗ Closed';

        let hoursHtml = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        days.forEach(day => {
            const dayHours = hours[day];
            if (dayHours && dayHours.open && dayHours.close) {
                hoursHtml += `
                    <div class="time-slot">
                        <strong>${day.substring(0, 3)}</strong> ${dayHours.open} - ${dayHours.close}
                    </div>
                `;
            }
        });

        // Add default/emergency hours
        if (hours.emergency) {
            hoursHtml += `
                <div class="time-slot">
                    <strong>24/7 Emergency:</strong> ${hours.emergency}
                </div>
            `;
        }

        col.innerHTML = `
            <div class="hours-card">
                <div class="hours-icon">${config.icon}</div>
                <h5>${config.label}</h5>
                ${hoursHtml}
                <div class="${statusClass}">${statusText}</div>
            </div>
        `;

        return col;
    }

    /**
     * Update status display for all cards
     */
    updateStatusDisplay() {
        this.hoursContainer?.querySelectorAll('.hours-card').forEach((card, index) => {
            const units = ['restaurant', 'supermarket', 'service_bay', 'car_wash'];
            const unit = units[index];
            const status = this.currentStatus[unit];
            
            if (status) {
                const statusEl = card.querySelector('[class*="status-"]');
                if (statusEl) {
                    const statusClass = status === 'open' ? 'status-open' : 'status-closed';
                    const statusText = status === 'open' ? '✓ Open Now' : '✗ Closed';
                    
                    statusEl.className = statusClass;
                    statusEl.textContent = statusText;
                }
            }
        });
    }

    /**
     * Handle inquiry form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();

        try {
            const formData = {
                name: document.getElementById('name')?.value.trim() || '',
                email: document.getElementById('email')?.value.trim() || '',
                phone: document.getElementById('phone')?.value.trim() || '',
                serviceType: document.getElementById('service-type')?.value || '',
                message: document.getElementById('message')?.value.trim() || '',
                timestamp: new Date().toISOString(),
                pageUrl: window.location.href
            };

            // Validate
            if (!this.validateInquiryForm(formData)) return;

            // Show loading state
            const submitBtn = this.inquiryForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

            // Add phone country code
            formData.phone = getPhoneWithCountryCode(formData.phone);

            // Send to N8N
            const response = await apiCall(PENUEL_CONFIG.INQUIRY_ENDPOINT, {
                method: 'POST',
                body: formData,
                headers: {
                    'x-api-key': PENUEL_CONFIG.API_KEY
                }
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to send message');
            }

            // Success
            showSuccess('✅ Message sent successfully! We\'ll contact you soon.');
            
            // Reset form
            this.inquiryForm.reset();
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;

            // Clear form after 3 seconds
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 1000);

        } catch (error) {
            console.error('❌ Form submission error:', error);
            showToast(error.message || 'Failed to send message. Please try again.', 'error');
            
            const submitBtn = this.inquiryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Message';
        }
    }

    /**
     * Validate inquiry form inputs
     */
    validateInquiryForm(data) {
        if (!data.name || data.name.length < 2) {
            showToast('❌ Please enter your full name', 'error');
            return false;
        }

        if (!validateEmail(data.email)) {
            showToast('❌ Please enter a valid email address', 'error');
            return false;
        }

        if (!validatePhone(data.phone)) {
            showToast('❌ Please enter a valid 9-digit phone number', 'error');
            return false;
        }

        if (!data.serviceType) {
            showToast('❌ Please select a service type', 'error');
            return false;
        }

        if (!data.message || data.message.length < 10) {
            showToast('❌ Please enter a message (at least 10 characters)', 'error');
            return false;
        }

        if (!document.getElementById('privacy-check')?.checked) {
            showToast('❌ Please agree to the privacy policy', 'error');
            return false;
        }

        return true;
    }

    /**
     * Show hours loading state
     */
    showHoursLoading() {
        if (!this.hoursContainer) return;
        this.hoursContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading hours...</span>
                    </div>
                    <p class="text-muted mt-3">Loading operating hours...</p>
                </div>
            </div>
        `;
    }

    /**
     * Show empty hours state
     */
    showHoursEmpty(message) {
        if (!this.hoursContainer) return;
        this.hoursContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning text-center" role="alert">
                    ${message}
                </div>
            </div>
        `;
    }

    /**
     * Handle back-to-top button visibility
     */
    handleBackToTop() {
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            if (window.scrollY > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }
    }
}

// ========================================
// INITIALIZE CONTACT MANAGER
// ========================================

const contactManager = new ContactManager();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize contact manager if on contact page
    if (document.getElementById('hours-container') || document.getElementById('inquiry-form')) {
        contactManager.init();
    }
});