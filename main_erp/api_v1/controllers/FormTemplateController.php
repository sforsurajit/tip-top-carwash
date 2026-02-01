<?php
require_once 'models/FormTemplate.php';
require_once 'utils/Validator.php';

class FormTemplateController {
    private $formTemplateModel;

    public function __construct() {
        $this->formTemplateModel = new FormTemplate();
    }

    public function createFormTemplate() {
            try {
                $currentUser = getCurrentUser();
                if (!$currentUser || !in_array($currentUser['user_type'], ['superadmin', 'admin'])) {
                    Response::error('Insufficient privileges', 403);
                    return;
                }
        
                $input = json_decode(file_get_contents('php://input'), true);
        
                if (json_last_error() !== JSON_ERROR_NONE) {
                    Response::error('Invalid JSON: ' . json_last_error_msg(), 400);
                    return;
                }
        
                // Validate ONLY string fields with the validator
                $requiredFields = ['user_type', 'form_name']; // REMOVED 'form_structure'
                $errors = Validator::validateRequired($requiredFields, $input);
        
                $validUserTypes = ['admin', 'staff', 'teacher', 'student', 'accountant', 'librarian', 'driver', 'security','employee'];
                if (!in_array($input['user_type'] ?? '', $validUserTypes)) {
                    $errors[] = 'Invalid user type';
                }
        
                // Manually validate form_structure (it's an array, not a string)
                if (!isset($input['form_structure']) || !is_array($input['form_structure'])) {
                    $errors[] = 'Form structure is required';
                } elseif (!isset($input['form_structure']['sections']) || empty($input['form_structure']['sections'])) {
                    $errors[] = 'Form structure must contain at least one section';
                }
        
                if (!empty($errors)) {
                    Response::error('Validation failed', 400, $errors);
                    return;
                }
        
                // If this form is active, deactivate other versions
                if ($input['is_active'] ?? true) {
                    $this->formTemplateModel->deactivateOtherVersions(
                        $currentUser['institution_id'],
                        $input['user_type'],
                        0
                    );
                }
        
                $formData = [
                    'institution_id' => $currentUser['institution_id'],
                    'user_type' => $input['user_type'],
                    'form_name' => trim($input['form_name']),
                    'form_description' => isset($input['form_description']) && !empty(trim($input['form_description'])) 
                        ? trim($input['form_description']) 
                        : null,
                    'form_structure' => $input['form_structure'], // Keep as array
                    'is_active' => $input['is_active'] ?? 1,
                    'version' => 1,
                    'created_by' => $currentUser['id']
                ];
        
                $formId = $this->formTemplateModel->create($formData);
        
                if ($formId) {
                    Response::success([
                        'form_id' => $formId,
                        'message' => 'Form template created successfully'
                    ], 'Form template created successfully', 201);
                } else {
                    Response::error('Failed to create form template', 500);
                }
        
            } catch (Exception $e) {
                error_log("Create form template error: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                Response::error('Server error: ' . $e->getMessage(), 500);
            }
        }



    public function getFormTemplatesByInstitution() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $forms = $this->formTemplateModel->getAllByInstitution($currentUser['institution_id']);

            Response::success([
                'forms' => $forms,
                'total' => count($forms),
                'institution_id' => $currentUser['institution_id']
            ], 'Form templates retrieved successfully');

        } catch (Exception $e) {
            error_log("Get form templates error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function getActiveFormByUserType($userType) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $form = $this->formTemplateModel->getActiveFormByUserType(
                $currentUser['institution_id'],
                $userType
            );

            if ($form) {
                Response::success($form, 'Form template retrieved successfully');
            } else {
                Response::error('No active form template found for this user type', 404);
            }

        } catch (Exception $e) {
            error_log("Get active form error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function getFormTemplateById($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $form = $this->formTemplateModel->findById($id);

            if (!$form) {
                Response::error('Form template not found', 404);
                return;
            }

            // Verify access
            if ($form['institution_id'] !== $currentUser['institution_id']) {
                Response::error('Access denied', 403);
                return;
            }

            Response::success($form, 'Form template retrieved successfully');

        } catch (Exception $e) {
            error_log("Get form template error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function updateFormTemplate($id) {
            try {
                $currentUser = getCurrentUser();
                if (!$currentUser || !in_array($currentUser['user_type'], ['superadmin', 'admin'])) {
                    Response::error('Insufficient privileges', 403);
                    return;
                }
        
                $form = $this->formTemplateModel->findById($id);
                if (!$form || $form['institution_id'] !== $currentUser['institution_id']) {
                    Response::error('Form template not found', 404);
                    return;
                }
        
                $input = json_decode(file_get_contents('php://input'), true);
        
                // ADD THIS: Check for JSON decode errors
                if (json_last_error() !== JSON_ERROR_NONE) {
                    Response::error('Invalid JSON: ' . json_last_error_msg(), 400);
                    return;
                }
        
                // CHANGED: Only validate string fields with the validator
                $requiredFields = ['form_name']; // REMOVED 'form_structure'
                $errors = Validator::validateRequired($requiredFields, $input);
        
                // CHANGED: Manually validate form_structure (it's an array, not a string)
                if (!isset($input['form_structure']) || !is_array($input['form_structure'])) {
                    $errors[] = 'Form structure is required and must be an array';
                } elseif (!isset($input['form_structure']['sections']) || empty($input['form_structure']['sections'])) {
                    $errors[] = 'Form structure must contain at least one section';
                }
        
                if (!empty($errors)) {
                    Response::error('Validation failed', 400, $errors);
                    return;
                }
        
                // If activating this form, deactivate others
                if (($input['is_active'] ?? true) && !$form['is_active']) {
                    $this->formTemplateModel->deactivateOtherVersions(
                        $currentUser['institution_id'],
                        $form['user_type'],
                        $id
                    );
                }
        
                $updateData = [
                    'form_name' => trim($input['form_name']),
                    'form_description' => isset($input['form_description']) && !empty(trim($input['form_description'])) 
                        ? trim($input['form_description']) 
                        : null,
                    'form_structure' => $input['form_structure'], // Keep as array
                    'is_active' => $input['is_active'] ?? 1,
                    'updated_by' => $currentUser['id']
                ];
        
                $result = $this->formTemplateModel->update($id, $updateData);
        
                if ($result) {
                    // ADD THIS: Return the updated form
                    $updatedForm = $this->formTemplateModel->findById($id);
                    Response::success($updatedForm, 'Form template updated successfully');
                } else {
                    Response::error('Failed to update form template', 500);
                }
        
            } catch (Exception $e) {
                error_log("Update form template error: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                Response::error('Server error: ' . $e->getMessage(), 500);
            }
        }

    public function deleteFormTemplate($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !in_array($currentUser['user_type'], ['superadmin', 'admin'])) {
                Response::error('Insufficient privileges', 403);
                return;
            }

            $form = $this->formTemplateModel->findById($id);
            if (!$form || $form['institution_id'] !== $currentUser['institution_id']) {
                Response::error('Form template not found', 404);
                return;
            }

            if ($form['is_active']) {
                Response::error('Cannot delete active form template. Deactivate it first.', 400);
                return;
            }

            if ($this->formTemplateModel->delete($id)) {
                Response::success(null, 'Form template deleted successfully');
            } else {
                Response::error('Failed to delete form template', 500);
            }

        } catch (Exception $e) {
            error_log("Delete form template error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    public function getFormStatistics() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $stats = $this->formTemplateModel->getStatistics($currentUser['institution_id']);

            Response::success($stats, 'Form statistics retrieved successfully');

        } catch (Exception $e) {
            error_log("Get form statistics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }
}
?>