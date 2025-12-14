"""
Standalone script to create admin user on production database
Can be run directly from Railway dashboard or via Railway CLI
"""
import os
import sys

# This will use Railway's DATABASE_URL automatically
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from accounts.models import User

def main():
    print("=" * 60)
    print("PRODUCTION ADMIN USER CREATION")
    print("=" * 60)
    
    # Check current database
    from django.db import connection
    db_name = connection.settings_dict.get('NAME', 'unknown')
    print(f"\nConnected to database: {db_name}")
    print()
    
    # Check if admin exists
    if User.objects.filter(username='admin').exists():
        admin = User.objects.get(username='admin')
        print("✅ Admin user ALREADY EXISTS!")
        print(f"   Username: {admin.username}")
        print(f"   Email: {admin.email}")
        print(f"   Role: {admin.role}")
        print(f"   Active: {admin.is_active}")
        print()
        
        # Test password
        if admin.check_password('admin123'):
            print("✅ Password 'admin123' is correct")
            print()
            print("🎉 You can now login with:")
            print("   Username: admin")
            print("   Password: admin123")
        else:
            print("⚠️  Password 'admin123' does NOT match")
            print("   You may need to reset the password")
        
        print()
        return
    
    # Create admin user
    print("Creating admin user...")
    try:
        admin = User.objects.create_user(
            username='admin',
            email='admin@igmis.edu',
            password='admin123',
            first_name='System',
            last_name='Administrator',
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        
        print("✅ Admin user created successfully!")
        print()
        print("🎉 Login credentials:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Email: admin@igmis.edu")
        print()
        print("⚠️  IMPORTANT: Change this password after first login!")
        print()
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        print()
        sys.exit(1)
    
    print("=" * 60)

if __name__ == '__main__':
    main()

