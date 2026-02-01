<?php
// Session management routes
// IMPORTANT: Specific routes MUST come before generic /{id} route

// Statistics endpoint (before /{id})
$router->get('/statistics', 'SessionController@getStatistics');

// Active session endpoint (before /{id})
$router->get('/active', 'SessionController@getActiveSession');

// List all sessions (before /{id})
$router->get('/', 'SessionController@getAll');

// Get session by ID
$router->get('/{id}', 'SessionController@getById');

// Create session
$router->post('/', 'SessionController@create');

// Update session
$router->put('/{id}', 'SessionController@update');

// Toggle active status
$router->put('/{id}/toggle-active', 'SessionController@toggleActive');

// Update settings
$router->put('/{id}/settings', 'SessionController@updateSettings');

// Delete session
$router->delete('/{id}', 'SessionController@delete');
?>