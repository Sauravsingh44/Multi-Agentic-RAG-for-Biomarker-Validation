from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Primary API namespace used by the frontend.
    path('api/pipeline/', include('pipeline.urls')),
    # Backward-compatible alias for existing clients.
    path('api/', include('pipeline.urls')),
]