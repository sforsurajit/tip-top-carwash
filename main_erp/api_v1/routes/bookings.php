<?php
// BOOKING ROUTES

// Get all bookings (with filters)
$router->get('/', 'BookingController@getAll');

// Create new booking
$router->post('/', 'BookingController@create');

// Get available time slots
$router->get('/available-slots', 'BookingController@getAvailableTimeSlots');

// Get booking statistics
$router->get('/statistics', 'BookingController@getStatistics');

// Get bookings by date range
$router->get('/by-date-range', 'BookingController@getByDateRange');

// Get upcoming bookings
$router->get('/upcoming', 'BookingController@getUpcomingBookings');

// Get today's bookings (for washer)
$router->get('/today', 'BookingController@getTodayBookings');

// Get available washers for time slot
$router->get('/available-washers', 'BookingController@getAvailableWashers');

// Get booking by ID
$router->get('/{id}', 'BookingController@getById');

// Update booking
$router->put('/{id}', 'BookingController@update');

// Delete booking
$router->delete('/{id}', 'BookingController@delete');

// Update booking status
$router->post('/{id}/status', 'BookingController@UpdateCustomer');

// Update payment status
$router->put('/{id}/payment-status', 'BookingController@updatePaymentStatus');

// Assign washer to booking
$router->put('/{id}/assign-washer', 'BookingController@assignWasher');

$router->post('/{id}/accept', 'BookingController@acceptBooking');

// Get ALL bookings for logged-in washer (no limit)
$router->post('/washer/my-bookings', 'BookingController@getMyBookings');

$router->post('/customer-bookings', 'BookingController@getCustomerBookings');

$router->post('/{id}/complete_with_photos', 'BookingController@completeWithPhotos');

//for admin section
$router->post('/admin/dashboard', 'BookingController@adminDashboard');

$router->get('/analytics', 'BookingController@analytics');
$router->get('/analytics/comparative', 'BookingController@comparativeAnalytics');


?>