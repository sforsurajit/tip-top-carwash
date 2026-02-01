/**
 * Component Loader
 * Dynamically loads HTML components into their respective containers
 */

// Global configuration
const COMPONENTS_CONFIG = {
    'topbar-container': {
        path: 'components/topbar.html',
        callback: 'initializeAuthSystem'
    },
    'navbar-container': {
        path: 'components/navbar.html',
        callback: 'initializeMobileMenu'
    },
    'auth-modal-container': {
        path: 'components/auth-modal.html',
        callback: 'initializeAuthSystem'
    },
    'hero-container': {
        path: 'components/hero.html',
        callback: 'initializeHero'
    },
    'services-container': {
        path: 'components/services.html',
        callback: 'initServices'
    },
    'how-it-works-container': {
        path: 'components/how-it-works.html',
        callback: 'initializeHowItWorks'
    },
    'why-choose-us': {
        path: 'components/why-choose-us.html',
        callback: 'initializeWhyChooseUs'
    },
    'testimonials': {
        path: 'components/testimonials.html',
        callback: 'initializeTestimonials'
    },
    'cta-section': {
        path: 'components/cta.html',
        callback: 'initializeCTA'
    },
    'footer': {
        path: 'components/footer.html',
        callback: 'initializeFooter'
    }
};

/**
 * Load a component into a container
 * @param {string} containerId - ID of the container element
 * @param {string} componentPath - Path to the component HTML file
 * @param {string} callbackName - Optional callback function name to execute after loading
 */
async function loadComponent(containerId, componentPath, callbackName = null) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }

    try {
        console.log(`Loading component: ${componentPath} into #${containerId}`);

        const response = await fetch(componentPath);

        if (!response.ok) {
            throw new Error(`Failed to load component: ${response.statusText}`);
        }

        const html = await response.text();

        // Remove loading skeleton
        const skeleton = container.querySelector('.skeleton-loader');
        if (skeleton) {
            skeleton.remove();
        }

        // Hide noscript fallback (keep for SEO)
        const noscript = container.querySelector('noscript');
        if (noscript) {
            noscript.style.display = 'none';
        }

        // Insert component content
        container.insertAdjacentHTML('beforeend', html);

        // Mark container as loaded
        container.classList.remove('loading');
        container.classList.add('loaded');

        console.log(`Successfully loaded ${componentPath}`);

        // Execute callback if provided
        if (callbackName && typeof window[callbackName] === 'function') {
            console.log(`Executing callback: ${callbackName}`);
            window[callbackName]();
        }

    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);

        // Remove skeleton
        const skeleton = container.querySelector('.skeleton-loader');
        if (skeleton) {
            skeleton.remove();
        }

        // Show error message
        container.innerHTML = `
            <div class="component-error">
                <p>⚠️ Unable to load content. Please refresh the page.</p>
                <small>${error.message}</small>
            </div>
        `;

        container.classList.remove('loading');
        container.classList.add('error');
    }
}

/**
 * Load all components defined in the configuration
 */
function loadAllComponents() {
    console.log('Loading all components...');

    Object.entries(COMPONENTS_CONFIG).forEach(([containerId, config]) => {
        loadComponent(containerId, config.path, config.callback);
    });
}

// Auto-load components when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllComponents);
} else {
    loadAllComponents();
}

// Expose functions to global scope
window.loadComponent = loadComponent;
window.loadAllComponents = loadAllComponents;
