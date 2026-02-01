/**
 * Services Page - Complete Functionality
 * Handles filtering, searching, sorting, and pagination
 */

let allServices = [];
let filteredServices = [];
let displayedServices = [];
let currentPage = 1;
const servicesPerPage = 12;

// Vehicle Selection State
let selectedVehicle = null;
let vehicleMultiplier = 1.0;

// Car Database for Autocomplete - Will be loaded from JSON
let carData = null;
let carModels = [];

// Category to multiplier mapping
const categoryMultipliers = {
    'Hatchback': 1.0,
    'Sedan': 1.2,
    'Compact SUV': 1.3,
    'SUV': 1.6,
    'Bike': 0.5
};

// Category to type mapping for vehicle card selection
const categoryToType = {
    'Hatchback': 'hatchback',
    'Sedan': 'sedan',
    'Compact SUV': 'compact-suv',
    'SUV': 'suv',
    'Bike': 'bike'
};

// DOM Elements
let servicesGrid;
let searchInput;
let categoryFilter;
let priceFilter;
let sortFilter;
let resultsCount;
let loadMoreBtn;
let noResults;
let headerSearch;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Services Page Initializing...');
    loadCarData(); // Load car data first
    initializeElements();
    setupEventListeners();
    setupCarSearch(); // Setup car model search
    loadServices();
});


/**
 * Initialize DOM elements
 */
function initializeElements() {
    servicesGrid = document.getElementById('services-grid');
    searchInput = document.getElementById('service-search');
    headerSearch = document.getElementById('header-search');
    categoryFilter = document.getElementById('category-filter');
    priceFilter = document.getElementById('price-filter');
    sortFilter = document.getElementById('sort-filter');
    resultsCount = document.getElementById('results-count');
    loadMoreBtn = document.getElementById('load-more-btn');
    noResults = document.getElementById('no-results');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Desktop filters
    setupDesktopFilters();

    // Mobile/Tablet filters
    setupMobileFilters();

    // Load More
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }

    // Sync header search with page search
    if (headerSearch) {
        searchInput.addEventListener('input', (e) => {
            headerSearch.value = e.target.value;
        });
        headerSearch.addEventListener('input', (e) => {
            searchInput.value = e.target.value;
        });
    }
}

/**
 * Setup desktop filter event listeners
 */
function setupDesktopFilters() {
    // Search
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    if (headerSearch) {
        headerSearch.addEventListener('input', debounce(handleSearch, 300));
    }

    // Filters
    categoryFilter.addEventListener('change', applyFilters);
    priceFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applySorting);

    // Clear & Reset
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }

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
    const searchInputMobile = document.getElementById('service-search-mobile');
    if (searchInputMobile) {
        searchInputMobile.addEventListener('input', debounce(() => {
            // Sync with desktop
            const desktopSearch = document.getElementById('service-search');
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
    const desktopSearch = document.getElementById('service-search');
    const mobileSearch = document.getElementById('service-search-mobile');
    if (desktopSearch && mobileSearch) {
        mobileSearch.value = desktopSearch.value;
    }

    const desktopCategory = document.getElementById('category-filter');
    const mobileCategory = document.getElementById('category-filter-mobile');
    if (desktopCategory && mobileCategory) {
        mobileCategory.value = desktopCategory.value;
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
    const mobileSearch = document.getElementById('service-search-mobile');
    const desktopSearch = document.getElementById('service-search');
    if (mobileSearch && desktopSearch) {
        desktopSearch.value = mobileSearch.value;
    }

    const mobileCategory = document.getElementById('category-filter-mobile');
    const desktopCategory = document.getElementById('category-filter');
    if (mobileCategory && desktopCategory) {
        desktopCategory.value = mobileCategory.value;
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
    const mobileSearch = document.getElementById('service-search-mobile');
    if (mobileSearch) mobileSearch.value = '';

    const mobileCategory = document.getElementById('category-filter-mobile');
    if (mobileCategory) mobileCategory.value = '';

    const mobilePrice = document.getElementById('price-filter-mobile');
    if (mobilePrice) mobilePrice.value = '';
}

/**
 * Load services from API
 * @param {string|null} vehicleCategory - Optional vehicle category to filter services
 */
async function loadServices(vehicleCategory = null) {
    try {
        showLoading();

        // Wait for ServiceAPI to be available
        let attempts = 0;
        while (!window.ServiceAPI && attempts < 20) {
            await sleep(100);
            attempts++;
        }

        if (!window.ServiceAPI) {
            throw new Error('ServiceAPI not found');
        }

        // Build API params
        const params = {};
        if (vehicleCategory) {
            params.vehicleCategory = vehicleCategory;
        }

        console.log('📡 Fetching services from:', API_CONFIG.BASE_URL, vehicleCategory ? `(Category: ${vehicleCategory})` : '');
        const result = await ServiceAPI.fetchServices(params);

        if (result.success && result.data && result.data.length > 0) {
            allServices = result.data;
            filteredServices = [...allServices];
            console.log('✅ Loaded', allServices.length, 'services from API', vehicleCategory ? `for ${vehicleCategory}` : '');

            displayServices();
        } else if (result.success && result.data && result.data.length === 0) {
            // No services for this category
            allServices = [];
            filteredServices = [];
            console.log('ℹ️ No services found for category:', vehicleCategory);
            displayServices();
        } else {
            throw new Error(result.error || 'No services data');
        }

    } catch (error) {
        console.warn('⚠️ API Error:', error.message);
        console.log('🎨 Using fallback demo data for local development...');

        // Use fallback demo data
        allServices = getDemoServices();
        filteredServices = [...allServices];
        console.log('✅ Loaded', allServices.length, 'demo services');

        displayServices();
    }
}

/**
 * Get demo services for fallback (when API is unavailable)
 */
function getDemoServices() {
    return [
        {
            service_key: 'basic-wash',
            title: 'Basic Car Wash',
            description: 'Exterior wash, vacuum cleaning, and tire shine for a quick refresh.',
            price: 299,
            category: 'washing',
            image_url: '../assets/images/services/basic-wash.jpg',
            badge: 'Popular',
            badge_type: 'popular',
            features: [
                { icon: '🚗', text: 'Exterior Wash' },
                { icon: '✨', text: 'Vacuum Clean' },
                { icon: '🛞', text: 'Tire Shine' }
            ]
        },
        {
            service_key: 'premium-wash',
            title: 'Premium Wash',
            description: 'Complete wash with wax polish and dashboard treatment.',
            price: 599,
            category: 'washing',
            image_url: '../assets/images/services/premium-wash.jpg',
            badge: 'Best Value',
            badge_type: 'featured',
            features: [
                { icon: '💎', text: 'Premium Wash' },
                { icon: '🪣', text: 'Wax Polish' },
                { icon: '🎯', text: 'Dashboard Care' }
            ]
        },
        {
            service_key: 'detailing',
            title: 'Full Detailing',
            description: 'Complete interior & exterior detailing service.',
            price: 1299,
            category: 'detailing',
            image_url: '../assets/images/services/detailing.jpg',
            badge: 'Premium',
            badge_type: 'featured',
            features: [
                { icon: '💎', text: 'Full Detailing' },
                { icon: '✨', text: 'Interior Clean' },
                { icon: '🚗', text: 'Exterior Polish' }
            ]
        },
        {
            service_key: 'interior-clean',
            title: 'Interior Cleaning',
            description: 'Thorough interior cleaning with seat shampooing.',
            price: 899,
            category: 'maintenance',
            image_url: '../assets/images/services/interior.jpg',
            features: [
                { icon: '🧹', text: 'Deep Clean' },
                { icon: '🪑', text: 'Seat Shampoo' },
                { icon: '🌸', text: 'Odor Remove' }
            ]
        }
    ];
}

/**
 * Display services
 */
function displayServices(resetPage = true) {
    if (resetPage) {
        currentPage = 1;
        displayedServices = [];
    }

    // Get services to display
    const startIndex = 0;
    const endIndex = currentPage * servicesPerPage;
    displayedServices = filteredServices.slice(startIndex, endIndex);

    // Update UI
    updateResultsCount();
    renderServices();
    updateLoadMoreButton();
}

/**
 * Render services to grid
 */
function renderServices() {
    if (filteredServices.length === 0) {
        showNoResults();
        return;
    }

    servicesGrid.innerHTML = '';

    displayedServices.forEach((service, index) => {
        const card = createServiceCard(service, index);
        servicesGrid.appendChild(card);
    });
}

/**
 * Create service card element
 */
function createServiceCard(service, index) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.index = index;

    const badge = service.badge ?
        `<div class="service-badge ${service.badge_type === 'featured' ? 'featured' : ''}">${service.badge}</div>`
        : '';

    const features = (service.features || [])
        .slice(0, 3) // Show max 3 features
        .map(f => `<span class="feature">${f.icon || ''} ${f.text || ''}</span>`)
        .join('');

    card.innerHTML = `
        <div class="service-image">
            <img src="${getImagePath(service.image_url)}" 
                 alt="${service.title}" 
                 onerror="this.src='../assets/images/services/default.jpg'"
                 loading="lazy">
            ${badge}
        </div>
        <div class="service-content">
            <h3 class="service-title">${service.title}</h3>
            <p class="service-description">${truncateText(service.description, 60)}</p>
            ${features ? `<div class="service-features">${features}</div>` : ''}
            <div class="service-footer">
                <span class="service-price">₹${formatPrice(service.price * vehicleMultiplier)}</span>
                <button class="btn-service" onclick="bookService('${service.service_key}')">Book Now</button>
            </div>
        </div>
    `;

    // Add click to view details
    card.addEventListener('click', function (e) {
        if (!e.target.closest('.btn-service')) {
            viewServiceDetails(service);
        }
    });

    return card;
}

/**
 * Handle search
 */
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    console.log('🔍 Searching:', query);

    if (!query) {
        filteredServices = [...allServices];
    } else {
        filteredServices = allServices.filter(service => {
            return service.title.toLowerCase().includes(query) ||
                service.description.toLowerCase().includes(query) ||
                (service.category && service.category.toLowerCase().includes(query));
        });
    }

    applyPriceFilter();
    applyCategoryFilter();
    applySorting();
    displayServices();
}

/**
 * Apply all filters
 */
function applyFilters() {
    console.log('🔧 Applying filters...');

    // Start with all services
    filteredServices = [...allServices];

    // Apply search if any
    const searchQuery = searchInput.value.toLowerCase().trim();
    if (searchQuery) {
        filteredServices = filteredServices.filter(service => {
            return service.title.toLowerCase().includes(searchQuery) ||
                service.description.toLowerCase().includes(searchQuery) ||
                (service.category && service.category.toLowerCase().includes(searchQuery));
        });
    }

    // Apply category filter
    applyCategoryFilter();

    // Apply price filter
    applyPriceFilter();

    // Apply sorting
    applySorting();

    displayServices();
}

/**
 * Apply category filter
 */
function applyCategoryFilter() {
    const category = categoryFilter.value;

    if (category) {
        filteredServices = filteredServices.filter(service => {
            return service.category && service.category.toLowerCase() === category.toLowerCase();
        });
    }
}

/**
 * Apply price filter
 */
function applyPriceFilter() {
    const priceRange = priceFilter.value;

    if (priceRange) {
        if (priceRange === '2000+') {
            filteredServices = filteredServices.filter(s => parseFloat(s.price) >= 2000);
        } else {
            const [min, max] = priceRange.split('-').map(p => parseFloat(p));
            filteredServices = filteredServices.filter(s => {
                const price = parseFloat(s.price);
                return price >= min && price <= max;
            });
        }
    }
}

/**
 * Apply sorting
 */
function applySorting() {
    const sortBy = sortFilter.value;

    console.log('📊 Sorting by:', sortBy);

    switch (sortBy) {
        case 'price-low':
            filteredServices.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price-high':
            filteredServices.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'name':
            filteredServices.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'popular':
            // Sort by featured badge or popularity
            filteredServices.sort((a, b) => {
                if (a.badge_type === 'featured' && b.badge_type !== 'featured') return -1;
                if (b.badge_type === 'featured' && a.badge_type !== 'featured') return 1;
                return 0;
            });
            break;
        default:
            // Default order (from API)
            break;
    }
}

/**
 * Clear all filters
 */
function clearFilters() {
    console.log('🧹 Clearing filters...');

    searchInput.value = '';
    if (headerSearch) headerSearch.value = '';
    categoryFilter.value = '';
    priceFilter.value = '';
    sortFilter.value = 'default';

    // Clear mobile filters
    clearMobileFilters();

    filteredServices = [...allServices];
    displayServices();
}

/**
 * Load more services
 */
function loadMore() {
    console.log('📄 Loading more services...');
    currentPage++;
    displayServices(false);
}

/**
 * Update results count
 */
function updateResultsCount() {
    const showing = displayedServices.length;
    const total = filteredServices.length;

    resultsCount.innerHTML = `Showing <strong>${showing}</strong> of <strong>${total}</strong> services`;
}

/**
 * Update load more button
 */
function updateLoadMoreButton() {
    const container = document.getElementById('load-more-container');

    if (filteredServices.length > displayedServices.length) {
        container.style.display = 'block';
        loadMoreBtn.textContent = `Load More Services (${filteredServices.length - displayedServices.length} remaining)`;
    } else {
        container.style.display = 'none';
    }
}

/**
 * Show loading state
 */
function showLoading() {
    servicesGrid.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading services...</p>
        </div>
    `;
    noResults.style.display = 'none';
}

/**
 * Show error state
 */
function showError() {
    servicesGrid.innerHTML = `
        <div class="loading-container">
            <p style="color: #ef4444;">Failed to load services. Please try again.</p>
            <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">Retry</button>
        </div>
    `;
    noResults.style.display = 'none';
}

/**
 * Show no results
 */
function showNoResults() {
    servicesGrid.innerHTML = '';
    noResults.style.display = 'block';
    document.getElementById('load-more-container').style.display = 'none';
    resultsCount.innerHTML = `Showing <strong>0</strong> services`;
}

/**
 * View service details
 */
function viewServiceDetails(service) {
    console.log('👁️ Viewing service:', service.service_key);
    bookService(service.service_key);
}

/**
 * Book service - Opens location booking modal
 */
function bookService(serviceKey) {
    console.log('📝 Booking service:', serviceKey);

    // Find the service data
    const service = allServices.find(s => s.service_key === serviceKey);

    if (service) {
        // Get selected vehicle type from card or filter
        const vehicleFilter = document.getElementById('vehicle-filter');
        const vehicleType = selectedVehicle || (vehicleFilter ? vehicleFilter.value : 'sedan') || 'sedan';

        // Calculate price with vehicle multiplier
        const finalPrice = parseFloat(service.price) * vehicleMultiplier;

        // Prepare service data for booking modal
        const serviceData = {
            id: service.id || serviceKey,
            key: serviceKey,
            name: service.title,
            price: finalPrice,
            basePrice: parseFloat(service.price),
            vehicleType: vehicleType,
            vehicleMultiplier: vehicleMultiplier
        };

        // Open location booking modal (new offline-first flow)
        if (window.LocationBooking) {
            LocationBooking.openBookingModal(serviceData);
        } else {
            // Fallback: redirect to old booking page
            console.warn('LocationBooking not loaded, using fallback');
            const bookingData = {
                selectedServices: [{
                    id: service.id || serviceKey,
                    name: service.title,
                    price: finalPrice
                }],
                vehicleType: vehicleType,
                fromServicesPage: true
            };
            localStorage.setItem('booking_data', JSON.stringify(bookingData));
            window.location.href = `book-service.html?service=${serviceKey}&vehicle=${vehicleType}`;
        }
    } else {
        // Fallback: navigate without data
        if (window.LocationBooking) {
            LocationBooking.openBookingModal({ id: serviceKey, name: 'Car Wash Service', price: 299, vehicleType: 'sedan' });
        } else {
            window.location.href = `book-service.html?service=${serviceKey}`;
        }
    }
}

/**
 * Get correct image path
 */
function getImagePath(imagePath) {
    if (!imagePath) {
        return '../assets/images/services/default.jpg';
    }

    // If it's an absolute URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // If path already starts with ../ or ./, return as-is (already relative)
    if (imagePath.startsWith('../') || imagePath.startsWith('./')) {
        return imagePath;
    }

    // If path starts with assets/, prepend ../
    if (imagePath.startsWith('assets/')) {
        return '../' + imagePath;
    }

    // If path starts with /, return as-is (absolute from root)
    if (imagePath.startsWith('/')) {
        return imagePath;
    }

    // Default: prepend ../ for other relative paths
    return '../' + imagePath;
}

/**
 * Truncate text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Format price
 */
function formatPrice(price) {
    return parseFloat(price).toFixed(2).replace(/\.00$/, '');
}

/**
 * Debounce function
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
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get URL parameters
 */
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Apply initial filters from URL
 */
function applyURLFilters() {
    const category = getURLParameter('category');
    const search = getURLParameter('search');

    if (category) {
        categoryFilter.value = category;
    }

    if (search) {
        searchInput.value = search;
        if (headerSearch) headerSearch.value = search;
    }

    if (category || search) {
        applyFilters();
    }
}

// Apply URL filters after services load
window.addEventListener('load', function () {
    setTimeout(applyURLFilters, 500);
});

/**
 * Load car data from JSON file
 */
async function loadCarData() {
    try {
        const response = await fetch('../car.json');
        if (!response.ok) {
            throw new Error('Failed to load car data');
        }
        carData = await response.json();

        // Transform cars array into carModels format
        if (carData && carData.cars) {
            carModels = carData.cars.map(car => ({
                name: `${car.brand} ${car.model}`,
                brand: car.brand,
                model: car.model,
                category: car.category,
                type: categoryToType[car.category] || 'sedan',
                multiplier: categoryMultipliers[car.category] || 1.0
            }));
            console.log(`✅ Loaded ${carModels.length} cars from car.json`);
        }
    } catch (error) {
        console.warn('⚠️ Could not load car.json:', error.message);
        // Fallback to empty array - search will still work, just no suggestions
        carModels = [];
    }
}

/**
 * Setup car model search autocomplete
 */
function setupCarSearch() {
    const searchInput = document.getElementById('car-model-search');
    const resultsContainer = document.getElementById('car-search-results');

    if (!searchInput || !resultsContainer) {
        console.log('Car search elements not found');
        return;
    }

    // Debounced search handler
    let debounceTimer;
    searchInput.addEventListener('input', function (e) {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim().toLowerCase();

        debounceTimer = setTimeout(() => {
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                return;
            }

            // Search cars
            const matches = searchCars(query);
            displayCarResults(matches, resultsContainer, searchInput);
        }, 200);
    });

    // Close results when clicking outside
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function (e) {
        const items = resultsContainer.querySelectorAll('.car-result-item');
        const activeItem = resultsContainer.querySelector('.car-result-item.active');
        let activeIndex = Array.from(items).indexOf(activeItem);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeIndex < items.length - 1) {
                items[activeIndex]?.classList.remove('active');
                items[activeIndex + 1]?.classList.add('active');
                items[activeIndex + 1]?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeIndex > 0) {
                items[activeIndex]?.classList.remove('active');
                items[activeIndex - 1]?.classList.add('active');
                items[activeIndex - 1]?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeItem) {
                activeItem.click();
            } else if (items.length > 0) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            resultsContainer.style.display = 'none';
            searchInput.blur();
        }
    });
}

/**
 * Search cars from loaded data
 */
function searchCars(query) {
    if (!carModels || carModels.length === 0) {
        return [];
    }

    const queryLower = query.toLowerCase().trim();
    const queryParts = queryLower.split(/\s+/);

    // Check if query is a brand name search
    const isBrandSearch = carModels.some(car =>
        car.brand.toLowerCase() === queryLower ||
        car.brand.toLowerCase().startsWith(queryLower)
    );

    // Score-based matching for better results
    const scoredResults = carModels.map(car => {
        let score = 0;
        const nameLower = car.name.toLowerCase();
        const brandLower = car.brand.toLowerCase();
        const modelLower = car.model.toLowerCase();

        // Exact match on brand (show all brand models)
        if (brandLower === queryLower) score += 100;

        // Brand starts with query
        if (brandLower.startsWith(queryLower)) score += 80;

        // Exact match on name
        if (nameLower === queryLower) score += 100;

        // Starts with query
        if (nameLower.startsWith(queryLower)) score += 50;
        if (modelLower.startsWith(queryLower)) score += 40;

        // Contains query
        if (nameLower.includes(queryLower)) score += 20;
        if (modelLower.includes(queryLower)) score += 15;

        // All query parts match
        const allPartsMatch = queryParts.every(part =>
            nameLower.includes(part) ||
            brandLower.includes(part) ||
            modelLower.includes(part)
        );
        if (allPartsMatch) score += 25;

        // Individual word matches
        queryParts.forEach(part => {
            if (brandLower.includes(part)) score += 10;
            if (modelLower.includes(part)) score += 5;
        });

        return { car, score };
    })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

    // If searching by brand, show more results (up to 20)
    // Otherwise limit to 10 for model searches
    const limit = isBrandSearch ? 20 : 10;

    return scoredResults.slice(0, limit).map(item => item.car);
}

/**
 * Display car search results
 */
function displayCarResults(cars, container, input) {
    if (cars.length === 0) {
        container.innerHTML = `
            <div class="car-no-results">
                <span>🔍</span>
                <p>No cars found. Try a different search.</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    const html = cars.map((car, index) => `
        <div class="car-result-item ${index === 0 ? 'active' : ''}" 
             data-name="${car.name}" 
             data-type="${car.type}" 
             data-category="${car.category}"
             data-multiplier="${car.multiplier}">
            <div class="car-result-info">
                <span class="car-result-brand">${car.brand}</span>
                <span class="car-result-model">${car.model}</span>
            </div>
            <span class="car-result-category ${car.type}">${car.category}</span>
        </div>
    `).join('');

    container.innerHTML = html;
    container.style.display = 'block';

    // Add click handlers
    container.querySelectorAll('.car-result-item').forEach(item => {
        item.addEventListener('click', function () {
            const name = this.dataset.name;
            const type = this.dataset.type;
            const category = this.dataset.category;
            const multiplier = parseFloat(this.dataset.multiplier);

            // Update input
            input.value = name;

            // Select the vehicle
            selectCarFromSearch(name, type, category, multiplier);

            // Hide results
            container.style.display = 'none';
        });

        // Hover state
        item.addEventListener('mouseenter', function () {
            container.querySelectorAll('.car-result-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * Select car from search results
 */
function selectCarFromSearch(name, type, category, multiplier) {
    console.log(`🚗 Selected: ${name} (${category})`);

    // Update selected vehicle state
    selectedVehicle = { name, type, category, multiplier };
    vehicleMultiplier = multiplier;

    // Update vehicle cards selection
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    vehicleCards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.type === type) {
            card.classList.add('selected');
        }
    });


    // Fetch services filtered by category from API
    loadServices(category);
}

/**
 * Select vehicle type from card click
 */
function selectVehicleType(type) {
    console.log(`🚗 Vehicle type selected: ${type}`);

    // Map type to category and multiplier
    const typeToCategory = {
        'hatchback': 'Hatchback',
        'sedan': 'Sedan',
        'compact-suv': 'Compact SUV',
        'suv': 'SUV',
        'bike': 'Bike'
    };

    const category = typeToCategory[type] || 'Sedan';
    const multiplier = categoryMultipliers[category] || 1.0;

    // Update selected vehicle state
    selectedVehicle = { name: category, type, category, multiplier };
    vehicleMultiplier = multiplier;

    // Update vehicle cards selection
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    vehicleCards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.type === type) {
            card.classList.add('selected');
        }
    });


    // Fetch services filtered by category from API
    loadServices(category);
}

/**
 * Clear vehicle selection
 */
function clearVehicleSelection() {
    selectedVehicle = null;
    vehicleMultiplier = 1.0;

    // Clear search input
    const searchInput = document.getElementById('car-model-search');
    if (searchInput) searchInput.value = '';

    // Remove selection from cards
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('selected');
    });


    // Fetch all services (no category filter)
    loadServices();
}

// Export functions
window.bookService = bookService;
window.viewServiceDetails = viewServiceDetails;
window.selectVehicleType = selectVehicleType;
window.clearVehicleSelection = clearVehicleSelection;

console.log('✅ Services page script loaded');