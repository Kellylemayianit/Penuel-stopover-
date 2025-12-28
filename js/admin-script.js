/**
 * Penuel Stopover - Admin Dashboard Manager
 * ============================================
 * Manages pricing, availability, and business settings
 * 100% synchronized with n8n backend
 * Secure authentication required
 */

class AdminManager {
    constructor() {
        this.authForm = document.getElementById('auth-form');
        this.authScreen = document.getElementById('auth-screen');
        this.adminDashboard = document.getElementById('admin-dashboard');
        this.saveBtn = document.getElementById('save-all-btn');
        this.discardBtn = document.getElementById('discard-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.isAuthenticated = false;
        this.adminToken = localStorage.getItem('penuel_admin_token');
        this.changedItems = new Map();
    }

    /**
     * Initialize admin manager
     */
    async init() {
        // Check if already authenticated
        if (this.adminToken) {
            await this.verifyToken();
        } else {
            this.setupAuthListeners();
        }
    }

    /**
     * Setup authentication form listeners
     */
    setupAuthListeners() {
        this.authForm?.addEventListener('submit', (e) => this.handleLogin(e));
    }

    /**
     * Handle login submission
     */
    async handleLogin(e) {
        e.preventDefault();

        try {
            const username = document.getElementById('auth-username')?.value.trim() || '';
            const password = document.getElementById('auth-password')?.value.trim() || '';

            if (!username || !password) {
                this.showAuthError('Please enter both username and password');
                return;
            }

            const authError = document.getElementById('auth-error');
            const submitBtn = this.authForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            // Call authentication endpoint
            const response = await apiCall(PENUEL_CONFIG.ADMIN_AUTH_ENDPOINT, {
                method: 'POST',
                body: {
                    username: username,
                    password: password,
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'x-api-key': PENUEL_CONFIG.API_KEY
                }
            });

            if (!response.success || !response.token) {
                throw new Error(response.message || 'Authentication failed');
            }

            // Store token and username
            localStorage.setItem('penuel_admin_token', response.token);
            localStorage.setItem('penuel_admin_user', username);
            this.adminToken = response.token;

            // Show dashboard
            this.showDashboard(username);
            console.log('✅ Admin authenticated successfully');

        } catch (error) {
            console.error('❌ Login error:', error);
            this.showAuthError(error.message || 'Invalid credentials. Please try again.');
            const submitBtn = this.authForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
        }
    }

    /**
     * Verify existing token with backend
     */
    async verifyToken() {
        try {
            const response = await apiCall(PENUEL_CONFIG.ADMIN_VERIFY_ENDPOINT, {
                headers: {
                    'x-api-key': PENUEL_CONFIG.API_KEY,
                    'x-admin-token': this.adminToken
                }
            });

            if (response.success) {
                const username = localStorage.getItem('penuel_admin_user') || 'Manager';
                this.showDashboard(username);
                console.log('✅ Token verified');
            } else {
                this.logout();
            }

        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
        }
    }

    /**
     * Show admin dashboard
     */
    async showDashboard(username) {
        this.authScreen.classList.add('d-none');
        this.adminDashboard.classList.remove('d-none');
        document.getElementById('user-info').textContent = `Welcome, ${username}!`;

        this.setupDashboardListeners();
        await this.loadAllData();
    }

    /**
     * Setup dashboard event listeners
     */
    setupDashboardListeners() {
        this.saveBtn?.addEventListener('click', () => this.saveAllChanges());
        this.discardBtn?.addEventListener('click', () => this.discardChanges());
        this.logoutBtn?.addEventListener('click', () => this.logout());
    }

    /**
     * Load all management data from backend
     */
    async loadAllData() {
        try {
            console.log('📊 Loading management data...');

            const response = await apiCall(PENUEL_CONFIG.ADMIN_DATA_ENDPOINT, {
                headers: {
                    'x-admin-token': this.adminToken,
                    'x-api-key': PENUEL_CONFIG.API_KEY
                }
            });

            if (response.menu) {
                this.renderItems('restaurant-items', response.menu, 'restaurant');
            }

            if (response.products) {
                this.renderItems('supermarket-items', response.products, 'supermarket');
            }

            if (response.services) {
                this.renderItems('service-items', response.services, 'service');
            }

            if (response.wash_packages) {
                this.renderItems('wash-items', response.wash_packages, 'wash');
            }

            if (response.settings) {
                this.renderSettings(response.settings);
            }

            console.log('✅ Data loaded successfully');

        } catch (error) {
            console.error('❌ Error loading data:', error);
            showToast('Failed to load management data. Please refresh.', 'error');
        }
    }

    /**
     * Render items/products for management
     */
    renderItems(containerId, items, type) {
        const container = document.getElementById(containerId);
        if (!container || !Array.isArray(items)) return;

        container.innerHTML = '';

        items.forEach(item => {
            const row = this.createItemRow(item, type);
            container.appendChild(row);
        });
    }

    /**
     * Create item management row
     */
    createItemRow(item, type) {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.dataset.itemId = item.id;
        row.dataset.itemType = type;

        const name = item.name || 'Unknown';
        const price = item.price_kes || 0;
        const isOutOfStock = !item.available || item.stock_level === 0;

        row.innerHTML = `
            <div class="item-name">${escapeHtml(name)}</div>
            <div>
                <label class="form-label small">Price (KES)</label>
                <input type="number" class="form-control item-price" value="${price}" min="0" step="100">
            </div>
            <div>
                <label class="form-label small">Stock</label>
                <input type="number" class="form-control item-stock" value="${item.stock_level || 0}" min="0">
            </div>
            <div class="item-status">
                <label class="form-label small">Out of Stock</label>
                <div class="form-check form-switch">
                    <input class="form-check-input out-of-stock-check" type="checkbox" ${isOutOfStock ? 'checked' : ''}>
                </div>
            </div>
            <div class="status-badge ${isOutOfStock ? 'status-inactive' : 'status-active'}">
                ${isOutOfStock ? 'INACTIVE' : 'ACTIVE'}
            </div>
        `;

        // Track changes
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => this.trackChange(item.id, type, row));
        });

        return row;
    }

    /**
     * Render business settings
     */
    renderSettings(settings) {
        // Contact info
        const phoneInput = document.getElementById('setting-phone');
        const emailInput = document.getElementById('setting-email');

        if (phoneInput) phoneInput.value = settings.phone || '';
        if (emailInput) emailInput.value = settings.email || '';

        // Operating hours
        this.renderHoursEditor(settings.hours || {});

        // Track setting changes
        phoneInput?.addEventListener('change', () => {
            this.changedItems.set('settings-phone', phoneInput.value);
        });

        emailInput?.addEventListener('change', () => {
            this.changedItems.set('settings-email', emailInput.value);
        });
    }

    /**
     * Render hours editor
     */
    renderHoursEditor(hours) {
        const container = document.getElementById('hours-editor');
        if (!container) return;

        container.innerHTML = '';

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        days.forEach(day => {
            const dayHours = hours[day] || { open: '07:00', close: '18:00' };

            const row = document.createElement('div');
            row.className = 'hours-editor-row';

            row.innerHTML = `
                <div>
                    <label class="form-label">${day}</label>
                </div>
                <div>
                    <input type="time" class="form-control hours-open" value="${dayHours.open}" data-day="${day}">
                </div>
                <div>
                    <input type="time" class="form-control hours-close" value="${dayHours.close}" data-day="${day}">
                </div>
            `;

            container.appendChild(row);

            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', () => {
                    this.changedItems.set(`hours-${day}`, {
                        open: row.querySelector('.hours-open').value,
                        close: row.querySelector('.hours-close').value
                    });
                });
            });
        });
    }

    /**
     * Track changes to an item
     */
    trackChange(itemId, type, row) {
        const price = row.querySelector('.item-price').value;
        const stock = row.querySelector('.item-stock').value;
        const outOfStock = row.querySelector('.out-of-stock-check').checked;

        this.changedItems.set(`${type}-${itemId}`, {
            id: itemId,
            type: type,
            price: parseInt(price) || 0,
            stock: parseInt(stock) || 0,
            outOfStock: outOfStock
        });

        // Update status badge
        const badge = row.querySelector('.status-badge');
        if (badge) {
            if (outOfStock) {
                badge.className = 'status-badge status-inactive';
                badge.textContent = 'INACTIVE';
            } else {
                badge.className = 'status-badge status-active';
                badge.textContent = 'ACTIVE';
            }
        }

        console.log('📝 Change tracked:', itemId, { price, stock, outOfStock });
    }

    /**
     * Save all changes to backend
     */
    async saveAllChanges() {
        try {
            if (this.changedItems.size === 0) {
                showToast('No changes to save', 'info');
                return;
            }

            const submitBtn = this.saveBtn;
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            // Prepare payload
            const payload = {
                items: Array.from(this.changedItems.values()),
                settings: {},
                timestamp: new Date().toISOString()
            };

            // Add settings if changed
            const phoneVal = document.getElementById('setting-phone')?.value;
            const emailVal = document.getElementById('setting-email')?.value;

            if (this.changedItems.has('settings-phone') || this.changedItems.has('settings-email')) {
                payload.settings = {
                    phone: phoneVal,
                    email: emailVal
                };
            }

            // Add hours if changed
            payload.hours = {};
            this.changedItems.forEach((value, key) => {
                if (key.startsWith('hours-')) {
                    const day = key.replace('hours-', '');
                    payload.hours[day] = value;
                }
            });

            // Send to backend
            const response = await apiCall(PENUEL_CONFIG.ADMIN_SAVE_ENDPOINT, {
                method: 'POST',
                body: payload,
                headers: {
                    'x-admin-token': this.adminToken,
                    'x-api-key': PENUEL_CONFIG.API_KEY
                }
            });

            if (!response.success) {
                throw new Error(response.message || 'Save failed');
            }

            // Success
            showSuccess('✅ All changes saved successfully!');
            this.changedItems.clear();

            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;

            // Optionally sync with AI
            await this.syncWithAI();

        } catch (error) {
            console.error('❌ Save error:', error);
            showToast(error.message || 'Failed to save changes', 'error');
            const submitBtn = this.saveBtn;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save All Changes';
        }
    }

    /**
     * Sync updated data with AI engine
     */
    async syncWithAI() {
        try {
            console.log('🧠 Syncing with AI engine...');

            await apiCall(PENUEL_CONFIG.AI_SYNC_ENDPOINT, {
                method: 'POST',
                body: {
                    action: 'update_knowledge',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'x-admin-token': this.adminToken,
                    'x-api-key': PENUEL_CONFIG.API_KEY
                }
            });

            console.log('✅ AI engine synced');

        } catch (error) {
            console.error('AI sync warning (non-blocking):', error.message);
        }
    }

    /**
     * Discard changes
     */
    discardChanges() {
        if (this.changedItems.size === 0) {
            showToast('No changes to discard', 'info');
            return;
        }

        if (confirm('Are you sure you want to discard all unsaved changes?')) {
            this.changedItems.clear();
            location.reload();
        }
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('penuel_admin_token');
        localStorage.removeItem('penuel_admin_user');
        window.location.href = 'index.html';
    }

    /**
     * Show authentication error
     */
    showAuthError(message) {
        const errorEl = document.getElementById('auth-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('d-none');

            setTimeout(() => {
                errorEl.classList.add('d-none');
            }, 5000);
        }
    }
}

// ========================================
// INITIALIZE ADMIN MANAGER
// ========================================

const adminManager = new AdminManager();

document.addEventListener('DOMContentLoaded', () => {
    adminManager.init();
});