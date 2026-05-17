"""
Script to create / reset the registrar (admin) user.
Removes any legacy 'admin' account and provisions the IGMIS_registrar account.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
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


def create_admin_user():
    legacy_qs = User.objects.filter(username__in=['admin', 'test', 'demo'])
    legacy_count = legacy_qs.count()
    if legacy_count:
        legacy_qs.delete()
        print(f"Removed {legacy_count} legacy account(s).")

    if User.objects.filter(username=REGISTRAR_USERNAME).exists():
        user = User.objects.get(username=REGISTRAR_USERNAME)
        user.set_password(REGISTRAR_PASSWORD)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.role = 'ADMIN'
        user.email = REGISTRAR_EMAIL
        user.save()
        print(f"Reset password for existing user '{REGISTRAR_USERNAME}'.")
        return

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
    print(f"Created user '{REGISTRAR_USERNAME}'.")


if __name__ == '__main__':
    create_admin_user()
