<?php
class Validator {
    public static function validateRequired($fields, $data) {
        $errors = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $errors[] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
            }
        }
        return $errors;
    }

    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function validateUrl($url) {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    public static function validatePhone($phone) {
        return preg_match('/^[\d\s\-\+\(\)]{10,}$/', $phone);
    }

    public static function validatePincode($pincode) {
        return preg_match('/^\d{6}$/', $pincode);
    }

    public static function validateYear($year) {
        $currentYear = date('Y');
        return is_numeric($year) && $year >= 1800 && $year <= $currentYear;
    }
}
?>