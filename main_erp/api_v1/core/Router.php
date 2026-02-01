<?php
class Router {
    private $routes = [];
    private $middlewares = [];
    private $currentPrefix = '';
    private $currentMiddleware = [];

    public function get($path, $handler) {
        $this->addRoute('GET', $path, $handler);
    }

    public function post($path, $handler) {
        $this->addRoute('POST', $path, $handler);
    }

    public function put($path, $handler) {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete($path, $handler) {
        $this->addRoute('DELETE', $path, $handler);
    }

    public function group($prefix, $callback, $middleware = []) {
        $previousPrefix = $this->currentPrefix;
        $previousMiddleware = $this->currentMiddleware;
        
        $this->currentPrefix = $previousPrefix . $prefix;
        $this->currentMiddleware = array_merge($previousMiddleware, $middleware);
        
        $callback($this);
        
        $this->currentPrefix = $previousPrefix;
        $this->currentMiddleware = $previousMiddleware;
    }

    private function addRoute($method, $path, $handler) {
        $fullPath = $this->currentPrefix . $path;
        // ADDED: Normalize path - remove trailing slash unless it's root
        $fullPath = $this->normalizePath($fullPath);
        
        $this->routes[] = [
            'method' => $method,
            'path' => $fullPath,
            'handler' => $handler,
            'middleware' => $this->currentMiddleware
        ];
    }

    // ADDED: Normalize path helper
    private function normalizePath($path) {
        // Remove trailing slash unless it's the root path
        if ($path !== '/' && substr($path, -1) === '/') {
            $path = rtrim($path, '/');
        }
        return $path;
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Remove the base API path to get clean route
        $basePath = '/main_erp/api_v1';
        $path = str_replace($basePath, '', $uri);
        
        // Ensure path starts with /
        if (substr($path, 0, 1) !== '/') {
            $path = '/' . $path;
        }
        
        // ADDED: Normalize incoming path too
        $path = $this->normalizePath($path);
        
        // If path is just /, show API info
        if ($path === '/') {
            Response::success([
                'message' => 'RONE ERP API',
                'version' => '1.0',
                'endpoints' => [
                    'POST /auth/register' => 'User registration',
                    'POST /auth/login' => 'User login',
                    'GET /users' => 'Get all users (auth required)',
                    'PUT /users/profile' => 'Update current user profile (auth required)'
                ]
            ], 'API is running');
            return;
        }
        
        // Sort routes: exact matches first, then parameterized
        $sortedRoutes = $this->sortRoutes($this->routes);
        
        foreach ($sortedRoutes as $route) {
            if ($route['method'] === $method && $this->matchRoute($route['path'], $path)) {
                // Execute middleware
                foreach ($route['middleware'] as $middleware) {
                    $this->executeMiddleware($middleware);
                }
                
                // Execute route handler
                $this->executeHandler($route['handler'], $path, $route['path']);
                return;
            }
        }
        
        Response::error("Endpoint not found. Requested: $method $path", 404);
    }

    private function sortRoutes($routes) {
        // Sort routes so exact matches come before parameterized ones
        usort($routes, function($a, $b) {
            $aHasParams = strpos($a['path'], '{') !== false;
            $bHasParams = strpos($b['path'], '{') !== false;
            
            if ($aHasParams && !$bHasParams) return 1;
            if (!$aHasParams && $bHasParams) return -1;
            return 0;
        });
        
        return $routes;
    }

    private function matchRoute($routePath, $requestPath) {
        // Exact match first
        if ($routePath === $requestPath) {
            return true;
        }
        
        // Convert route path to regex pattern for parameterized routes
        $pattern = preg_replace('/\{([^}]+)\}/', '([^/]+)', $routePath);
        $pattern = '#^' . $pattern . '$#';
        
        return preg_match($pattern, $requestPath);
    }

    private function executeMiddleware($middleware) {
        if (is_string($middleware)) {
            // Middleware class name
            $middlewareClass = $middleware;
            if (class_exists($middlewareClass)) {
                $middlewareInstance = new $middlewareClass();
                $middlewareInstance->handle();
            }
        } elseif (is_callable($middleware)) {
            // Middleware function
            $middleware();
        }
    }

    private function executeHandler($handler, $requestPath, $routePath) {
        if (is_string($handler)) {
            // Controller@method format
            if (strpos($handler, '@') !== false) {
                list($controllerName, $method) = explode('@', $handler);
                
                if (class_exists($controllerName)) {
                    $controller = new $controllerName();
                    
                    // Extract route parameters
                    $params = $this->extractParameters($routePath, $requestPath);
                    
                    if (method_exists($controller, $method)) {
                        call_user_func_array([$controller, $method], $params);
                    } else {
                        Response::error('Method not found', 404);
                    }
                } else {
                    Response::error('Controller not found', 404);
                }
            }
        } elseif (is_callable($handler)) {
            // Anonymous function
            $params = $this->extractParameters($routePath, $requestPath);
            call_user_func_array($handler, $params);
        }
    }

    private function extractParameters($routePath, $requestPath) {
        $routeParts = explode('/', trim($routePath, '/'));
        $requestParts = explode('/', trim($requestPath, '/'));
        
        $params = [];
        
        for ($i = 0; $i < count($routeParts); $i++) {
            if (preg_match('/\{([^}]+)\}/', $routeParts[$i])) {
                $params[] = $requestParts[$i] ?? null;
            }
        }
        
        return $params;
    }
}
?>