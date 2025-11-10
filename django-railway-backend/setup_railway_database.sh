#!/bin/bash
# Setup Railway database with migrations and admin user

echo "🚀 Setting up Railway database..."

# Run migrations
echo ""
echo "📦 Running migrations..."
python manage.py migrate

# Create admin user
echo ""
echo "👤 Creating admin user..."
python create_admin.py

echo ""
echo "✅ Database setup complete!"
echo ""
echo "You can now login with:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "⚠️  Remember to change the password after first login!"

