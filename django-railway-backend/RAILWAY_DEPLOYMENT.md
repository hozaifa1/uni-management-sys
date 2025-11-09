# Railway Deployment Guide

## Required Environment Variables in Railway

Set these environment variables in your Railway project settings:

### Essential Variables

```bash
# Django Secret Key (generate a new one for production)
SECRET_KEY=your-super-secret-key-here-at-least-50-characters-long

# Debug Mode (MUST be False in production)
DEBUG=False

# Allowed Hosts (Railway will automatically set RAILWAY_PUBLIC_DOMAIN)
# You can add additional domains if needed
ALLOWED_HOSTS=your-custom-domain.com

# CORS - Add your frontend URL(s) (comma-separated)
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com

# Database URL (Railway automatically provides this when you add PostgreSQL)
# DATABASE_URL=postgresql://user:password@host:port/database
```

### Optional Variables (for debugging only)

```bash
# Temporarily allow all hosts (remove after debugging)
DISABLE_ALLOWED_HOSTS_CHECK=True

# Temporarily allow all CORS origins (remove after debugging)
CORS_ALLOW_ALL=True
```

## Deployment Steps

1. **Push your code to GitHub** (make sure `.env` is in `.gitignore`)

2. **Create a new project in Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL database**
   - In your Railway project, click "New"
   - Select "Database" > "Add PostgreSQL"
   - Railway will automatically set the `DATABASE_URL` environment variable

4. **Set environment variables**
   - Go to your service settings
   - Click on "Variables" tab
   - Add all the required variables listed above

5. **Deploy**
   - Railway will automatically deploy when you push to your main branch
   - The Procfile will:
     - Collect static files
     - Run database migrations
     - Start the gunicorn server

## Troubleshooting

### 500 Internal Server Error

1. **Check Railway logs**: Look for detailed error messages
2. **Verify environment variables**: Make sure all required variables are set
3. **Database connection**: Ensure PostgreSQL is added and `DATABASE_URL` is set
4. **Allowed hosts**: Make sure your Railway domain is in `ALLOWED_HOSTS`

### Static Files Issues

The Procfile now automatically runs `collectstatic` on each deployment.
If you still see issues, check that:
- `staticfiles` directory exists
- WhiteNoise is properly configured

### Database Migrations

Migrations run automatically via the Procfile.
If you need to run migrations manually:
```bash
railway run python manage.py migrate
```

### Access Django Admin

Create a superuser:
```bash
railway run python manage.py createsuperuser
```

## Security Notes

- **Never commit `.env` file** to version control
- **Use strong SECRET_KEY** (50+ characters, random)
- **Keep DEBUG=False** in production
- **Restrict CORS_ALLOWED_ORIGINS** to your actual frontend URLs
- **Remove debugging variables** (`DISABLE_ALLOWED_HOSTS_CHECK`, `CORS_ALLOW_ALL`) after fixing issues

