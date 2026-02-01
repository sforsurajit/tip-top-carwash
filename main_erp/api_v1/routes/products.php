<?php
/**
 * Product Routes
 * 
 * PUBLIC ROUTES - No authentication required
 * - GET /products/home - Get home page products (8 featured products)
 * - GET /products/active - Get all active products
 * - GET /products/{id} - Get product details by ID or slug
 * - GET /products/brands - Get all brands
 * 
 * PROTECTED ROUTES - Admin authentication required
 * - POST /products - Create new product
 * - PUT /products/{id} - Update product
 * - PUT /products/{id}/status - Update product status
 * - PUT /products/{id}/stock - Update product stock
 * - DELETE /products/{id} - Delete product
 * - GET /products/statistics - Get product statistics
 */

// PUBLIC ROUTES (No authentication)
$router->get('/products/home', 'ProductController@getHomeProducts');
$router->get('/products/active', 'ProductController@getAllActive');
$router->get('/products/brands', 'ProductController@getAllBrands');
$router->get('/products/{id}', 'ProductController@getById');

// PROTECTED ROUTES (Admin only) - Already in AuthMiddleware group
$router->post('/products', 'ProductController@create');
$router->put('/products/{id}', 'ProductController@update');
$router->put('/products/{id}/status', 'ProductController@updateStatus');
$router->put('/products/{id}/stock', 'ProductController@updateStock');
$router->delete('/products/{id}', 'ProductController@delete');
$router->get('/products/statistics', 'ProductController@getStatistics');
?>