"""
Management command para configurar base fixa na Vercel (versão simplificada).

Uso:
    python manage.py base_fixa_vercel_simples
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from core.models import Aluno, Disciplina, Matricula


class Command(BaseCommand):
    help = 'Configura base fixa para produção na Vercel (sem dependência de JSON)'

    def handle(self, *args, **options):
        self.stdout.write('Configurando base fixa para Vercel (versão simplificada)...')
        
        # Verificar se já existe dados
        total_alunos = Aluno.objects.count()
        if total_alunos > 0:
            self.stdout.write(self.style.WARNING(f'Banco já contém {total_alunos} alunos'))
            self.stdout.write('Limpando dados existentes...')
            
            # Limpar models na ordem correta
            Matricula.objects.all().delete()
            Aluno.objects.all().delete()
            Disciplina.objects.all().delete()
        
        # Gerar base fixa com parâmetros conhecidos
        self.stdout.write('Gerando base fixa com parâmetros padrão...')
        call_command('popular_banco', '--base-fixa')
        
        # Adicionar Erick manualmente
        self.stdout.write('Adicionando Alex Silva Demo...')
        call_command('adicionar_erick')
        
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
        
        # Verificar se Erick está na base
        erick = Aluno.objects.filter(nome__icontains='Erick').first()
        if erick:
            self.stdout.write(self.style.SUCCESS(f'✅ Alex Silva Demo encontrado (ID: {erick.pk})'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Erick não encontrado na base'))
