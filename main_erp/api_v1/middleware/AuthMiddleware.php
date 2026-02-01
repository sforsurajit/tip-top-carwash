<?php
class AuthMiddleware {
    public function handle() {
        // Debug: Log all headers
        $headers = getallheaders();
        error_log("All headers: " . print_r($headers, true));
        
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        error_log("Auth header: " . $authHeader);
        
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            error_log("Auth middleware failed: No valid Authorization header found");
            Response::error('Authorization token required', 401);
        }
        
        $token = $matches[1];
        error_log("Extracted token: " . substr($token, 0, 20) . "...");
        
        try {
            $payload = JWT::decode($token);
            
            // Store ALL payload data, not just id and email
            $GLOBALS['current_user'] = $payload;
            
            error_log("Auth successful for user: " . $payload['user_id']);
            error_log("Full payload stored: " . json_encode($payload));
            
        } catch (Exception $e) {
            error_log("JWT decode error: " . $e->getMessage());
            Response::error('Invalid or expired token', 401);
        }
    }
}

function getCurrentUser() {
    return $GLOBALS['current_user'] ?? null;
}
?>