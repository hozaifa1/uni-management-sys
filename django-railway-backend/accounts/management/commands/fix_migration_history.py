"""
Custom management command to fix inconsistent migration history.
This handles the case where admin.0001_initial was applied before accounts.0001_initial.
Automatically fixes the issue when detected (idempotent - safe to run multiple times).
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder
import sys


class Command(BaseCommand):
    help = 'Fix inconsistent migration history automatically (idempotent)'

    def handle(self, *args, **options):
        try:
            recorder = MigrationRecorder(connection)
            applied_migrations = recorder.applied_migrations()
            
            accounts_initial = ('accounts', '0001_initial')
            admin_initial = ('admin', '0001_initial')
            
            has_accounts = accounts_initial in applied_migrations
            has_admin = admin_initial in applied_migrations
            
            self.stdout.write("🔍 Checking migration history...")
            
            # Case 1: Inconsistent state - admin before accounts
            if has_admin and not has_accounts:
                self.stdout.write(
                    self.style.WARNING(
                        '⚠️  Inconsistent migration history detected!'
                    )
                )
                self.stdout.write('🔧 Clearing migration history (tables will remain intact)...')
                
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM django_migrations")
                
                self.stdout.write(
                    self.style.SUCCESS(
                        '✅ Migration history cleared! Ready for migrate --fake-initial'
                    )
                )
                return
            
            # Case 2: Already consistent
            elif has_accounts:
                self.stdout.write(
                    self.style.SUCCESS('✅ Migration history is consistent!')
                )
                return
            
            # Case 3: Fresh database (no migrations yet)
            else:
                self.stdout.write(
                    self.style.SUCCESS('✅ Fresh database - ready for migrations!')
                )
                return
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error checking migrations: {e}')
            )
            # Don't fail the deployment - let migrate handle it
            return

