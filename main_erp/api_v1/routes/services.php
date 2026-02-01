<?php
/**
 * Service Routes
 * 
 * PUBLIC ROUTES - No authentication required
 * - GET /services/active - Get all active services
 * - GET /services/{id} - Get service details by ID or key
 * 
 * PROTECTED ROUTES - Admin authentication required
 * - GET /services/all - Get all services (including inactive)
 * - POST /services - Create new service
 * - PUT /services/{id} - Update service
 * - PUT /services/{id}/status - Update service status
 * - DELETE /services/{id} - Delete service
 * - GET /services/statistics - Get service statistics
 */

// PUBLIC ROUTES (No authentication)
$router->get('/services/active', 'ServiceController@getAllActive');
$router->get('/services/{id}', 'ServiceController@getById');

// PROTECTED ROUTES (Admin only)
$router->get('/services/all', 'ServiceController@getAll');
$router->post('/services', 'ServiceController@create');
$router->put('/services/{id}', 'ServiceController@update');
$router->put('/services/{id}/status', 'ServiceController@updateStatus');
$router->delete('/services/{id}', 'ServiceController@delete');
$router->get('/services/statistics', 'ServiceController@getStatistics');
?>