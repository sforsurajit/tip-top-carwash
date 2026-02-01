<?php
// Leave management routes
// Note: These routes will be wrapped with AuthMiddleware in api.php

// Leave application routes
$router->post('/org/{orgId}/apply', 'LeaveController@applyForLeave');

// User's leave management
$router->get('/org/{orgId}/my-leaves', 'LeaveController@getMyLeaves');

$router->get('/org/{orgId}/user-leaves', 'LeaveController@getuserLeaves');

$router->get('/org/{orgId}/{leaveId}', 'LeaveController@getLeaveById');
$router->put('/org/{orgId}/{leaveId}/cancel', 'LeaveController@cancelLeave');

// Admin leave management
$router->get('/org/{orgId}', 'LeaveController@getAllLeaves');
$router->put('/org/{orgId}/{leaveId}/status', 'LeaveController@updateLeaveStatus');

// Statistics and calendar
$router->get('/org/{orgId}/statistics', 'LeaveController@getStatistics');
$router->get('/org/{orgId}/calendar', 'LeaveController@getCalendar');

// Leave type management
$router->get('/leave-types/org/{orgId}', 'LeaveTypeController@getLeaveTypes');
$router->post('/leave-types/org/{orgId}', 'LeaveTypeController@createLeaveType');
$router->put('/leave-types/org/{orgId}/{typeId}', 'LeaveTypeController@updateLeaveType');
$router->delete('/leave-types/org/{orgId}/{typeId}', 'LeaveTypeController@deleteLeaveType');

// Document upload routes (these will be made public in api.php)
$router->post('/org/{orgId}/upload-document', 'LeaveController@uploadDocument');
$router->post('/org/{orgId}/upload-documents', 'LeaveController@uploadDocuments');
?>