from django.shortcuts import render
from django.http import HttpResponse

def login(request):
    """View para a página de login"""
    return render(request, 'login.html')

def dashboard(request):
    """View para o dashboard principal"""
    return render(request, 'dashboard.html')

def egressos(request):
    """View para a página de egressos"""
    return render(request, 'egressos.html')

def vagas(request):
    """View para a página de vagas"""
    return render(request, 'vagas.html')

def conquistas(request):
    """View para a página de conquistas"""
    return render(request, 'conquistas.html')

def arvore(request):
    """View para a página da árvore de carreiras"""
    return render(request, 'arvore.html')

def home(request):
    """View para a página inicial (redireciona para login)"""
    return render(request, 'login.html')
