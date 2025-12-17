"""
Quick script to check database connection and admin user status
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from accounts.models import User

print("=" * 60)
print("DATABASE CONNECTION CHECK")
print("=" * 60)

# Check database connection
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    print("✅ Database connection: SUCCESS")
    print(f"   Database: {connection.settings_dict['ENGINE']}")
except Exception as e:
    print(f"❌ Database connection: FAILED")
    print(f"   Error: {e}")
    exit(1)

print("\n" + "=" * 60)
print("USER TABLE CHECK")
print("=" * 60)

# Check if tables exist
try:
    user_count = User.objects.count()
    print(f"✅ User table exists")
    print(f"   Total users: {user_count}")
except Exception as e:
    print(f"❌ User table doesn't exist or error")
    print(f"   Error: {e}")
    print("\n⚠️  Run migrations: python manage.py migrate")
    exit(1)

# Check user roles
try:
    users_with_roles = User.objects.exclude(role='').count()
    print(f"✅ User roles field working")
    print(f"   Users with roles: {users_with_roles}")
    
    # Show role distribution
    from django.db.models import Count
    role_stats = User.objects.values('role').annotate(count=Count('role'))
    if role_stats:
        print("\n   Role Distribution:")
        for stat in role_stats:
            print(f"     - {stat['role']}: {stat['count']} users")
except Exception as e:
    print(f"❌ User roles check error: {e}")

print("\n" + "=" * 60)
print("ADMIN USER CHECK")
print("=" * 60)

# Check admin user
try:
    if User.objects.filter(username='admin').exists():
        admin = User.objects.get(username='admin')
        print("✅ Admin user EXISTS")
        print(f"   Username: {admin.username}")
        print(f"   Email: {admin.email}")
        print(f"   Active: {admin.is_active}")
        print(f"   Staff: {admin.is_staff}")
        print(f"   Superuser: {admin.is_superuser}")
        print(f"   Role: {admin.role}")
        
        # Test password
        print("\n   Testing password...")
        if admin.check_password('admin123'):
            print("   ✅ Password 'admin123' is CORRECT")
        else:
            print("   ❌ Password 'admin123' is WRONG")
            print("   ⚠️  Need to reset password!")
    else:
        print("❌ Admin user DOES NOT EXIST")
        print("\n   Run: python create_admin.py")
except Exception as e:
    print(f"❌ Error checking admin user: {e}")

print("\n" + "=" * 60)
print("ALL USERS")
print("=" * 60)

try:
    users = User.objects.all()
    if users.exists():
        for user in users:
            print(f"  - {user.username} ({user.email}) - Role: {user.role}")
    else:
        print("  No users in database")
except Exception as e:
    print(f"❌ Error listing users: {e}")

print("\n" + "=" * 60)


