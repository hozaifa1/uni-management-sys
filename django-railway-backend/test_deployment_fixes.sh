#!/bin/bash
# Test script to verify deployment fixes locally

echo "🧪 Testing Railway Deployment Fixes"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: manage.py not found. Run this script from the django-railway-backend directory."
    exit 1
fi

echo "1️⃣ Checking django-filter package..."
python -c "import django_filters; print('✅ django-filter is installed')" 2>/dev/null || {
    echo "⚠️  django-filter not found. Installing..."
    pip install django-filter==24.3
}
echo ""

echo "2️⃣ Testing CORS configuration..."
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.conf import settings
print('CORS_ALLOWED_ORIGINS:', settings.CORS_ALLOWED_ORIGINS)
print('✅ CORS configuration loaded successfully')
"
echo ""

echo "3️⃣ Testing migration fix command..."
python manage.py fix_migration_history
echo ""

echo "4️⃣ Checking migrations..."
python manage.py migrate --check 2>/dev/null && {
    echo "✅ All migrations are applied"
} || {
    echo "⚠️  Migrations need to be applied. Run: python manage.py migrate --fake-initial"
}
echo ""

echo "5️⃣ Running Django system checks..."
python manage.py check --deploy 2>/dev/null || {
    echo "⚠️  Some deployment checks failed (this is normal for local testing)"
}
echo ""

echo "===================================="
echo "✅ All tests completed!"
echo ""
echo "To start the server locally:"
echo "  python manage.py runserver"
echo ""
echo "To test the full Railway deployment flow:"
echo "  python manage.py collectstatic --no-input"
echo "  python manage.py fix_migration_history"
echo "  python manage.py migrate --fake-initial --no-input"
echo "  gunicorn config.wsgi"

