<?php
function requireAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        Response::error('Authorization token required', 401);
    }

    $token = $matches[1];

    try {
        $payload = JWT::decode($token);
        $_SESSION['user_id'] = $payload['user_id'];
        $_SESSION['email'] = $payload['email'];
    } catch (Exception $e) {
        Response::error('Invalid or expired token', 401);
    }
}

?>
