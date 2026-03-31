"""
Management command para adicionar Alex Silva Demo (dados de demonstração)
e 10 egressos extras ao banco de dados.

Uso:
    python manage.py seed_erick_e_egressos
    python manage.py seed_erick_e_egressos --senha MinhaSenh@123
"""

import random
from datetime import date

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Aluno, Disciplina, Matricula

# Senha padrão para o superusuário (pode ser sobrescrita via --senha)
DEFAULT_PASSWORD = 'Utfpr@2024!'

# ── Dados fictícios de demonstração de Alex Silva Demo ────────────────────────
# (codigo: (nota, frequencia, data_conclusao))
ERICK_APROVADAS = {
    'CC1AED1': (8.4, 97, date(2024, 12, 15)),
    'CC1ICC': (7.5, 93, date(2024, 12, 15)),
    'CC1MBD': (8.3, 90, date(2024, 12, 15)),
    'HU1LA': (7.4, 99, date(2024, 12, 15)),
    'MA1FM': (6.7, 95, date(2024, 12, 15)),
    'MA1LM': (6.7, 93, date(2024, 12, 15)),
    'CC2AED2': (6.1, 82, date(2024, 12, 15)),
    'CC2CLD': (9.4, 88, date(2024, 12, 15)),
    'CC2ER': (7.7, 75, date(2024, 12, 15)),
    'CC2POO': (9.3, 92, date(2024, 12, 15)),
    'MA2MA': (6.3, 100, date(2024, 12, 15)),
    'CC3AED3': (9.2, 98, date(2024, 12, 15)),
    'CC3AOC': (6.5, 80, date(2024, 12, 15)),
    'CC3ES': (7.3, 86, date(2025, 7, 15)),
    'CC3PI1': (7.1, 91, date(2024, 12, 15)),
    'MA3AL': (6.2, 85, date(2024, 12, 15)),
    'MA3CA': (6.7, 100, date(2024, 12, 15)),
    'CC4IHC': (7.2, 88, date(2025, 7, 15)),
    'CC4LBD': (7.1, 79, date(2025, 7, 15)),
    'CC4PO': (8.9, 96, date(2025, 7, 15)),
    'CC4RC': (8.5, 81, date(2025, 7, 15)),
    'CC4SO': (7.3, 95, date(2025, 7, 15)),
    'MA4PE': (6.8, 86, date(2025, 7, 15)),
    'CC5AG': (8.0, 95, date(2024, 12, 15)),
    'CC5PI2': (6.5, 85, date(2025, 12, 15)),
    'CC5PLDS': (6.7, 75, date(2025, 12, 15)),
    'CC5QS': (6.7, 81, date(2025, 12, 15)),
    'CC5SDT': (7.5, 98, date(2025, 12, 15)),
    'MA5MN': (8.1, 75, date(2025, 7, 15)),
    'CC6FIA': (8.8, 97, date(2025, 12, 15)),
}

# Disciplinas que Erick está cursando atualmente (2026/1)
ERICK_CURSANDO = [
    'CC6IBDDA', 'CC6LFTC', 'CC6PDSW', 'CC6TRC', 'MA6PO',
    'OPETDS',   # optativa [413]
    'OPHMP',    # optativa [412]
]

# ── Dados dos 10 novos egressos ───────────────────────────────────────────────
NOVOS_EGRESSOS = [
    {
        'registro': '20191234501',
        'nome': 'Ana Paula Ribeiro Santos',
        'email': 'ana.ribeiro.santos@alunos.utfpr.edu.br',
        'data_nascimento': date(1999, 3, 12),
        'data_ingresso': date(2019, 2, 15),
        'previsao_formatura': date(2023, 12, 15),
        'coeficiente': 8.42,
        'cargo': 'Desenvolvedora Backend',
        'empresa': 'Nubank',
        'trabalha_remoto': True,
        'disponibilidade': 'alta',
        'areas_mentoria': 'Python, APIs REST, Microsserviços, Carreira em TI',
        'opt412': ['OPHE', 'OPHIT1'],          # 30h + 30h = 60h → não basta, adiciona mais
        'opt413': ['OPETDS', 'OPEAP'],
    },
    {
        'registro': '20181234502',
        'nome': 'Bruno Henrique Costa Lima',
        'email': 'bruno.henrique.lima@alunos.utfpr.edu.br',
        'data_nascimento': date(1998, 7, 25),
        'data_ingresso': date(2018, 2, 10),
        'previsao_formatura': date(2022, 12, 15),
        'coeficiente': 7.85,
        'cargo': 'Especialista em DevOps',
        'empresa': 'Amazon',
        'trabalha_remoto': True,
        'disponibilidade': 'media',
        'areas_mentoria': 'DevOps, AWS, Docker, Kubernetes, CI/CD',
        'opt412': ['OPHLG', 'OPHE'],
        'opt413': ['OPECD', 'OPEGP'],
    },
    {
        'registro': '20201234503',
        'nome': 'Carolina Beatriz Moraes Ferreira',
        'email': 'carolina.beatriz.ferreira@alunos.utfpr.edu.br',
        'data_nascimento': date(2000, 11, 5),
        'data_ingresso': date(2020, 2, 12),
        'previsao_formatura': date(2024, 12, 15),
        'coeficiente': 9.12,
        'cargo': 'Analista de Dados',
        'empresa': 'Itaú Unibanco',
        'trabalha_remoto': False,
        'disponibilidade': 'baixa',
        'areas_mentoria': 'Análise de Dados, SQL, Power BI, Python',
        'opt412': ['OPHIT1', 'OPHMP'],
        'opt413': ['OPETCD', 'OPEGP'],
    },
    {
        'registro': '20191234504',
        'nome': 'Diego Fernando Alves Pereira',
        'email': 'diego.fernando.pereira@alunos.utfpr.edu.br',
        'data_nascimento': date(1999, 8, 19),
        'data_ingresso': date(2019, 2, 18),
        'previsao_formatura': date(2023, 12, 15),
        'coeficiente': 7.34,
        'cargo': 'Desenvolvedor(a) Fullstack',
        'empresa': 'TOTVS',
        'trabalha_remoto': False,
        'disponibilidade': 'media',
        'areas_mentoria': 'React, Node.js, APIs REST, Banco de Dados',
        'opt412': ['OPHE', 'OPHFE'],
        'opt413': ['OPETDS', 'OPELSO'],
    },
    {
        'registro': '20201234505',
        'nome': 'Fernanda Letícia Souza Gomes',
        'email': 'fernanda.leticia.gomes@alunos.utfpr.edu.br',
        'data_nascimento': date(2000, 4, 30),
        'data_ingresso': date(2020, 2, 14),
        'previsao_formatura': date(2024, 12, 15),
        'coeficiente': 8.91,
        'cargo': 'Desenvolvedora Frontend',
        'empresa': 'Magazine Luiza',
        'trabalha_remoto': True,
        'disponibilidade': 'alta',
        'areas_mentoria': 'Vue.js, React, UX/UI, Acessibilidade',
        'opt412': ['OPHIT2', 'OPHLG'],
        'opt413': ['OPELPOO', 'OPELEAC'],
    },
    {
        'registro': '20171234506',
        'nome': 'Gabriel Augusto Martins Rodrigues',
        'email': 'gabriel.augusto.rodrigues@alunos.utfpr.edu.br',
        'data_nascimento': date(1997, 2, 14),
        'data_ingresso': date(2017, 2, 11),
        'previsao_formatura': date(2021, 12, 15),
        'coeficiente': 8.05,
        'cargo': 'Arquiteto(a) de Sistemas',
        'empresa': 'IBM Brasil',
        'trabalha_remoto': False,
        'disponibilidade': 'baixa',
        'areas_mentoria': 'Arquitetura de Software, Microsserviços, Java, Design Patterns',
        'opt412': ['OPHGIT', 'OPHE'],
        'opt413': ['OPEGP', 'OPEPPD'],
    },
    {
        'registro': '20181234507',
        'nome': 'Isabela Carla Fernandes Nunes',
        'email': 'isabela.carla.nunes@alunos.utfpr.edu.br',
        'data_nascimento': date(1998, 9, 3),
        'data_ingresso': date(2018, 2, 13),
        'previsao_formatura': date(2022, 12, 15),
        'coeficiente': 8.76,
        'cargo': 'Tech Lead',
        'empresa': 'Mercado Livre',
        'trabalha_remoto': True,
        'disponibilidade': 'media',
        'areas_mentoria': 'Liderança Técnica, Python, AWS, Code Review',
        'opt412': ['OPHL', 'OPHLG'],
        'opt413': ['OPETDS', 'OPETCD'],
    },
    {
        'registro': '20191234508',
        'nome': 'João Marcos Carvalho Dias',
        'email': 'joao.marcos.dias@alunos.utfpr.edu.br',
        'data_nascimento': date(1999, 12, 22),
        'data_ingresso': date(2019, 2, 16),
        'previsao_formatura': date(2023, 12, 15),
        'coeficiente': 9.28,
        'cargo': 'Cientista de Dados',
        'empresa': 'Embraer',
        'trabalha_remoto': False,
        'disponibilidade': 'alta',
        'areas_mentoria': 'Machine Learning, Python, Deep Learning, MLOps',
        'opt412': ['OPHFE', 'OPHIT1'],
        'opt413': ['OPEAP', 'OPETCD'],
    },
    {
        'registro': '20201234509',
        'nome': 'Letícia Vanessa Santos Barbosa',
        'email': 'leticia.vanessa.barbosa@alunos.utfpr.edu.br',
        'data_nascimento': date(2000, 6, 17),
        'data_ingresso': date(2020, 2, 11),
        'previsao_formatura': date(2024, 12, 15),
        'coeficiente': 8.53,
        'cargo': 'Product Manager',
        'empresa': 'iFood',
        'trabalha_remoto': True,
        'disponibilidade': 'media',
        'areas_mentoria': 'Gestão de Produto, Agile, Scrum, Startups, Estratégia',
        'opt412': ['OPHGIT', 'OPHMP'],
        'opt413': ['OPEGP', 'OPECDMS'],
    },
    {
        'registro': '20171234510',
        'nome': 'Marcos Antonio Gomes da Silva',
        'email': 'marcos.antonio.silva@alunos.utfpr.edu.br',
        'data_nascimento': date(1997, 5, 8),
        'data_ingresso': date(2017, 2, 17),
        'previsao_formatura': date(2021, 12, 15),
        'coeficiente': 7.61,
        'cargo': 'Desenvolvedor(a) Backend',
        'empresa': 'Siemens',
        'trabalha_remoto': False,
        'disponibilidade': 'baixa',
        'areas_mentoria': 'Java, Spring Boot, Microsserviços, Boas práticas',
        'opt412': ['OPHE', 'OPHIT2'],
        'opt413': ['OPETDS', 'OPERP'],
    },
]

REQUIRED_OPT_H = 75


def _get_disc(codigo):
    """Retorna a Disciplina ou None se não existir."""
    try:
        return Disciplina.objects.get(codigo=codigo)
    except Disciplina.DoesNotExist:
        return None


def _criar_matriculas_erick(aluno, rng):
    """Cria as matrículas do Erick conforme histórico real."""
    created = 0
    # Disciplinas aprovadas
    for codigo, (nota, freq, dt) in ERICK_APROVADAS.items():
        disc = _get_disc(codigo)
        if disc is None:
            continue
        _, c = Matricula.objects.get_or_create(
            aluno=aluno,
            disciplina=disc,
            defaults={
                'status': 'aprovada',
                'nota': nota,
                'frequencia': freq,
                'data_conclusao': dt,
            }
        )
        if c:
            created += 1

    # Disciplinas cursando
    for codigo in ERICK_CURSANDO:
        disc = _get_disc(codigo)
        if disc is None:
            continue
        _, c = Matricula.objects.get_or_create(
            aluno=aluno,
            disciplina=disc,
            defaults={
                'status': 'cursando',
                'nota': None,
                'frequencia': rng.randint(75, 100),
                'data_conclusao': None,
            }
        )
        if c:
            created += 1

    return created


def _criar_matriculas_egresso(aluno, opt412_codigos, opt413_codigos, rng, cy):
    """Cria matrículas completas para um egresso (todas aprovadas)."""
    mandatory_discs = Disciplina.objects.filter(tipo='obrigatoria')
    created = 0

    for disc in mandatory_discs:
        nota = round(rng.uniform(5.0, 10.0), 1)
        freq = rng.randint(75, 100)
        years_in = (disc.periodo - 1) // 2
        year = cy + years_in
        month = 7 if disc.periodo % 2 == 1 else 12
        dt = date(year, month, rng.randint(5, 20))
        _, c = Matricula.objects.get_or_create(
            aluno=aluno,
            disciplina=disc,
            defaults={
                'status': 'aprovada',
                'nota': nota,
                'frequencia': freq,
                'data_conclusao': dt,
            }
        )
        if c:
            created += 1

    # Optativas [412] e [413]
    completed_opt_h = 0
    for codigo in (opt412_codigos + opt413_codigos):
        if completed_opt_h >= REQUIRED_OPT_H:
            break
        disc = _get_disc(codigo)
        if disc is None:
            continue
        nota = round(rng.uniform(5.5, 10.0), 1)
        freq = rng.randint(75, 100)
        dt = date(cy + 3, 12, rng.randint(5, 20))
        _, c = Matricula.objects.get_or_create(
            aluno=aluno,
            disciplina=disc,
            defaults={
                'status': 'aprovada',
                'nota': nota,
                'frequencia': freq,
                'data_conclusao': dt,
            }
        )
        if c:
            created += 1
            completed_opt_h += disc.carga_horaria

    return created


class Command(BaseCommand):
    help = 'Adiciona Alex Silva Demo (dados de demonstração) e 10 egressos ao banco de dados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--senha',
            type=str,
            default=DEFAULT_PASSWORD,
            help=f'Senha do superusuário Django (default: {DEFAULT_PASSWORD})',
        )

    def handle(self, *args, **options):
        senha = options['senha']
        rng = random.Random(999)

        mandatory_discs = list(Disciplina.objects.filter(tipo='obrigatoria'))
        total_mandatory_h = sum(d.carga_horaria for d in mandatory_discs)
        total_course_h = total_mandatory_h + REQUIRED_OPT_H

        # ── 1. Alex Silva Demo ─────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Alex Silva Demo ==='))

        erick_completed_h = sum(
            d.carga_horaria
            for codigo in ERICK_APROVADAS
            if (d := _get_disc(codigo)) is not None
        )
        erick_cursando_h = sum(
            d.carga_horaria
            for codigo in ERICK_CURSANDO
            if (d := _get_disc(codigo)) is not None
        )

        erick, created = Aluno.objects.get_or_create(
            registro='2587246',
            defaults={
                'nome': 'Alex Silva Demo',
                'email': 'alex.demo@alunos.utfpr.edu.br',
                'data_nascimento': date(2005, 5, 3),
                'data_ingresso': date(2024, 8, 1),
                'previsao_formatura': date(2028, 12, 15),
                'periodo_atual': 6,
                'status': 'ativo',
                'ano_curriculo': 2024,
                'carga_horaria_total': total_course_h,
                'carga_horaria_cumprida': erick_completed_h,
                'carga_horaria_pendente': max(0, total_course_h - erick_completed_h),
                'carga_horaria_semestre': erick_cursando_h,
                'coeficiente': 0.7925,
                'campus': 'Santa Helena',
                'curso': 'Ciência da Computação',
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('  Aluno criado com sucesso.'))
        else:
            self.stdout.write(self.style.WARNING('  Aluno já existia — nenhuma alteração feita.'))

        n_mat = _criar_matriculas_erick(erick, rng)
        self.stdout.write(f'  {n_mat} matrículas adicionadas.')

        # ── 2. Superusuário Django ────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Superusuário Django ==='))

        if User.objects.filter(username='erick.bonruque').exists():
            self.stdout.write(self.style.WARNING(
                '  Usuário "erick.bonruque" já existe — senha não alterada.'
            ))
        else:
            User.objects.create_superuser(
                username='erick.bonruque',
                email='alex.demo@alunos.utfpr.edu.br',
                password=senha,
            )
            self.stdout.write(self.style.SUCCESS(
                f'  Superusuário criado.\n'
                f'  Username : erick.bonruque\n'
                f'  Senha    : {senha}\n'
                f'  Acesse   : /admin/'
            ))

        # ── 3. 10 novos egressos ──────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Novos Egressos ==='))

        for dados in NOVOS_EGRESSOS:
            opt412 = dados.pop('opt412')
            opt413 = dados.pop('opt413')
            cy = dados['data_ingresso'].year
            nome = dados['nome']

            try:
                with transaction.atomic():
                    egresso, eg_created = Aluno.objects.get_or_create(
                        registro=dados['registro'],
                        defaults={
                            **{k: v for k, v in dados.items() if k != 'registro'},
                            'periodo_atual': 8,
                            'status': 'formado',
                            'ano_curriculo': cy,
                            'campus': 'Santa Helena',
                            'curso': 'Ciência da Computação',
                            'carga_horaria_total': total_course_h,
                            'carga_horaria_cumprida': total_mandatory_h + REQUIRED_OPT_H,
                            'carga_horaria_pendente': 0,
                            'carga_horaria_semestre': 0,
                        }
                    )

                    if eg_created:
                        n_mat = _criar_matriculas_egresso(egresso, opt412, opt413, rng, cy)
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ {nome} — {n_mat} matrículas')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  ~ {nome} já existia — ignorado')
                        )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {nome} — erro: {e}')
                )

        self.stdout.write(self.style.SUCCESS('\nConcluído!'))
