"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

@csrf_exempt
def api_root(request):
    """API root endpoint - health check"""
    return JsonResponse({
        'status': 'ok',
        'message': 'IGMIS LMS - University Management System API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api': {
                'accounts': '/api/accounts/',
                'students': '/api/students/',
                'academics': '/api/academics/',
                'payments': '/api/payments/',
            },
            'auth': {
                'token': '/api/token/',
                'token_refresh': '/api/token/refresh/',
                'token_verify': '/api/token/verify/',
                'login': '/api/accounts/auth/login/',
                'logout': '/api/accounts/auth/logout/',
            }
        }
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    
    # JWT Token endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # API endpoints
    path('api/accounts/', include('accounts.urls')),
    path('api/students/', include('students.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/payments/', include('payments.urls')),
    
    # DRF browsable API login/logout
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
