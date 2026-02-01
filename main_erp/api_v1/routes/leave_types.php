<?php
// leave_types.php - Separate file for leave type routes

// Leave type management routes
$router->get('/leave-types/org/{orgId}', 'LeaveTypeController@getLeaveTypes');
$router->post('/leave-types/org/{orgId}', 'LeaveTypeController@createLeaveType');
$router->put('/leave-types/org/{orgId}/{typeId}', 'LeaveTypeController@updateLeaveType');
$router->delete('/leave-types/org/{orgId}/{typeId}', 'LeaveTypeController@deleteLeaveType');
?>