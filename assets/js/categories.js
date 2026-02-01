document.addEventListener('DOMContentLoaded', function() {
    initializeCategories();
});

function initializeCategories() {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const categoryTitle = this.querySelector('.category-title').textContent;
            console.log('Selected category:', categoryTitle);
        });
    });
}