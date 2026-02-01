<?php
require_once 'config/database.php';

class FormTemplate {
    private $db;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            error_log("Database connection error in FormTemplate model: " . $e->getMessage());
            throw $e;
        }
    }

    public function create($data) {
        try {
            error_log("FormTemplate create called");
            error_log("Data received: " . print_r($data, true));
            
            $sql = "INSERT INTO form_templates (
                institution_id, user_type, form_name, form_description, 
                form_structure, is_active, version, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            
            // Convert form_structure array to JSON string
            // Note: The form_structure already contains file_formats in each field
            $formStructureJson = json_encode($data['form_structure']);
            error_log("Form structure JSON: " . $formStructureJson);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON encode error: " . json_last_error_msg());
                return false;
            }
            
            $stmt = $this->db->prepare($sql);
            
            $params = [
                $data['institution_id'],
                $data['user_type'],
                $data['form_name'],
                $data['form_description'],
                $formStructureJson,
                $data['is_active'] ?? 1,
                $data['version'] ?? 1,
                $data['created_by']
            ];
            
            error_log("SQL params: " . print_r($params, true));
            
            $result = $stmt->execute($params);
            error_log("Execute result: " . ($result ? 'true' : 'false'));
            
            if ($result) {
                $id = $this->db->lastInsertId();
                error_log("Last insert ID: " . $id);
                return $id;
            }
            
            error_log("Execute failed: " . print_r($stmt->errorInfo(), true));
            return false;
            
        } catch (Exception $e) {
            error_log("FormTemplate create exception: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }

    public function getActiveFormByUserType($institutionId, $userType) {
        try {
            $sql = "SELECT * FROM form_templates 
                    WHERE institution_id = ? 
                    AND user_type = ? 
                    AND is_active = 1 
                    ORDER BY version DESC 
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$institutionId, $userType]);
            $form = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($form && $form['form_structure']) {
                $form['form_structure'] = json_decode($form['form_structure'], true);
                // File formats are already included in the JSON structure
            }
            
            return $form;
        } catch (Exception $e) {
            error_log("Get active form error: " . $e->getMessage());
            return false;
        }
    }

    public function getAllByInstitution($institutionId) {
        try {
            $sql = "SELECT ft.*, u.name as created_by_name 
                    FROM form_templates ft
                    LEFT JOIN usersnew u ON ft.created_by = u.id
                    WHERE ft.institution_id = ? 
                    ORDER BY ft.user_type, ft.version DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$institutionId]);
            $forms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($forms as &$form) {
                if ($form['form_structure']) {
                    $form['form_structure'] = json_decode($form['form_structure'], true);
                    // File formats are already included in the JSON structure
                }
            }
            
            return $forms;
        } catch (Exception $e) {
            error_log("Get forms by institution error: " . $e->getMessage());
            return [];
        }
    }

    public function findById($id) {
        try {
            $sql = "SELECT ft.*, u.name as created_by_name 
                    FROM form_templates ft
                    LEFT JOIN usersnew u ON ft.created_by = u.id
                    WHERE ft.id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $form = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($form && $form['form_structure']) {
                $form['form_structure'] = json_decode($form['form_structure'], true);
                // File formats are already included in the JSON structure
            }
            
            return $form;
        } catch (Exception $e) {
            error_log("Find form by ID error: " . $e->getMessage());
            return false;
        }
    }

    public function update($id, $data) {
        try {
            $sql = "UPDATE form_templates SET 
                    form_name = ?, 
                    form_description = ?, 
                    form_structure = ?, 
                    is_active = ?,
                    updated_by = ?,
                    updated_at = NOW() 
                    WHERE id = ?";
            
            // form_structure is already a properly formatted array with file_formats included
            $formStructureJson = json_encode($data['form_structure']);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON encode error in update: " . json_last_error_msg());
                return false;
            }
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['form_name'],
                $data['form_description'] ?? null,
                $formStructureJson,
                $data['is_active'] ?? 1,
                $data['updated_by'],
                $id
            ]);
            
            if (!$result) {
                error_log("Update failed: " . print_r($stmt->errorInfo(), true));
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("FormTemplate update error: " . $e->getMessage());
            return false;
        }
    }

    public function deactivateOtherVersions($institutionId, $userType, $excludeId) {
        try {
            $sql = "UPDATE form_templates 
                    SET is_active = 0 
                    WHERE institution_id = ? 
                    AND user_type = ? 
                    AND id != ?";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$institutionId, $userType, $excludeId]);
        } catch (Exception $e) {
            error_log("Deactivate forms error: " . $e->getMessage());
            return false;
        }
    }

    public function delete($id) {
        try {
            $sql = "DELETE FROM form_templates WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            error_log("FormTemplate delete error: " . $e->getMessage());
            return false;
        }
    }

    public function getStatistics($institutionId) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_forms,
                        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_forms,
                        COUNT(DISTINCT user_type) as user_types_with_forms
                    FROM form_templates 
                    WHERE institution_id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$institutionId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Form statistics error: " . $e->getMessage());
            return false;
        }
    }

    // NEW: Helper method to extract file format info from form
    public function getFileFieldsWithFormats($formId) {
        try {
            $form = $this->findById($formId);
            if (!$form) {
                return [];
            }

            $fileFields = [];
            $formStructure = $form['form_structure'];

            if (isset($formStructure['sections'])) {
                foreach ($formStructure['sections'] as $section) {
                    if (isset($section['fields'])) {
                        foreach ($section['fields'] as $field) {
                            if ($field['type'] === 'file' && isset($field['file_formats'])) {
                                $fileFields[] = [
                                    'key' => $field['key'],
                                    'label' => $field['label'],
                                    'formats' => $field['file_formats']
                                ];
                            }
                        }
                    }
                }
            }

            return $fileFields;
        } catch (Exception $e) {
            error_log("Get file fields error: " . $e->getMessage());
            return [];
        }
    }
}
?>