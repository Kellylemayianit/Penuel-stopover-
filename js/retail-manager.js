/**
 * Penuel Stopover - Retail Manager
 * ============================================
 * Manages restaurant menu and supermarket catalog
 * 100% synchronized with n8n backend for pricing & availability
 */

class RetailManager {
    constructor() {
        this.menuGrid = document.getElementById('menu-grid');
        this.retailList = document.getElementById('retail-list');
        this.restaurantFilters = document.querySelectorAll('#restaurant-filters .btn-outline-success');
        this.retailFilters = document.querySelectorAll('#retail-filters .btn-outline-success');
        this.activeMenuCategory = 'all';
        this.activeRetailCategory = 'all';
        this.debounceTimer = null;
    }

    /**
     * Initialize retail manager
     */
    async init() {
        this.setupEventListeners();
        await this.fetchRetailData();
    }

    /**
     * Setup event listeners for filters
     */
    setupEventListeners() {
        // Restaurant category filters
        this.restaurantFilters.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleMenuCategoryFilter(e));
        });

        // Supermarket category filters
        this.retailFilters.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRetailCategoryFilter(e));
        });

        // Back to top button
        window.addEventListener('scroll', () => this.handleBackToTop());
        document.querySelector('.back-to-top')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /**
     * Fetch retail data from n8n backend
     * Returns: { menu: [], products: [] }
     */
    async fetchRetailData() {
        try {
            this.showMenuLoading();
            this.showRetailLoading();

            // Fetch both menu and retail data
            const response = await apiCall(PENUEL_CONFIG.RETAIL_ENDPOINT);

            if (!response.menu || !response.products) {
                throw new Error('Invalid response format from n8n');
            }

            // Update APP_STATE with retail data
            APP_STATE.menu = response.menu || [];
            APP_STATE.filteredMenu = [...APP_STATE.menu];
            APP_STATE.products = response.products || [];
            APP_STATE.filteredProducts = [...APP_STATE.products];

            console.log(`✅ Fetched ${APP_STATE.menu.length} menu items and ${APP_STATE.products.length} products`);

            this.renderMenuItems();
            this.renderRetailItems();

        } catch (error) {
            console.error('❌ Error fetching retail data:', error.message);
            this.showMenuEmpty('⚠️ Unable to load menu. Please refresh.');
            this.showRetailEmpty('⚠️ Unable to load products. Please refresh.');
            showToast('Failed to load items. Please refresh.', 'error');
        }
    }

    /**
     * Handle restaurant menu category filter
     */
    handleMenuCategoryFilter(e) {
        // Update active button state
        this.restaurantFilters.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update active category and apply filter
        this.activeMenuCategory = e.target.dataset.category || 'all';
        this.applyMenuFilters();
    }

    /**
     * Handle supermarket category filter
     */
    handleRetailCategoryFilter(e) {
        // Update active button state
        this.retailFilters.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update active category and apply filter
        this.activeRetailCategory = e.target.dataset.category || 'all';
        this.applyRetailFilters();
    }

    /**
     * Apply menu filters based on active category
     */
    applyMenuFilters() {
        const category = this.activeMenuCategory;

        APP_STATE.filteredMenu = APP_STATE.menu.filter(item => {
            return category === 'all' ||
                (item.category && item.category.toLowerCase() === category.toLowerCase());
        });

        this.renderMenuItems();
    }

    /**
     * Apply retail filters based on active category
     */
    applyRetailFilters() {
        const category = this.activeRetailCategory;

        APP_STATE.filteredProducts = APP_STATE.products.filter(product => {
            return category === 'all' ||
                (product.category && product.category.toLowerCase() === category.toLowerCase());
        });

        this.renderRetailItems();
    }

    /**
     * Render restaurant menu items to grid
     */
    renderMenuItems() {
        if (!this.menuGrid) return;

        this.menuGrid.innerHTML = '';

        if (APP_STATE.filteredMenu.length === 0) {
            this.showMenuEmpty('🍽️ No menu items in this category.');
            return;
        }

        APP_STATE.filteredMenu.forEach(item => {
            const card = this.createMenuCard(item);
            this.menuGrid.appendChild(card);
        });

        this.menuGrid.classList.remove('hidden');
    }

    /**
     * Render supermarket items to list
     */
    renderRetailItems() {
        if (!this.retailList) return;

        this.retailList.innerHTML = '';

        if (APP_STATE.filteredProducts.length === 0) {
            this.showRetailEmpty('🛒 No products in this category.');
            return;
        }

        APP_STATE.filteredProducts.forEach(product => {
            const card = this.createRetailCard(product);
            this.retailList.appendChild(card);
        });

        this.retailList.classList.remove('hidden');
    }

    /**
     * Create menu item card element
     */
    createMenuCard(item) {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6';

        const imageUrl = item.image_url || 'https://via.placeholder.com/400x300?text=Menu+Item';
        const price = item.price_kes || 0;
        const itemName = item.name || 'Unknown Item';
        const description = item.description || 'Fresh and delicious';
        const category = item.category || '';
        const stockStatus = this.getStockStatus(item.available || true, item.stock_level || 0);

        col.innerHTML = `
            <div class="menu-card h-100">
                <div class="card-img-container">
                    <img 
                        src="${escapeHtml(imageUrl)}" 
                        alt="${escapeHtml(itemName)}"
                        onerror="this.src='https://via.placeholder.com/400x300?text=Menu+Item'"
                    >
                </div>
                <div class="card-body">
                    ${category ? `<span class="card-category">${escapeHtml(category)}</span>` : ''}
                    <h5 class="card-title">${escapeHtml(itemName)}</h5>
                    <p class="card-description">${escapeHtml(description)}</p>
                </div>
                <div class="card-footer">
                    <div>
                        <span class="card-price-label">Price</span>
                        <span class="card-price">KES ${formatPrice(price)}</span>
                    </div>
                    <span class="badge-stock badge-${stockStatus.cssClass}">
                        ${stockStatus.text}
                    </span>
                </div>
            </div>
        `;

        col.querySelector('.menu-card').addEventListener('click', () => {
            this.selectMenuItem(item);
        });

        return col;
    }

    /**
     * Create retail product card element
     */
    createRetailCard(product) {
        const col = document.createElement('div');
        col.className = 'col-lg-3 col-md-6 col-sm-6';

        const imageUrl = product.image_url || 'https://via.placeholder.com/300x300?text=Product';
        const price = product.price_kes || 0;
        const productName = product.name || 'Unknown Product';
        const description = product.description || 'Essential supplies';
        const category = product.category || '';
        const stockStatus = this.getStockStatus(product.available || true, product.stock_level || 0);

        col.innerHTML = `
            <div class="retail-card h-100">
                <div class="card-img-container">
                    <img 
                        src="${escapeHtml(imageUrl)}" 
                        alt="${escapeHtml(productName)}"
                        onerror="this.src='https://via.placeholder.com/300x300?text=Product'"
                    >
                </div>
                <div class="card-body">
                    ${category ? `<span class="card-category">${escapeHtml(category)}</span>` : ''}
                    <h5 class="card-title">${escapeHtml(productName)}</h5>
                    <p class="card-description">${escapeHtml(description)}</p>
                </div>
                <div class="card-footer">
                    <div>
                        <span class="card-price-label">Price</span>
                        <span class="card-price">KES ${formatPrice(price)}</span>
                    </div>
                    <span class="badge-stock badge-${stockStatus.cssClass}">
                        ${stockStatus.text}
                    </span>
                </div>
            </div>
        `;

        col.querySelector('.retail-card').addEventListener('click', () => {
            this.selectProduct(product);
        });

        return col;
    }

    /**
     * Get stock status for display
     */
    getStockStatus(available, stockLevel) {
        if (!available || stockLevel === 0) {
            return { text: 'Out of Stock', cssClass: 'out-of-stock' };
        }

        if (stockLevel < 5) {
            return { text: 'Low Stock', cssClass: 'low-stock' };
        }

        return { text: 'In Stock', cssClass: 'in-stock' };
    }

    /**
     * Handle menu item selection
     */
    selectMenuItem(item) {
        console.log('📍 Selected menu item:', item);

        // Send to chat context for AI awareness
        this.updateChatContext('menu', item);

        // Optional: Show toast confirmation
        showToast(`Selected: ${item.name} - KES ${formatPrice(item.price_kes)}`, 'info');
    }

    /**
     * Handle product selection
     */
    selectProduct(product) {
        console.log('📍 Selected product:', product);

        // Send to chat context for AI awareness
        this.updateChatContext('product', product);

        // Optional: Show toast confirmation
        showToast(`Selected: ${product.name} - KES ${formatPrice(product.price_kes)}`, 'info');
    }

    /**
     * Update AI chat context with current page content
     */
    updateChatContext(type, item) {
        if (!window.chatState) return;

        window.chatState.context = {
            page: 'retail',
            type: type,
            selectedItem: item.name,
            price: item.price_kes,
            category: item.category,
            timestamp: new Date().toISOString()
        };

        console.log('💬 Chat context updated:', window.chatState.context);
    }

    /**
     * Show menu loading state
     */
    showMenuLoading() {
        if (!this.menuGrid) return;
        this.menuGrid.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading menu...</span>
                    </div>
                    <p class="text-muted mt-3">Loading menu items...</p>
                </div>
            </div>
        `;
    }

    /**
     * Show retail loading state
     */
    showRetailLoading() {
        if (!this.retailList) return;
        this.retailList.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading products...</span>
                    </div>
                    <p class="text-muted mt-3">Loading products...</p>
                </div>
            </div>
        `;
    }

    /**
     * Show empty menu state
     */
    showMenuEmpty(message) {
        if (!this.menuGrid) return;
        this.menuGrid.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">🍽️</div>
                    <p class="empty-state-text">${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * Show empty retail state
     */
    showRetailEmpty(message) {
        if (!this.retailList) return;
        this.retailList.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
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
// INITIALIZE RETAIL MANAGER
// ========================================

const retailManager = new RetailManager();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize retail manager if on retail page
    if (document.getElementById('menu-grid') || document.getElementById('retail-list')) {
        retailManager.init();
    }
});