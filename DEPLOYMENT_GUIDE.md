# Genesis WMS Deployment Guide

Complete guide to deploy your Genesis WMS Receiving Management Module to production.

## 📋 Prerequisites

- Node.js 18+ installed locally
- Git installed
- GitHub account (or GitLab/Bitbucket)
- Accounts on chosen platforms (Vercel, Railway, etc.)
- PostgreSQL database (we'll set this up)

---

## 🚀 Quick Start (Recommended Path)

**Frontend**: Deploy to Vercel (free tier available)  
**Backend**: Deploy to Railway or Render (free tier available)  
**Database**: Use Railway/Render PostgreSQL or Supabase (free tier)

---

## Part 1: Prepare Your Code

### Step 1: Commit Configuration Changes

```bash
cd /home/user/Genesis-WMS-DIY

# Add the fixed configuration files
git add frontend/package.json backend/package.json frontend/vite.config.ts
git add frontend/.env.example frontend/vercel.json

git commit -m "chore: Prepare for deployment - fix configs and add environment templates"

git push -u origin claude/receiving-management-module-Lros9
```

### Step 2: Merge to Main Branch

```bash
# Switch to main branch
git checkout main

# Merge your feature branch
git merge claude/receiving-management-module-Lros9

# Push to main
git push origin main
```

---

## Part 2: Deploy the Backend

### Option A: Railway (Recommended)

1. **Sign up at [railway.app](https://railway.app)**
   - Login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Genesis-WMS-DIY repository
   - Select the `backend` folder

3. **Add PostgreSQL Database**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create DATABASE_URL

4. **Configure Environment Variables**
   
   In Railway dashboard, add these variables:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

5. **Configure Build Settings**
   - Root Directory: `backend`
   - Build Command: `npm install && npm run prisma:generate && npm run build`
   - Start Command: `npm run prisma:migrate && npm start`

6. **Deploy**
   - Railway will automatically deploy
   - Note your backend URL (e.g., `https://your-app.railway.app`)

### Option B: Render

1. **Sign up at [render.com](https://render.com)**

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: `genesis-wms-db`
   - Select free plan
   - Click "Create Database"
   - Copy the "External Database URL"

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Name: `genesis-wms-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run prisma:generate && npm run build`
   - Start Command: `npm run prisma:migrate && npm start`

4. **Add Environment Variables**
   ```
   NODE_ENV=production
   DATABASE_URL=[paste your external database URL]
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

5. **Deploy** - Click "Create Web Service"

---

## Part 3: Deploy the Frontend

### Option A: Vercel (Recommended - Easiest)

1. **Sign up at [vercel.com](https://vercel.com)**
   - Login with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your Genesis-WMS-DIY repository

3. **Configure Project**
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables**
   
   Add these in Vercel dashboard:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_APP_NAME=Genesis WMS
   VITE_APP_VERSION=1.0.0
   VITE_ENABLE_BARCODE_SCANNER=true
   ```

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - You'll get a URL like `https://genesis-wms.vercel.app`

6. **Update Backend CORS**
   - Go back to Railway/Render
   - Update `CORS_ORIGIN` to your Vercel URL
   - Redeploy backend

### Option B: Netlify

1. **Sign up at [netlify.com](https://netlify.com)**

2. **Import Project**
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repo

3. **Build Settings**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`

4. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

5. **Deploy**

### Option C: Cloudflare Pages

1. **Sign up at [pages.cloudflare.com](https://pages.cloudflare.com)**

2. **Create Project**
   - Connect to GitHub
   - Select repository

3. **Build Settings**
   - Framework preset: Vite
   - Build command: `cd frontend && npm install && npm run build`
   - Build output directory: `frontend/dist`

4. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend.railway.app
   NODE_VERSION=18
   ```

---

## Part 4: Database Setup & Migration

### After Backend is Deployed

1. **Run Database Migrations**
   
   Railway auto-runs migrations on deploy, but if needed:
   ```bash
   # From your local machine, with DATABASE_URL from Railway/Render
   cd backend
   DATABASE_URL="your-production-database-url" npm run prisma:migrate
   ```

2. **Seed Initial Data (Optional)**
   ```bash
   DATABASE_URL="your-production-database-url" npm run prisma:seed
   ```

---

## Part 5: Custom Domain (Optional)

### For Vercel Frontend

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `wms.yourdomain.com`)
3. Update DNS records as instructed
4. Update backend CORS_ORIGIN

### For Railway Backend

1. Go to Settings → Networking
2. Add custom domain
3. Update DNS records
4. Update frontend VITE_API_URL

---

## 🔧 Testing Your Deployment

### 1. Test Backend Health

```bash
curl https://your-backend.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T..."
}
```

### 2. Test Frontend

1. Visit `https://your-frontend.vercel.app`
2. Try to login
3. Check browser console for errors
4. Verify API calls are going to correct backend URL

---

## 🔐 Security Checklist

- [ ] Changed all default secrets (JWT_SECRET, etc.)
- [ ] CORS_ORIGIN is set to exact frontend URL
- [ ] Database URL is using SSL (should have `?sslmode=require`)
- [ ] Environment variables are not committed to git
- [ ] API rate limiting is configured
- [ ] Helmet.js is enabled in production

---

## 📊 Monitoring

### Vercel
- Auto-includes deployment logs
- Analytics available on Pro plan

### Railway
- View logs: Railway dashboard → Select service → Logs tab
- Metrics: Railway dashboard → Metrics tab

### Database
- Railway: Database → Metrics
- Monitor connection count and query performance

---

## 🔄 Continuous Deployment

Both Vercel and Railway support auto-deployment:

1. **Push to GitHub main branch**
2. **Automatic triggers**:
   - Vercel rebuilds frontend
   - Railway rebuilds backend
3. **Changes go live** in 2-3 minutes

---

## 🐛 Troubleshooting

### Build Fails

**Frontend:**
```bash
# Test build locally first
cd frontend
npm install
npm run build
```

**Backend:**
```bash
cd backend
npm install
npm run prisma:generate
npm run build
```

### CORS Errors

Check that:
1. Backend `CORS_ORIGIN` matches frontend URL exactly
2. Frontend `VITE_API_URL` is correct
3. No trailing slashes in URLs

### Database Connection Fails

1. Verify `DATABASE_URL` format:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```
2. Check Railway/Render database is running
3. Verify network connectivity

### API Returns 500 Errors

1. Check Railway/Render logs
2. Verify all environment variables are set
3. Ensure migrations ran successfully

---

## 💰 Cost Estimate

### Free Tier (Perfect for Testing/Demo)

- **Vercel**: Free (Hobby plan)
  - 100 GB bandwidth/month
  - Unlimited projects
  
- **Railway**: $5 credit/month free
  - ~550 hours runtime
  - 1GB RAM, shared CPU
  - 1GB PostgreSQL database

- **Total**: Free for first month, ~$5-10/month after

### Production (Recommended)

- **Vercel Pro**: $20/month
- **Railway**: ~$15-30/month (based on usage)
- **Total**: ~$35-50/month

---

## 📝 Environment Variables Reference

### Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app

# Redis (optional)
REDIS_URL=redis://...

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

### Frontend (.env)

```bash
# API
VITE_API_URL=https://your-backend.railway.app

# App
VITE_APP_NAME=Genesis WMS
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_BARCODE_SCANNER=true
VITE_ENABLE_DEBUG=false
```

---

## 🎯 Next Steps After Deployment

1. **Set up monitoring** (Sentry, LogRocket)
2. **Configure backups** for database
3. **Set up staging environment** (separate branch/deployment)
4. **Add CI/CD tests** (GitHub Actions)
5. **Configure CDN** for assets (Cloudflare)
6. **Set up SSL** (auto on Vercel/Railway)
7. **Create admin user** in production database

---

## 📞 Support

If you encounter issues:

1. Check Railway/Vercel deployment logs
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Test API endpoints with Postman/curl
5. Check database connectivity

---

## 🎉 You're Done!

Your Genesis WMS is now live and accessible worldwide!

- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-app.railway.app`
- API Docs: `https://your-app.railway.app/api-docs`

