<?php
require_once 'config/database.php';

class Session {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    /**
     * Create new session
     */
    public function create($data) {
        $sql = "INSERT INTO sessions (
            institution_id,
            session_name,
            start_date,
            end_date,
            is_active,
            status,
            description,
            working_days,
            number_of_terms,
            term_structure,
            holidays,
            settings,
            created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        try {
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $data['institution_id'],
                $data['session_name'],
                $data['start_date'],
                $data['end_date'],
                $data['is_active'] ?? 0,
                $data['status'] ?? 'upcoming',
                $data['description'] ?? null,
                isset($data['working_days']) ? json_encode($data['working_days']) : null,
                $data['number_of_terms'] ?? 2,
                isset($data['term_structure']) ? json_encode($data['term_structure']) : null,
                isset($data['holidays']) ? json_encode($data['holidays']) : null,
                isset($data['settings']) ? json_encode($data['settings']) : null,
                $data['created_by'] ?? null
            ]);
            
            if ($result) {
                return $this->db->lastInsertId();
            }
            return false;
        } catch (PDOException $e) {
            error_log("Session creation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Find session by ID
     */
    public function findById($id) {
        $sql = "SELECT s.*, 
                o.institution_name,
                u1.name as created_by_name,
                u2.name as updated_by_name
                FROM sessions s
                LEFT JOIN organizations o ON s.institution_id = o.id
                LEFT JOIN usersnew u1 ON s.created_by = u1.id
                LEFT JOIN usersnew u2 ON s.updated_by = u2.id
                WHERE s.id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($session) {
                $session = $this->decodeJsonFields($session);
            }
            
            return $session;
        } catch (PDOException $e) {
            error_log("Session find error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all sessions for an institution
     */
    public function getAllByInstitution($institutionId, $filters = []) {
        $sql = "SELECT s.*, 
                o.institution_name,
                u1.name as created_by_name
                FROM sessions s
                LEFT JOIN organizations o ON s.institution_id = o.id
                LEFT JOIN usersnew u1 ON s.created_by = u1.id
                WHERE s.institution_id = ?";
        
        $params = [$institutionId];
        
        // Apply filters
        if (!empty($filters['status'])) {
            $sql .= " AND s.status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['is_active'])) {
            $sql .= " AND s.is_active = ?";
            $params[] = $filters['is_active'];
        }
        
        if (!empty($filters['year'])) {
            $sql .= " AND YEAR(s.start_date) = ?";
            $params[] = $filters['year'];
        }
        
        $sql .= " ORDER BY s.start_date DESC, s.created_at DESC";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($sessions as &$session) {
                $session = $this->decodeJsonFields($session);
            }
            
            return $sessions;
        } catch (PDOException $e) {
            error_log("Session getAll error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get active session for institution
     */
    public function getActiveSession($institutionId) {
        $sql = "SELECT s.*, 
                o.institution_name
                FROM sessions s
                LEFT JOIN organizations o ON s.institution_id = o.id
                WHERE s.institution_id = ? AND s.is_active = 1
                LIMIT 1";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$institutionId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($session) {
                $session = $this->decodeJsonFields($session);
            }
            
            return $session;
        } catch (PDOException $e) {
            error_log("Get active session error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update session
     */
    public function update($id, $data) {
        $sql = "UPDATE sessions SET 
                session_name = ?,
                start_date = ?,
                end_date = ?,
                status = ?,
                description = ?,
                working_days = ?,
                number_of_terms = ?,
                term_structure = ?,
                holidays = ?,
                settings = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                $data['session_name'],
                $data['start_date'],
                $data['end_date'],
                $data['status'],
                $data['description'] ?? null,
                isset($data['working_days']) ? json_encode($data['working_days']) : null,
                $data['number_of_terms'] ?? 2,
                isset($data['term_structure']) ? json_encode($data['term_structure']) : null,
                isset($data['holidays']) ? json_encode($data['holidays']) : null,
                isset($data['settings']) ? json_encode($data['settings']) : null,
                $data['updated_by'] ?? null,
                $id
            ]);
        } catch (PDOException $e) {
            error_log("Session update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Activate/Deactivate session
     */
    public function toggleActive($id, $isActive, $institutionId, $userId = null) {
        try {
            $this->db->beginTransaction();
            
            // If activating this session, deactivate all other sessions for this institution
            if ($isActive == 1) {
                $deactivateSql = "UPDATE sessions SET is_active = 0 WHERE institution_id = ? AND id != ?";
                $deactivateStmt = $this->db->prepare($deactivateSql);
                $deactivateStmt->execute([$institutionId, $id]);
            }
            
            // Update the target session
            $sql = "UPDATE sessions SET 
                    is_active = ?,
                    updated_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND institution_id = ?";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([$isActive, $userId, $id, $institutionId]);
            
            $this->db->commit();
            return $result;
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Session toggle active error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update session settings
     */
    public function updateSettings($id, $settings, $userId = null) {
        $sql = "UPDATE sessions SET 
                working_days = ?,
                number_of_terms = ?,
                term_structure = ?,
                holidays = ?,
                settings = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                isset($settings['working_days']) ? json_encode($settings['working_days']) : null,
                $settings['number_of_terms'] ?? 2,
                isset($settings['term_structure']) ? json_encode($settings['term_structure']) : null,
                isset($settings['holidays']) ? json_encode($settings['holidays']) : null,
                isset($settings['additional_settings']) ? json_encode($settings['additional_settings']) : null,
                $userId,
                $id
            ]);
        } catch (PDOException $e) {
            error_log("Session settings update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete session
     */
    public function delete($id, $institutionId) {
        $sql = "DELETE FROM sessions WHERE id = ? AND institution_id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$id, $institutionId]);
        } catch (PDOException $e) {
            error_log("Session delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if session name exists for institution
     */
    public function sessionNameExists($sessionName, $institutionId, $excludeId = null) {
        $sql = "SELECT id FROM sessions WHERE session_name = ? AND institution_id = ?";
        $params = [$sessionName, $institutionId];
        
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (PDOException $e) {
            error_log("Session name check error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get session statistics for institution
     */
    public function getStatistics($institutionId) {
        $sql = "SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_sessions,
                COUNT(CASE WHEN status = 'ongoing' THEN 1 END) as ongoing_sessions,
                COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_sessions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
                FROM sessions 
                WHERE institution_id = ?";
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$institutionId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Session statistics error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Helper function to decode JSON fields
     */
    private function decodeJsonFields($session) {
        $jsonFields = ['working_days', 'term_structure', 'holidays', 'settings'];
        
        foreach ($jsonFields as $field) {
            if (isset($session[$field]) && !empty($session[$field])) {
                $session[$field] = json_decode($session[$field], true);
            }
        }
        
        return $session;
    }

    /**
     * Validate session dates don't overlap with existing sessions
     */
    public function checkDateOverlap($institutionId, $startDate, $endDate, $excludeId = null) {
        $sql = "SELECT id, session_name FROM sessions 
                WHERE institution_id = ? 
                AND (
                    (start_date <= ? AND end_date >= ?) OR
                    (start_date <= ? AND end_date >= ?) OR
                    (start_date >= ? AND end_date <= ?)
                )";
        
        $params = [$institutionId, $startDate, $startDate, $endDate, $endDate, $startDate, $endDate];
        
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Session overlap check error: " . $e->getMessage());
            return false;
        }
    }
}

?>