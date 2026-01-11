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