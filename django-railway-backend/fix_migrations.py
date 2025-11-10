#!/usr/bin/env python
"""
Script to fix inconsistent migration history in Railway deployment.
This script should be run ONCE to reset the migration state.

Usage: python fix_migrations.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def fix_migration_history():
    """
    Fix the inconsistent migration history by:
    1. Removing admin migration records that were applied before accounts
    2. Re-applying them in the correct order
    """
    print("🔍 Checking migration history...")
    
    recorder = MigrationRecorder(connection)
    applied_migrations = recorder.applied_migrations()
    
    print(f"📊 Found {len(applied_migrations)} applied migrations")
    
    # Check if accounts.0001_initial is missing
    accounts_initial = ('accounts', '0001_initial')
    admin_initial = ('admin', '0001_initial')
    
    has_accounts = accounts_initial in applied_migrations
    has_admin = admin_initial in applied_migrations
    
    print(f"✓ accounts.0001_initial: {'Applied' if has_accounts else 'NOT Applied'}")
    print(f"✓ admin.0001_initial: {'Applied' if has_admin else 'NOT Applied'}")
    
    if has_admin and not has_accounts:
        print("\n⚠️  Inconsistent state detected!")
        print("🔧 Fixing: Removing problematic migration records...")
        
        # Remove all migration records (but keep the actual database tables)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM django_migrations")
        
        print("✅ Migration history cleared!")
        print("\n📝 Next steps:")
        print("   1. Run: python manage.py migrate --fake-initial")
        print("   2. This will mark all existing migrations as applied")
        
        return True
    elif has_accounts and has_admin:
        print("\n✅ Migration history looks consistent!")
        return False
    else:
        print("\n⚠️  Unusual state - running migrate should fix this")
        return False

if __name__ == '__main__':
    try:
        fixed = fix_migration_history()
        if fixed:
            print("\n🎯 Run migrations now with: python manage.py migrate --fake-initial")
            sys.exit(0)
        else:
            print("\n✅ No fixes needed. You can run: python manage.py migrate")
            sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

