# 🚀 Genesis WMS - Quick Deployment (5 Minutes)

Follow these exact steps to deploy your app in ~5 minutes.

## Step 1: Merge Your Code (1 min)

```bash
cd /home/user/Genesis-WMS-DIY

# Merge feature branch to main
git checkout main
git merge claude/receiving-management-module-Lros9
git push origin main
```

## Step 2: Deploy Backend to Railway (2 min)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select **Genesis-WMS-DIY**
4. Click **"Add variables"** and add:
   ```
   NODE_ENV=production
   JWT_SECRET=please-change-this-to-something-very-secure-and-random
   JWT_REFRESH_SECRET=please-change-this-too-something-different
   ```
5. Click **"New"** → **"Database"** → **"PostgreSQL"** (auto-connects to your app)
6. In **Settings** → **Configure**:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run prisma:generate && npm run build`
   - Start Command: `npm run prisma:migrate && npm start`
7. Click **"Deploy"**
8. Copy your Railway URL (e.g., `https://genesis-wms-production.up.railway.app`)

## Step 3: Deploy Frontend to Vercel (2 min)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import **Genesis-WMS-DIY**
4. Configure:
   - Framework: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variable:
   ```
   VITE_API_URL=https://your-railway-url-from-step-2.railway.app
   ```
6. Click **"Deploy"**
7. Wait ~2 minutes for build to complete
8. Copy your Vercel URL (e.g., `https://genesis-wms.vercel.app`)

## Step 4: Update Backend CORS (30 seconds)

1. Go back to **Railway**
2. Click your backend service → **Variables**
3. Add new variable:
   ```
   CORS_ORIGIN=https://your-vercel-url-from-step-3.vercel.app
   ```
4. Railway will auto-redeploy (takes ~1 min)

## Step 5: Test Your App! ✅

1. Visit your Vercel URL
2. You should see the Genesis WMS login page
3. Try logging in with test credentials (if you seeded the database)

---

## 🎉 Done!

Your app is now live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.railway.app`
- **API Docs**: `https://your-app.railway.app/api-docs`

## 📱 Next Steps

- [ ] Create your first admin user
- [ ] Test all modules (ASN, Blind Receipt, Variance, etc.)
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring
- [ ] Share with your team!

## 🆘 Troubleshooting

**Can't login?**
- Check browser console for errors
- Verify VITE_API_URL is correct in Vercel
- Check Railway logs for backend errors

**CORS errors?**
- Ensure CORS_ORIGIN in Railway matches Vercel URL exactly (no trailing slash)

**Database errors?**
- Check Railway logs
- Verify DATABASE_URL is set (Railway does this automatically)
- Run migrations manually if needed

---

Need detailed help? See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
