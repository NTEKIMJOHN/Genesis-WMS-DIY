# Genesis WMS - Order Management System

A comprehensive Warehouse Management System (WMS) with advanced Order Management capabilities, built with modern full-stack technologies.

## 🚀 Features

### Core Order Management
- **Order Creation**: Manual entry, CSV upload, and API integration
- **Intelligent Allocation Engine**: FIFO, FEFO, and LIFO strategies with batch/expiry awareness
- **Pick Task Management**: Single-order, batch, wave, and zone picking workflows
- **Packing Station**: Containerization, multi-box shipments, and label generation
- **Shipment Tracking**: Real-time delivery status and carrier integration
- **Complete Traceability**: Batch/lot/serial tracking throughout the fulfillment lifecycle

### Technical Highlights
- **Full-Stack TypeScript**: Type-safe development across frontend and backend
- **Real-Time Updates**: Event-driven architecture with Redis pub/sub
- **Mobile-First**: Responsive design optimized for warehouse tablets and smartphones
- **Barcode Scanning**: Camera-based scanning support for picking and packing
- **Role-Based Access Control**: Granular permissions for different warehouse roles
- **RESTful API**: Complete API documentation with Swagger/OpenAPI
- **Docker-Ready**: Full containerization for easy deployment

## 🏗️ Architecture

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 16 with Prisma ORM
- **Caching/Events**: Redis for caching and event bus
- **Authentication**: JWT with role-based access control
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: Zustand for global state, React Query for server state
- **Styling**: Tailwind CSS for rapid UI development
- **Routing**: React Router v6
- **Icons**: Lucide React

### Database Schema
- Multi-tenant architecture with row-level isolation
- Comprehensive order lifecycle tracking
- Inventory management with bin-level accuracy
- Complete audit trail for all operations
- Support for batch/lot/serial tracking

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended)
- **OR** Node.js 20+, PostgreSQL 16+, Redis 7+

## 🚀 Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Genesis-WMS-DIY
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations and seed**
   ```bash
   # Access the backend container
   docker-compose exec backend sh

   # Run migrations
   npx prisma migrate deploy

   # Seed the database
   npm run prisma:seed
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

## 🔧 Manual Setup (Without Docker)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp ../.env.example .env
# Edit .env with your PostgreSQL and Redis connection strings

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed the database
npm run prisma:seed

# Start development server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 👤 Default Login Credentials

After seeding the database, you can login with:

### Warehouse Manager
- **Email**: manager@warehouse.com
- **Password**: password123

### Picker
- **Email**: picker@warehouse.com
- **Password**: password123

### Packer
- **Email**: packer@warehouse.com
- **Password**: password123

### Admin
- **Email**: admin@warehouse.com
- **Password**: password123

## 📁 Project Structure

```
Genesis-WMS-DIY/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data script
│   ├── src/
│   │   ├── config/            # Configuration (database, redis, swagger)
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utilities and helpers
│   │   ├── app.ts             # Express app setup
│   │   └── index.ts           # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # API client and utilities
│   │   ├── pages/             # Page components
│   │   ├── store/             # State management
│   │   ├── App.tsx            # App component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml         # Docker orchestration
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration

### Orders
- `GET /api/v1/orders` - List orders with filters
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id` - Update order
- `POST /api/v1/orders/:id/cancel` - Cancel order

### Allocation
- `POST /api/v1/allocation/:orderId/allocate` - Allocate inventory to order
- `GET /api/v1/allocation/:orderId/check` - Check allocation availability

### Pick Tasks
- `POST /api/v1/pick-tasks/generate` - Generate pick tasks
- `GET /api/v1/pick-tasks/:id` - Get pick task details
- `POST /api/v1/pick-tasks/:id/start` - Start picking
- `POST /api/v1/pick-tasks/:id/pick` - Record item pick
- `POST /api/v1/pick-tasks/:id/complete` - Complete pick task

### Pack Tasks
- `POST /api/v1/pack-tasks/generate/:orderId` - Generate pack task
- `GET /api/v1/pack-tasks/:id` - Get pack task details
- `POST /api/v1/pack-tasks/:id/start` - Start packing
- `POST /api/v1/pack-tasks/:id/pack` - Record item packed
- `POST /api/v1/pack-tasks/:id/label` - Generate shipping label
- `POST /api/v1/pack-tasks/:id/complete` - Complete pack task

### Shipments
- `POST /api/v1/shipments` - Create shipment
- `GET /api/v1/shipments` - List shipments
- `GET /api/v1/shipments/:id` - Get shipment details
- `PUT /api/v1/shipments/:id/status` - Update delivery status
- `GET /api/v1/shipments/track/:trackingNumber` - Track shipment

## 🔐 Security Features

- JWT-based authentication with secure token storage
- Role-based access control (RBAC) for all operations
- Password hashing with bcrypt
- SQL injection prevention via Prisma ORM
- XSS protection with Helmet.js
- CORS configuration for API security
- Rate limiting to prevent abuse
- Comprehensive audit logging

## 📊 Key User Workflows

### Order Fulfillment Lifecycle

1. **Order Creation** → Order created manually, via CSV, or API
2. **Allocation** → System allocates inventory using FIFO/FEFO/LIFO
3. **Pick Task Generation** → Creates optimized pick tasks by zone/location
4. **Picking** → Picker scans items and confirms quantities
5. **Pack Task Generation** → Picked items sent to packing station
6. **Packing** → Packer verifies items, generates shipping label
7. **Shipment** → Creates shipment record with tracking
8. **Delivery** → Track delivery status until confirmed

### Warehouse Manager Dashboard
- View order statistics and KPIs
- Monitor pending orders and allocation failures
- Generate pick/pack tasks
- Track picking and packing performance
- Manage backordered items

### Picker Console
- View assigned pick tasks
- Navigate optimized pick paths
- Scan locations and items for verification
- Report variances (short picks, damaged goods)
- Complete tasks efficiently

### Packer Console
- View items to pack
- Manage multiple cartons per order
- Generate shipping labels
- Enter package dimensions and weight
- Complete packing workflow

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://genesis:genesis_dev_password@localhost:5432/genesis_wms
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
```

## 🚀 Deployment

### Production Build

```bash
# Build all services
npm run build

# Or build individually
npm run build:backend
npm run build:frontend
```

### Docker Production Deployment

```bash
# Build production images
docker-compose build

# Start services
docker-compose up -d
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED license.

## 👥 Authors

Genesis WMS Team

## 🙏 Acknowledgments

- PRD authored by Genesis WMS Product Team
- Built with modern open-source technologies
- Designed for African logistics and warehouse operations

---

**Genesis WMS** - Powering efficient warehouse operations 🚀
# Genesis WMS - Inventory Management Module

A comprehensive, enterprise-grade Warehouse Management System with advanced inventory tracking, batch management, cycle counting, and intelligent alerting capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Environment Configuration](#environment-configuration)
- [Development](#development)
- [Performance & Scalability](#performance--scalability)
- [Security & Compliance](#security--compliance)
- [License](#license)

## 🎯 Overview

Genesis WMS is a modern, microservices-based warehouse management system designed to provide real-time inventory visibility, advanced batch tracking with FEFO/FIFO enforcement, intelligent threshold alerts, and comprehensive cycle counting capabilities.

### Key Highlights

- **Real-time Inventory Visibility**: Sub-2-second sync for critical operations
- **Intelligent Threshold Management**: ML-ready architecture with velocity-based alerts
- **Advanced Batch Tracking**: Complete traceability with FEFO enforcement for regulatory compliance
- **Cycle Counting**: ABC classification with perpetual inventory model
- **Multi-Tenant Architecture**: Secure, scalable multi-tenancy support
- **Offline-First Mobile**: Warehouse operations continue during network outages

## ✨ Features

### 1. Real-Time Inventory Visibility
- Multi-warehouse inventory tracking with real-time synchronization
- Advanced search and filtering (SKU, category, status, location)
- Customizable views with saved filter presets
- Multi-tier sync architecture (Tier 1: <2s, Tier 2: <30s, Tier 3: 2-5min)
- Export capabilities (CSV, Excel, PDF)

### 2. Bin-Level Tracking & Occupancy Management
- Precise bin-level inventory allocation
- Occupancy analytics with color-coded capacity indicators
- Automated bin reassignment recommendations
- Movement history per bin with full audit trail
- Space optimization tools

### 3. Intelligent Threshold Alerts
- Velocity-based reorder point calculations
- Multi-tier alert escalation (Warning → Critical → Emergency)
- Configurable alert cooldown periods
- Multi-channel notifications (in-app, email, SMS, webhook)
- Weekly digest reports

### 4. Batch & Expiry Tracking
- FEFO (First Expiry, First Out) enforcement
- Batch genealogy for complete traceability
- Automated expiry monitoring with multi-tier alerts
- Quarantine and QA release workflows
- FDA 21 CFR Part 11 compliance support

### 5. Inventory Adjustments
- Maker-checker approval workflows
- Value-based approval thresholds
- Complete audit trail with electronic signatures
- Attachment support (photos, documents)
- Integration with cycle count results

### 6. Cycle Counting
- Manual SKU selection and Zone/Bin Sweep
- Blind counting to reduce bias
- Variance detection and review workflows
- Mobile app support with offline capability
- ABC classification (roadmap)

## 🏗️ Architecture

### Microservices Design

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                         │
│                    (Rate Limiting)                      │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼────────┐ ┌──────▼──────┐ ┌───────▼──────┐
│  Inventory Core │ │    Batch    │ │  Threshold   │
│    Service      │ │  Management │ │  Monitoring  │
│   (Port 3001)   │ │ (Port 3002) │ │ (Port 3003)  │
└────────┬────────┘ └──────┬──────┘ └───────┬──────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
    │PostgreSQL│      │   Redis   │    │ RabbitMQ  │
    │   +      │      │  (Cache)  │    │  (Queue)  │
    │TimescaleDB│     └───────────┘    └───────────┘
    └──────────┘
```

### Technology Stack

**Backend:**
- Node.js 18+ with TypeScript
- Express.js for REST APIs
- PostgreSQL 14+ with TimescaleDB for time-series data
- Redis for caching and session management
- RabbitMQ for asynchronous message processing

**Frontend:**
- React 18+ with TypeScript (roadmap)
- TanStack Query for data fetching
- Zustand for state management
- AG Grid for high-performance tables
- Recharts for analytics visualizations

**DevOps:**
- Docker & Docker Compose
- Multi-stage builds for optimization
- Health checks and auto-restart policies

## 📦 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: v20.10 or higher (recommended)
- **Docker Compose**: v2.0 or higher (recommended)
- **PostgreSQL**: v14 or higher (if running without Docker)
- **Redis**: v7 or higher (if running without Docker)
- **RabbitMQ**: v3.11 or higher (if running without Docker)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/NTEKIMJOHN/Genesis-WMS-DIY.git
   cd Genesis-WMS-DIY
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration if needed
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis rabbitmq
   ```

4. **Initialize the database**
   ```bash
   # Wait for PostgreSQL to be ready (check with docker-compose logs postgres)
   docker exec -i genesis-wms-db psql -U genesis_admin -d genesis_wms < database/migrations/001_initial_schema.sql
   ```

5. **Seed sample data (optional)**
   ```bash
   docker exec -i genesis-wms-db psql -U genesis_admin -d genesis_wms < database/seeds/001_sample_data.sql
   ```

6. **Install and start the Inventory Core Service**
   ```bash
   cd backend/inventory-core-service
   cp .env.example .env
   npm install
   npm run dev
   ```

7. **Verify the service is running**
   ```bash
   curl http://localhost:3001/health
   ```

   You should see:
   ```json
   {
     "status": "healthy",
     "service": "inventory-core-service",
     "timestamp": "2025-01-11T...",
     "uptime": 5.123
   }
   ```

### Access Points

- **Inventory Core API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **RabbitMQ Management UI**: http://localhost:15672 (username: `genesis`, password: `genesis_rabbitmq_password`)

## 📁 Project Structure

```
Genesis-WMS-DIY/
├── backend/
│   └── inventory-core-service/       # Main inventory service
│       ├── src/
│       │   ├── config/               # Database, Redis, RabbitMQ config
│       │   ├── controllers/          # Request handlers
│       │   ├── services/             # Business logic
│       │   ├── routes/               # API routes
│       │   ├── middleware/           # Auth, error handling, rate limiting
│       │   ├── utils/                # Logger, helpers
│       │   └── index.ts              # Entry point
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── database/
│   ├── migrations/                   # SQL migration files
│   │   └── 001_initial_schema.sql    # Initial database schema
│   └── seeds/                        # Sample data
│       └── 001_sample_data.sql       # Sample inventory data
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 📚 API Documentation

### Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Base URL

```
http://localhost:3001/api/v1
```

### Key Endpoints

#### Inventory Management

```http
# Get inventory overview with pagination and filtering
GET /inventory?page=1&limit=50&search=SKU-001&status=low

# Get detailed SKU information
GET /inventory/:skuId

# Get bin-level inventory breakdown
GET /inventory/:skuId/bins

# Get movement history for a specific bin
GET /inventory/bins/:binId/movements?startDate=2025-01-01&endDate=2025-01-31

# Export inventory data
POST /inventory/export
Content-Type: application/json
{
  "format": "csv",
  "scope": "all",
  "warehouseId": "66666666-6666-6666-6666-666666666666"
}

# Search inventory
GET /inventory/search?q=wireless&limit=20
```

#### Inventory Adjustments

```http
# Get all adjustments with filtering
GET /adjustments?status=pending_approval&page=1&limit=50

# Create a new adjustment
POST /adjustments
Content-Type: application/json
{
  "skuId": "12121212-1212-1212-1212-121212121212",
  "warehouseId": "66666666-6666-6666-6666-666666666666",
  "adjustmentType": "decrease",
  "quantityAfter": 100,
  "reason": "damage",
  "remarks": "Water damage from roof leak",
  "binId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
}

# Get adjustment details
GET /adjustments/:adjustmentId

# Approve a pending adjustment
PATCH /adjustments/:adjustmentId/approve

# Reject a pending adjustment
PATCH /adjustments/:adjustmentId/reject
Content-Type: application/json
{
  "rejectionReason": "Insufficient documentation"
}
```

### Sample Data

The seed file includes sample data:
- **Tenant**: Acme Corporation
- **Users**: Admin, Manager, Analyst, Associate
- **Warehouses**: Main Warehouse, West Coast Warehouse
- **SKUs**: Electronics, Food & Beverage, Pharmaceuticals
- **Sample Credentials** (for testing only):
  - Email: `admin@acme.com`
  - Password: `password` (bcrypt hash in database)

## ⚙️ Environment Configuration

### Key Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://genesis_admin:genesis_secure_password_2025@localhost:5432/genesis_wms

# Redis
REDIS_URL=redis://:genesis_redis_password@localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://genesis:genesis_rabbitmq_password@localhost:5672

# JWT Authentication
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRY=24h

# Cache TTL (seconds)
CACHE_TTL_HOT=300      # 5 minutes for hot data (inventory quantities)
CACHE_TTL_WARM=1800    # 30 minutes for warm data (bin mappings)
CACHE_TTL_COLD=7200    # 2 hours for cold data (analytics)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000        # 1 minute window
RATE_LIMIT_MAX_REQUESTS=1000      # Max requests per window
```

## 🛠️ Development

### Running the Service

```bash
# Development mode with auto-reload
cd backend/inventory-core-service
npm run dev

# Production build
npm run build
npm start
```

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## ⚡ Performance & Scalability

### Performance Benchmarks (Target vs Actual)

| Operation | Target (p95) | Implementation Goal |
|-----------|-------------|-------------------|
| Inventory Overview Load | 1.5s | Optimized queries + caching |
| SKU Detail Load | 500ms | Redis caching enabled |
| Search Query | 800ms | Full-text search indexes |
| Filter Application | 300ms | Materialized views |
| Real-Time Sync (Tier 1) | 2.0s | RabbitMQ message queue |

### Scalability Targets

- ✅ Support 1M+ SKUs per tenant (database partitioning)
- ✅ 10,000 API requests/minute sustained (rate limiting configured)
- ✅ 1,000 concurrent users (connection pooling)
- ✅ 99.95% system uptime (health checks + auto-restart)

### Caching Strategy

**Hot Data (5-minute TTL):**
- Current inventory quantities by SKU
- Active threshold configurations
- Active alerts

**Warm Data (30-minute TTL):**
- Bin location mappings
- Batch details
- Movement summaries (last 30 days)

**Cold Data (2-hour TTL):**
- Historical reports
- Analytics aggregations
- Export metadata

## 🔒 Security & Compliance

### Implemented Security Features

- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Role-Based Access Control**: 5 user roles with granular permissions
- ✅ **Rate Limiting**: 1000 requests/minute per IP
- ✅ **Helmet.js**: Security headers (XSS, CSRF protection)
- ✅ **Input Validation**: Joi schema validation
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **CORS Configuration**: Restricted origin access
- ✅ **Error Handling**: No stack traces in production

### Compliance Frameworks Supported

- **FDA 21 CFR Part 11**: Electronic signatures, audit trails (batch management)
- **ISO 9001**: Quality management, complete traceability
- **SOX**: Financial controls, segregation of duties, immutable audit logs
- **GDPR/CCPA**: Data privacy, user consent management

### Audit Logging

All critical operations are logged with:
- **WHO**: User ID, email, role
- **WHAT**: Action performed (create, update, delete, approve, reject)
- **WHEN**: Timestamp (UTC)
- **WHERE**: IP address, user agent
- **WHY**: Reason (for adjustments, rejections)

Audit logs are:
- Immutable (write-only)
- Stored in TimescaleDB (efficient time-series queries)
- Retained for 7 years (configurable)
- Indexed for fast retrieval

## 🗺️ Roadmap

### Phase 1: Core Inventory (Current)
- ✅ Real-time inventory visibility
- ✅ Bin-level tracking
- ✅ Inventory adjustments with approval workflow
- ✅ Basic search and filtering
- ✅ Database schema with TimescaleDB

### Phase 2: Batch Management & Alerts (Next)
- ⏳ Batch tracking service
- ⏳ FEFO/FIFO enforcement
- ⏳ Threshold monitoring service
- ⏳ Multi-channel alerts (email, SMS, webhook)
- ⏳ Expiry monitoring

### Phase 3: Cycle Counting (Future)
- ⏳ Cycle count service
- ⏳ Mobile app for warehouse associates
- ⏳ Blind counting
- ⏳ ABC classification
- ⏳ Variance review workflows

### Phase 4: Advanced Features (Future)
- ⏳ AI-powered demand forecasting
- ⏳ Automated reorder point calculation
- ⏳ IoT integration (RFID, weight scales)
- ⏳ Blockchain-based batch traceability
- ⏳ Advanced analytics dashboard

## 🐛 Troubleshooting

### Common Issues

**1. Database connection failed**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker exec -it genesis-wms-db psql -U genesis_admin -d genesis_wms -c "SELECT NOW();"
```

**2. Redis connection timeout**
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker exec -it genesis-wms-redis redis-cli -a genesis_redis_password ping
```

**3. RabbitMQ not accessible**
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Access management UI
open http://localhost:15672
```

**4. Port already in use**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

**5. TypeScript compilation errors**
```bash
# Clean build artifacts
rm -rf dist/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For questions or support:
- **GitHub Issues**: https://github.com/NTEKIMJOHN/Genesis-WMS-DIY/issues

## 🙏 Acknowledgments

- **Product Manager**: Edima Samuel Koffi
- **Technical Lead**: Ntekim John
- **Genesis WMS Product Team**

---

**Built with ❤️ for modern warehouse operations**

*Version 1.0.0 - January 2025*
