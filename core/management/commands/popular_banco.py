"""
Management command para popular o banco de dados com alunos sintéticos.

Uso:
    python manage.py popular_banco
    python manage.py popular_banco --ativos 500 --egressos 20 --seed 42
    python manage.py popular_banco --limpar  # limpa tudo antes de popular
"""

import math
import random
import unicodedata
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Aluno, Disciplina, Matricula
from core.synthetic.curriculum import get_curriculum
from core.synthetic.names import FIRST_NAMES, LAST_NAMES


# ── Constantes ────────────────────────────────────────────────────────────

CAMPUS = 'Santa Helena'
CURSO = 'Ciência da Computação'
BASE_YEAR = 2026
REQUIRED_OPTATIVAS_H = 75


# ── Helpers ───────────────────────────────────────────────────────────────

def _ascii_lower(text):
    nfkd = unicodedata.normalize('NFD', text.lower())
    return ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')


def _name_to_email(name, suffix=0):
    parts = _ascii_lower(name).split()
    local = f"{parts[0]}.{parts[-1]}" if len(parts) >= 2 else parts[0]
    if suffix:
        local = f"{local}{suffix}"
    return f"{local}@alunos.utfpr.edu.br"


def _generate_name(rng):
    first = rng.choice(FIRST_NAMES)
    last1 = rng.choice(LAST_NAMES)
    last2 = rng.choice(LAST_NAMES)
    attempts = 0
    while last2 == last1 and attempts < 10:
        last2 = rng.choice(LAST_NAMES)
        attempts += 1
    return f"{first} {last1} {last2}"


def _curriculum_year_for_period(period):
    return BASE_YEAR - (period // 2)


def _grade(rng, passing):
    if passing:
        return round(rng.uniform(5.0, 10.0), 1)
    return round(rng.uniform(0.0, 4.9), 1)


def _attendance(rng, passing):
    return rng.randint(75, 100) if passing else rng.randint(40, 74)


def _completed_at(rng, cy, period):
    years_in = (period - 1) // 2
    year = cy + years_in
    month = 7 if period % 2 == 1 else 12
    day = rng.randint(5, 20)
    return date(year, month, day)


# ── Geração de matrículas por status ─────────────────────────────────────

def _matriculas_ativo(rng, current_period, cy, mandatory_by_period,
                      optativas_412, optativas_413):
    rows = []
    for p in range(1, 9):
        for disc in mandatory_by_period.get(p, []):
            if p < current_period:
                passing = rng.random() > 0.15
                status = 'aprovada' if passing else 'reprovada'
            elif p == current_period:
                status = 'cursando'
            else:
                status = 'nao_iniciada'
            rows.append((disc, status))

    if current_period >= 2 and optativas_412:
        opt = rng.choice(optativas_412)
        st = 'aprovada' if current_period > 2 else 'cursando'
        rows.append((opt, st))

    if current_period >= 7 and optativas_413:
        opt = rng.choice(optativas_413)
        st = 'cursando' if current_period == 7 else 'aprovada'
        rows.append((opt, st))

    return rows


def _matriculas_trancado(rng, current_period, cy, mandatory_by_period,
                         optativas_412, optativas_413):
    rows = []
    for p in range(1, 9):
        for disc in mandatory_by_period.get(p, []):
            if p < current_period:
                passing = rng.random() > 0.20
                status = 'aprovada' if passing else 'reprovada'
            else:
                status = 'nao_iniciada'
            rows.append((disc, status))

    if current_period > 2 and optativas_412:
        opt = rng.choice(optativas_412)
        passing = rng.random() > 0.20
        rows.append((opt, 'aprovada' if passing else 'reprovada'))

    return rows


def _matriculas_evadido(rng, current_period, cy, mandatory_by_period,
                        optativas_412, optativas_413):
    rows = []
    for p in range(1, 9):
        for disc in mandatory_by_period.get(p, []):
            if p < current_period:
                passing = rng.random() > 0.35
                status = 'aprovada' if passing else 'reprovada'
            else:
                status = 'nao_iniciada'
            rows.append((disc, status))

    if current_period > 2 and optativas_412:
        opt = rng.choice(optativas_412)
        passing = rng.random() > 0.35
        rows.append((opt, 'aprovada' if passing else 'reprovada'))

    return rows


def _matriculas_formado(rng, cy, mandatory_discs, optativas_412,
                        optativas_413, required_opt_h):
    rows = []
    for disc in mandatory_discs:
        rows.append((disc, 'aprovada'))

    all_opts = list(optativas_412) + list(optativas_413)
    rng.shuffle(all_opts)
    completed_opt_h = 0
    for opt in all_opts:
        if completed_opt_h >= required_opt_h:
            break
        rows.append((opt, 'aprovada'))
        completed_opt_h += opt.carga_horaria

    return rows


class Command(BaseCommand):
    help = 'Popula o banco de dados com alunos sintéticos para testes'

    def add_arguments(self, parser):
        parser.add_argument('--ativos', type=int, default=500,
                            help='Quantidade de alunos ativos (default: 500)')
        parser.add_argument('--egressos', type=int, default=20,
                    help='Quantidade de egressos/formados (default: 20)')
        parser.add_argument('--trancados', type=int, default=80,
                            help='Quantidade de trancados (default: 80)')
        parser.add_argument('--evadidos', type=int, default=50,
                            help='Quantidade de evadidos (default: 50)')
        parser.add_argument('--seed', type=int, default=42,
                            help='Seed para reprodutibilidade (default: 42)')
        parser.add_argument('--limpar', action='store_true',
                            help='Limpa todos os dados antes de popular')

    @transaction.atomic
    def handle(self, *args, **options):
        n_ativos = options['ativos']
        n_egressos = options['egressos']
        n_trancados = options['trancados']
        n_evadidos = options['evadidos']
        seed = options['seed']
        limpar = options['limpar']

        rng = random.Random(seed)

        if limpar:
            self.stdout.write('Limpando dados existentes...')
            Matricula.objects.all().delete()
            Aluno.objects.all().delete()
            Disciplina.objects.all().delete()

        # ── 1. Carregar/criar disciplinas ─────────────────────────────────
        self.stdout.write('Carregando grade curricular...')
        curriculum_data = get_curriculum()
        disc_map = {}  # codigo -> Disciplina obj

        for item in curriculum_data:
            disc, _ = Disciplina.objects.get_or_create(
                codigo=item['code'],
                defaults={
                    'nome': item['name'],
                    'carga_horaria': item['workload'],
                    'periodo': item['period'],
                    'tipo': item['type'],
                    'grupo': item.get('group'),
                }
            )
            disc_map[disc.codigo] = disc

        self.stdout.write(f'  {len(disc_map)} disciplinas carregadas.')

        # Classificar disciplinas
        mandatory_discs = [d for d in disc_map.values() if d.tipo == 'obrigatoria']
        optativas_412 = [d for d in disc_map.values() if d.grupo == '[412]']
        optativas_413 = [d for d in disc_map.values() if d.grupo == '[413]']

        mandatory_by_period = {}
        for d in mandatory_discs:
            mandatory_by_period.setdefault(d.periodo, []).append(d)

        total_mandatory_h = sum(d.carga_horaria for d in mandatory_discs)
        total_course_h = total_mandatory_h + REQUIRED_OPTATIVAS_H

        # ── 2. Montar lista de alunos a criar ────────────────────────────
        status_counts = [
            ('ativo', n_ativos),
            ('formado', n_egressos),
            ('trancado', n_trancados),
            ('evadido', n_evadidos),
        ]

        total = sum(c for _, c in status_counts)
        self.stdout.write(f'Gerando {total} alunos ({n_ativos} ativos, '
                          f'{n_egressos} egressos, {n_trancados} trancados, '
                          f'{n_evadidos} evadidos)...')

        used_registrations = set()
        used_emails = set()
        period_cycle = list(range(1, 9)) * 100
        period_idx = 0
        aluno_idx = 0

        all_matriculas = []

        for status, count in status_counts:
            for _ in range(count):
                aluno_idx += 1

                # ── Período e ano de currículo ────────────────────────────
                if status == 'formado':
                    current_period = 8
                    cy = rng.randint(2019, 2025)
                elif status == 'evadido':
                    current_period = rng.randint(2, 7)
                    cy = _curriculum_year_for_period(current_period)
                    cy -= rng.randint(0, 1)
                    cy = max(2018, cy)
                elif status == 'trancado':
                    current_period = rng.randint(2, 7)
                    cy = _curriculum_year_for_period(current_period)
                else:  # ativo
                    current_period = period_cycle[period_idx % len(period_cycle)]
                    period_idx += 1
                    cy = _curriculum_year_for_period(current_period)

                # ── Dados pessoais ────────────────────────────────────────
                name = _generate_name(rng)
                email = _name_to_email(name)
                suffix = 1
                while email in used_emails:
                    email = _name_to_email(name, suffix)
                    suffix += 1
                used_emails.add(email)

                while True:
                    reg = f"{cy}{rng.randint(100000, 199999)}"
                    if reg not in used_registrations:
                        used_registrations.add(reg)
                        break

                admission_date = date(cy, 2, rng.randint(10, 20))
                grad_delay = rng.choice([0, 0, 0, 1, 1, 2])
                expected_grad = date(cy + 4 + grad_delay, 12, 15)

                birth_age = rng.randint(17, 22)
                birth_date = date(
                    cy - birth_age,
                    rng.randint(1, 12),
                    rng.randint(1, 28),
                )

                # ── Matrículas ────────────────────────────────────────────
                if status == 'formado':
                    mat_rows = _matriculas_formado(
                        rng, cy, mandatory_discs, optativas_412,
                        optativas_413, REQUIRED_OPTATIVAS_H
                    )
                elif status == 'ativo':
                    mat_rows = _matriculas_ativo(
                        rng, current_period, cy, mandatory_by_period,
                        optativas_412, optativas_413
                    )
                elif status == 'trancado':
                    mat_rows = _matriculas_trancado(
                        rng, current_period, cy, mandatory_by_period,
                        optativas_412, optativas_413
                    )
                else:
                    mat_rows = _matriculas_evadido(
                        rng, current_period, cy, mandatory_by_period,
                        optativas_412, optativas_413
                    )

                # ── Campos calculados ─────────────────────────────────────
                completed_h = sum(
                    d.carga_horaria for d, s in mat_rows if s == 'aprovada'
                )
                current_sem_h = sum(
                    d.carga_horaria for d, s in mat_rows if s == 'cursando'
                )
                missing_h = max(0, total_course_h - completed_h)

                approved_grades = []
                mat_objs = []
                for disc, mat_status in mat_rows:
                    passing = mat_status == 'aprovada'
                    cursando = mat_status == 'cursando'
                    done = mat_status in ('aprovada', 'reprovada')

                    nota = _grade(rng, passing) if done else None
                    freq = (_attendance(rng, passing or cursando)
                            if (done or cursando) else None)
                    dt_conclusao = (_completed_at(rng, cy, disc.periodo)
                                    if passing else None)

                    if passing and nota is not None:
                        approved_grades.append(nota)

                    mat_objs.append({
                        'disciplina': disc,
                        'status': mat_status,
                        'nota': nota,
                        'frequencia': freq,
                        'data_conclusao': dt_conclusao,
                    })

                gpa = (round(sum(approved_grades) / len(approved_grades), 2)
                       if approved_grades else 0.0)

                # ── Dados de egresso (para formados) ──────────────────────
                cargo = None
                empresa = None
                trabalha_remoto = False
                disponibilidade = 'media'
                areas_mentoria = None

                if status == 'formado':
                    job_titles = [
                        'Desenvolvedor(a) Fullstack',
                        'Desenvolvedor(a) Backend', 
                        'Desenvolvedor(a) Frontend',
                        'Engenheiro(a) de Software',
                        'Arquiteto(a) de Sistemas',
                        'Especialista em DevOps',
                        'Analista de Dados',
                        'Cientista de Dados',
                        'Segurança da Informação',
                        'Tech Lead',
                        'Product Manager',
                        'Consultor(a) de TI',
                    ]
                    
                    companies = [
                        'Google',
                        'Microsoft',
                        'Amazon',
                        'Apple',
                        'Meta',
                        'Netflix',
                        'Spotify',
                        'Airbnb',
                        'Uber',
                        'Stripe',
                        'GitHub',
                        'GitLab',
                        'Mercado Pago',
                        'Nubank',
                        'Stone Co',
                        'ContaAzul',
                        'Stagemuse',
                        'BeanTech',
                        'Startup Local',
                    ]
                    
                    mentoring_options = [
                        'Carreira profissional, Desenvolvimento backend, Algorithms',
                        'Frontend moderno, React.js, CSS avançado',
                        'DevOps, Docker, Kubernetes, CI/CD',
                        'Data Science, Machine Learning, Python',
                        'Segurança, Web security, Pentest',
                        'Arquitetura de sistemas, Escalabilidade',
                        'Gestão de projetos, Agile, Scrum',
                        'Empreendedorismo, Startup',
                        'Cloud computing, AWS, Azure',
                    ]
                    
                    cargo = rng.choice(job_titles)
                    empresa = rng.choice(companies)
                    trabalha_remoto = rng.random() > 0.4
                    disponibilidade = rng.choice(['alta', 'media', 'baixa'])
                    areas_mentoria = rng.choice(mentoring_options)

                # ── Criar aluno ───────────────────────────────────────────
                aluno = Aluno.objects.create(
                    registro=reg,
                    nome=name,
                    email=email,
                    periodo_atual=current_period,
                    status=status,
                    ano_curriculo=cy,
                    carga_horaria_total=total_course_h,
                    carga_horaria_cumprida=completed_h,
                    carga_horaria_pendente=missing_h,
                    carga_horaria_semestre=current_sem_h,
                    coeficiente=gpa,
                    data_nascimento=birth_date,
                    data_ingresso=admission_date,
                    previsao_formatura=expected_grad,
                    campus=CAMPUS,
                    curso=CURSO,
                    cargo=cargo,
                    empresa=empresa,
                    trabalha_remoto=trabalha_remoto,
                    disponibilidade=disponibilidade,
                    areas_mentoria=areas_mentoria,
                )

                # Acumular matrículas para bulk_create
                for m in mat_objs:
                    all_matriculas.append(Matricula(
                        aluno=aluno,
                        disciplina=m['disciplina'],
                        status=m['status'],
                        nota=m['nota'],
                        frequencia=m['frequencia'],
                        data_conclusao=m['data_conclusao'],
                    ))

                if aluno_idx % 100 == 0:
                    self.stdout.write(f'  {aluno_idx}/{total} alunos criados...')

        # Bulk create matrículas em batches
        self.stdout.write(f'Inserindo {len(all_matriculas)} matrículas...')
        batch_size = 5000
        for i in range(0, len(all_matriculas), batch_size):
            Matricula.objects.bulk_create(all_matriculas[i:i + batch_size])

        # Resumo final
        self.stdout.write(self.style.SUCCESS(
            f'\n  Base de dados populada com sucesso!\n'
            f'  Disciplinas: {Disciplina.objects.count()}\n'
            f'  Alunos: {Aluno.objects.count()}\n'
            f'    - Ativos: {Aluno.objects.filter(status="ativo").count()}\n'
            f'    - Formados: {Aluno.objects.filter(status="formado").count()}\n'
            f'    - Trancados: {Aluno.objects.filter(status="trancado").count()}\n'
            f'    - Evadidos: {Aluno.objects.filter(status="evadido").count()}\n'
            f'  Matrículas: {Matricula.objects.count()}'
        ))
