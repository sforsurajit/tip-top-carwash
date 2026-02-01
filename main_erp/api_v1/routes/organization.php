<?php
// College/School management routes

// Public route - Create new organization/college/school account (no authentication)
$router->post('/', 'OrganizationController@create');

// Protected routes (authentication required)
$router->get('/', 'OrganizationController@getAll');
$router->get('/statistics', 'OrganizationController@getStatistics');
$router->get('/feature-analytics', 'OrganizationController@getFeatureAnalytics');
$router->get('/{id}', 'OrganizationController@getById');
$router->put('/{id}', 'OrganizationController@update');
$router->put('/{id}/status', 'OrganizationController@updateStatus');
$router->delete('/{id}', 'OrganizationController@delete');
?>