# Genesis WMS - Setup Guide

This guide will help you set up and run the Genesis WMS Receiving Management Module.

## Quick Start (Recommended)

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd Genesis-WMS-DIY

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# API Documentation: http://localhost:3000/api-docs
# pgAdmin: http://localhost:5050
```

## Manual Setup

### Prerequisites

Ensure you have the following installed:
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### Step 1: Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE genesis_wms;
CREATE USER genesis_user WITH PASSWORD 'genesis_password';
GRANT ALL PRIVILEGES ON DATABASE genesis_wms TO genesis_user;
```

2. Or use Docker for PostgreSQL:
```bash
docker run --name genesis-postgres \
  -e POSTGRES_USER=genesis_user \
  -e POSTGRES_PASSWORD=genesis_password \
  -e POSTGRES_DB=genesis_wms \
  -p 5432:5432 \
  -d postgres:14-alpine
```

### Step 2: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
DATABASE_URL="postgresql://genesis_user:genesis_password@localhost:5432/genesis_wms?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Generate Prisma client:
```bash
npx prisma generate
```

7. Seed the database with sample data:
```bash
npm run prisma:seed
```

8. Start the backend server:
```bash
npm run dev
```

The API will be available at http://localhost:3000

### Step 3: Frontend Setup (Coming Soon)

The frontend React application is under development.

## Database Management

### Prisma Studio

Access the visual database editor:
```bash
cd backend
npx prisma studio
```

This will open http://localhost:5555 with a GUI to view and edit database records.

### pgAdmin (Docker only)

If using Docker Compose, access pgAdmin at http://localhost:5050

- Email: admin@genesis-wms.com
- Password: admin

Add a new server connection:
- Host: postgres
- Port: 5432
- Database: genesis_wms
- Username: genesis_user
- Password: genesis_password

## Sample Login Credentials

After seeding the database, use these credentials to test:

### Platform Admin
- Email: admin@genesis-wms.com
- Password: password123

### Warehouse Receiver
- Email: receiver@genesis-wms.com
- Password: password123

### Receiving Supervisor
- Email: supervisor@genesis-wms.com
- Password: password123

## API Documentation

Interactive API documentation is available at:
http://localhost:3000/api-docs

## Development Workflow

### Backend Development

```bash
cd backend

# Start development server with auto-reload
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Running Tests

```bash
cd backend
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## Production Deployment

### Backend

1. Build the application:
```bash
cd backend
npm run build
```

2. Set production environment variables:
```env
NODE_ENV=production
DATABASE_URL=<production-database-url>
JWT_SECRET=<strong-random-secret>
```

3. Run migrations:
```bash
npx prisma migrate deploy
```

4. Start the server:
```bash
npm start
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running:
```bash
# Linux/Mac
sudo systemctl status postgresql

# Or check if container is running
docker ps | grep postgres
```

2. Test connection:
```bash
psql -h localhost -U genesis_user -d genesis_wms
```

3. Check environment variables:
```bash
cd backend
cat .env
```

### Port Already in Use

If port 3000 or 5432 is already in use:

1. Find the process:
```bash
# Mac/Linux
lsof -i :3000
lsof -i :5432

# Windows
netstat -ano | findstr :3000
```

2. Kill the process or change the port in `.env`

### Prisma Client Issues

If you encounter Prisma-related errors:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

## Project Structure

```
Genesis-WMS-DIY/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers (TODO)
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes (TODO)
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.ts          # Seed script
│   │   └── migrations/      # Database migrations
│   └── package.json
├── frontend/                # React frontend (TODO)
├── docker-compose.yml       # Docker setup
└── README.md
```

## Next Steps

1. Review the API documentation at http://localhost:3000/api-docs
2. Explore the database schema in Prisma Studio
3. Test the API endpoints using the Swagger UI
4. Check the PRD document for feature specifications

## Support

For issues and questions:
- GitHub Issues: [Repository URL]
- Email: support@genesis-wms.com

## License

Proprietary - Genesis WMS
