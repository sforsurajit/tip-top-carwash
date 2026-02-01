<?php
session_start();


// Handle CORS headers FIRST - before any other processing
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set content type after handling OPTIONS
header('Content-Type: application/json');

// Handle Authorization header
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $_SERVER['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
}

// Include required files
require_once 'config/database.php';
require_once 'config/jwt.php';
require_once 'utils/Response.php';
require_once 'utils/Validator.php';
require_once 'middleware/AuthMiddleware.php';

// Include controllers

require_once 'controllers/AuthController.php';
require_once 'controllers/EmployeeController.php';
require_once 'controllers/FormTemplateController.php';
require_once 'controllers/OrganizationController.php';
require_once 'controllers/SessionController.php';
require_once 'controllers/UserController.php';
require_once 'controllers/SystemFeatureController.php';
require_once 'controllers/BookingController.php';
require_once 'controllers/ProductController.php';
require_once 'controllers/CategoryController.php';
require_once 'controllers/VehicleController.php';

// Include models

require_once 'models/Employee.php';
require_once 'models/FormTemplate.php';
require_once 'models/Organization.php';
require_once 'models/Session.php';
require_once 'models/SystemFeature.php';
require_once 'models/User.php';
require_once 'models/UserFeatures.php';
require_once 'models/Booking.php';
require_once 'models/Product.php';
require_once 'models/Category.php';
require_once 'models/Vehicle.php';


// Include router
require_once 'core/Router.php';

try {
    // Initialize router
    $router = new Router();
    
    // Load all routes
    require_once 'routes/api.php';
    
    // Handle the request
    $router->handleRequest();
    
} catch (Exception $e) {
    Response::error('Internal server error: ' . $e->getMessage(), 500);
}
?>