"""Custom DRF permission classes."""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrCoordinatorCreateOnly(BasePermission):
    """
    Admins (and superusers) have full access.
    Coordinators can read + create, but cannot update or delete.
    All other authenticated users get read-only access.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.is_superuser or getattr(user, "role", None) == "ADMIN":
            return True

        if getattr(user, "role", None) == "COORDINATOR":
            # Coordinator: read + create only (no update/delete).
            if request.method in SAFE_METHODS:
                return True
            if request.method == "POST":
                return True
            return False

        # Everyone else: read-only.
        return request.method in SAFE_METHODS
