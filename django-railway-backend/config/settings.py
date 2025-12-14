"""
Django settings for config project.
Production-ready configuration with environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Try to import dj_database_url, fallback if not available
try:
    import dj_database_url
    HAS_DJ_DATABASE_URL = True
except ImportError:
    HAS_DJ_DATABASE_URL = False

# Try to import cloudinary packages
try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
    HAS_CLOUDINARY = True
except ImportError:
    HAS_CLOUDINARY = False

# Load environment variables from .env file
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-q!hm2a(m$w83l&ya0f+1!79!3ss5j397g2*&qfp8wyx6r_6hch')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Parse ALLOWED_HOSTS from environment variable (comma-separated)
ALLOWED_HOSTS_ENV = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1')
if ALLOWED_HOSTS_ENV:
    ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_ENV.split(',')]
else:
    ALLOWED_HOSTS = []

# Add Railway domain if RAILWAY_PUBLIC_DOMAIN is set
RAILWAY_PUBLIC_DOMAIN = os.getenv('RAILWAY_PUBLIC_DOMAIN')
if RAILWAY_PUBLIC_DOMAIN:
    ALLOWED_HOSTS.append(RAILWAY_PUBLIC_DOMAIN)

# Add Vercel domain if VERCEL_URL is set
VERCEL_URL = os.getenv('VERCEL_URL')
if VERCEL_URL:
    ALLOWED_HOSTS.append(VERCEL_URL)

# In production, also allow Railway's and Vercel's domains
if not DEBUG:
    ALLOWED_HOSTS.extend([
        '.railway.app',
        '.up.railway.app',
        '.vercel.app',
    ])
    
# Allow all hosts if explicitly set (for debugging only)
if os.getenv('DISABLE_ALLOWED_HOSTS_CHECK', 'False') == 'True':
    ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'cloudinary',
    'cloudinary_storage',
    
    # Local apps
    'accounts',
    'students',
    'payments',
    'academics',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise for static files
    'corsheaders.middleware.CorsMiddleware',  # CORS middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

# Use DATABASE_URL from environment, fallback to SQLite for development
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL and HAS_DJ_DATABASE_URL:
    # Parse database URL if dj_database_url is available
    # Use conn_max_age=0 for serverless (Vercel) to close connections immediately
    # This prevents connection pooling issues with Neon/serverless PostgreSQL
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=0,  # Critical for serverless: close connections after each request
            conn_health_checks=True,
        )
    }
else:
    # Fallback to SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'config.exception_handler.custom_exception_handler',
}

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}


# CORS Configuration
# Parse CORS_ALLOWED_ORIGINS from environment variable (comma-separated)
CORS_ORIGINS_ENV = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
if CORS_ORIGINS_ENV:
    origins = []
    for origin in CORS_ORIGINS_ENV.split(','):
        origin = origin.strip()
        # Add https:// scheme if missing and not localhost
        if origin and not origin.startswith(('http://', 'https://')):
            if 'localhost' in origin or '127.0.0.1' in origin:
                origin = f'http://{origin}'
            else:
                origin = f'https://{origin}'
        origins.append(origin)
    CORS_ALLOWED_ORIGINS = origins
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# Allow all origins in development (if explicitly set)
if os.getenv('CORS_ALLOW_ALL', 'False') == 'True':
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Expose headers in CORS responses
CORS_EXPOSE_HEADERS = [
    'content-type',
    'content-length',
]

# Preflight cache time (24 hours)
CORS_PREFLIGHT_MAX_AGE = 86400


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = '/static/'
# Use staticfiles_build/static for Vercel compatibility
STATIC_ROOT = BASE_DIR / 'staticfiles_build' / 'static'

# Only add static dir if it exists
STATIC_DIR = BASE_DIR / 'static'
if STATIC_DIR.exists():
    STATICFILES_DIRS = [STATIC_DIR]
else:
    STATICFILES_DIRS = []

# WhiteNoise configuration for static files
# Use CompressedStaticFilesStorage instead of CompressedManifestStaticFilesStorage
# to avoid issues when staticfiles.json is missing
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}


# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# Cloudinary Storage Backend Configuration
USE_CLOUDINARY = os.getenv('USE_CLOUDINARY', 'False') == 'True'

if USE_CLOUDINARY and HAS_CLOUDINARY:
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
        secure=True
    )
    
    # Cloudinary storage settings for django-cloudinary-storage
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
        'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
    }
    
    # Use Cloudinary for media files (user uploads)
    STORAGES["default"]["BACKEND"] = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    
    # Optionally use Cloudinary for static files too (uncomment if needed)
    # STORAGES["staticfiles"]["BACKEND"] = 'cloudinary_storage.storage.StaticHashedCloudinaryStorage'

# Legacy Google Drive Storage Backend Configuration (deprecated, use Cloudinary instead)
USE_GOOGLE_DRIVE = os.getenv('USE_GOOGLE_DRIVE', 'False') == 'True'

if USE_GOOGLE_DRIVE and not USE_CLOUDINARY:
    # Use custom Google Drive Storage backend
    STORAGES["default"]["BACKEND"] = 'config.storage_backends.GoogleDriveStorage'
    
    # Google Drive Configuration
    # GOOGLE_DRIVE_CREDENTIALS_JSON: Service account JSON credentials (as string or file path)
    # GDRIVE_FOLDER_ID: Google Drive folder ID where files will be stored
# else: Use local file system storage (already set in STORAGES above)


# Security Settings for Production
if not DEBUG:
    # Railway uses a reverse proxy, so we need to trust the proxy headers
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # Disable SECURE_SSL_REDIRECT for Railway (proxy handles SSL)
    SECURE_SSL_REDIRECT = False
    
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # HSTS settings - be careful with these on Railway
    # SECURE_HSTS_SECONDS = 31536000
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # SECURE_HSTS_PRELOAD = True


# Custom User Model
AUTH_USER_MODEL = 'accounts.User'


# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Add file logging only in development (if logs directory exists)
if DEBUG:
    LOGS_DIR = BASE_DIR / 'logs'
    if not LOGS_DIR.exists():
        try:
            LOGS_DIR.mkdir(parents=True, exist_ok=True)
        except (OSError, PermissionError):
            pass  # Skip file logging if directory can't be created
    
    if LOGS_DIR.exists():
        LOGGING['handlers']['file'] = {
            'class': 'logging.FileHandler',
            'filename': LOGS_DIR / 'django.log',
            'formatter': 'verbose',
        }
        LOGGING['loggers']['django']['handlers'].append('file')
