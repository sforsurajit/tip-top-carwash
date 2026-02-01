<?php
/**
 * API Debugger - Optimized for your routes/ folder structure
 */

echo "==== API DEBUGGER (YOUR STRUCTURE) ====\n\n";

$api_root = __DIR__;
echo "API Root: $api_root\n\n";

// Check 1: List all files in routes folder
echo "1. Checking Routes Folder:\n";
$routes_dir = $api_root . '/routes';
if (is_dir($routes_dir)) {
    $route_files = array_diff(scandir($routes_dir), ['.', '..']);
    echo "✓ Routes folder found with " . count($route_files) . " file(s):\n";
    foreach ($route_files as $file) {
        echo "  - $file\n";
    }
} else {
    echo "✗ Routes folder not found\n";
}

// Check 2: Search for 'my-features' or 'users' in route files
echo "\n2. Searching for 'my-features' endpoint:\n";
$found_endpoint = false;
if (is_dir($routes_dir)) {
    foreach ($route_files as $file) {
        $file_path = $routes_dir . '/' . $file;
        if (is_file($file_path) && pathinfo($file, PATHINFO_EXTENSION) === 'php') {
            $content = file_get_contents($file_path);
            
            if (strpos($content, 'my-features') !== false || strpos($content, 'myFeatures') !== false) {
                echo "✓ Found in: $file\n";
                $lines = file($file_path);
                foreach ($lines as $num => $line) {
                    if (strpos($line, 'my-features') !== false || strpos($line, 'myFeatures') !== false) {
                        echo "  Line " . ($num + 1) . ": " . trim($line) . "\n";
                    }
                }
                $found_endpoint = true;
            }
            
            // Also check for 'users' route
            if (strpos($content, 'users') !== false && !$found_endpoint) {
                echo "ℹ Found 'users' reference in: $file\n";
            }
        }
    }
}

if (!$found_endpoint) {
    echo "⚠ 'my-features' not found in any route files\n";
}

// Check 3: Check controllers
echo "\n3. Checking Controllers:\n";
$controllers_dir = $api_root . '/controllers';
if (is_dir($controllers_dir)) {
    $controllers = array_diff(scandir($controllers_dir), ['.', '..']);
    echo "✓ Controllers found: " . count($controllers) . "\n";
    foreach ($controllers as $controller) {
        echo "  - $controller\n";
    }
} else {
    echo "✗ Controllers folder not found\n";
}

// Check 4: Check for UserController specifically
echo "\n4. Checking for UserController:\n";
$user_controller_path = $controllers_dir . '/UserController.php';
if (file_exists($user_controller_path)) {
    echo "✓ UserController.php found\n";
    $controller_content = file_get_contents($user_controller_path);
    
    // Check for myFeatures or my_features method
    if (preg_match('/function\s+myFeatures|function\s+my_features|public\s+function\s+getMyFeatures/i', $controller_content)) {
        echo "✓ Found method that handles 'my-features'\n";
    } else {
        echo "✗ No method found for 'my-features' in UserController\n";
        // List all methods
        preg_match_all('/public\s+function\s+(\w+)/i', $controller_content, $matches);
        if (!empty($matches[1])) {
            echo "  Available methods:\n";
            foreach ($matches[1] as $method) {
                echo "    - $method()\n";
            }
        }
    }
} else {
    echo "⚠ UserController.php not found\n";
    echo "  Searching for user-related controllers...\n";
    if (is_dir($controllers_dir)) {
        $all_controllers = scandir($controllers_dir);
        $user_files = [];
        foreach ($all_controllers as $file) {
            if (stripos($file, 'user') !== false && $file !== '.' && $file !== '..') {
                $user_files[] = $file;
            }
        }
        if (!empty($user_files)) {
            echo "  Found:\n";
            foreach ($user_files as $file) {
                echo "    - $file\n";
            }
        }
    }
}

// Check 5: PHP Syntax errors
echo "\n5. Checking for PHP syntax errors...\n";
$error_files = [];
$dirs_to_check = ['routes', 'controllers', 'core', 'middleware', 'models'];

foreach ($dirs_to_check as $dir) {
    $dir_path = $api_root . '/' . $dir;
    if (is_dir($dir_path)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir_path, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        
        foreach ($files as $file) {
            if ($file->getExtension() === 'php') {
                $output = [];
                $return_var = 0;
                exec("php -l " . escapeshellarg($file->getRealPath()), $output, $return_var);
                
                if ($return_var !== 0) {
                    $error_files[] = [
                        'file' => str_replace($api_root, '', $file->getRealPath()),
                        'error' => implode("\n", $output)
                    ];
                }
            }
        }
    }
}

if (empty($error_files)) {
    echo "✓ No PHP syntax errors found\n";
} else {
    echo "✗ SYNTAX ERRORS FOUND:\n";
    foreach ($error_files as $error) {
        echo "\n  File: " . $error['file'] . "\n";
        echo "  Error: " . $error['error'] . "\n";
    }
}

// Check 6: Check index.php
echo "\n6. Checking index.php:\n";
$index_file = $api_root . '/index.php';
if (file_exists($index_file)) {
    echo "✓ index.php exists\n";
    $size = filesize($index_file);
    echo "  Size: " . $size . " bytes\n";
} else {
    echo "✗ index.php not found\n";
}

// Check 7: Check .env and config
echo "\n7. Checking configuration:\n";
if (file_exists($api_root . '/.env')) {
    echo "✓ .env file found\n";
}

$config_dir = $api_root . '/config';
if (is_dir($config_dir)) {
    $config_files = array_diff(scandir($config_dir), ['.', '..']);
    echo "✓ Config folder with " . count($config_files) . " file(s):\n";
    foreach ($config_files as $file) {
        echo "  - $file\n";
    }
}

echo "\n==== SUMMARY ====\n";
echo "Now please share:\n";
echo "1. Content of your routes files (especially any file with 'users' or 'my-features')\n";
echo "2. Content of your UserController.php (or the controller handling users endpoint)\n";
echo "3. Your index.php (to see how routing is handled)\n";
echo "4. Error log: tail -50 /home/u341108544/domains/rootsofnortheast.com/public_html/error_log\n";
echo "\n";

?>