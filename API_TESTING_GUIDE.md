# Genesis WMS - API Testing Guide

This guide provides comprehensive instructions for testing all 43+ API endpoints in the Receiving Management Module.

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

The API will be available at: **http://localhost:3000**

### 2. Access Interactive API Documentation

Open your browser and navigate to:
**http://localhost:3000/api-docs**

This provides a complete Swagger UI interface where you can test all endpoints interactively.

## Authentication Flow

### Step 1: Login to Get JWT Token

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "admin@genesis-wms.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "admin@genesis-wms.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "PLATFORM_ADMIN",
      "tenantId": "tenant-uuid"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 2: Use Token for Authenticated Requests

Add the token to all subsequent requests in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Complete API Endpoint Reference

### 🔐 Authentication (6 endpoints)

#### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "WAREHOUSE_RECEIVER",
  "tenantId": "your-tenant-id"
}
```

#### 2. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "receiver@genesis-wms.com",
  "password": "password123"
}
```

#### 3. Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### 4. Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer {your-token}
```

#### 5. Update Profile
```http
PATCH /api/v1/auth/profile
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### 6. Change Password
```http
POST /api/v1/auth/change-password
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "NewSecure456!"
}
```

---

### 📦 ASN Management (7 endpoints)

#### 1. Create ASN
```http
POST /api/v1/asn
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "warehouseId": "your-warehouse-id",
  "poNumber": "PO-2026-002",
  "supplierId": "supplier-uuid",
  "supplierName": "Acme Suppliers Ltd",
  "carrier": "DHL Express",
  "trackingNumber": "DHL987654321",
  "expectedArrivalDate": "2026-01-15T10:00:00Z",
  "receivingZoneId": "zone-uuid",
  "priority": "STANDARD",
  "lines": [
    {
      "lineNumber": 1,
      "skuId": "sku-uuid",
      "skuCode": "SKU-001",
      "productName": "Widget Pro Large",
      "expectedQuantity": 100,
      "uom": "UNIT",
      "batchNumberExpected": "BATCH-2026-001",
      "expiryDateExpected": "2027-01-15T00:00:00Z"
    }
  ]
}
```

#### 2. List ASNs with Filters
```http
GET /api/v1/asn?page=1&limit=20&status=IN_TRANSIT&warehouseId={warehouse-id}
Authorization: Bearer {your-token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `warehouseId` (optional): Filter by warehouse
- `status` (optional): CREATED, IN_TRANSIT, ARRIVED, RECEIVING, COMPLETED, CANCELLED
- `supplierId` (optional): Filter by supplier
- `dateFrom` (optional): Filter by date range
- `dateTo` (optional): Filter by date range

#### 3. Get ASN Details
```http
GET /api/v1/asn/{asn-id}
Authorization: Bearer {your-token}
```

#### 4. Update ASN Status
```http
PATCH /api/v1/asn/{asn-id}/status
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "status": "ARRIVED",
  "actualArrivalDate": "2026-01-15T14:30:00Z"
}
```

#### 5. Receive ASN Line Item
```http
POST /api/v1/asn/{asn-id}/lines/{line-id}/receive
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "receivedQuantity": 98,
  "batchNumberReceived": "BATCH-2026-001",
  "expiryDateReceived": "2027-01-15T00:00:00Z",
  "temperatureReading": 5.2,
  "qaHold": false,
  "photoEvidenceUrls": ["https://example.com/photo1.jpg"],
  "varianceNotes": "2 units damaged in transit"
}
```

#### 6. Complete ASN
```http
POST /api/v1/asn/{asn-id}/complete
Authorization: Bearer {your-token}
```

#### 7. Cancel ASN
```http
DELETE /api/v1/asn/{asn-id}
Authorization: Bearer {your-token}
```

---

### 📝 Blind Receipts (9 endpoints)

#### 1. Create Blind Receipt
```http
POST /api/v1/blind-receipts
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "warehouseId": "your-warehouse-id",
  "receiptType": "UNPLANNED_DELIVERY",
  "supplierName": "New Supplier Co.",
  "carrier": "FedEx",
  "driverName": "Mike Driver",
  "arrivalDate": "2026-01-12T00:00:00Z",
  "arrivalTime": "2026-01-12T09:30:00Z",
  "specialNotes": "Urgent delivery"
}
```

#### 2. List Blind Receipts
```http
GET /api/v1/blind-receipts?status=PENDING_APPROVAL
Authorization: Bearer {your-token}
```

#### 3. Get Blind Receipt Details
```http
GET /api/v1/blind-receipts/{receipt-id}
Authorization: Bearer {your-token}
```

#### 4. Add Line Item
```http
POST /api/v1/blind-receipts/{receipt-id}/lines
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "lineNumber": 1,
  "skuCode": "SKU-NEW-001",
  "productName": "Unknown Product",
  "quantityReceived": 50,
  "uom": "UNIT",
  "condition": "GOOD",
  "receiverNotes": "New SKU - needs supervisor review"
}
```

#### 5. Update Line Item
```http
PATCH /api/v1/blind-receipts/lines/{line-id}
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "quantityReceived": 48,
  "condition": "DAMAGED"
}
```

#### 6. Delete Line Item
```http
DELETE /api/v1/blind-receipts/lines/{line-id}
Authorization: Bearer {your-token}
```

#### 7. Submit for Approval
```http
POST /api/v1/blind-receipts/{receipt-id}/submit
Authorization: Bearer {your-token}
```

#### 8. Approve (Supervisor Only)
```http
POST /api/v1/blind-receipts/{receipt-id}/approve
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "supervisorNotes": "Verified all items, approved for inventory"
}
```

#### 9. Reject (Supervisor Only)
```http
POST /api/v1/blind-receipts/{receipt-id}/reject
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "rejectionReason": "Insufficient documentation"
}
```

---

### ⚠️ Variance Management (8 endpoints)

#### 1. List Variances
```http
GET /api/v1/variances?status=PENDING&priority=HIGH
Authorization: Bearer {your-token}
```

#### 2. Get Variance Details
```http
GET /api/v1/variances/{variance-id}
Authorization: Bearer {your-token}
```

#### 3. Get Variance Statistics
```http
GET /api/v1/variances/statistics?warehouseId={warehouse-id}&dateFrom=2026-01-01T00:00:00Z&dateTo=2026-01-31T23:59:59Z
Authorization: Bearer {your-token}
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "pending": 12,
      "underReview": 5,
      "approved": 25,
      "rejected": 2,
      "escalated": 1
    },
    "byType": {
      "SHORTAGE": 20,
      "OVERAGE": 8,
      "DAMAGED": 10,
      "WRONG_ITEM": 7
    },
    "totalVarianceValue": 15000,
    "avgResolutionTimeHours": 2.3
  }
}
```

#### 4. Get Supplier Variance Report
```http
GET /api/v1/variances/reports/suppliers?limit=10
Authorization: Bearer {your-token}
```

#### 5. Approve Variance
```http
POST /api/v1/variances/{variance-id}/approve
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "resolutionAction": "APPROVE_AS_IS",
  "supervisorNotes": "Verified shortage with carrier. Initiating claim.",
  "adjustedQuantity": 48
}
```

#### 6. Reject Variance
```http
POST /api/v1/variances/{variance-id}/reject
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "supervisorNotes": "Incorrect count. Requesting recount."
}
```

#### 7. Escalate Variance
```http
POST /api/v1/variances/{variance-id}/escalate
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "escalatedToId": "manager-user-id",
  "escalationNotes": "High-value variance requiring manager approval"
}
```

#### 8. Mark Under Review
```http
POST /api/v1/variances/{variance-id}/under-review
Authorization: Bearer {supervisor-token}
```

---

### 🚛 Putaway Management (5 endpoints)

#### 1. Generate Putaway Tasks
```http
POST /api/v1/putaway/generate
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "warehouseId": "your-warehouse-id",
  "receiptType": "ASN",
  "receiptId": "asn-uuid",
  "sourceLocationId": "receiving-dock-location-id",
  "items": [
    {
      "skuId": "sku-uuid",
      "quantity": 100,
      "batchNumber": "BATCH-2026-001",
      "expiryDate": "2027-01-15T00:00:00Z"
    }
  ]
}
```

**Response:** Returns array of generated putaway tasks with assigned bins

#### 2. List Putaway Tasks
```http
GET /api/v1/putaway?status=PENDING&operatorUserId={operator-id}
Authorization: Bearer {your-token}
```

#### 3. Assign Task to Operator
```http
POST /api/v1/putaway/{task-id}/assign
Authorization: Bearer {supervisor-token}
Content-Type: application/json

{
  "operatorUserId": "operator-user-id"
}
```

#### 4. Start Putaway Task
```http
POST /api/v1/putaway/{task-id}/start
Authorization: Bearer {operator-token}
```

#### 5. Complete Putaway Task
```http
POST /api/v1/putaway/{task-id}/complete
Authorization: Bearer {operator-token}
Content-Type: application/json

{
  "actualQuantity": 100,
  "operatorNotes": "Completed successfully"
}
```

---

### 🏷️ LPN Management (8 endpoints)

#### 1. Create LPN
```http
POST /api/v1/lpn
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "warehouseId": "your-warehouse-id",
  "lpnType": "PALLET",
  "currentLocationId": "location-uuid",
  "items": [
    {
      "skuId": "sku-uuid",
      "quantity": 100,
      "batchNumber": "BATCH-2026-001",
      "expiryDate": "2027-01-15T00:00:00Z"
    }
  ]
}
```

**Response:** Returns LPN with auto-generated code (e.g., `LPN-WH01-20260112-0001`)

#### 2. List LPNs
```http
GET /api/v1/lpn?warehouseId={warehouse-id}&status=AVAILABLE
Authorization: Bearer {your-token}
```

#### 3. Get LPN by ID
```http
GET /api/v1/lpn/{lpn-id}
Authorization: Bearer {your-token}
```

#### 4. Get LPN by Barcode
```http
GET /api/v1/lpn/code/LPN-WH01-20260112-0001
Authorization: Bearer {your-token}
```

**Use Case:** Scan LPN barcode to get full details

#### 5. Move LPN to Location
```http
POST /api/v1/lpn/{lpn-id}/move
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "destinationLocationId": "new-location-uuid"
}
```

#### 6. Update LPN Status
```http
PATCH /api/v1/lpn/{lpn-id}/status
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "status": "ALLOCATED"
}
```

**Status Values:** RECEIVING, AVAILABLE, ALLOCATED, PICKED, SHIPPED, CONSUMED, ARCHIVED

#### 7. Split LPN
```http
POST /api/v1/lpn/{lpn-id}/split
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "items": [
    {
      "skuId": "sku-uuid",
      "quantity": 30
    }
  ]
}
```

**Returns:** Both original (reduced) and new LPN

#### 8. Archive LPN
```http
POST /api/v1/lpn/{lpn-id}/archive
Authorization: Bearer {your-token}
```

---

## Testing Workflows

### Workflow 1: Complete ASN Receiving

```bash
# 1. Login as receiver
POST /api/v1/auth/login
{
  "email": "receiver@genesis-wms.com",
  "password": "password123"
}

# 2. Get pending ASNs
GET /api/v1/asn?status=ARRIVED

# 3. Update ASN status to receiving
PATCH /api/v1/asn/{asn-id}/status
{
  "status": "RECEIVING"
}

# 4. Receive each line item
POST /api/v1/asn/{asn-id}/lines/{line-id}/receive
{
  "receivedQuantity": 100,
  "batchNumberReceived": "BATCH-2026-001"
}

# 5. Complete ASN
POST /api/v1/asn/{asn-id}/complete

# 6. Check if variances were created (if any discrepancies)
GET /api/v1/variances?receiptId={asn-id}
```

### Workflow 2: Blind Receiving with Supervisor Approval

```bash
# 1. Login as receiver
POST /api/v1/auth/login

# 2. Create blind receipt
POST /api/v1/blind-receipts

# 3. Add line items
POST /api/v1/blind-receipts/{receipt-id}/lines

# 4. Submit for approval
POST /api/v1/blind-receipts/{receipt-id}/submit

# 5. Login as supervisor
POST /api/v1/auth/login
{
  "email": "supervisor@genesis-wms.com",
  "password": "password123"
}

# 6. Review pending receipts
GET /api/v1/blind-receipts?status=PENDING_APPROVAL

# 7. Approve receipt
POST /api/v1/blind-receipts/{receipt-id}/approve
{
  "supervisorNotes": "Approved"
}
```

### Workflow 3: Variance Resolution

```bash
# 1. Login as supervisor
POST /api/v1/auth/login

# 2. Get pending variances
GET /api/v1/variances?status=PENDING&priority=HIGH

# 3. Review variance details
GET /api/v1/variances/{variance-id}

# 4. Approve variance
POST /api/v1/variances/{variance-id}/approve
{
  "resolutionAction": "APPROVE_AS_IS",
  "supervisorNotes": "Confirmed shortage",
  "adjustedQuantity": 98
}
```

### Workflow 4: Putaway Execution

```bash
# 1. Generate putaway tasks (after ASN completed)
POST /api/v1/putaway/generate

# 2. Get putaway tasks for operator
GET /api/v1/putaway?operatorUserId={operator-id}&status=PENDING

# 3. Start task
POST /api/v1/putaway/{task-id}/start

# 4. Complete task
POST /api/v1/putaway/{task-id}/complete
{
  "actualQuantity": 100
}
```

## Error Handling Examples

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": "No token provided"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "error": "Forbidden: Insufficient permissions"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "ASN not found"
}
```

## Postman Collection

You can import this OpenAPI spec into Postman:
**http://localhost:3000/api-docs-json**

Or use the Swagger UI for interactive testing:
**http://localhost:3000/api-docs**

## Quick Test Script (curl)

```bash
#!/bin/bash

# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@genesis-wms.com","password":"password123"}' \
  | jq -r '.data.token')

# 2. Get ASNs
curl -X GET http://localhost:3000/api/v1/asn \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# 3. Get Variances
curl -X GET http://localhost:3000/api/v1/variances/statistics \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

## Support

For issues or questions:
- GitHub Issues: [Repository URL]
- Email: support@genesis-wms.com
- API Docs: http://localhost:3000/api-docs

---

**Last Updated:** January 2026
**API Version:** 1.0.0
