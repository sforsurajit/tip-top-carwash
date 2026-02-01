<?php
// Updated auth.php routes

// Existing global authentication routes
$router->post('/login', 'AuthController@login');
$router->post('/register', 'AuthController@register');
$router->post('/refresh', 'AuthController@refresh');
$router->post('/logout', function() {
    Response::success(null, 'Logged out successfully');
});

// NEW: Organization-specific authentication routes
$router->post('/org/{orgId}/login', 'AuthController@orgLogin');
$router->post('/org/{orgId}/register', 'AuthController@orgRegister');

?>