document.addEventListener('DOMContentLoaded', function() {
    loadComponents();
});

async function loadComponents() {
    const components = [
        { id: 'header-container', file: 'components/header.html' },
        { id: 'hero-container', file: 'components/hero.html' },
        { id: 'services-container', file: 'components/services.html' },
        { id: 'products-container', file: 'components/products.html' },
        { id: 'categories-container', file: 'components/categories.html' },
        { id: 'why-choose-us-container', file: 'components/why-choose-us.html' },
        { id: 'testimonials-container', file: 'components/testimonials.html' },
        { id: 'cta-container', file: 'components/cta.html' },
        { id: 'footer-container', file: 'components/footer.html' }
    ];

    for (const component of components) {
        await loadComponent(component.id, component.file);
    }
}

async function loadComponent(containerId, filePath) {
    try {
        const response = await fetch(filePath);
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
    } catch (error) {
        console.error(`Error loading component ${filePath}:`, error);
    }
}

function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;z-index:99999';
    loader.innerHTML = '<div style="border:4px solid #f3f3f3;border-top:4px solid #2563eb;border-radius:50%;width:50px;height:50px;animation:spin 1s linear infinite"></div>';
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.remove();
    }
}

const style = document.createElement('style');
style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
document.head.appendChild(style);