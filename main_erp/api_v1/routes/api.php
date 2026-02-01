<?php

require_once 'controllers/AuthController.php';
require_once 'controllers/EmployeeController.php';
require_once 'controllers/FormTemplateController.php';
require_once 'controllers/OrganizationController.php';
require_once 'controllers/SessionController.php';
require_once 'controllers/UserController.php';
require_once 'controllers/SystemFeatureController.php';
require_once 'controllers/ServiceController.php';
require_once 'controllers/BookingController.php';
require_once 'controllers/ProductController.php';
require_once 'controllers/CategoryController.php';
require_once 'controllers/VehicleController.php'; // ADD THIS LINE


// Authentication routes (public)
$router->group('/auth', function($router) {
    require_once 'routes/auth.php';
});

// ==================== PUBLIC PRODUCT ROUTES ====================
// These routes are accessible to everyone (no authentication required)

// Product routes
$router->get('/products/home', 'ProductController@getHomeProducts');
$router->get('/products/active', 'ProductController@getAllActive');
$router->get('/products/brands', 'ProductController@getAllBrands');
$router->get('/products/{id}', 'ProductController@getById');

// Category routes
$router->get('/categories/active', 'CategoryController@getAllActive');
$router->get('/categories/top-level', 'CategoryController@getTopLevel');
$router->get('/categories/{id}', 'CategoryController@getById');
$router->get('/categories/{id}/subcategories', 'CategoryController@getSubcategories');

// ==================== PUBLIC SERVICE ROUTES ====================
$router->get('/services/active', 'ServiceController@getAllActive');
$router->get('/services/{id}', 'ServiceController@getById');

// ==================== PROTECTED ROUTES ====================

// PROTECTED product management routes (with middleware)
$router->group('/products', function($router) {
    require_once 'routes/products.php';
}, ['AuthMiddleware']);

// PROTECTED category management routes (with middleware)
$router->group('/categories', function($router) {
    require_once 'routes/categories.php';
}, ['AuthMiddleware']);

// PROTECTED service management routes (with middleware)
$router->group('/services', function($router) {
    require_once 'routes/services.php';
}, ['AuthMiddleware']);

// User management routes (protected)
$router->group('/users', function($router) {
    require_once 'routes/users.php';
}, ['AuthMiddleware']);

// PUBLIC organization routes (no middleware) - DEFINE THESE FIRST
$router->get('/organizations/public', 'OrganizationController@getPublicOrganizations');
$router->get('/organizations/{id}/auth-info', 'OrganizationController@getOrganizationForAuth');
$router->post('/organizations', 'OrganizationController@create');

// Alternative endpoints for schools and institutions (also public)
$router->post('/schools', 'OrganizationController@create');
$router->post('/institutions', 'OrganizationController@create');

// PROTECTED organization management routes (with middleware)
$router->group('/organizations', function($router) {
    $router->get('/', 'OrganizationController@getAll');
    $router->get('/statistics', 'OrganizationController@getStatistics');
    $router->get('/feature-analytics', 'OrganizationController@getFeatureAnalytics');
    $router->get('/{id}', 'OrganizationController@getById');
    $router->put('/{id}', 'OrganizationController@update');
    $router->put('/{id}/status', 'OrganizationController@updateStatus');
    $router->delete('/{id}', 'OrganizationController@delete');
}, ['AuthMiddleware']);

// PUBLIC SYSTEM FEATURES ROUTES (No Auth Required)

// Get all active features (for selection)
$router->get('/system-features/active', 'SystemFeatureController@getActiveFeatures');
$router->get('/system-features/all', 'SystemFeatureController@getAll');
$router->get('/system-features/statistics', 'SystemFeatureController@getStatistics');

// Feature CRUD Operations
$router->post('/system-features', 'SystemFeatureController@create');
$router->put('/system-features/{id}', 'SystemFeatureController@update');
$router->put('/system-features/{id}/toggle-status', 'SystemFeatureController@toggleStatus');
$router->delete('/system-features/{id}', 'SystemFeatureController@delete');

// Module CRUD Operations
$router->post('/system-features/modules', 'SystemFeatureController@createModule');
$router->put('/system-features/modules/{moduleId}', 'SystemFeatureController@updateModule');
$router->delete('/system-features/modules/{moduleId}', 'SystemFeatureController@deleteModule');

// USER FEATURE MANAGEMENT ROUTES (Primary)

$router->get('/system-features/users', 'SystemFeatureController@getUsersWithFeatures');
$router->get('/system-features/institutions/{institutionId}/users', 'SystemFeatureController@getUsersByInstitution');
$router->get('/system-features/users/{userId}', 'SystemFeatureController@getUserFeatures');
$router->put('/system-features/users/{userId}', 'SystemFeatureController@updateUserFeatures');
$router->post('/system-features/users/{userId}/add', 'SystemFeatureController@addFeatureToUser');
$router->delete('/system-features/users/{userId}/remove/{systemKey}', 'SystemFeatureController@removeFeatureFromUser');
$router->put('/system-features/users/{userId}/toggle/{systemKey}', 'SystemFeatureController@toggleUserFeature');
$router->get('/system-features/organizations/{orgId}', 'SystemFeatureController@getOrganizationFeatures');
$router->put('/system-features/organizations/{orgId}', 'SystemFeatureController@updateOrganizationFeatures');

// Session management routes (protected)
$router->group('/sessions', function($router) {
    require_once 'routes/sessions.php';
}, ['AuthMiddleware']);

// Form template management routes (protected)
$router->group('/form-templates', function($router) {
    require_once 'routes/form_templates.php';
}, ['AuthMiddleware']);

// ==================== EMPLOYEE ROUTES ====================

// PUBLIC employee routes (registration and uploads)
$router->get('/employee/org/{orgId}/registration-form', 'EmployeeController@getRegistrationForm');
$router->post('/employee/org/{orgId}/register', 'EmployeeController@registerEmployee');
$router->post('/employee/org/{orgId}/upload-profile', 'EmployeeController@uploadProfileImage');
$router->post('/employee/org/{orgId}/upload-file', 'EmployeeController@uploadFile');
$router->post('/employee/org/{orgId}/upload-files', 'EmployeeController@uploadFiles');

// PROTECTED EMPLOYEE ROUTES (with AuthMiddleware)
$router->group('/employee', function($router) {
    require_once 'routes/employee.php';
}, ['AuthMiddleware']);

//for bookings
$router->group('/bookings', function($router) {
    require_once 'routes/bookings.php';
}, ['AuthMiddleware']);

// ==================== VEHICLE ROUTES ====================
$router->group('/vehicles', function($router) {
    require_once 'routes/vehicle.php';
}, ['AuthMiddleware']); // ADD THIS SECTION


?>