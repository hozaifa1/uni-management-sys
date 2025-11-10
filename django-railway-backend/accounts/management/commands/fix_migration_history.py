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
            
            self.stdout.write("🔍 Checking migration and database state...")
            
            # Case 1: Inconsistent state - admin before accounts OR corrupted tables
            if has_admin and not has_accounts:
                self.stdout.write(
                    self.style.WARNING(
                        '⚠️  Inconsistent migration history detected!'
                    )
                )
                self.stdout.write('🔧 Dropping all tables and starting fresh...')
                
                # Drop all tables including django_migrations
                with connection.cursor() as cursor:
                    # Get all table names
                    cursor.execute("""
                        SELECT tablename FROM pg_tables 
                        WHERE schemaname = 'public'
                    """)
                    tables = cursor.fetchall()
                    
                    # Drop each table
                    for table in tables:
                        table_name = table[0]
                        self.stdout.write(f'  Dropping table: {table_name}')
                        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                
                self.stdout.write(
                    self.style.SUCCESS(
                        '✅ Database reset complete! Ready for fresh migrations'
                    )
                )
                return
            
            # Case 2: Check if tables exist but migrations don't (corrupted state)
            elif not has_accounts and not has_admin:
                with connection.cursor() as cursor:
                    # Check if django_content_type table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM pg_tables 
                            WHERE schemaname = 'public' 
                            AND tablename = 'django_content_type'
                        )
                    """)
                    table_exists = cursor.fetchone()[0]
                    
                    if table_exists:
                        self.stdout.write(
                            self.style.WARNING(
                                '⚠️  Corrupted database state detected (tables exist but no migration records)!'
                            )
                        )
                        self.stdout.write('🔧 Dropping all tables and starting fresh...')
                        
                        # Get all table names
                        cursor.execute("""
                            SELECT tablename FROM pg_tables 
                            WHERE schemaname = 'public'
                        """)
                        tables = cursor.fetchall()
                        
                        # Drop each table
                        for table in tables:
                            table_name = table[0]
                            self.stdout.write(f'  Dropping table: {table_name}')
                            cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                '✅ Database reset complete! Ready for fresh migrations'
                            )
                        )
                        return
                    else:
                        self.stdout.write(
                            self.style.SUCCESS('✅ Fresh database - ready for migrations!')
                        )
                        return
            
            # Case 3: Already consistent
            else:
                self.stdout.write(
                    self.style.SUCCESS('✅ Migration history is consistent!')
                )
                return
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error checking migrations: {e}')
            )
            # Don't fail the deployment - let migrate handle it
            return

