/**
 * Products Page Module
 * Handles products page with filters, search, and load more functionality
 */

let allProducts = [];
let filteredProducts = [];
let displayedProducts = [];
let allCategories = [];
let allBrands = [];

const PRODUCTS_PER_PAGE = 12;
let currentPage = 1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeProductsPage();
});

/**
 * Initialize products page
 */
async function initializeProductsPage() {
    try {
        // Load categories and brands for filters
        await Promise.all([
            loadCategories(),
            loadBrands(),
            loadProducts()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize cart badge
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            const cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
            updateCartBadge(cart.length);
        }
    } catch (error) {
        console.error('Initialize products page error:', error);
        showError('Failed to load products');
    }
}

/**
 * Load all products
 */
async function loadProducts() {
    try {
        showLoader();
        
        const result = await ProductAPI.fetchProducts({ limit: 100 });
        
        if (result.success && result.data) {
            allProducts = result.data;
            filteredProducts = [...allProducts];
            displayProducts();
        } else {
            showError('Failed to load products');
        }
    } catch (error) {
        console.error('Load products error:', error);
        showError('Failed to load products');
    }
}

/**
 * Load categories
 */
async function loadCategories() {
    try {
        const result = await CategoryAPI.fetchCategories();
        
        if (result.success && result.data) {
            allCategories = result.data;
            populateCategoryFilter();
        }
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

/**
 * Load brands
 */
async function loadBrands() {
    try {
        const result = await ProductAPI.fetchBrands();
        
        if (result.success && result.data) {
            allBrands = result.data;
            populateBrandFilter();
        }
    } catch (error) {
        console.error('Load brands error:', error);
    }
}

/**
 * Populate category filter dropdown
 */
function populateCategoryFilter() {
    const selects = document.querySelectorAll('#category-filter, #category-filter-mobile');
    
    selects.forEach(select => {
        if (!select) return;
        
        // Clear existing options except first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.name} (${category.product_count || 0})`;
            select.appendChild(option);
        });
    });
}

/**
 * Populate brand filter dropdown
 */
function populateBrandFilter() {
    const selects = document.querySelectorAll('#brand-filter, #brand-filter-mobile');
    
    selects.forEach(select => {
        if (!select) return;
        
        // Clear existing options except first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        allBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            select.appendChild(option);
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Desktop filters
    setupDesktopFilters();
    
    // Mobile/Tablet filters
    setupMobileFilters();
    
    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreProducts);
    }
}

/**
 * Setup desktop filter event listeners
 */
function setupDesktopFilters() {
    // Search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    // Brand filter
    const brandFilter = document.getElementById('brand-filter');
    if (brandFilter) {
        brandFilter.addEventListener('change', applyFilters);
    }
    
    // Price filter
    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) {
        priceFilter.addEventListener('change', applyFilters);
    }
    
    // Sort filter
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
    
    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // Reset filters (in no results section)
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', clearFilters);
    }
}

/**
 * Setup mobile filter event listeners
 */
function setupMobileFilters() {
    // Filter toggle button
    const filterToggle = document.getElementById('filter-toggle-btn');
    const filterSheet = document.getElementById('filter-bottom-sheet');
    const filterOverlay = document.getElementById('filter-sheet-overlay');
    const filterClose = document.getElementById('filter-sheet-close');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            openFilterSheet();
        });
    }
    
    if (filterClose) {
        filterClose.addEventListener('click', () => {
            closeFilterSheet();
        });
    }
    
    if (filterOverlay) {
        filterOverlay.addEventListener('click', () => {
            closeFilterSheet();
        });
    }
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            applyMobileFilters();
            closeFilterSheet();
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            clearMobileFilters();
        });
    }
    
    // Mobile filter inputs
    const searchInputMobile = document.getElementById('product-search-mobile');
    if (searchInputMobile) {
        searchInputMobile.addEventListener('input', debounce(() => {
            // Sync with desktop
            const desktopSearch = document.getElementById('product-search');
            if (desktopSearch) {
                desktopSearch.value = searchInputMobile.value;
            }
        }, 300));
    }
}

/**
 * Open filter bottom sheet
 */
function openFilterSheet() {
    const filterSheet = document.getElementById('filter-bottom-sheet');
    const filterOverlay = document.getElementById('filter-sheet-overlay');
    
    if (filterSheet && filterOverlay) {
        // Sync desktop values to mobile
        syncFiltersToMobile();
        
        // Show overlay and sheet
        filterOverlay.classList.add('active');
        filterSheet.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close filter bottom sheet
 */
function closeFilterSheet() {
    const filterSheet = document.getElementById('filter-bottom-sheet');
    const filterOverlay = document.getElementById('filter-sheet-overlay');
    
    if (filterSheet && filterOverlay) {
        filterOverlay.classList.remove('active');
        filterSheet.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

/**
 * Sync desktop filters to mobile
 */
function syncFiltersToMobile() {
    const desktopSearch = document.getElementById('product-search');
    const mobileSearch = document.getElementById('product-search-mobile');
    if (desktopSearch && mobileSearch) {
        mobileSearch.value = desktopSearch.value;
    }
    
    const desktopCategory = document.getElementById('category-filter');
    const mobileCategory = document.getElementById('category-filter-mobile');
    if (desktopCategory && mobileCategory) {
        mobileCategory.value = desktopCategory.value;
    }
    
    const desktopBrand = document.getElementById('brand-filter');
    const mobileBrand = document.getElementById('brand-filter-mobile');
    if (desktopBrand && mobileBrand) {
        mobileBrand.value = desktopBrand.value;
    }
    
    const desktopPrice = document.getElementById('price-filter');
    const mobilePrice = document.getElementById('price-filter-mobile');
    if (desktopPrice && mobilePrice) {
        mobilePrice.value = desktopPrice.value;
    }
}

/**
 * Apply mobile filters
 */
function applyMobileFilters() {
    // Sync mobile values to desktop
    const mobileSearch = document.getElementById('product-search-mobile');
    const desktopSearch = document.getElementById('product-search');
    if (mobileSearch && desktopSearch) {
        desktopSearch.value = mobileSearch.value;
    }
    
    const mobileCategory = document.getElementById('category-filter-mobile');
    const desktopCategory = document.getElementById('category-filter');
    if (mobileCategory && desktopCategory) {
        desktopCategory.value = mobileCategory.value;
    }
    
    const mobileBrand = document.getElementById('brand-filter-mobile');
    const desktopBrand = document.getElementById('brand-filter');
    if (mobileBrand && desktopBrand) {
        desktopBrand.value = mobileBrand.value;
    }
    
    const mobilePrice = document.getElementById('price-filter-mobile');
    const desktopPrice = document.getElementById('price-filter');
    if (mobilePrice && desktopPrice) {
        desktopPrice.value = mobilePrice.value;
    }
    
    // Apply filters
    applyFilters();
}

/**
 * Clear mobile filters
 */
function clearMobileFilters() {
    const mobileSearch = document.getElementById('product-search-mobile');
    if (mobileSearch) mobileSearch.value = '';
    
    const mobileCategory = document.getElementById('category-filter-mobile');
    if (mobileCategory) mobileCategory.value = '';
    
    const mobileBrand = document.getElementById('brand-filter-mobile');
    if (mobileBrand) mobileBrand.value = '';
    
    const mobilePrice = document.getElementById('price-filter-mobile');
    if (mobilePrice) mobilePrice.value = '';
}

/**
 * Apply all filters
 */
function applyFilters() {
    const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
    const categoryId = document.getElementById('category-filter')?.value || '';
    const brand = document.getElementById('brand-filter')?.value || '';
    const priceRange = document.getElementById('price-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || '';
    
    // Start with all products
    filteredProducts = [...allProducts];
    
    // Apply search filter
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            (product.short_description && product.short_description.toLowerCase().includes(searchTerm)) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply category filter
    if (categoryId) {
        filteredProducts = filteredProducts.filter(product => {
            return product.category_id == categoryId || 
                   (product.categories && product.categories.some(cat => cat.id == categoryId));
        });
    }
    
    // Apply brand filter
    if (brand) {
        filteredProducts = filteredProducts.filter(product => product.brand === brand);
    }
    
    // Apply price filter
    if (priceRange) {
        filteredProducts = filteredProducts.filter(product => {
            const price = product.sale_price || product.base_price;
            
            if (priceRange === '0-300') return price < 300;
            if (priceRange === '300-500') return price >= 300 && price < 500;
            if (priceRange === '500-800') return price >= 500 && price < 800;
            if (priceRange === '800+') return price >= 800;
            
            return true;
        });
    }
    
    // Apply sorting
    if (sort) {
        filteredProducts = sortProducts(filteredProducts, sort);
    }
    
    // Reset pagination
    currentPage = 1;
    
    // Display products
    displayProducts();
}

/**
 * Sort products
 */
function sortProducts(products, sortBy) {
    const sorted = [...products];
    
    switch (sortBy) {
        case 'price_asc':
            return sorted.sort((a, b) => {
                const priceA = a.sale_price || a.base_price;
                const priceB = b.sale_price || b.base_price;
                return priceA - priceB;
            });
            
        case 'price_desc':
            return sorted.sort((a, b) => {
                const priceA = a.sale_price || a.base_price;
                const priceB = b.sale_price || b.base_price;
                return priceB - priceA;
            });
            
        case 'name_asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
            
        case 'name_desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));
            
        case 'rating':
            return sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
            
        case 'newest':
            return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
        default:
            return sorted;
    }
}

/**
 * Display products
 */
function displayProducts() {
    const grid = document.getElementById('products-grid');
    const noResults = document.getElementById('no-results');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (!grid) return;
    
    // Update results count
    updateResultsCount(filteredProducts.length);
    
    // Check if we have products
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    // Get products to display (paginated)
    const endIndex = currentPage * PRODUCTS_PER_PAGE;
    displayedProducts = filteredProducts.slice(0, endIndex);
    
    // Render products
    grid.innerHTML = displayedProducts.map(product => renderProductCard(product)).join('');
    
    // Setup product interactions
    setupProductInteractions();
    
    // Show/hide load more button
    if (loadMoreContainer) {
        loadMoreContainer.style.display = displayedProducts.length < filteredProducts.length ? 'flex' : 'none';
    }
}

/**
 * Render product card HTML
 */
function renderProductCard(product) {
    const currentPrice = product.sale_price || product.base_price;
    const hasDiscount = product.sale_price && product.sale_price < product.base_price;
    
    // Handle image URL
    let imageUrl = '';
    if (product.image_url) {
        if (product.image_url.startsWith('http') || product.image_url.startsWith('/')) {
            imageUrl = product.image_url;
        } else {
            const cleanPath = product.image_url.replace(/^(\.\.\/)?assets\/images\/products\//, '');
            imageUrl = `../assets/images/products/${cleanPath}`;
        }
    } else {
        imageUrl = '../assets/images/products/placeholder.jpg';
    }
    
    // Calculate discount percentage
    let discountPercent = 0;
    if (hasDiscount) {
        discountPercent = Math.round(((product.base_price - product.sale_price) / product.base_price) * 100);
    }
    
    // Generate star rating
    const rating = parseFloat(product.average_rating) || 0;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '★'.repeat(fullStars);
    if (hasHalfStar) starsHTML += '☆';
    starsHTML += '☆'.repeat(emptyStars);
    
    // Stock status
    const isOutOfStock = product.stock_status === 'out_of_stock';
    
    return `
        <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.src='../assets/images/products/placeholder.jpg'">
                ${hasDiscount ? `<div class="product-badge discount">${discountPercent}% OFF</div>` : ''}
                ${product.badge && !hasDiscount ? `<div class="product-badge ${product.badge_type}">${escapeHtml(product.badge)}</div>` : ''}
                ${isOutOfStock ? '<div class="out-of-stock-overlay">Out of Stock</div>' : ''}
                <button class="wishlist-btn" data-product-id="${product.id}" aria-label="Add to wishlist">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
            <div class="product-content">
                <h3 class="product-title">${escapeHtml(product.name)}</h3>
                ${product.brand ? `<p class="product-brand">${escapeHtml(product.brand)}</p>` : ''}
                <div class="product-rating">
                    <span class="stars">${starsHTML}</span>
                    <span class="rating-count">(${product.rating_count || 0})</span>
                </div>
                <p class="product-description">${escapeHtml(product.short_description || '').substring(0, 60)}${product.short_description && product.short_description.length > 60 ? '...' : ''}</p>
                <div class="product-footer">
                    <div class="product-price">
                        <span class="current-price">₹${formatPrice(currentPrice)}</span>
                        ${hasDiscount ? `<span class="original-price">₹${formatPrice(product.base_price)}</span>` : ''}
                    </div>
                    <button class="btn-cart" data-product-id="${product.id}" data-product-key="${product.product_key}" ${isOutOfStock ? 'disabled' : ''}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span>${isOutOfStock ? 'Out of Stock' : 'Add'}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Setup product interactions (cart, wishlist)
 */
function setupProductInteractions() {
    // Add to cart buttons
    document.querySelectorAll('.btn-cart:not([disabled])').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            const productKey = this.getAttribute('data-product-key');
            addToCart(productId, productKey, this);
        });
    });
    
    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = this.getAttribute('data-product-id');
            toggleWishlist(productId, this);
        });
    });
    
    // Load wishlist status
    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
        loadWishlistStatus();
    }
}

/**
 * Add to cart
 */
function addToCart(productId, productKey, button) {
    // Check authentication
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        showNotification('Please login to add items to cart', 'info');
        return;
    }
    
    try {
        // Show loading state
        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span>Adding...</span>';
        
        // Get cart from session storage
        let cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
        const existingIndex = cart.findIndex(item => item.productId === productId);
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
            showNotification('Product quantity updated in cart', 'success');
        } else {
            cart.push({
                productId: productId,
                productKey: productKey,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
            showNotification('Product added to cart!', 'success');
        }
        
        sessionStorage.setItem('cart', JSON.stringify(cart));
        updateCartBadge(cart.length);
        
        // Restore button
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalHTML;
        }, 500);
        
    } catch (error) {
        console.error('Add to cart error:', error);
        showNotification('Failed to add to cart', 'error');
        button.disabled = false;
    }
}

/**
 * Toggle wishlist
 */
function toggleWishlist(productId, button) {
    // Check authentication
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        showNotification('Please login to add items to wishlist', 'info');
        return;
    }
    
    try {
        let wishlist = JSON.parse(sessionStorage.getItem('wishlist') || '[]');
        const index = wishlist.indexOf(productId);
        const svg = button.querySelector('svg path');
        
        if (index === -1) {
            wishlist.push(productId);
            button.classList.add('active');
            if (svg) svg.setAttribute('fill', 'currentColor');
            showNotification('Added to wishlist!', 'success');
        } else {
            wishlist.splice(index, 1);
            button.classList.remove('active');
            if (svg) svg.setAttribute('fill', 'none');
            showNotification('Removed from wishlist', 'info');
        }
        
        sessionStorage.setItem('wishlist', JSON.stringify(wishlist));
    } catch (error) {
        console.error('Wishlist error:', error);
        showNotification('Failed to update wishlist', 'error');
    }
}

/**
 * Load wishlist status
 */
function loadWishlistStatus() {
    try {
        const wishlist = JSON.parse(sessionStorage.getItem('wishlist') || '[]');
        
        document.querySelectorAll('.wishlist-btn').forEach(button => {
            const productId = button.getAttribute('data-product-id');
            
            if (productId && wishlist.includes(productId)) {
                button.classList.add('active');
                const svg = button.querySelector('svg path');
                if (svg) svg.setAttribute('fill', 'currentColor');
            }
        });
    } catch (error) {
        console.error('Load wishlist status error:', error);
    }
}

/**
 * Load more products
 */
function loadMoreProducts() {
    currentPage++;
    displayProducts();
    
    // Scroll to newly loaded products
    const grid = document.getElementById('products-grid');
    if (grid) {
        const newProducts = grid.querySelectorAll('.product-card');
        if (newProducts.length > 0) {
            newProducts[displayedProducts.length - PRODUCTS_PER_PAGE]?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }
}

/**
 * Clear all filters
 */
function clearFilters() {
    // Clear desktop filters
    const searchInput = document.getElementById('product-search');
    if (searchInput) searchInput.value = '';
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = '';
    
    const brandFilter = document.getElementById('brand-filter');
    if (brandFilter) brandFilter.value = '';
    
    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) priceFilter.value = '';
    
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) sortFilter.value = '';
    
    // Clear mobile filters
    clearMobileFilters();
    
    // Reset and reload
    currentPage = 1;
    filteredProducts = [...allProducts];
    displayProducts();
}

/**
 * Update results count
 */
function updateResultsCount(count) {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        resultsCount.innerHTML = `Showing <strong>${count}</strong> product${count !== 1 ? 's' : ''}`;
    }
}

/**
 * Show loader
 */
function showLoader() {
    const grid = document.getElementById('products-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading-container" style="grid-column: 1 / -1;">
                <div class="spinner"></div>
                <p>Loading products...</p>
            </div>
        `;
    }
}

/**
 * Show error
 */
function showError(message) {
    const grid = document.getElementById('products-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="color: #e74c3c; font-size: 16px; margin-top: 20px;">${escapeHtml(message)}</p>
                <button class="btn-primary" onclick="loadProducts()" style="margin-top: 20px;">Try Again</button>
            </div>
        `;
    }
}

/**
 * Helper: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Helper: Format price
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Update cart badge
 */
function updateCartBadge(count) {
    const badge = document.querySelector('.cart-btn .badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Helper: Show notification
 */
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}