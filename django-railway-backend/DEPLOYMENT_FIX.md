# Railway Deployment Fix Guide

## Issues Fixed

### 1. Missing `django-filter` Package
**Error:** `ModuleNotFoundError: No module named 'django_filters'`

**Fix:** Added `django-filter==24.3` to `requirements.txt`

### 2. CORS Origin Missing Scheme
**Error:** `Origin 'uni-manage-sys.netlify.app' in CORS_ALLOWED_ORIGINS is missing scheme or netloc`

**Fix:** Updated `config/settings.py` to automatically add `https://` to non-localhost origins

### 3. Inconsistent Migration History
**Error:** `Migration admin.0001_initial is applied before its dependency accounts.0001_initial`

**Fix:** Created custom management command `fix_migration_history` that automatically detects and fixes this issue

## How It Works

The updated `Procfile` now runs:

```bash
python manage.py collectstatic --no-input && \
python manage.py fix_migration_history && \
python manage.py migrate --fake-initial --no-input && \
gunicorn config.wsgi --bind 0.0.0.0:$PORT
```

### Migration Fix Process

1. **`fix_migration_history`** - Checks if migration history is inconsistent
   - If admin migrations exist but accounts migrations don't → Clears migration history
   - If consistent → Does nothing (idempotent)
   
2. **`migrate --fake-initial`** - Applies migrations
   - If tables exist → Marks migrations as applied without recreating tables
   - If tables don't exist → Creates them normally

## Deployment Steps

### Option 1: Automatic (Recommended)
Simply push these changes to Railway:

```bash
git add .
git commit -m "Fix Railway deployment issues"
git push
```

Railway will automatically:
1. Install the updated dependencies
2. Fix the migration history
3. Apply migrations correctly
4. Start the server

### Option 2: Manual Database Reset (If Option 1 Fails)

If you want a completely fresh start:

1. **In Railway Dashboard:**
   - Go to your PostgreSQL database
   - Click "Data" tab
   - Delete all tables (or delete and recreate the database)

2. **Redeploy:**
   - The Procfile will handle everything automatically

## Environment Variables

Ensure these are set in Railway:

```env
# Database (automatically set by Railway)
DATABASE_URL=postgresql://...

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app

# CORS - Now supports both formats:
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://uni-manage-sys.netlify.app
# OR (scheme will be added automatically):
CORS_ALLOWED_ORIGINS=http://localhost:5173,uni-manage-sys.netlify.app
```

## Verification

After deployment, check Railway logs for:

```
✅ Migration history is consistent!
```

Or if it was fixed:

```
⚠️  Inconsistent migration history detected!
🔧 Clearing migration history (tables will remain intact)...
✅ Migration history cleared! Ready for migrate --fake-initial
```

## Testing Locally

To test the fix locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the fix command
python manage.py fix_migration_history

# Apply migrations
python manage.py migrate --fake-initial

# Run the server
python manage.py runserver
```

## Troubleshooting

### If deployment still fails:

1. **Check Railway logs** for the specific error
2. **Verify environment variables** are set correctly
3. **Try manual database reset** (Option 2 above)

### If you see "502 Bad Gateway":

- Wait 1-2 minutes for the server to fully start
- Check Railway logs for errors
- Ensure `PORT` environment variable is being used correctly

## Files Modified

- ✅ `requirements.txt` - Added `django-filter==24.3`
- ✅ `config/settings.py` - Auto-add HTTPS scheme to CORS origins
- ✅ `Procfile` - Added migration fix step
- ✅ `accounts/management/commands/fix_migration_history.py` - New command
- ✅ `fix_migrations.py` - Standalone script (optional use)

## Support

If issues persist, check:
- Railway build logs
- Railway deployment logs
- Django error messages in logs

