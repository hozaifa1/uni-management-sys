"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def api_root(request):
    """API root endpoint - health check"""
    return JsonResponse({
        'status': 'ok',
        'message': 'University Management System API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api': {
                'accounts': '/api/accounts/',
                'students': '/api/students/',
                'academics': '/api/academics/',
                'payments': '/api/payments/',
            }
        }
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    # API endpoints will be added here as you develop them
    # path('api/accounts/', include('accounts.urls')),
    # path('api/students/', include('students.urls')),
    # path('api/academics/', include('academics.urls')),
    # path('api/payments/', include('payments.urls')),
]
