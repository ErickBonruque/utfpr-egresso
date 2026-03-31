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
    path('perfil/', views.perfil, name='perfil'),

    # API endpoints
    path('api/vagas/', views.api_buscar_vagas, name='api_buscar_vagas'),
    path('api/egressos/', views.api_egressos, name='api_egressos'),
    path('api/alunos-ativos/', views.api_alunos_ativos, name='api_alunos_ativos'),
    path('api/trocar-aluno/', views.api_trocar_aluno, name='api_trocar_aluno'),
    path('api/alunos/', views.api_alunos, name='api_alunos'),
    path('api/alunos/<int:aluno_id>/', views.api_aluno_detalhe, name='api_aluno_detalhe'),

    # Admin dashboard
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin-dashboard/unlock/', views.admin_unlock, name='admin_unlock'),
]
