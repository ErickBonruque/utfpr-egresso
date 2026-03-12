from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login, name='login'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('egressos/', views.egressos, name='egressos'),
    path('vagas/', views.vagas, name='vagas'),
    path('conquistas/', views.conquistas, name='conquistas'),
    path('arvore/', views.arvore, name='arvore'),

    # API endpoints
    path('api/vagas/', views.api_buscar_vagas, name='api_buscar_vagas'),

    # Synthetic data API
    path('api/synthetic/dashboard/', views.api_synthetic_dashboard, name='api_synthetic_dashboard'),
    path('api/synthetic/students/', views.api_synthetic_students, name='api_synthetic_students'),
    path('api/synthetic/students/<str:student_id>/', views.api_synthetic_student_detail, name='api_synthetic_student_detail'),
    path('api/synthetic/curriculum/', views.api_synthetic_curriculum, name='api_synthetic_curriculum'),
]
