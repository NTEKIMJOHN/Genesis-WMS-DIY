# Genesis WMS - Receiving Management Module

A comprehensive Warehouse Management System focused on inbound inventory operations.

## Overview

The Receiving Management Module is the critical gateway for all inbound inventory operations within Genesis WMS. It digitizes and automates the process of accepting goods from suppliers, verifying quantities and quality, managing discrepancies through systematic variance workflows, and intelligently routing inventory to optimal storage locations.

## Key Features

### 1. ASN/PO-Based Receiving
- Structured workflow for pre-recorded shipment data
- Barcode scanning integration
- Real-time validation and verification
- Batch/lot/serial number tracking
- Temperature monitoring for cold chain items

### 2. Blind Receiving
- Unplanned delivery handling
- Manual data entry with supervisor approval
- New SKU flagging and review workflow
- Photographic evidence support

### 3. Variance Management
- Three-tier resolution workflow (Approve/Reject/Escalate)
- Mandatory reason codes
- Photographic evidence capture
- Automated threshold-based routing
- Comprehensive audit trails

### 4. Intelligent Putaway Task Generation
- Automated bin assignment based on:
  - SKU velocity (FEFO/FIFO)
  - Temperature zone requirements
  - Bin capacity and availability
  - Consolidation opportunities
- Real-time operator task assignment

### 5. License Plate Number (LPN) Management
- Pallet/carton level tracking
- Nested container support
- Simplified putaway operations
- LPN lifecycle management

### 6. Label Printing
- SKU labels with barcode/QR codes
- LPN labels for containers
- Bin location labels
- Batch/expiry stickers
- ZPL and PDF format support

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 14+
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **UI Components**: Headless UI + Custom components

### DevOps
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, Prettier
- **Version Control**: Git

## Project Structure

```
Genesis-WMS-DIY/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Prisma models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   ├── validators/      # Request validators
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   ├── tests/               # Backend tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Root component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker-compose.yml
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn
- Docker (optional, for containerized setup)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Genesis-WMS-DIY
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
```

5. Set up the database:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
npx prisma db seed  # Optional: seed with sample data
```

6. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs

### Using Docker

Alternatively, use Docker Compose to run the entire stack:

```bash
docker-compose up -d
```

## API Documentation

Once the backend is running, access the interactive API documentation at:
http://localhost:3000/api-docs

## User Roles & Permissions

1. **Warehouse Receiver**: Execute receiving tasks, flag variances
2. **Receiving Supervisor**: Review variances, approve blind receipts, configure rules
3. **QA Inspector**: Inspect flagged items, manage QA holds
4. **Buyer/Procurement**: Upload ASNs, monitor shipments, approve high-value variances
5. **Platform Admin**: System configuration and monitoring

## Key Performance Indicators

- **Receiving Accuracy Rate**: Target ≥99.5%
- **Variance Rate**: Target ≤3%
- **Average Receipt Processing Time**: Target ≤15 minutes
- **Putaway Task Completion Time**: Target ≤20 minutes
- **Batch Data Capture Rate**: Target 100% for batch-tracked SKUs
- **System Uptime**: Target ≥99.95%

## Development

### Running Tests

Backend:
```bash
cd backend
npm test
npm run test:coverage
```

Frontend:
```bash
cd frontend
npm test
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Deployment

### Production Build

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm run build
# Serve the dist/ folder with a static file server
```

### Environment Variables

See `.env.example` files for required environment variables.

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create a Pull Request

## License

Proprietary - Genesis WMS

## Support

For support, contact: support@genesis-wms.com

## Version

Current Version: 1.0.0
Last Updated: January 2026

---

**Prepared by**: Ntekim John - Genesis WMS Product Manager
**Department**: Product Team
