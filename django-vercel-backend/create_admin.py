"""
Script to create admin user in Railway database
Run this once after deploying to Railway
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

def create_admin_user():
    """Create admin user if it doesn't exist"""
    
    # Check if admin user already exists
    if User.objects.filter(username='admin').exists():
        print("✅ Admin user already exists!")
        admin = User.objects.get(username='admin')
        print(f"   Username: {admin.username}")
        print(f"   Email: {admin.email}")
        print(f"   Role: {admin.role}")
        print(f"   Active: {admin.is_active}")
        return
    
    print("Creating admin user...")
    
    # Create admin user
    admin_user = User.objects.create_user(
        username='admin',
        email='admin@igmis.edu',
        password='admin123',
        first_name='System',
        last_name='Administrator',
        role='ADMIN',  # Simple CharField, not ForeignKey
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    
    print("✅ Admin user created successfully!")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print(f"   Email: {admin_user.email}")
    print(f"   Role: {admin_user.role}")
    print("\n⚠️  IMPORTANT: Change this password after first login!")

if __name__ == '__main__':
    create_admin_user()


