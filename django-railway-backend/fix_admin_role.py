"""
Script to fix the admin user's role
Run this with: python manage.py shell < fix_admin_role.py
Or: python fix_admin_role.py (if Django setup is configured)
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

# Update admin user role
try:
    admin_user = User.objects.get(username='admin')
    admin_user.role = 'ADMIN'
    admin_user.save()
    print("SUCCESS: Updated admin user role to ADMIN")
    print(f"   Username: {admin_user.username}")
    print(f"   Role: {admin_user.role}")
    print(f"   Email: {admin_user.email}")
except User.DoesNotExist:
    print("ERROR: Admin user not found")
except Exception as e:
    print(f"ERROR: {e}")

