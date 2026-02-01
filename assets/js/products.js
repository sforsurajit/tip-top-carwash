/**
 * Products Section Module
 * Handles displaying products on home page (8 featured products)
 */

document.addEventListener('DOMContentLoaded', function() {
    loadProductsSection();
});

/**
 * Load products section
 */
async function loadProductsSection() {
    try {
        // Load the products HTML component
        const response = await fetch('components/products.html');
        if (!response.ok) throw new Error('Failed to load products component');
        
        const html = await response.text();
        const container = document.getElementById('products-container');
        if (container) {
            container.innerHTML = html;
            
            // Load products from API
            await loadHomeProducts();
            
            // Initialize product interactions
            initializeProductInteractions();
        }
    } catch (error) {
        console.error('Load products section error:', error);
    }
}

/**
 * Load home products (8 featured products with is_home_view=true)
 */
async function loadHomeProducts() {
    try {
        const productsGrid = document.getElementById('products-grid');
        if (!productsGrid) return;
        
        // Show loading state
        productsGrid.innerHTML = `
            <div class="loading-container" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div class="spinner"></div>
                <p style="margin-top: 15px; color: #666; font-size: 16px;">Loading products...</p>
            </div>
        `;
        
        // Fetch home products from API
        const result = await ProductAPI.fetchHomeProducts(8);
        
        if (result.success && result.data && result.data.length > 0) {
            renderProducts(result.data);
        } else {
            productsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <p style="color: #666; font-size: 16px;">No products available at the moment.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load home products error:', error);
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <p style="color: #e74c3c; font-size: 16px;">Failed to load products. Please try again later.</p>
                </div>
            `;
        }
    }
}

/**
 * Render products to the grid
 */
function renderProducts(products) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = products.map(product => {
        const currentPrice = product.sale_price || product.base_price;
        const hasDiscount = product.sale_price && product.sale_price < product.base_price;
        const imageUrl = product.image_url || 'assets/images/products/placeholder.jpg';
        
        // Generate star rating
        const rating = parseFloat(product.average_rating) || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '★'.repeat(fullStars);
        if (hasHalfStar) starsHTML += '☆';
        starsHTML += '☆'.repeat(emptyStars);
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy">
                    ${product.badge ? `<div class="product-badge ${product.badge_type}">${escapeHtml(product.badge)}</div>` : ''}
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
                    <p class="product-description">${escapeHtml(product.short_description || '')}</p>
                    <div class="product-footer">
                        <div class="product-price">
                            <span class="current-price">₹${formatPrice(currentPrice)}</span>
                            ${hasDiscount ? `<span class="original-price">₹${formatPrice(product.base_price)}</span>` : ''}
                        </div>
                        <button class="btn-cart" data-product-id="${product.id}" data-product-key="${product.product_key}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span>Add to Cart</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Initialize product interactions
 */
function initializeProductInteractions() {
    // Add to cart buttons
    document.querySelectorAll('.btn-cart').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            const productKey = this.getAttribute('data-product-key');
            addToCart(productId, productKey);
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
    
    // Load wishlist status if user is authenticated
    if (isAuthenticated()) {
        loadWishlistStatus();
    }
}

/**
 * Add product to cart
 */
function addToCart(productId, productKey) {
    if (!productId) {
        showNotification('Invalid product', 'error');
        return;
    }
    
    try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            showNotification('Please login to add items to cart', 'info');
            if (typeof openAuthModal === 'function') {
                setTimeout(() => openAuthModal(), 500);
            }
            return;
        }
        
        // Get cart from session storage (temporary until full cart API integration)
        let cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
        
        // Check if product already in cart
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
        
        // Save to session storage
        sessionStorage.setItem('cart', JSON.stringify(cart));
        
        // Update cart badge
        updateCartBadge(cart.length);
        
    } catch (error) {
        console.error('Add to cart error:', error);
        showNotification('Failed to add to cart', 'error');
    }
}

/**
 * Toggle wishlist
 */
function toggleWishlist(productId, button) {
    if (!productId) {
        showNotification('Invalid product', 'error');
        return;
    }
    
    try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            showNotification('Please login to add items to wishlist', 'info');
            if (typeof openAuthModal === 'function') {
                setTimeout(() => openAuthModal(), 500);
            }
            return;
        }
        
        // Get wishlist from session storage
        let wishlist = JSON.parse(sessionStorage.getItem('wishlist') || '[]');
        const index = wishlist.indexOf(productId);
        
        const svg = button.querySelector('svg path');
        
        if (index === -1) {
            // Add to wishlist
            wishlist.push(productId);
            button.classList.add('active');
            if (svg) svg.setAttribute('fill', 'currentColor');
            showNotification('Added to wishlist!', 'success');
        } else {
            // Remove from wishlist
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
 * Update cart badge
 */
function updateCartBadge(count) {
    const badge = document.querySelector('.cart-btn .badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Format price
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show notification (uses global function from utils.js if available)
 */
function showNotification(message, type = 'info') {
    // If global showNotification exists, use it
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback: simple console log
    console.log(`[${type.toUpperCase()}] ${message}`);
}