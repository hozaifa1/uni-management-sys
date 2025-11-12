# 🚀 Production Database Setup Guide

## Problem
Your Railway app is running, but the Neon database is empty (no users). This causes 401 errors when trying to login from the frontend.

## Solution: 3-Step Fix

### Step 1: Run Migrations on Railway

First, push your fixed code to Railway:

```bash
cd "F:\IGMIS LMS\django-railway-backend"
git add .
git commit -m "Fix admin creation script"
git push origin main
```

Wait for Railway to redeploy (2-3 minutes). Then run migrations using Railway CLI:

**Option A: Using Railway CLI (Recommended)**
```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migrations
railway run python manage.py migrate
```

**Option B: Using Railway Dashboard**
1. Go to https://railway.app
2. Open your project
3. Click on your Django service
4. Go to "Settings" tab
5. Scroll to "Deploy"
6. Click "Add deployment trigger" → "Manual"
7. Then go to deployments and you can run commands in the "Deploy Logs" section

However, the easiest way is using Railway CLI for step-by-step commands.

---

### Step 2: Create Admin User on Production

After migrations are done, create the admin user:

```bash
# Using Railway CLI
railway run python create_admin.py
```

This will create:
- **Username:** admin
- **Password:** admin123
- **Role:** ADMIN

---

### Step 3: Verify Everything Works

Check your database status:

```bash
# Using Railway CLI
railway run python check_database.py
```

You should see:
```
✅ Database connection: SUCCESS
✅ User table exists
✅ Admin user EXISTS
✅ Password 'admin123' is CORRECT
```

---

### Step 4: Test Login from Frontend

1. Open your Netlify app: `https://your-app.netlify.app`
2. Try to login:
   - **Username:** admin
   - **Password:** admin123
3. You should now be able to login successfully! 🎉

---

## Troubleshooting

### If Railway CLI doesn't work:

You can run commands directly on Railway using their web console:

1. Go to Railway dashboard
2. Click your service
3. Click "Settings" → "Service Variables"
4. Make sure `DATABASE_URL` is set to your Neon URL
5. Go to "Deployments" → Click latest deployment
6. Look for "Deploy Logs" or use the Railway API

### Alternative: Create admin via Railway Shell

Railway provides a shell interface. From the project settings, you can:

1. Open Railway Shell
2. Run: `python manage.py createsuperuser`
3. Follow prompts to create admin user with:
   - Username: admin
   - Email: admin@igmis.edu
   - Password: admin123

---

## After First Login

⚠️ **IMPORTANT:** Change the default password immediately after first login!

1. Login with admin/admin123
2. Go to Settings or Profile
3. Change password to something secure

---

## Quick Commands Reference

```bash
# Check database status
railway run python check_database.py

# Create admin user
railway run python create_admin.py

# Run migrations
railway run python manage.py migrate

# Create superuser interactively
railway run python manage.py createsuperuser

# Access Django shell
railway run python manage.py shell
```

---

## Testing Files Summary

Your project has several testing files:

### ✅ USEFUL - Keep These:
- **`check_database.py`** - Checks database connection and admin user
- **`create_admin.py`** - Creates admin user (fixed)
- **`test_api.py`** - Tests API endpoints (useful for development)

### ⚠️ OPTIONAL - Can Remove:
- **`test_deployment_fixes.bat`** - Windows test script (only for local testing)
- **`test_deployment_fixes.sh`** - Linux/Mac test script (only for local testing)
- **`fix_admin_role.py`** - Old migration fix (not needed anymore)
- **`fix_migrations.py`** - Old migration fix (not needed anymore)

### Files to DELETE (if not needed):
```bash
# From django-railway-backend directory
del test_deployment_fixes.bat
del test_deployment_fixes.sh
del fix_admin_role.py
del fix_migrations.py
```

---

## Next Steps After Login Works

1. ✅ Login working with admin/admin123
2. Create test data via Django admin panel
3. Add students, courses, teachers
4. Test payment and results features
5. Monitor logs in Railway dashboard

---

## Need Help?

If you still get 401 errors after following these steps:

1. Check Railway logs for errors
2. Verify Netlify environment variable `VITE_API_URL` is correct
3. Make sure CORS settings in Django include your Netlify domain
4. Run `railway run python check_database.py` to verify admin exists


