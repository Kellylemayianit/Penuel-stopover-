/**
 * Penuel Stopover - Services Manager
 * ============================================
 * Manages Service Bay and Car Wash services
 * 100% synchronized with n8n backend for pricing & availability
 */

class ServicesManager {
    constructor() {
        this.serviceList = document.getElementById('service-list');
        this.washPackages = document.getElementById('wash-packages');
        this.serviceFilters = document.querySelectorAll('#service-filters .btn-outline-success');
        this.washFilters = document.querySelectorAll('#wash-filters .btn-outline-success');
        this.activeServiceCategory = 'all';
        this.activeWashCategory = 'all';
    }

    /**
     * Initialize services manager
     */
    async init() {
        this.setupEventListeners();
        await this.fetchServicesData();
    }

    /**
     * Setup event listeners for filters
     */
    setupEventListeners() {
        // Service category filters
        this.serviceFilters.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleServiceCategoryFilter(e));
        });

        // Wash category filters
        this.washFilters.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleWashCategoryFilter(e));
        });

        // Back to top button
        window.addEventListener('scroll', () => this.handleBackToTop());
        document.querySelector('.back-to-top')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /**
     * Fetch services data from n8n backend
     * Returns: { services: [], wash_packages: [] }
     * Headers include x-api-key for security
     */
    async fetchServicesData() {
        try {
            this.showServicesLoading();
            this.showWashLoading();

            // Fetch services data with API key header
            const response = await apiCall(PENUEL_CONFIG.SERVICES_ENDPOINT, {
                headers: {
                    'x-api-key': PENUEL_CONFIG.API_KEY
                }
            });

            if (!response.services || !response.wash_packages) {
                throw new Error('Invalid response format from n8n');
            }

            // Update APP_STATE with services data
            APP_STATE.services = response.services || [];
            APP_STATE.filteredServices = [...APP_STATE.services];
            APP_STATE.washPackages = response.wash_packages || [];
            APP_STATE.filteredWashPackages = [...APP_STATE.washPackages];

            console.log(`✅ Fetched ${APP_STATE.services.length} services and ${APP_STATE.washPackages.length} wash packages`);

            this.renderServices();
            this.renderWashPackages();

        } catch (error) {
            console.error('❌ Error fetching services data:', error.message);
            this.showServicesEmpty('⚠️ Unable to load services. Please refresh.');
            this.showWashEmpty('⚠️ Unable to load wash packages. Please refresh.');
            showToast('Failed to load services. Please refresh.', 'error');
        }
    }

    /**
     * Handle service category filter
     */
    handleServiceCategoryFilter(e) {
        // Update active button state
        this.serviceFilters.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update active category and apply filter
        this.activeServiceCategory = e.target.dataset.category || 'all';
        this.applyServiceFilters();
    }

    /**
     * Handle wash category filter
     */
    handleWashCategoryFilter(e) {
        // Update active button state
        this.washFilters.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update active category and apply filter
        this.activeWashCategory = e.target.dataset.category || 'all';
        this.applyWashFilters();
    }

    /**
     * Apply service filters based on active category
     */
    applyServiceFilters() {
        const category = this.activeServiceCategory;

        APP_STATE.filteredServices = APP_STATE.services.filter(service => {
            return category === 'all' ||
                (service.category && service.category.toLowerCase() === category.toLowerCase());
        });

        this.renderServices();
    }

    /**
     * Apply wash filters based on active category
     */
    applyWashFilters() {
        const category = this.activeWashCategory;

        APP_STATE.filteredWashPackages = APP_STATE.washPackages.filter(pkg => {
            return category === 'all' ||
                (pkg.category && pkg.category.toLowerCase() === category.toLowerCase());
        });

        this.renderWashPackages();
    }

    /**
     * Render service items to list
     */
    renderServices() {
        if (!this.serviceList) return;

        this.serviceList.innerHTML = '';

        if (APP_STATE.filteredServices.length === 0) {
            this.showServicesEmpty('🔧 No services in this category.');
            return;
        }

        APP_STATE.filteredServices.forEach(service => {
            const card = this.createServiceCard(service);
            this.serviceList.appendChild(card);
        });

        this.serviceList.classList.remove('hidden');
    }

    /**
     * Render wash packages to grid
     */
    renderWashPackages() {
        if (!this.washPackages) return;

        this.washPackages.innerHTML = '';

        if (APP_STATE.filteredWashPackages.length === 0) {
            this.showWashEmpty('💧 No wash packages in this category.');
            return;
        }

        APP_STATE.filteredWashPackages.forEach(pkg => {
            const card = this.createWashCard(pkg);
            this.washPackages.appendChild(card);
        });

        this.washPackages.classList.remove('hidden');
    }

    /**
     * Create service card element
     */
    createServiceCard(service) {
        const col = document.createElement('div');
        col.className = 'col-lg-6 col-md-12';

        const serviceName = service.name || 'Unknown Service';
        const description = service.description || 'Professional service';
        const price = service.price_kes || 0;
        const duration = service.duration_minutes || 30;
        const category = service.category || '';
        const features = service.features || [];
        const status = this.getServiceStatus(service.available || true);

        let featuresHtml = '';
        if (Array.isArray(features) && features.length > 0) {
            featuresHtml = `
                <ul class="service-features">
                    ${features.slice(0, 4).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                </ul>
            `;
        }

        col.innerHTML = `
            <div class="service-card">
                <div class="service-header">
                    <div class="service-icon">
                        <i class="fas fa-tools"></i>
                    </div>
                    <div>
                        <h5>${escapeHtml(serviceName)}</h5>
                        ${category ? `<span class="service-category">${escapeHtml(category)}</span>` : ''}
                    </div>
                </div>
                <p class="service-description">${escapeHtml(description)}</p>
                ${featuresHtml}
                <div class="service-footer">
                    <div>
                        <span class="service-price-label">Price</span>
                        <span class="service-price">KES ${formatPrice(price)}</span>
                    </div>
                    <div class="text-end">
                        <div class="service-time">
                            <i class="fas fa-clock"></i>
                            <span>${duration} mins</span>
                        </div>
                        <span class="status-badge status-${status.cssClass}">
                            ${status.text}
                        </span>
                    </div>
                </div>
            </div>
        `;

        col.querySelector('.service-card').addEventListener('click', () => {
            this.selectService(service);
        });

        return col;
    }

    /**
     * Create wash package card element
     */
    createWashCard(pkg) {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 col-sm-6';

        const packageName = pkg.name || 'Unknown Package';
        const subtitle = pkg.subtitle || 'Complete wash';
        const price = pkg.price_kes || 0;
        const duration = pkg.duration_minutes || 30;
        const category = pkg.category || '';
        const features = pkg.features || [];
        const icon = pkg.icon || '💧';

        let featuresHtml = '';
        if (Array.isArray(features) && features.length > 0) {
            featuresHtml = `
                <ul class="wash-features">
                    ${features.slice(0, 5).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                </ul>
            `;
        }

        col.innerHTML = `
            <div class="wash-package-card">
                <div class="wash-package-icon">${icon}</div>
                <h5 class="wash-package-title">${escapeHtml(packageName)}</h5>
                <p class="wash-package-subtitle">${escapeHtml(subtitle)}</p>
                ${featuresHtml}
                <div class="package-price">KES ${formatPrice(price)}</div>
                <div class="package-duration">
                    <i class="fas fa-hourglass-end"></i>
                    <span>~${duration} minutes</span>
                </div>
                <button class="btn btn-success btn-sm w-100" data-package-id="${escapeHtml(pkg.id || '')}">
                    Book Now
                </button>
            </div>
        `;

        col.querySelector('.btn-success').addEventListener('click', (e) => {
            e.stopPropagation();
            this.bookPackage(pkg);
        });

        col.querySelector('.wash-package-card').addEventListener('click', () => {
            this.selectPackage(pkg);
        });

        return col;
    }

    /**
     * Get service status for display
     */
    getServiceStatus(available) {
        if (!available) {
            return { text: 'Unavailable', cssClass: 'closed' };
        }

        // Check time-based availability (example: closed after 6pm)
        const hour = new Date().getHours();
        if (hour >= 18 || hour < 7) {
            return { text: 'Coming Soon', cssClass: 'busy' };
        }

        return { text: 'Available', cssClass: 'open' };
    }

    /**
     * Handle service selection
     */
    selectService(service) {
        console.log('🔧 Selected service:', service);

        // Send to chat context for AI awareness
        this.updateChatContext('service', service);

        // Show confirmation toast
        showToast(`Selected: ${service.name} - KES ${formatPrice(service.price_kes)}`, 'info');
    }

    /**
     * Handle package selection
     */
    selectPackage(pkg) {
        console.log('💧 Selected package:', pkg);

        // Send to chat context for AI awareness
        this.updateChatContext('wash_package', pkg);

        // Show confirmation toast
        showToast(`Selected: ${pkg.name} - KES ${formatPrice(pkg.price_kes)}`, 'info');
    }

    /**
     * Book wash package (redirect to booking/contact)
     */
    bookPackage(pkg) {
        // Save selected package to state
        if (!window.sessionStorage) {
            localStorage.setItem('penuel_selected_package', JSON.stringify(pkg));
        } else {
            sessionStorage.setItem('penuel_selected_package', JSON.stringify(pkg));
        }

        // Redirect to booking page
        window.location.href = 'contact.html?service=wash&package=' + encodeURIComponent(pkg.id || pkg.name);
    }

    /**
     * Update AI chat context with current page content
     */
    updateChatContext(type, item) {
        if (!window.chatState) {
            window.chatState = {};
        }

        window.chatState.context = {
            page: 'services',
            type: type,
            selectedItem: item.name,
            price: item.price_kes,
            duration: item.duration_minutes || item.duration || '',
            category: item.category,
            timestamp: new Date().toISOString()
        };

        console.log('💬 Chat context updated:', window.chatState.context);
    }

    /**
     * Show services loading state
     */
    showServicesLoading() {
        if (!this.serviceList) return;
        this.serviceList.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading services...</span>
                    </div>
                    <p class="text-muted mt-3">Loading services...</p>
                </div>
            </div>
        `;
    }

    /**
     * Show wash loading state
     */
    showWashLoading() {
        if (!this.washPackages) return;
        this.washPackages.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading packages...</span>
                    </div>
                    <p class="text-muted mt-3">Loading wash packages...</p>
                </div>
            </div>
        `;
    }

    /**
     * Show empty services state
     */
    showServicesEmpty(message) {
        if (!this.serviceList) return;
        this.serviceList.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">🔧</div>
                    <p class="empty-state-text">${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * Show empty wash state
     */
    showWashEmpty(message) {
        if (!this.washPackages) return;
        this.washPackages.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">💧</div>
                    <p class="empty-state-text">${message}</p>
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
// INITIALIZE SERVICES MANAGER
// ========================================

const servicesManager = new ServicesManager();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize services manager if on services page
    if (document.getElementById('service-list') || document.getElementById('wash-packages')) {
        servicesManager.init();
    }
});