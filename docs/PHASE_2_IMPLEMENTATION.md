# Genesis WMS - Phase 2: Batch Management & Alerts

## Overview

Phase 2 implements advanced batch tracking with FEFO (First Expiry First Out) enforcement, intelligent threshold monitoring with velocity-based alerts, and multi-channel notifications.

## Architecture

### Services Implemented

1. **Batch Management Service** (Port 3002)
   - FEFO allocation engine
   - Batch lifecycle management
   - Expiry monitoring
   - QA status tracking

2. **Threshold Monitoring Service** (Port 3003)
   - Velocity-based threshold calculation
   - Real-time stock monitoring
   - Multi-severity alerting
   - Alert acknowledgment/resolution workflow

### Key Features

## 1. Batch Management & FEFO Enforcement

### Batch Tracking
- Full batch traceability from receipt to disposal
- Parent-child batch relationships (splits/merges)
- Temperature-controlled batch support
- Custom batch attributes (lot numbers, certificates, etc.)

### FEFO Allocation
```typescript
// Intelligent allocation prioritizing expiry dates
POST /api/v1/batches/allocate-fefo
{
  "sku_id": "uuid",
  "warehouse_id": "uuid",
  "requested_quantity": 100,
  "enforce_fefo": true
}

// Response includes prioritized batches
{
  "allocations": [
    {
      "batch_id": "uuid",
      "batch_number": "B-2024-001",
      "expiry_date": "2024-03-15",
      "allocated_quantity": 60,
      "fefo_priority": 1
    },
    {
      "batch_id": "uuid",
      "batch_number": "B-2024-002",
      "expiry_date": "2024-04-20",
      "allocated_quantity": 40,
      "fefo_priority": 2
    }
  ],
  "fully_allocated": true,
  "warnings": [
    "Batch B-2024-001 expires in 15 days"
  ]
}
```

### Batch Status Flow
1. **QUARANTINE** - Newly received, awaiting QA
2. **ACTIVE** - QA passed, available for picking
3. **NEAR_EXPIRY** - Within warning threshold
4. **EXPIRED** - Past expiry date
5. **ON_HOLD** - Temporarily unavailable
6. **DISPOSED** - Removed from inventory

### QA Integration
- Pending/Passed/Failed/Conditional statuses
- QA notes and approval workflow
- Automatic status transitions

## 2. Expiry Monitoring

### Automated Monitoring
- Scheduled cron job (every 6 hours by default)
- Multi-level alerts (warning/critical/emergency)
- Configurable thresholds (default: 30/7 days)

### Alert Levels
- **WARNING**: 30+ days until expiry
- **CRITICAL**: 7-30 days until expiry
- **EMERGENCY**: <7 days until expiry

### Auto-Status Updates
```sql
-- Automatic status transitions
ACTIVE → NEAR_EXPIRY (when approaching expiry)
NEAR_EXPIRY → EXPIRED (when past expiry date)
```

## 3. Threshold Monitoring with Velocity-Based Alerts

### Velocity Calculation
Analyzes historical consumption patterns to predict stockouts:

```typescript
// Velocity metrics calculated per SKU per warehouse
{
  "daily_average": 12.5,      // Average daily consumption
  "weekly_average": 87.5,      // 7-day average
  "monthly_average": 375.0,    // 30-day average
  "velocity_trend": "increasing", // stable/increasing/decreasing
  "days_of_stock": 8.5,       // Days until stockout at current rate
  "stockout_risk_score": 70,  // 0-100 risk score
  "data_points": 14           // Number of samples used
}
```

### Dynamic Threshold Adjustment
- Base thresholds (min/max/safety stock)
- Velocity multiplier (default 1.5x)
- Adaptive reorder points based on consumption trends

### Alert Types

#### Low Stock Alert (WARNING)
```
Current: 50 units
Reorder Point: 75 units
Action: Plan procurement (25 units)
```

#### Critical Stock Alert (CRITICAL)
```
Current: 20 units
Safety Stock: 40 units
Action: Immediate reorder required
```

#### Out of Stock Alert (EMERGENCY)
```
Current: 0 units
Action: URGENT - Emergency procurement
```

#### Overstock Alert (WARNING)
```
Current: 500 units
Max Quantity: 300 units
Action: Consider redistribution (200 excess units)
```

#### Velocity Anomaly Alert (CRITICAL)
```
High stockout risk detected
Days of Stock: 2.3 days
Daily Consumption: 45.2 units (trending up)
Stockout Risk: 85%
```

### Velocity-Based Features
- Minimum 3 data points required
- 7-day lookback window (configurable)
- Trend analysis using linear regression
- Risk scoring algorithm

## 4. Multi-Channel Notifications

### Supported Channels

#### 1. In-App Notifications
- Stored in database
- Real-time alerts dashboard
- Acknowledgment workflow

#### 2. Email (SMTP)
- HTML formatted emails
- Severity-based templates
- Configurable recipients by role

#### 3. SMS (Twilio)
- Emergency/Critical alerts only
- Concise message format
- Phone number validation

#### 4. Webhooks
- Custom endpoint configuration
- Retry logic (3 attempts)
- Timeout protection (5s)
- JSON payload delivery

### Notification Routing Rules
```
WARNING → In-App only
CRITICAL → In-App + Email
EMERGENCY → In-App + Email + SMS
```

### Configuration
```bash
# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhooks
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_RETRY_ATTEMPTS=3
```

## API Endpoints

### Batch Management Service (Port 3002)

```
GET    /api/v1/batches
       Query: skuId, warehouseId, status, qaStatus, expiringInDays

POST   /api/v1/batches
       Create new batch

GET    /api/v1/batches/:batchId
       Get batch details

PATCH  /api/v1/batches/:batchId/status
       Update batch status (QA approval)

POST   /api/v1/batches/allocate-fefo
       FEFO allocation request

GET    /api/v1/batches/expiring
       Get batches nearing expiry

GET    /api/v1/batches/expiry-summary
       Expiry analytics summary

POST   /api/v1/batches/trigger-expiry-check
       Manual expiry check trigger
```

### Threshold Monitoring Service (Port 3003)

```
GET    /api/v1/alerts
       Get active alerts
       Query: skuId, warehouseId, severity, alertType

GET    /api/v1/alerts/velocity
       Calculate velocity metrics
       Query: skuId, warehouseId, lookbackDays

POST   /api/v1/alerts/check
       Manual threshold check trigger

PATCH  /api/v1/alerts/:alertId/acknowledge
       Acknowledge alert

PATCH  /api/v1/alerts/:alertId/resolve
       Resolve alert
```

## Database Schema (Existing)

All Phase 2 features use the existing database schema from Phase 1:

- `batches` - Batch tracking with FEFO support
- `inventory_thresholds` - Min/max/safety stock configuration
- `inventory_alerts` - Multi-channel alert management
- `inventory_movements` (TimescaleDB) - Velocity calculation source

## RabbitMQ Message Queues

### Batch Events Exchange
```
Exchange: batch-events (topic)

Routing Keys:
- batch.expiry.warning
- batch.expiry.critical
- batch.expiry.emergency
- batch.fefo.update
- batch.status.created
- batch.status.active
- batch.status.expired
```

### Threshold Alerts Exchange
```
Exchange: threshold-alerts (topic)

Routing Keys:
- threshold.low.stock
- threshold.critical.stock
- threshold.overstock
```

## Scheduled Jobs

### Expiry Monitoring
```bash
# Default: Every 6 hours
EXPIRY_CHECK_CRON=0 */6 * * *
```

### Threshold Monitoring
```bash
# Default: Every 2 hours
THRESHOLD_CHECK_CRON=0 */2 * * *
```

## Development

### Running Services

```bash
# All services
npm run dev

# Individual services
npm run dev:batch        # Batch Management (3002)
npm run dev:threshold    # Threshold Monitoring (3003)

# With Docker
docker-compose up batch-management-service threshold-monitoring-service
```

### Environment Setup

1. Copy `.env.example` to `.env` in each service directory
2. Configure SMTP for email notifications (optional)
3. Configure Twilio for SMS notifications (optional)
4. Set webhook URLs if using webhook notifications (optional)

### Testing FEFO Allocation

```bash
# Create test batches with different expiry dates
curl -X POST http://localhost:3002/api/v1/batches \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sku_id": "uuid",
    "batch_number": "B-2024-001",
    "warehouse_id": "uuid",
    "quantity_received": 100,
    "expiry_date": "2024-03-15"
  }'

# Request FEFO allocation
curl -X POST http://localhost:3002/api/v1/batches/allocate-fefo \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sku_id": "uuid",
    "warehouse_id": "uuid",
    "requested_quantity": 150,
    "enforce_fefo": true
  }'
```

### Testing Velocity-Based Alerts

```bash
# Trigger manual threshold check
curl -X POST http://localhost:3003/api/v1/alerts/check \
  -H "Authorization: Bearer $TOKEN"

# Get velocity metrics
curl "http://localhost:3003/api/v1/alerts/velocity?skuId=uuid&warehouseId=uuid&lookbackDays=14" \
  -H "Authorization: Bearer $TOKEN"

# View active alerts
curl "http://localhost:3003/api/v1/alerts" \
  -H "Authorization: Bearer $TOKEN"
```

## Monitoring & Observability

### Health Checks
```bash
# Batch Management Service
curl http://localhost:3002/health

# Threshold Monitoring Service
curl http://localhost:3003/health
```

### Logs
- Located in `logs/` directory in each service
- `error.log` - Error level and above
- `combined.log` - All log levels
- Automatic log rotation (5MB max, 5 files)

### Redis Cache Keys
```
batch:{tenantId}:{batchId}
velocity:{tenantId}:{skuId}:{warehouseId}
```

### Cache TTLs
- HOT (batch data): 5 minutes
- WARM (velocity metrics): 30 minutes
- COLD (analytics): 2 hours

## Security

### Authentication
- All endpoints require JWT authentication
- Same authentication as Phase 1

### Authorization
- Batch creation: Warehouse Associate+
- Batch QA approval: QA Supervisor+
- Alert management: Warehouse Manager+

### Data Protection
- Tenant isolation at row level
- Parameterized queries for SQL injection prevention
- Rate limiting: 1000 requests/minute

## Performance Considerations

### FEFO Allocation
- Optimized queries with composite indexes
- Batch size limits prevent timeouts
- Cache-first strategy for batch details

### Velocity Calculation
- TimescaleDB hypertable for movements
- Configurable lookback window
- Cached results (30 min TTL)
- Minimum sample size requirement

### Notification Delivery
- Async processing via RabbitMQ
- Retry logic for failed deliveries
- Timeout protection
- Duplicate alert prevention (24h window)

## Known Limitations

1. **Velocity Calculation**
   - Requires minimum 3 data points
   - Only analyzes outbound movements
   - Linear trend analysis (simple regression)

2. **Notifications**
   - Email/SMS require external service configuration
   - Webhook delivery not guaranteed (best effort)
   - In-app notifications only for authenticated users

3. **FEFO Enforcement**
   - Optional (can be disabled per request)
   - Does not account for bin location optimization
   - Assumes all batches in warehouse are accessible

## Future Enhancements (Phase 3+)

- Predictive stockout modeling (ML-based)
- Batch genealogy visualization
- Advanced notification rules engine
- Mobile app push notifications
- Webhook payload customization
- Multi-warehouse FEFO optimization
- Batch quality score trending

## Troubleshooting

### Expiry Monitoring Not Running
```bash
# Check cron schedule
echo $EXPIRY_CHECK_CRON

# Manually trigger check
curl -X POST http://localhost:3002/api/v1/batches/trigger-expiry-check \
  -H "Authorization: Bearer $TOKEN"
```

### Velocity Calculation Returns Null
- Ensure sufficient movement data (minimum 3 data points)
- Check lookback window (default 7 days)
- Verify movements are recorded in `inventory_movements`

### Notifications Not Sending
- Check email/SMS configuration in `.env`
- Verify external service credentials (SMTP, Twilio)
- Review logs for error messages
- Ensure recipient configuration in database

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review RabbitMQ management console: http://localhost:15672
- Verify database connectivity
- Ensure all required environment variables are set

---

**Phase 2 Status**: ✅ Complete

**Next Phase**: Cycle Counting (Phase 3)
