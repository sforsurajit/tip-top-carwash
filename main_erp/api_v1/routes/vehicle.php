<?php
// VEHICLE ROUTES

// Get all vehicles for current customer
$router->get('/', 'VehicleController@getAll');

// Get vehicle by ID
$router->get('/{id}', 'VehicleController@getById');

// Create new vehicle
$router->post('/', 'VehicleController@create');

// Update vehicle
$router->put('/{id}', 'VehicleController@update');

// Delete vehicle
$router->delete('/{id}', 'VehicleController@delete');
?>