<?php
// Existing routes...
$router->get('/', 'UserController@getAllUsers');
$router->post('/', 'UserController@createUser');
$router->get('/profile', 'UserController@getCurrentUserProfile');
$router->put('/profile', 'UserController@updateCurrentUserProfile');

// New institution-specific routes
$router->get('/institution', 'UserController@getInstitutionUsers');
$router->post('/institution', 'UserController@createInstitutionUser');
$router->post('/{id}/features', 'UserController@assignUserFeatures');
$router->get('/{id}/features', 'UserController@getUserFeatures');
$router->get('/my-features', 'UserController@getUserFeatures');
$router->get('/org/{orgId}/my-features', 'UserController@getOrganizationUserFeatures');

// Existing routes...
$router->get('/{id}', 'UserController@getUserById');
$router->put('/{id}', 'UserController@updateUser');
$router->delete('/{id}', 'UserController@deleteUser');

// ==================== USER MANAGEMENT MODULE ROUTES ====================

// Get all users in organization (already exists - you have this)
$router->get('/org/{orgId}', 'UserController@getOrganizationUsers');

// Get specific user's features in organization (NEW - for individual user feature view)
$router->get('/org/{orgId}/user/{userId}/features', 'UserController@getUserFeaturesInOrg');

// Assign features to specific user in organization (NEW - for individual assignment)
$router->put('/org/{orgId}/user/{userId}/features', 'UserController@assignUserFeaturesInOrg');

// Bulk assign features to user type in organization (NEW - for bulk assignment)
$router->post('/org/{orgId}/bulk-assign-features', 'UserController@bulkAssignUserFeaturesInOrg');

// Get organization statistics (NEW - for dashboard stats)
$router->get('/org/{orgId}/statistics', 'UserController@getOrganizationStatistics');

// Update user status in organization (NEW - for status management)
$router->put('/org/{orgId}/user/{userId}/status', 'UserController@updateUserStatusInOrg');

?>