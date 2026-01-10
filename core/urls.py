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
]
