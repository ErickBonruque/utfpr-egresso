"""
Management command para configurar base fixa na Vercel.

Uso:
    python manage.py base_fixa_vercel
"""
import json
import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from core.models import Aluno, Disciplina, Matricula


class Command(BaseCommand):
    help = 'Configura base fixa para produção na Vercel'

    def handle(self, *args, **options):
        self.stdout.write('Configurando base fixa para Vercel...')
        
        # Limpar dados existentes
        self.stdout.write('Limpando dados existentes...')
        call_command('flush', verbosity=0, interactive=False)
        
        # Carregar dados fixos
        dados_file = os.path.join(os.path.dirname(__file__), '../../../dados_fixos.json')
        if os.path.exists(dados_file):
            self.stdout.write('Carregando dados fixos...')
            call_command('loaddata', dados_file)
            self.stdout.write(self.style.SUCCESS('Dados carregados com sucesso!'))
        else:
            self.stdout.write(self.style.WARNING('Arquivo dados_fixos.json não encontrado'))
            self.stdout.write('Gerando base fixa com parâmetros padrão...')
            call_command('popular_banco', '--base-fixa')
        
        # Estatísticas finais
        total_alunos = Aluno.objects.count()
        ativos = Aluno.objects.filter(status='ativo').count()
        formados = Aluno.objects.filter(status='formado').count()
        disciplinas = Disciplina.objects.count()
        matriculas = Matricula.objects.count()
        
        self.stdout.write(self.style.SUCCESS('\n=== Base configurada com sucesso ==='))
        self.stdout.write(f'Alunos totais: {total_alunos}')
        self.stdout.write(f'Alunos ativos: {ativos}')
        self.stdout.write(f'Alunos formados: {formados}')
        self.stdout.write(f'Disciplinas: {disciplinas}')
        self.stdout.write(f'Matrículas: {matriculas}')
        
        # Verificar se a conta de demonstração está na base
        demo = Aluno.objects.filter(registro='2587246').first()
        if demo:
            self.stdout.write(self.style.SUCCESS(f'Conta de demonstração encontrada (ID: {demo.pk})'))
        else:
            self.stdout.write(self.style.WARNING('Conta de demonstração não encontrada na base'))
