"""
Production standalone script — provisions the IGMIS_registrar account
and removes legacy demo accounts (admin / test / demo).

Usage:
    IGMIS_REGISTRAR_PASSWORD='your-strong-password' python create_admin_production.py
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from accounts.models import User

REGISTRAR_USERNAME = 'IGMIS_registrar'
REGISTRAR_PASSWORD = os.environ.get('IGMIS_REGISTRAR_PASSWORD')
REGISTRAR_EMAIL = 'registrar@igmis.edu'

if not REGISTRAR_PASSWORD:
    raise SystemExit(
        "IGMIS_REGISTRAR_PASSWORD env var is required. "
        "Set it before running this script (no default is provided for security)."
    )


def main():
    from django.db import connection
    print(f"Connected to database: {connection.settings_dict.get('NAME', 'unknown')}")

    legacy_qs = User.objects.filter(username__in=['admin', 'test', 'demo'])
    legacy_count = legacy_qs.count()
    if legacy_count:
        legacy_qs.delete()
        print(f"Removed {legacy_count} legacy account(s).")

    try:
        if User.objects.filter(username=REGISTRAR_USERNAME).exists():
            user = User.objects.get(username=REGISTRAR_USERNAME)
            user.set_password(REGISTRAR_PASSWORD)
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.role = 'ADMIN'
            user.email = REGISTRAR_EMAIL
            user.save()
            print(f"Reset password for '{REGISTRAR_USERNAME}'.")
        else:
            User.objects.create_user(
                username=REGISTRAR_USERNAME,
                email=REGISTRAR_EMAIL,
                password=REGISTRAR_PASSWORD,
                first_name='IGMIS',
                last_name='Registrar',
                role='ADMIN',
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            print(f"Created '{REGISTRAR_USERNAME}'.")
    except Exception as e:
        print(f"Error provisioning registrar: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
