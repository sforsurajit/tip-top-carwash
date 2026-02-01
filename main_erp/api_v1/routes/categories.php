<?php
/**
 * Category Routes
 * 
 * PUBLIC ROUTES - No authentication required
 * - GET /categories/active - Get all active categories
 * - GET /categories/top-level - Get top level categories
 * - GET /categories/{id} - Get category details by ID or key
 * - GET /categories/{id}/subcategories - Get subcategories
 * 
 * PROTECTED ROUTES - Admin authentication required
 * - GET /categories/all - Get all categories (including inactive)
 * - POST /categories - Create new category
 * - PUT /categories/{id} - Update category
 * - PUT /categories/{id}/status - Update category status
 * - DELETE /categories/{id} - Delete category
 */

// PUBLIC ROUTES (No authentication)
$router->get('/categories/active', 'CategoryController@getAllActive');
$router->get('/categories/top-level', 'CategoryController@getTopLevel');
$router->get('/categories/{id}', 'CategoryController@getById');
$router->get('/categories/{id}/subcategories', 'CategoryController@getSubcategories');

// PROTECTED ROUTES (Admin only) - Already in AuthMiddleware group
$router->get('/categories/all', 'CategoryController@getAll');
$router->post('/categories', 'CategoryController@create');
$router->put('/categories/{id}', 'CategoryController@update');
$router->put('/categories/{id}/status', 'CategoryController@updateStatus');
$router->delete('/categories/{id}', 'CategoryController@delete');
?>