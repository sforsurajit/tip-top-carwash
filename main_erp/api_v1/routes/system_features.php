<?php
// System Features Routes
// Protected routes (authentication required)

// Get all system features with modules
$router->get('/', 'SystemFeatureController@getAll');

// Get feature statistics
$router->get('/statistics', 'SystemFeatureController@getStatistics');

// Create a new system feature
$router->post('/', 'SystemFeatureController@create');

// Update a system feature
$router->put('/{id}', 'SystemFeatureController@update');

// Toggle feature active status
$router->put('/{id}/toggle-status', 'SystemFeatureController@toggleStatus');

// Delete a system feature
$router->delete('/{id}', 'SystemFeatureController@delete');

// Module management
$router->post('/modules', 'SystemFeatureController@createModule');
$router->put('/modules/{moduleId}', 'SystemFeatureController@updateModule');
$router->delete('/modules/{moduleId}', 'SystemFeatureController@deleteModule');

// Get organizations with their features
$router->get('/organizations', 'SystemFeatureController@getOrganizationsWithFeatures');
?>