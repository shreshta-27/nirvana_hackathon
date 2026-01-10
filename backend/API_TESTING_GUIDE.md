# Nivarna Backend API Testing Guide

## Base URL
```
http://localhost:5000
```

## Server Status
✅ **Running**
✅ **MongoDB Connected**

---

## 1. Authentication Endpoints

### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phoneNumber": "+919876543210"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": "10 minutes",
  "otp": "123456"
}
```

### Verify OTP & Login
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "role": "frontline_worker",
  "name": "Priya Sharma",
  "village": "Dharavi",
  "language": "en"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "phoneNumber": "+919876543210",
    "role": "frontline_worker",
    "name": "Priya Sharma",
    "language": "en",
    "village": "Dharavi"
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

---

## 2. Patient Endpoints

### Register New Patient
```http
POST /api/patients/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Anjali Devi",
  "age": 25,
  "gender": "female",
  "phoneNumber": "+919876543211",
  "village": "Dharavi",
  "category": "pregnant",
  "pregnancyDetails": {
    "lmp": "2024-10-01",
    "edd": "2025-07-08",
    "trimester": 2
  }
}
```

### Get All Patients
```http
GET /api/patients
Authorization: Bearer {token}

Query Parameters:
- search: string (name or patient ID)
- category: pregnant|child|adult
- risk: normal|monitor|high
- village: string
```

### Get Patient by ID
```http
GET /api/patients/{id}
Authorization: Bearer {token}
```

### Update Patient
```http
PUT /api/patients/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Anjali Devi Updated",
  "phoneNumber": "+919876543211"
}
```

### Get Health Card
```http
GET /api/patients/{id}/health-card
Authorization: Bearer {token}
```

---

## 3. Visit Endpoints

### Add Visit - Pregnant Woman
```http
POST /api/visits/add
Authorization: Bearer {token}
Content-Type: application/json

{
  "patientId": "67817e9c4d8f1234567890ab",
  "category": "pregnant",
  "pregnantVisit": {
    "pregnancyMonth": 6,
    "ancVisitCount": 3,
    "bp": {
      "systolic": 120,
      "diastolic": 80
    },
    "weight": 65,
    "hb": 12,
    "ttInjection": true,
    "supplements": {
      "iron": true,
      "calcium": true
    },
    "symptoms": []
  },
  "notes": "Patient is doing well"
}
```

### Add Visit - Child
```http
POST /api/visits/add
Authorization: Bearer {token}
Content-Type: application/json

{
  "patientId": "67817e9c4d8f1234567890ab",
  "category": "child",
  "childVisit": {
    "ageInMonths": 18,
    "weight": 10.5,
    "height": 80,
    "vaccinations": ["BCG", "DPT1", "DPT2"],
    "nutritionStatus": "normal",
    "symptoms": []
  }
}
```

### Add Visit - Adult
```http
POST /api/visits/add
Authorization: Bearer {token}
Content-Type: application/json

{
  "patientId": "67817e9c4d8f1234567890ab",
  "category": "adult",
  "adultVisit": {
    "bp": {
      "systolic": 130,
      "diastolic": 85
    },
    "sugar": {
      "type": "fasting",
      "value": 110
    },
    "chronicCondition": "Hypertension",
    "medicationAdherence": true,
    "symptoms": []
  }
}
```

### Get Visit History
```http
GET /api/visits/{patientId}
Authorization: Bearer {token}
```

### Batch Sync Visits
```http
POST /api/visits/sync/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "visits": [
    {
      "patientId": "...",
      "category": "pregnant",
      "pregnantVisit": {...},
      "localId": "local_123"
    }
  ]
}
```

---

## 4. Doctor Dashboard Endpoints

### Get Patients by Risk
```http
GET /api/doctor/patients
Authorization: Bearer {doctor_token}

Query Parameters:
- risk: normal|monitor|high
- category: pregnant|child|adult
- village: string
```

### Get Patient Detail for Doctor
```http
GET /api/doctor/patients/{id}
Authorization: Bearer {doctor_token}
```

### Add Doctor Notes
```http
POST /api/doctor/notes
Authorization: Bearer {doctor_token}
Content-Type: application/json

{
  "patientId": "67817e9c4d8f1234567890ab",
  "notes": "Patient needs immediate attention",
  "advice": "Visit PHC within 24 hours",
  "escalation": true,
  "escalationDetails": "High BP requires specialist consultation"
}
```

### Mark Patient as Reviewed
```http
PUT /api/doctor/review/{id}
Authorization: Bearer {doctor_token}
```

### Get Dashboard Stats
```http
GET /api/doctor/stats
Authorization: Bearer {doctor_token}
```

---

## 5. Alert Endpoints

### Send Alert
```http
POST /api/alerts/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "patientId": "67817e9c4d8f1234567890ab",
  "method": "sms"
}
```

Options for method: `sms`, `whatsapp`, `both`

### Send Bulk Alerts
```http
POST /api/alerts/send-bulk
Authorization: Bearer {doctor_token}
Content-Type: application/json

{
  "patientIds": ["id1", "id2", "id3"],
  "method": "sms"
}
```

### Get Alert History
```http
GET /api/alerts/history/{patientId}
Authorization: Bearer {token}
```

---

## Testing Workflow

### 1. Authentication Flow
1. Send OTP to phone number
2. Verify OTP and get token
3. Use token for all subsequent requests

### 2. Frontline Worker Flow
1. Login as frontline worker
2. Register a new patient
3. Add a visit for the patient
4. View risk assessment result
5. Send alert if high risk

### 3. Doctor Flow
1. Login as doctor
2. View high-risk patients
3. View patient details with trends
4. Add doctor notes
5. Mark patient as reviewed

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied. Required role: doctor"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Patient not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "..."
}
```

---

## Rate Limits

- **Auth endpoints:** 10 requests per 15 minutes
- **Visit endpoints (AI):** 20 requests per minute
- **General endpoints:** 100 requests per 15 minutes

---

## Notes

- All timestamps are in ISO 8601 format
- Patient IDs are auto-generated (PAT000001, PAT000002, etc.)
- Visit IDs are auto-generated (VIS00000001, VIS00000002, etc.)
- Health Card IDs are auto-generated (HC000001, HC000002, etc.)
- QR codes are generated automatically for health cards
- AI risk assessment runs automatically after each visit
- Alerts can be sent via SMS or WhatsApp using Twilio
