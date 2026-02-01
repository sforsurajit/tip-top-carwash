# Rone ERP API - Complete Structure Guide for AI

## 🏗️ **API Architecture Overview**

This is a **PHP-based REST API** using **JWT authentication** with a **custom MVC routing system**. The API follows clean architecture principles with separation of concerns, middleware-based authentication, and standardized response formatting.

**Base URL:** `https://rootsofnortheast.com/main_erp/api_v1/`
**Authentication:** JWT Bearer tokens
**Database:** MySQL with PDO
**Response Format:** JSON with standardized success/error structure

---

## 📁 **Directory Structure & Purpose**

```
main_erp/api_v1/
├── 📄 index.php                    # Single entry point - bootstraps entire application
├── 📄 .htaccess                    # URL rewriting, CORS headers, security headers
├── 📄 .env                         # Environment variables (DB, JWT secrets, etc.)
├── 📁 config/                      # Configuration classes
│   ├── 📄 database.php             # Database connection singleton with PDO
│   └── 📄 jwt.php                  # JWT token encoding/decoding utilities
├── 📁 core/                        # Core framework components
│   └── 📄 Router.php               # Custom routing system with middleware support
├── 📁 middleware/                  # HTTP middleware components
│   └── 📄 AuthMiddleware.php       # JWT authentication guard
├── 📁 routes/                      # Route definitions (URL → Controller mapping)
│   ├── 📄 api.php                  # Main route registry with groups
│   ├── 📄 auth.php                 # Authentication endpoints (login, register)
│   └── 📄 users.php                # User management endpoints (CRUD + profile)
├── 📁 controllers/                 # Request handlers (business logic)
│   ├── 📄 AuthController.php       # Authentication logic (login, register, refresh)
│   └── 📄 UserController.php       # User management (CRUD, profile updates)
├── 📁 models/                      # Data access layer (database operations)
│   └── 📄 User.php                 # User model with CRUD operations
├── 📁 utils/                       # Utility classes
│   ├── 📄 Response.php             # Standardized JSON response formatter
│   └── 📄 Validator.php            # Input validation utilities
└── 📁 logs/                        # Application logs
```

---

## 🔄 **Request Flow Architecture**

```
HTTP Request → index.php → Router → Middleware → Controller → Model → Database
     ↓
JSON Response ← Response Utility ← Controller ← Model ← Database
```

**Detailed Flow:**
1. **index.php** - Entry point, loads dependencies, initializes router
2. **Router** - Matches URL to controller/method, extracts parameters
3. **Middleware** - Authenticates requests, sets user context
4. **Controller** - Handles business logic, validates input
5. **Model** - Performs database operations
6. **Response** - Returns standardized JSON format

---

## 🛡️ **Authentication System**

**Type:** JWT (JSON Web Tokens)
**Header Format:** `Authorization: Bearer <token>`
**Token Payload:**
```json
{
  "user_id": 123,
  "email": "user@example.com",
  "iat": 1640995200,
  "exp": 1641081600
}
```

**Protected Routes:** Require `AuthMiddleware` in route group
**Current User Access:** `getCurrentUser()` function returns authenticated user data

---

## 🗂️ **Database Schema**

**Primary Table: `users`**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🛣️ **Routing System**

**Route Definition Pattern:**
```php
$router->METHOD('/path', 'ControllerName@methodName');
$router->METHOD('/path/{parameter}', 'ControllerName@methodName');
```

**Route Groups with Middleware:**
```php
$router->group('/prefix', function($router) {
    // Routes here inherit prefix and middleware
}, ['MiddlewareName']);
```

**Current Endpoints:**
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration  
- `GET /users` - List users (authenticated)
- `PUT /users/profile` - Update current user profile (authenticated)
- `GET /users/{id}` - Get specific user (authenticated)

---

## 📋 **Standard Response Format**

**Success Response:**
```json
{
    "success": true,
    "message": "Operation successful",
    "data": {...},
    "timestamp": "2025-01-15 10:30:00"
}
```

**Error Response:**
```json
{
    "success": false,
    "message": "Error description",
    "errors": ["Detailed error array"],
    "timestamp": "2025-01-15 10:30:00"
}
```

---

## 🎯 **How to Add New Features**

### **Step 1: Create Model (if needed)**
**Location:** `models/FeatureName.php`
**Pattern:**
```php
<?php
require_once 'config/database.php';

class FeatureName {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    public function create($data) {
        $sql = "INSERT INTO table_name (columns...) VALUES (?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$data['field1'], $data['field2']]);
    }

    public function findById($id) {
        $sql = "SELECT * FROM table_name WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    // Additional CRUD methods...
}
?>
```

### **Step 2: Create Controller**
**Location:** `controllers/FeatureNameController.php`
**Pattern:**
```php
<?php
require_once 'models/FeatureName.php';
require_once 'utils/Validator.php';

class FeatureNameController {
    private $model;

    public function __construct() {
        $this->model = new FeatureName();
    }

    public function methodName($parameter = null) {
        try {
            // For protected routes
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
            }

            // Get input data
            $input = json_decode(file_get_contents('php://input'), true);

            // Validate input
            $errors = Validator::validateRequired(['field1', 'field2'], $input);
            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
            }

            // Business logic
            $result = $this->model->methodName($input);

            // Return response
            if ($result) {
                Response::success($result, 'Success message');
            } else {
                Response::error('Operation failed', 500);
            }

        } catch (Exception $e) {
            Response::error('Server error: ' . $e->getMessage(), 500);
        }
    }
}
?>
```

### **Step 3: Create Routes**
**Location:** `routes/feature_name.php`
**Pattern:**
```php
<?php
// GET /feature-name
$router->get('/feature-name', 'FeatureNameController@getAll');

// POST /feature-name
$router->post('/feature-name', 'FeatureNameController@create');

// GET /feature-name/{id}
$router->get('/feature-name/{id}', 'FeatureNameController@getById');

// PUT /feature-name/{id}
$router->put('/feature-name/{id}', 'FeatureNameController@update');

// DELETE /feature-name/{id}
$router->delete('/feature-name/{id}', 'FeatureNameController@delete');
?>
```

### **Step 4: Register Routes**
**Location:** `routes/api.php`
**Add:**
```php
// Include the controller
require_once 'controllers/FeatureNameController.php';

// Register route group
$router->group('/feature-name', function($router) {
    require_once 'routes/feature_name.php';
}, ['AuthMiddleware']); // Add middleware if needed
```

### **Step 5: Update index.php**
**Add controller include:**
```php
require_once 'controllers/FeatureNameController.php';
```

---

## 🔧 **Code Patterns & Conventions**

### **Naming Conventions:**
- **Files:** PascalCase for classes (`UserController.php`), snake_case for routes (`user_routes.php`)
- **Classes:** PascalCase (`UserController`)
- **Methods:** camelCase (`getUserById`)
- **Database:** snake_case (`user_id`, `created_at`)
- **Routes:** kebab-case (`/users/profile`, `/auth/login`)

### **Error Handling Pattern:**
```php
try {
    // Operation
    if ($success) {
        Response::success($data, 'Success message');
    } else {
        Response::error('Failure message', 400);
    }
} catch (Exception $e) {
    Response::error('Server error: ' . $e->getMessage(), 500);
}
```

### **Input Validation Pattern:**
```php
$errors = Validator::validateRequired(['field1', 'field2'], $input);
if (!Validator::validateEmail($input['email'] ?? '')) {
    $errors[] = 'Invalid email format';
}
if (!empty($errors)) {
    Response::error('Validation failed', 400, $errors);
}
```

### **Database Query Pattern:**
```php
// Always use prepared statements
$sql = "SELECT * FROM table WHERE field = ?";
$stmt = $this->db->prepare($sql);
$stmt->execute([$value]);
return $stmt->fetch(); // or fetchAll()
```

---

## 🚀 **Middleware System**

**Creating New Middleware:**
**Location:** `middleware/MiddlewareName.php`
```php
<?php
class MiddlewareName {
    public function handle() {
        // Middleware logic
        if (!$condition) {
            Response::error('Middleware check failed', 403);
        }
        // Continue to next middleware/controller
    }
}
?>
```

**Applying Middleware:**
```php
// To specific routes
$router->group('/protected', function($router) {
    // Routes here
}, ['AuthMiddleware', 'AdminMiddleware']);
```

---

## 💾 **Database Integration**

**Connection:** Singleton pattern in `config/database.php`
**ORM:** None - uses raw PDO with prepared statements
**Migrations:** Manual SQL execution
**Query Builder:** None - raw SQL queries

**Adding New Tables:**
1. Create SQL schema
2. Create model class following User.php pattern
3. Implement CRUD methods with prepared statements

---

## 🎛️ **Environment Configuration**

**File:** `.env`
**Key Variables:**
```
DB_HOST=localhost
DB_NAME=database_name
DB_USER=username
DB_PASS=password
JWT_SECRET=your-secret-key
```

**Usage in Code:**
```php
$host = $_ENV['DB_HOST'] ?? 'localhost';
```

---

## 📊 **Current API Endpoints**

| Method | Endpoint | Controller | Middleware | Description |
|--------|----------|------------|------------|-------------|
| POST | `/auth/login` | AuthController@login | None | User authentication |
| POST | `/auth/register` | AuthController@register | None | User registration |
| GET | `/users` | UserController@getAllUsers | Auth | List all users |
| GET | `/users/{id}` | UserController@getUserById | Auth | Get specific user |
| PUT | `/users/profile` | UserController@updateCurrentUserProfile | Auth | Update current user |

---

## 🔍 **AI Instructions for Extension**

When adding new functionality:

1. **Analyze the feature requirements**
2. **Determine database needs** - Create model if needed
3. **Create controller** following existing patterns
4. **Define routes** in separate route file
5. **Register routes** in api.php with appropriate middleware
6. **Update index.php** with new includes
7. **Follow naming conventions** strictly
8. **Use existing Response and Validator utilities**
9. **Implement proper error handling**
10. **Add authentication where needed**

**Always maintain:**
- Consistent error handling
- Input validation
- Prepared statements for database queries
- Standardized response format
- Proper middleware usage
- Security best practices

This API structure is designed for scalability, maintainability, and security. Each component has a specific responsibility, making it easy to extend without affecting existing functionality.