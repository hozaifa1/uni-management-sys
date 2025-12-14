# 🚀 Vercel + Cloudinary Deployment TODO

This is a hyper-specific, step-by-step guide to migrate your Django backend to **Vercel** and your file storage to **Cloudinary**, while keeping your existing hosted PostgreSQL database.

---

## Phase 1: Cloudinary Setup (File Storage)

### 1.1 Create Cloudinary Account
- [ ] Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
- [ ] Click **"Sign up for Free"**
- [ ] Fill in:
  - **Your Name**: Your full name
  - **Email**: Your email address
  - **Password**: Create a strong password
- [ ] Click **"Create Account"**
- [ ] Verify your email by clicking the link sent to your inbox

### 1.2 Get Cloudinary Credentials
- [ ] After login, you land on the **Dashboard** (or click "Dashboard" in left sidebar)
- [ ] Look for the **"Product Environment Credentials"** section (top of dashboard)
- [ ] Copy these 3 values and save them securely:
  - **Cloud Name**: `your_cloud_name` (e.g., `dxyz123abc`)
  - **API Key**: `123456789012345` (15-digit number)
  - **API Secret**: `aBcDeFgHiJkLmNoPqRsTuVwXyZ` (27-character string)

> ⚠️ **NEVER commit these to Git!** They go in environment variables only.

---

## Phase 2: Vercel Account Setup

### 2.1 Create Vercel Account
- [ ] Go to [https://vercel.com/signup](https://vercel.com/signup)
- [ ] Click **"Continue with GitHub"** (recommended for easy repo import)
- [ ] Authorize Vercel to access your GitHub account
- [ ] Complete the onboarding questionnaire (or skip)

### 2.2 Install Vercel CLI (Optional but Recommended)
```powershell
npm install -g vercel
```
- [ ] Run `vercel login` and follow browser authentication

---

## Phase 3: Database (Neon - Already Configured)

> **✅ ALREADY DONE** - Your PostgreSQL database has always been hosted on **Neon**. Railway was only used for backend API hosting (similar to how Vercel is now used). No database migration is needed.

### Current Setup
- **Database**: Neon PostgreSQL (unchanged)
- **Previous Backend Host**: Railway (deprecated)
- **New Backend Host**: Vercel (serverless)

### Your Neon Connection String
Your `DATABASE_URL` is already configured in Vercel environment variables and points to your existing Neon database. No action required here.

---

## Phase 4: Code Changes (Already Applied by Cascade)

The following files have been modified/created:

### 4.1 Files Modified
- [ ] `django-vercel-backend/requirements.txt` - Added Cloudinary packages
- [ ] `django-vercel-backend/config/settings.py` - Added Cloudinary storage, Vercel-compatible DB config
- [ ] `django-vercel-backend/config/wsgi.py` - Added `app = application` for Vercel

### 4.2 Files Created
- [ ] `django-vercel-backend/vercel.json` - Vercel build/routing configuration
- [ ] `django-vercel-backend/build_files.sh` - Build script for Vercel

---

## Phase 5: Deploy Django Backend to Vercel

### 5.1 Push Code to GitHub
- [ ] Ensure all changes are committed:
```bash
git add .
git commit -m "feat: configure for Vercel + Cloudinary deployment"
git push origin main
```

### 5.2 Import Project to Vercel
1. [ ] Go to [https://vercel.com/new](https://vercel.com/new)
2. [ ] Click **"Import Git Repository"**
3. [ ] Select your repository: `uni-management-sys` (or your repo name)
4. [ ] Configure project:
   - **Framework Preset**: Select `Other`
   - **Root Directory**: Click **"Edit"** → Enter `django-vercel-backend` → Click **"Continue"**
   - **Build Command**: Leave as `sh build_files.sh`
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty

### 5.3 Configure Environment Variables
Click **"Environment Variables"** and add ALL of the following:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `SECRET_KEY` | `your-django-secret-key-here` | Generate with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | `False` | Must be False in production |
| `DATABASE_URL` | `postgres://user:pass@host:5432/dbname` | Your existing PostgreSQL connection string |
| `ALLOWED_HOSTS` | `your-project.vercel.app,*.vercel.app` | Your Vercel domain |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` | Your frontend URL |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | From Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | `123456789012345` | From Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | `aBcDeFgHiJkLmNoPqRsTuVwXyZ` | From Cloudinary Dashboard |
| `USE_CLOUDINARY` | `True` | Enables Cloudinary storage |

### 5.4 Deploy
- [ ] Click **"Deploy"**
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Note your deployment URL: `https://your-project.vercel.app`

---

## Phase 6: Post-Deployment Configuration

### 6.1 Run Migrations (First Time Only)
You need to run migrations manually since Vercel is serverless:

**Option A: Using Vercel CLI**
```bash
cd django-vercel-backend
vercel env pull .env.local
python manage.py migrate
```

**Option B: Create a Migration Endpoint (One-time use)**
Add a temporary view in Django, call it once, then remove it.

### 6.2 Create Superuser
```bash
# Locally with production DATABASE_URL
export DATABASE_URL="your-production-db-url"
python manage.py createsuperuser
```

### 6.3 Collect Static Files
This happens automatically during Vercel build via `build_files.sh`.

---

## Phase 7: Deploy React Frontend to Vercel

### 7.1 Update Frontend API URL
- [ ] Edit `frontend/.env`:
```env
VITE_API_URL=https://your-django-project.vercel.app/api
```

### 7.2 Deploy Frontend
1. [ ] Go to [https://vercel.com/new](https://vercel.com/new)
2. [ ] Import same repository
3. [ ] Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. [ ] Add Environment Variable:
   - `VITE_API_URL` = `https://your-django-backend.vercel.app/api`
5. [ ] Click **"Deploy"**

---

## Phase 8: Update CORS & Allowed Hosts

After both are deployed, update the backend environment variables:

### 8.1 In Vercel Dashboard (Backend Project)
- [ ] Go to **Settings** → **Environment Variables**
- [ ] Update `ALLOWED_HOSTS`:
  ```
  your-backend.vercel.app,your-frontend.vercel.app
  ```
- [ ] Update `CORS_ALLOWED_ORIGINS`:
  ```
  https://your-frontend.vercel.app
  ```
- [ ] Click **"Redeploy"** for changes to take effect

---

## Phase 9: Set Up Keep-Alive (Prevent Cold Starts)

Neon's free tier suspends after 5 minutes of inactivity. Set up a ping service:

### 9.1 Using UptimeRobot (Free)
1. [ ] Go to [https://uptimerobot.com](https://uptimerobot.com)
2. [ ] Create free account
3. [ ] Click **"Add New Monitor"**
4. [ ] Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: `IGMIS LMS Backend`
   - **URL**: `https://your-backend.vercel.app/api/health/`
   - **Monitoring Interval**: `5 minutes`
5. [ ] Click **"Create Monitor"**

### 9.2 Create Health Check Endpoint (If Not Exists)
Add to your Django URLs if needed - a simple endpoint that returns 200 OK.

---

## Phase 10: Verification Checklist

### Backend Verification
- [ ] Visit `https://your-backend.vercel.app/admin/` - Should show Django admin login
- [ ] Visit `https://your-backend.vercel.app/api/` - Should show API response
- [ ] Test file upload - Should upload to Cloudinary
- [ ] Check Cloudinary Dashboard - Files should appear in Media Library

### Frontend Verification
- [ ] Visit `https://your-frontend.vercel.app` - Should load React app
- [ ] Login functionality works
- [ ] API calls to backend succeed (check Network tab)
- [ ] Image uploads display correctly (served from Cloudinary CDN)

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `504 Gateway Timeout` | DB cold start (Neon) | Set up UptimeRobot ping |
| `pg_config not found` | Wrong psycopg2 | Use `psycopg2-binary` |
| `ModuleNotFoundError` | Missing `app` in wsgi.py | Add `app = application` |
| `DisallowedHost` | ALLOWED_HOSTS wrong | Add your `.vercel.app` domain |
| `CORS error` | CORS_ALLOWED_ORIGINS wrong | Add frontend URL with https:// |
| `Static files 404` | collectstatic failed | Check build_files.sh ran |

### Useful Commands

```bash
# Check Vercel deployment logs
vercel logs your-project.vercel.app

# Re-deploy after env var change
vercel --prod

# Test locally with production DB
DATABASE_URL="your-prod-url" python manage.py runserver
```

---

## Environment Variables Summary

### Backend (Django on Vercel)
```env
SECRET_KEY=your-super-secret-key-here
DEBUG=False
DATABASE_URL=postgres://user:pass@host:5432/dbname
ALLOWED_HOSTS=your-backend.vercel.app,*.vercel.app
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret_here
USE_CLOUDINARY=True
```

### Frontend (React on Vercel)
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

---

## 📝 Notes

- **Free Tier Limits**:
  - Vercel: 100GB bandwidth/month, 6000 minutes build time
  - Cloudinary: 25 credits/month (≈25GB storage OR bandwidth)
  - Neon: 0.5GB storage, 191 compute hours/month

- **Serverless Considerations**:
  - No persistent file system (use Cloudinary)
  - 10-second function timeout on Vercel Hobby
  - Cold starts may cause initial delay

---

*Generated by Cascade - Last updated: December 2024*
