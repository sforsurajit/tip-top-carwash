<?php
// Form template management routes
$router->get('/', 'FormTemplateController@getFormTemplatesByInstitution');
$router->get('/statistics', 'FormTemplateController@getFormStatistics');
$router->get('/user-type/{userType}', 'FormTemplateController@getActiveFormByUserType');
$router->get('/{id}', 'FormTemplateController@getFormTemplateById');
$router->post('/', 'FormTemplateController@createFormTemplate');
$router->put('/{id}', 'FormTemplateController@updateFormTemplate');
$router->delete('/{id}', 'FormTemplateController@deleteFormTemplate');
?>