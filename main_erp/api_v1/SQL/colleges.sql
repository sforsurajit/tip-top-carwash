-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: ds15209.dreamservers.com
-- Generation Time: Jul 03, 2025 at 04:40 AM
-- Server version: 8.0.37-0ubuntu0.24.04.1
-- PHP Version: 8.1.2-1ubuntu2.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_bts`
--

-- --------------------------------------------------------

--
-- Table structure for table `colleges`
--

CREATE TABLE `colleges` (
  `id` int NOT NULL,
  `institution_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `institution_type` enum('college','school','university','institute') COLLATE utf8mb4_general_ci NOT NULL,
  `principal_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `established_year` year DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `website` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `selected_features` json DEFAULT NULL COMMENT 'JSON array of selected management features',
  `status` enum('pending','active','inactive','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `colleges`
--

INSERT INTO `colleges` (`id`, `institution_name`, `institution_type`, `principal_name`, `contact_email`, `contact_phone`, `established_year`, `address`, `city`, `state`, `pincode`, `website`, `selected_features`, `status`, `created_at`, `updated_at`) VALUES
(2, 'new Name Test', 'college', '783370', 'new@gmail.com', '09101633479', '1998', 'Near Kali Mandir', 'Kokrajhar', 'Assam', '783370', NULL, '{\"fee_management\": {\"system_icon\": \"dollar-sign\", \"system_name\": \"Fee Management System\", \"selected_modules\": [{\"key\": \"fee_structure\", \"name\": \"Fee Structure\", \"description\": \"Course and class fee configuration\"}, {\"key\": \"payment_collection\", \"name\": \"Payment Collection\", \"description\": \"Fee payment processing\"}, {\"key\": \"receipt_generation\", \"name\": \"Receipt Generation\", \"description\": \"Payment receipt and invoices\"}, {\"key\": \"payment_reminders\", \"name\": \"Payment Reminders\", \"description\": \"Automated payment notifications\"}, {\"key\": \"financial_reports\", \"name\": \"Financial Reports\", \"description\": \"Revenue and payment analytics\"}, {\"key\": \"scholarship_management\", \"name\": \"Scholarship Management\", \"description\": \"Fee concession and scholarships\"}], \"system_description\": \"Financial transaction management\"}, \"event_management\": {\"system_icon\": \"calendar\", \"system_name\": \"Event Management System\", \"selected_modules\": [{\"key\": \"event_planning\", \"name\": \"Event Planning\", \"description\": \"Event creation and scheduling\"}, {\"key\": \"venue_booking\", \"name\": \"Venue Booking\", \"description\": \"Facility reservation system\"}, {\"key\": \"participant_management\", \"name\": \"Participant Management\", \"description\": \"Event registration and attendance\"}, {\"key\": \"resource_allocation\", \"name\": \"Resource Allocation\", \"description\": \"Equipment and resource planning\"}, {\"key\": \"event_promotion\", \"name\": \"Event Promotion\", \"description\": \"Marketing and publicity\"}, {\"key\": \"event_reports\", \"name\": \"Event Reports\", \"description\": \"Event analytics and feedback\"}], \"system_description\": \"Institutional event planning\"}, \"staff_management\": {\"system_icon\": \"briefcase\", \"system_name\": \"Staff Management System\", \"selected_modules\": [{\"key\": \"employee_registration\", \"name\": \"Employee Registration\", \"description\": \"Staff onboarding and profiles\"}, {\"key\": \"payroll_management\", \"name\": \"Payroll Management\", \"description\": \"Salary calculation and disbursement\"}, {\"key\": \"attendance_tracking\", \"name\": \"Staff Attendance\", \"description\": \"Employee attendance monitoring\"}, {\"key\": \"leave_management\", \"name\": \"Leave Management\", \"description\": \"Leave application and approval\"}, {\"key\": \"performance_evaluation\", \"name\": \"Performance Evaluation\", \"description\": \"Staff performance assessment\"}, {\"key\": \"staff_reports\", \"name\": \"Staff Reports\", \"description\": \"HR analytics and reports\"}], \"system_description\": \"Human resource management\"}, \"student_management\": {\"system_icon\": \"users\", \"system_name\": \"Student Management System\", \"selected_modules\": [{\"key\": \"student_registration\", \"name\": \"Student Registration\", \"description\": \"New student admission and enrollment\"}, {\"key\": \"attendance_management\", \"name\": \"Attendance Management\", \"description\": \"Daily attendance tracking and reports\"}, {\"key\": \"grade_management\", \"name\": \"Grade Management\", \"description\": \"Marks entry and grade calculation\"}, {\"key\": \"student_reports\", \"name\": \"Student Reports\", \"description\": \"Academic and behavioral reports\"}, {\"key\": \"student_communication\", \"name\": \"Student Communication\", \"description\": \"SMS/Email to students and parents\"}, {\"key\": \"fee_tracking\", \"name\": \"Fee Tracking\", \"description\": \"Student fee payment tracking\"}], \"system_description\": \"Complete student lifecycle management\"}}', 'pending', '2025-07-03 11:13:20', '2025-07-03 11:13:20'),
(3, 'BTS', 'school', '783370', 'malen@gmail.com', '09101633479', '1998', 'Near Kali Mandir', 'Kokrajhar', 'Assam', '783370', NULL, '{\"sports_management\": {\"system_icon\": \"zap\", \"system_name\": \"Sports Management System\", \"selected_modules\": [{\"key\": \"sports_registration\", \"name\": \"Sports Registration\", \"description\": \"Athletic program enrollment\"}], \"system_description\": \"Athletic program management\"}, \"student_management\": {\"system_icon\": \"users\", \"system_name\": \"Student Management System\", \"selected_modules\": [{\"key\": \"student_registration\", \"name\": \"Student Registration\", \"description\": \"New student admission and enrollment\"}, {\"key\": \"attendance_management\", \"name\": \"Attendance Management\", \"description\": \"Daily attendance tracking and reports\"}], \"system_description\": \"Complete student lifecycle management\"}}', 'pending', '2025-07-03 11:22:45', '2025-07-03 11:25:18');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `colleges`
--
ALTER TABLE `colleges`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `contact_email` (`contact_email`),
  ADD KEY `idx_institution_type` (`institution_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_city` (`city`),
  ADD KEY `idx_state` (`state`),
  ADD KEY `idx_contact_email` (`contact_email`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `colleges`
--
ALTER TABLE `colleges`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
