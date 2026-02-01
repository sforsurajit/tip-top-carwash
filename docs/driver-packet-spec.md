# Driver Location Packet Specification

API endpoint for driver app to retrieve customer location and booking details.

## Endpoint

```
GET /api/booking/driver-packet/{booking_id}
```

## Response Format

```json
{
  "booking_id": "CW-001",
  "customer": {
    "name": "Customer Name",
    "phone": "XXXXXXXXXX",
    "language": "Bodo"
  },
  "location": {
    "coordinates": {
      "lat": 26.401,
      "lng": 90.265
    },
    "landmark": "Opposite Kali Temple",
    "landmark_type": "temple",
    "notes": "Blue gate, inside lane"
  },
  "service": {
    "vehicle_type": "SUV",
    "package": "Premium Wash",
    "price": 799
  },
  "call_policy": {
    "allowed": true,
    "condition": "if_lost"
  },
  "status": "confirmed",
  "created_at": "2026-01-20T02:30:00+05:30"
}
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | string | Unique booking identifier |
| `customer.name` | string | Customer display name |
| `customer.phone` | string | Contact number for calling |
| `customer.language` | string | Preferred language (Hindi/Bodo/English/Assamese) |
| `location.coordinates` | object | GPS lat/lng |
| `location.landmark` | string | Human-readable landmark description |
| `location.landmark_type` | string | Category: temple, mosque, school, market, petrol, medical, other |
| `location.notes` | string | Additional driver hints |
| `service.vehicle_type` | string | hatchback, sedan, compact-suv, suv, bike |
| `service.package` | string | Service name |
| `service.price` | number | Final price in INR |
| `call_policy.allowed` | boolean | Whether driver can call customer |
| `call_policy.condition` | string | When to call: "if_lost", "always", "never" |

## Driver App Display

1. **Booking List View**: Show time, landmark, call button
2. **Navigation View**: Show map with pin + landmark overlay  
3. **Arrival Feedback**: "Found easily" / "Needed call" / "Location unclear"

## Offline Sync Endpoint

```
POST /api/booking/sync-offline
```

Request body: Array of pending offline bookings from IndexedDB.

Response: Array of server-assigned booking IDs for each synced booking.
