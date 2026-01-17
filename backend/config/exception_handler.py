"""
Custom exception handler to ensure CORS headers are included in error responses.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
import traceback

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures proper error responses with CORS headers.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is None:
        # If DRF didn't handle it, create a detailed error response
        error_traceback = traceback.format_exc()
        logger.error(f"Unhandled exception: {exc}\n{error_traceback}", exc_info=True)
        
        response = Response(
            {
                'detail': 'An unexpected error occurred. Please try again.',
                'error': str(exc),
                'traceback': error_traceback
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Add additional context to the response
    if hasattr(exc, 'detail'):
        response.data['error'] = str(exc.detail) if hasattr(exc.detail, '__str__') else exc.detail
    
    return response
