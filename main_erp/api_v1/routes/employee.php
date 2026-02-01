<?php
// PROTECTED employee routes - authentication required via AuthMiddleware

// Get all employees (excluding students) with filters
$router->get('/org/{orgId}', 'EmployeeController@getAllEmployees');

// Get available user types for filtering
$router->get('/org/{orgId}/user-types', 'EmployeeController@getAvailableUserTypes');

// Get employee statistics
$router->get('/org/{orgId}/statistics', 'EmployeeController@getStatistics');

// Get single employee by ID
$router->get('/org/{orgId}/{employeeId}', 'EmployeeController@getEmployeeById');

// Update employee
$router->put('/org/{orgId}/{employeeId}', 'EmployeeController@updateEmployee');

// Update employee status (approve/reject/activate/deactivate)
$router->put('/org/{orgId}/{employeeId}/status', 'EmployeeController@updateEmployeeStatus');

// Delete employee
$router->delete('/org/{orgId}/{employeeId}', 'EmployeeController@deleteEmployee');
?>