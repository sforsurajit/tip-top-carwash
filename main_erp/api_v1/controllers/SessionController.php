<?php
require_once 'models/Session.php';
require_once 'utils/Validator.php';
require_once 'utils/Response.php';

class SessionController {
    private $sessionModel;

    public function __construct() {
        $this->sessionModel = new Session();
    }

    /**
     * Create new session
     */
    public function create() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Required fields validation
            $requiredFields = [
                'institution_id', 'session_name', 'start_date', 'end_date'
            ];

            $errors = Validator::validateRequired($requiredFields, $input);

            // Validate institution access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $input['institution_id']) {
                if ($currentUser['institution_id'] != $input['institution_id']) {
                    Response::error('Unauthorized access to this institution', 403);
                    return;
                }
            }

            // Validate dates
            if (!$this->validateDate($input['start_date'])) {
                $errors[] = 'Invalid start date format. Use YYYY-MM-DD';
            }

            if (!$this->validateDate($input['end_date'])) {
                $errors[] = 'Invalid end date format. Use YYYY-MM-DD';
            }

            if (empty($errors) && strtotime($input['start_date']) >= strtotime($input['end_date'])) {
                $errors[] = 'End date must be after start date';
            }

            // Validate status
            if (!empty($input['status'])) {
                $validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
                if (!in_array($input['status'], $validStatuses)) {
                    $errors[] = 'Invalid status. Must be: ' . implode(', ', $validStatuses);
                }
            }

            // Validate working days
            if (!empty($input['working_days'])) {
                if (!is_array($input['working_days'])) {
                    $errors[] = 'Working days must be an array';
                } else {
                    $validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    foreach ($input['working_days'] as $day) {
                        if (!in_array($day, $validDays)) {
                            $errors[] = "Invalid day: {$day}";
                            break;
                        }
                    }
                }
            }

            // Validate number of terms
            if (!empty($input['number_of_terms'])) {
                if (!is_numeric($input['number_of_terms']) || $input['number_of_terms'] < 1 || $input['number_of_terms'] > 4) {
                    $errors[] = 'Number of terms must be between 1 and 4';
                }
            }

            // Validate term structure
            if (!empty($input['term_structure'])) {
                $termErrors = $this->validateTermStructure($input['term_structure'], $input['number_of_terms'] ?? 2);
                $errors = array_merge($errors, $termErrors);
            }

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check for duplicate session name
            if ($this->sessionModel->sessionNameExists($input['session_name'], $input['institution_id'])) {
                Response::error('A session with this name already exists for this institution', 409);
                return;
            }

            // Check for date overlap
            $overlap = $this->sessionModel->checkDateOverlap(
                $input['institution_id'], 
                $input['start_date'], 
                $input['end_date']
            );
            
            if ($overlap) {
                Response::error(
                    'Session dates overlap with existing session: ' . $overlap['session_name'], 
                    409,
                    ['overlapping_session' => $overlap]
                );
                return;
            }

            // Prepare session data
            $sessionData = [
                'institution_id' => $input['institution_id'],
                'session_name' => trim($input['session_name']),
                'start_date' => $input['start_date'],
                'end_date' => $input['end_date'],
                'is_active' => $input['is_active'] ?? 0,
                'status' => $input['status'] ?? 'upcoming',
                'description' => trim($input['description'] ?? ''),
                'working_days' => $input['working_days'] ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                'number_of_terms' => $input['number_of_terms'] ?? 2,
                'term_structure' => $input['term_structure'] ?? null,
                'holidays' => $input['holidays'] ?? [],
                'settings' => $input['settings'] ?? null,
                'created_by' => $currentUser['id']
            ];

            $sessionId = $this->sessionModel->create($sessionData);

            if ($sessionId) {
                $newSession = $this->sessionModel->findById($sessionId);
                Response::success([
                    'session' => $newSession,
                    'message' => 'Session created successfully'
                ], 'Session created successfully', 201);
            } else {
                Response::error('Failed to create session', 500);
            }

        } catch (Exception $e) {
            error_log("Session creation error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get all sessions for institution
     */
    public function getAll() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $institutionId = $_GET['institution_id'] ?? $currentUser['institution_id'];

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $institutionId) {
                if ($currentUser['institution_id'] != $institutionId) {
                    Response::error('Unauthorized access to this institution', 403);
                    return;
                }
            }

            $filters = [];
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['is_active'])) {
                $filters['is_active'] = $_GET['is_active'];
            }
            if (isset($_GET['year'])) {
                $filters['year'] = $_GET['year'];
            }

            $sessions = $this->sessionModel->getAllByInstitution($institutionId, $filters);

            if ($sessions !== false) {
                Response::success([
                    'sessions' => $sessions,
                    'total' => count($sessions),
                    'institution_id' => $institutionId,
                    'filters_applied' => $filters
                ], 'Sessions retrieved successfully');
            } else {
                Response::error('Failed to retrieve sessions', 500);
            }

        } catch (Exception $e) {
            error_log("Get sessions error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get session by ID
     */
    public function getById($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid session ID', 400);
                return;
            }

            $session = $this->sessionModel->findById($id);

            if (!$session) {
                Response::error('Session not found', 404);
                return;
            }

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $session['institution_id']) {
                if ($currentUser['institution_id'] != $session['institution_id']) {
                    Response::error('Unauthorized access to this session', 403);
                    return;
                }
            }

            Response::success($session, 'Session retrieved successfully');

        } catch (Exception $e) {
            error_log("Get session by ID error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get active session for institution
     */
    public function getActiveSession() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $institutionId = $_GET['institution_id'] ?? $currentUser['institution_id'];

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $institutionId) {
                if ($currentUser['institution_id'] != $institutionId) {
                    Response::error('Unauthorized access to this institution', 403);
                    return;
                }
            }

            $session = $this->sessionModel->getActiveSession($institutionId);

            if ($session) {
                Response::success($session, 'Active session retrieved successfully');
            } else {
                Response::success([
                    'session' => null,
                    'message' => 'No active session found for this institution'
                ], 'No active session found');
            }

        } catch (Exception $e) {
            error_log("Get active session error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Update session
     */
    public function update($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid session ID', 400);
                return;
            }

            $existingSession = $this->sessionModel->findById($id);
            if (!$existingSession) {
                Response::error('Session not found', 404);
                return;
            }

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $existingSession['institution_id']) {
                if ($currentUser['institution_id'] != $existingSession['institution_id']) {
                    Response::error('Unauthorized access to this session', 403);
                    return;
                }
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['session_name', 'start_date', 'end_date', 'status'];
            $errors = Validator::validateRequired($requiredFields, $input);

            // Validate dates
            if (!$this->validateDate($input['start_date'])) {
                $errors[] = 'Invalid start date format';
            }

            if (!$this->validateDate($input['end_date'])) {
                $errors[] = 'Invalid end date format';
            }

            if (empty($errors) && strtotime($input['start_date']) >= strtotime($input['end_date'])) {
                $errors[] = 'End date must be after start date';
            }

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check for duplicate name (excluding current session)
            if ($this->sessionModel->sessionNameExists(
                $input['session_name'], 
                $existingSession['institution_id'], 
                $id
            )) {
                Response::error('A session with this name already exists', 409);
                return;
            }

            // Check for date overlap (excluding current session)
            $overlap = $this->sessionModel->checkDateOverlap(
                $existingSession['institution_id'], 
                $input['start_date'], 
                $input['end_date'],
                $id
            );
            
            if ($overlap) {
                Response::error(
                    'Session dates overlap with: ' . $overlap['session_name'], 
                    409
                );
                return;
            }

            $updateData = [
                'session_name' => trim($input['session_name']),
                'start_date' => $input['start_date'],
                'end_date' => $input['end_date'],
                'status' => $input['status'],
                'description' => trim($input['description'] ?? ''),
                'working_days' => $input['working_days'] ?? null,
                'number_of_terms' => $input['number_of_terms'] ?? 2,
                'term_structure' => $input['term_structure'] ?? null,
                'holidays' => $input['holidays'] ?? null,
                'settings' => $input['settings'] ?? null,
                'updated_by' => $currentUser['id']
            ];

            $result = $this->sessionModel->update($id, $updateData);

            if ($result) {
                $updatedSession = $this->sessionModel->findById($id);
                Response::success($updatedSession, 'Session updated successfully');
            } else {
                Response::error('Failed to update session', 500);
            }

        } catch (Exception $e) {
            error_log("Session update error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Toggle session active status
     */
    public function toggleActive($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid session ID', 400);
                return;
            }

            $session = $this->sessionModel->findById($id);
            if (!$session) {
                Response::error('Session not found', 404);
                return;
            }

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $session['institution_id']) {
                if ($currentUser['institution_id'] != $session['institution_id']) {
                    Response::error('Unauthorized access to this session', 403);
                    return;
                }
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['is_active'])) {
                Response::error('is_active field is required', 400);
                return;
            }

            $isActive = (int)$input['is_active'];

            $result = $this->sessionModel->toggleActive(
                $id, 
                $isActive, 
                $session['institution_id'],
                $currentUser['id']
            );

            if ($result) {
                $updatedSession = $this->sessionModel->findById($id);
                Response::success([
                    'session' => $updatedSession,
                    'message' => $isActive ? 'Session activated successfully' : 'Session deactivated successfully'
                ], 'Session status updated');
            } else {
                Response::error('Failed to update session status', 500);
            }

        } catch (Exception $e) {
            error_log("Session toggle active error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Update session settings
     */
    public function updateSettings($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid session ID', 400);
                return;
            }

            $session = $this->sessionModel->findById($id);
            if (!$session) {
                Response::error('Session not found', 404);
                return;
            }

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $session['institution_id']) {
                if ($currentUser['institution_id'] != $session['institution_id']) {
                    Response::error('Unauthorized access to this session', 403);
                    return;
                }
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $result = $this->sessionModel->updateSettings($id, $input, $currentUser['id']);

            if ($result) {
                $updatedSession = $this->sessionModel->findById($id);
                Response::success($updatedSession, 'Session settings updated successfully');
            } else {
                Response::error('Failed to update session settings', 500);
            }

        } catch (Exception $e) {
            error_log("Session settings update error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Delete session
     */
    public function delete($id) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            if (!$id || !is_numeric($id)) {
                Response::error('Invalid session ID', 400);
                return;
            }

            $session = $this->sessionModel->findById($id);
            if (!$session) {
                Response::error('Session not found', 404);
                return;
            }

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $session['institution_id']) {
                if ($currentUser['institution_id'] != $session['institution_id']) {
                    Response::error('Unauthorized access to this session', 403);
                    return;
                }
            }

            // Prevent deletion of active session
            if ($session['is_active'] == 1) {
                Response::error('Cannot delete active session. Please deactivate it first.', 400);
                return;
            }

            $result = $this->sessionModel->delete($id, $session['institution_id']);

            if ($result) {
                Response::success([
                    'session_id' => $id,
                    'deleted' => true
                ], 'Session deleted successfully');
            } else {
                Response::error('Failed to delete session', 500);
            }

        } catch (Exception $e) {
            error_log("Session delete error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Get session statistics
     */
    public function getStatistics() {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser) {
                Response::error('Authentication required', 401);
                return;
            }

            $institutionId = $_GET['institution_id'] ?? $currentUser['institution_id'];

            // Verify access
            if ($currentUser['user_type'] !== 'superadmin' || 
                $currentUser['institution_id'] != $institutionId) {
                if ($currentUser['institution_id'] != $institutionId) {
                    Response::error('Unauthorized access to this institution', 403);
                    return;
                }
            }

            $stats = $this->sessionModel->getStatistics($institutionId);

            if ($stats !== false) {
                Response::success($stats, 'Statistics retrieved successfully');
            } else {
                Response::error('Failed to retrieve statistics', 500);
            }

        } catch (Exception $e) {
            error_log("Session statistics error: " . $e->getMessage());
            Response::error('Server error occurred', 500);
        }
    }

    /**
     * Validate date format
     */
    private function validateDate($date) {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    /**
     * Validate term structure
     */
    private function validateTermStructure($termStructure, $numberOfTerms) {
        $errors = [];
        
        if (!is_array($termStructure)) {
            $errors[] = 'Term structure must be an array';
            return $errors;
        }

        if (count($termStructure) != $numberOfTerms) {
            $errors[] = "Term structure must have exactly {$numberOfTerms} terms";
        }

        foreach ($termStructure as $index => $term) {
            if (!isset($term['term_name'])) {
                $errors[] = "Term " . ($index + 1) . " missing term_name";
            }
            if (!isset($term['start_date']) || !$this->validateDate($term['start_date'])) {
                $errors[] = "Term " . ($index + 1) . " has invalid start_date";
            }
            if (!isset($term['end_date']) || !$this->validateDate($term['end_date'])) {
                $errors[] = "Term " . ($index + 1) . " has invalid end_date";
            }
        }

        return $errors;
    }
}

?>