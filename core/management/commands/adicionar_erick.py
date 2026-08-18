from django.core.management.base import BaseCommand
from core.models import Aluno, Disciplina, Matricula
from core.synthetic.curriculum import get_curriculum
import random

class Command(BaseCommand):
    help = 'Adiciona Alex Silva Demo ao banco de dados'

    def handle(self, *args, **options):
        # Verificar se já existe
        if Aluno.objects.filter(registro='2023012345').exists():
            self.stdout.write('Aluno de demonstração já existe no banco de dados')
            return

        # Criar Erick
        erick = Aluno.objects.create(
            registro='2023012345',
            nome='Alex Silva Demo',
            email='alex.demo@alunos.utfpr.edu.br',
            periodo_atual=6,
            status='ativo',
            ano_curriculo=2023,
            coeficiente=random.uniform(7.0, 9.0),
            carga_horaria_cumprida=1200,
            carga_horaria_total=3600,
            campus='Santa Helena',
            curso='Ciência da Computação',
            is_admin=True,
            trabalha_remoto=False,
            disponibilidade='media',
            areas_mentoria='Programação,Desenvolvimento Web',
            empresa='',
            cargo='',
            linkedin='',
            github='',
        )

        # Adicionar algumas disciplinas concluídas
        disciplinas = Disciplina.objects.all()[:15]
        for disc in disciplinas:
            Matricula.objects.create(
                aluno=erick,
                disciplina=disc,
                status='aprovada' if random.random() > 0.2 else 'cursando',
                nota=random.uniform(6.0, 10.0) if random.random() > 0.2 else None,
                frequencia=random.uniform(75, 100),
                data_conclusao=None
            )

        self.stdout.write(
            self.style.SUCCESS(f'Alex Silva Demo adicionado com ID: {erick.pk}')
        )
