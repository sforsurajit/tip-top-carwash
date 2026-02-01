<?php
/**
 * Customer API Routes
 * Defines all customer-related endpoints
 * 
 * @package TipTop Car Wash
 * @version 1.0
 */

require_once __DIR__ . '/../controllers/CustomerController.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Initialize controller
$controller = new CustomerController();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '/';

// Remove leading slash
$path = ltrim($path, '/');

// Split path into segments
$segments = explode('/', $path);

try {
    // Route handling
    switch ($method) {
        case 'GET':
            if ($path === 'check-phone') {
                // GET /api/customers/check-phone?phone=+919876543210
                echo $controller->checkPhone();
            } elseif (count($segments) === 1 && is_numeric($segments[0])) {
                // GET /api/customers/{id}
                echo $controller->getProfile($segments[0]);
            } elseif (count($segments) === 2 && is_numeric($segments[0])) {
                // GET /api/customers/{id}/{resource}
                $id = $segments[0];
                $resource = $segments[1];
                
                switch ($resource) {
                    case 'last-booking':
                        echo $controller->getLastBooking($id);
                        break;
                    case 'bookings':
                        echo $controller->getBookings($id);
                        break;
                    case 'vehicles':
                        echo $controller->getVehicles($id);
                        break;
                    case 'locations':
                        echo $controller->getLocations($id);
                        break;
                    case 'statistics':
                        echo $controller->getStatistics($id);
                        break;
                    default:
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Resource not found'
                        ]);
                }
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Endpoint not found'
                ]);
            }
            break;

        case 'POST':
            if ($path === '' || $path === '/') {
                // POST /api/customers
                echo $controller->create();
            } elseif (count($segments) === 2 && is_numeric($segments[0])) {
                // POST /api/customers/{id}/{resource}
                $id = $segments[0];
                $resource = $segments[1];
                
                switch ($resource) {
                    case 'vehicles':
                        echo $controller->saveVehicle($id);
                        break;
                    case 'locations':
                        echo $controller->saveLocation($id);
                        break;
                    default:
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Resource not found'
                        ]);
                }
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Endpoint not found'
                ]);
            }
            break;

        case 'PUT':
            if (count($segments) === 1 && is_numeric($segments[0])) {
                // PUT /api/customers/{id}
                echo $controller->update($segments[0]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Endpoint not found'
                ]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
    }
} catch (Exception $e) {
    error_log("Customer API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error'
    ]);
}
?>
