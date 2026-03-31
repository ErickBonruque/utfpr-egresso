import json
import math
import traceback

from django.conf import settings as django_settings
from django.db.models import Count, FloatField, Q, ExpressionWrapper
from django.db.models.functions import Cast
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import redirect, render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from core.models import Aluno, Disciplina, Matricula
from core.progress import calcular_progresso_aluno
from core.serializers import serializar_aluno, serializar_aluno_resumo, serializar_egresso_publico


# ── Helpers ───────────────────────────────────────────────────────────────

def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _get_aluno_from_request(request):
    """Obtém o aluno visualizador. Prioridade: ?id= > sessão > fallback."""
    # 1) Parâmetro explícito na URL sempre tem prioridade
    requested_id = _safe_int(request.GET.get('id'))
    if requested_id:
        viewer = Aluno.objects.filter(pk=requested_id).first()
        if viewer:
            request.session['viewer_id'] = viewer.pk
            return viewer

    # 2) Sessão persistida
    session_viewer_id = request.session.get('viewer_id')
    if session_viewer_id:
        viewer = Aluno.objects.filter(pk=session_viewer_id).first()
        if viewer:
            return viewer

    # 3) Fallback: primeiro aluno ativo
    viewer = Aluno.objects.filter(status='ativo').first() or Aluno.objects.first()
    if viewer:
        request.session['viewer_id'] = viewer.pk
    return viewer


def _aluno_context(request):
    """Retorna contexto com dados do aluno serializado em JSON."""
    aluno = _get_aluno_from_request(request)
    if aluno:
        aluno_data = serializar_aluno(aluno)
        progresso = calcular_progresso_aluno(aluno_data)
    else:
        aluno_data = None
        progresso = None
    return {
        'aluno_json': json.dumps(aluno_data, ensure_ascii=False),
        'progress_json': json.dumps(progresso, ensure_ascii=False),
        'aluno': aluno,
        'is_admin': aluno.is_admin if aluno else False,
    }


# ── Views de páginas ─────────────────────────────────────────────────────

def login(request):
    """View para a página de login"""
    return render(request, 'login.html')


def home(request):
    """View para a página inicial"""
    return render(request, 'login.html')


def dashboard(request):
    """View para o dashboard principal"""
    context = _aluno_context(request)
    context['nav_active'] = 'dashboard'
    return render(request, 'dashboard.html', context)


def egressos(request):
    """View para a página de egressos"""
    # Stats gerais do curso
    total_alunos = Aluno.objects.count()
    ativos = Aluno.objects.filter(status='ativo').count()
    formados = Aluno.objects.filter(status='formado').count()
    evadidos = Aluno.objects.filter(status='evadido').count()
    trancados = Aluno.objects.filter(status='trancado').count()
    
    stats = {
        'totalStudents': total_alunos,
        'activeStudents': ativos,
        'graduatedStudents': formados,
        'evadidosStudents': evadidos,
        'trancadosStudents': trancados,
        'campusCount': Aluno.objects.filter(status='formado').values('campus').distinct().count(),
        'courseCount': Aluno.objects.filter(status='formado').values('curso').distinct().count(),
    }
    public_emails = Aluno.objects.filter(status='formado').exclude(email='').count()
    stats['publicEmails'] = public_emails

    context = _aluno_context(request)
    context['nav_active'] = 'egressos'
    context['stats_json'] = json.dumps(stats, ensure_ascii=False)
    return render(request, 'egressos.html', context)


def vagas(request):
    """View para a página de vagas"""
    context = _aluno_context(request)
    context['nav_active'] = 'vagas'
    return render(request, 'vagas.html', context)


def conquistas(request):
    """View para a página de conquistas"""
    context = _aluno_context(request)
    context['nav_active'] = 'conquistas'
    return render(request, 'conquistas.html', context)


def arvore(request):
    """View para a página da árvore de carreiras"""
    context = _aluno_context(request)
    context['nav_active'] = 'arvore'
    return render(request, 'arvore.html', context)


def perfil(request):
    """View para perfil próprio ou perfil público de egresso (sem notas)."""
    viewer = _get_aluno_from_request(request)
    target_id = _safe_int(request.GET.get('target'))

    aluno = viewer
    is_public_profile = False

    if target_id and viewer and target_id != viewer.pk:
        target = Aluno.objects.filter(pk=target_id, status='formado').first()
        if target:
            aluno = target
            is_public_profile = True

    if aluno:
        if is_public_profile:
            # Calculate progress from full data (needed for tracks/achievements display)
            # but only expose sanitized public fields to the frontend
            full_data = serializar_aluno(aluno)
            progresso = calcular_progresso_aluno(full_data)
            aluno_data = serializar_egresso_publico(aluno)
            # Add non-sensitive aggregate stats so the profile shows rich data
            approved_subs = [s for s in full_data.get('subjects', []) if s.get('status') == 'aprovada']
            aluno_data['approvedCount'] = len(approved_subs)
            aluno_data['completedWorkload'] = full_data.get('completedWorkload') or 0
            aluno_data['totalCourseWorkload'] = full_data.get('totalCourseWorkload') or 1
            aluno_data['currentPeriod'] = full_data.get('currentPeriod')
            aluno_data['gpa'] = None          # grades are private
            aluno_data['registration'] = None  # RA is private
            aluno_data['subjects'] = []        # individual subjects are private
        else:
            aluno_data = serializar_aluno(aluno)
            progresso = calcular_progresso_aluno(aluno_data)
    else:
        aluno_data = None
        progresso = None

    context = {
        'aluno_json': json.dumps(aluno_data, ensure_ascii=False),
        'progress_json': json.dumps(progresso, ensure_ascii=False),
        'aluno': aluno,
        'is_public_profile': is_public_profile,
    }
    return render(request, 'perfil.html', context)


# ── API: Listar alunos (para página de egressos) ─────────────────────────

@require_GET
def api_alunos(request):
    """Endpoint legado redirecionado para a vitrine pública de egressos."""
    return api_egressos(request)


@require_GET
def api_aluno_detalhe(request, aluno_id):
    """
    GET /api/alunos/<id>/

    Dados completos de um aluno incluindo disciplinas.
    """
    viewer = _get_aluno_from_request(request)
    if not viewer or viewer.pk != aluno_id:
        return JsonResponse({
            'error': 'A visualização detalhada é permitida apenas para o próprio aluno.'
        }, status=403)

    aluno = get_object_or_404(Aluno, pk=aluno_id)
    return JsonResponse(serializar_aluno(aluno), json_dumps_params={'ensure_ascii': False})


@require_GET
def api_egressos(request):
    """Retorna uma vitrine curada de egressos com dados públicos para contato."""
    qs = Aluno.objects.filter(status='formado').order_by('nome')

    search = request.GET.get('search', '').strip()
    campus = request.GET.get('campus', '').strip()

    if search:
        qs = qs.filter(nome__icontains=search)
    if campus:
        qs = qs.filter(campus=campus)

    # Limite de exposição para a POC: não exibir todos os perfis ao mesmo tempo.
    max_visible = 18
    public_list = list(qs[:max_visible])
    results = [serializar_egresso_publico(a) for a in public_list]

    return JsonResponse({
        'count': len(results),
        'maxVisible': max_visible,
        'results': results,
    })


@csrf_exempt
@require_POST
def api_trocar_aluno(request):
    """Troca o aluno da sessão e retorna a URL de redirecionamento."""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'JSON inválido.'}, status=400)

    aluno_id = _safe_int(body.get('id'))
    if not aluno_id:
        return JsonResponse({'error': 'ID do aluno é obrigatório.'}, status=400)

    aluno = Aluno.objects.filter(pk=aluno_id).first()
    if not aluno:
        return JsonResponse({'error': 'Aluno não encontrado.'}, status=404)

    request.session['viewer_id'] = aluno.pk

    # Redirecionar para a página atual ou dashboard
    redirect_to = body.get('redirect', '/dashboard/')
    redirect_to = f"{redirect_to.split('?')[0]}?id={aluno.pk}"

    return JsonResponse({'ok': True, 'redirect': redirect_to, 'name': aluno.nome})


@require_GET
def api_alunos_ativos(request):
    """Lista alunos ativos para seleção no modal de troca de aluno."""
    qs = Aluno.objects.filter(status='ativo').order_by('nome')
    search = request.GET.get('search', '').strip()

    if search:
        qs = qs.filter(nome__icontains=search)

    results = [
        {
            'id': a.pk,
            'name': a.nome,
            'currentPeriod': a.periodo_atual,
            'course': a.curso,
            'campus': a.campus,
        }
        for a in qs
    ]

    return JsonResponse({'count': len(results), 'results': results})


@require_GET
def api_buscar_vagas(request):
    """
    Endpoint de API para buscar vagas de emprego/estágio usando JobSpy.
    Parâmetros GET:
        - search_term: termo de pesquisa (obrigatório)
        - estado: sigla do estado (ex: 'PR', 'SP')
        - cidade: nome da cidade (ex: 'Curitiba')
        - job_type: tipo de vaga (fulltime, parttime, internship, contract)
        - is_remote: se é remoto (true/false)
        - hours_old: vagas das últimas X horas (default: 168 = 1 semana)
        - results_wanted: quantidade de resultados (default: 20, max: 50)
        - sites: fontes separadas por vírgula (default: "indeed,linkedin")
    """
    from jobspy import scrape_jobs

    # Mapeamento sigla -> nome completo do estado
    ESTADOS_MAP = {
        'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
        'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
        'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
        'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
        'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
        'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
        'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins',
    }

    # Parâmetros da pesquisa
    search_term = request.GET.get('search_term', '').strip()
    estado = request.GET.get('estado', '').strip().upper()
    cidade = request.GET.get('cidade', '').strip()
    job_type = request.GET.get('job_type', '').strip()
    is_remote_str = request.GET.get('is_remote', '').strip()
    hours_old = request.GET.get('hours_old', '168')
    results_wanted = request.GET.get('results_wanted', '20')
    sites_str = request.GET.get('sites', 'indeed,linkedin').strip()

    # Validação
    if not search_term:
        return JsonResponse({
            'error': 'O termo de pesquisa é obrigatório.',
            'jobs': [],
            'total': 0
        }, status=400)

    # Parsear parâmetros numéricos
    try:
        hours_old = int(hours_old)
    except ValueError:
        hours_old = 168

    try:
        results_wanted = min(int(results_wanted), 50)
    except ValueError:
        results_wanted = 20

    # Parsear remoto
    is_remote = None
    if is_remote_str.lower() == 'true':
        is_remote = True
    elif is_remote_str.lower() == 'false':
        is_remote = False

    # Parsear fontes
    sites = [s.strip() for s in sites_str.split(',') if s.strip()]
    valid_sites = ['indeed', 'linkedin', 'glassdoor']
    sites = [s for s in sites if s in valid_sites]
    if not sites:
        sites = ['indeed', 'linkedin']

    # Montar localização no formato correto para o JobSpy
    # O Indeed funciona melhor com "Cidade, UF" e o LinkedIn com "Cidade, Estado por extenso"
    # Formato ideal: "Curitiba, Paraná" ou apenas "Paraná"
    estado_nome = ESTADOS_MAP.get(estado, '')
    if cidade and estado_nome:
        location = f"{cidade}, {estado_nome}"
    elif estado_nome:
        location = estado_nome
    elif cidade:
        location = cidade
    else:
        location = 'Brazil'

    # Montar parâmetros do JobSpy
    scrape_params = {
        'site_name': sites,
        'search_term': search_term,
        'location': location,
        'results_wanted': results_wanted,
        'country_indeed': 'Brazil',
        'description_format': 'html',
        'verbose': 0,
    }

    # hours_old e (job_type + is_remote) são mutuamente exclusivos no Indeed
    # Priorizamos job_type/is_remote se definidos, senão usamos hours_old
    if job_type and job_type in ['fulltime', 'parttime', 'internship', 'contract']:
        scrape_params['job_type'] = job_type
        if is_remote is not None:
            scrape_params['is_remote'] = is_remote
    elif is_remote is not None:
        scrape_params['is_remote'] = is_remote
    else:
        scrape_params['hours_old'] = hours_old

    try:
        jobs_df = scrape_jobs(**scrape_params)

        # Converter DataFrame para lista de dicionários
        jobs_list = []
        for _, row in jobs_df.iterrows():
            job = {}
            job['id'] = _safe_str(row.get('id'))
            job['site'] = _safe_str(row.get('site'))
            job['title'] = _safe_str(row.get('title'))
            job['company'] = _safe_str(row.get('company'))
            job['company_url'] = _safe_str(row.get('company_url'))
            job['company_logo'] = _safe_str(row.get('company_logo'))
            job['job_url'] = _safe_str(row.get('job_url'))
            job['job_url_direct'] = _safe_str(row.get('job_url_direct'))
            job['location'] = _safe_str(row.get('location'))
            job['is_remote'] = bool(row.get('is_remote')) if row.get('is_remote') is not None else False
            job['description'] = _safe_str(row.get('description'))
            job['job_type'] = _safe_str(row.get('job_type'))

            # Salário
            min_amount = row.get('min_amount')
            max_amount = row.get('max_amount')
            interval = _safe_str(row.get('interval'))
            currency = _safe_str(row.get('currency'))

            job['min_amount'] = _safe_number(min_amount)
            job['max_amount'] = _safe_number(max_amount)
            job['interval'] = interval
            job['currency'] = currency if currency else 'BRL'

            # Data de publicação
            date_posted = row.get('date_posted')
            job['date_posted'] = str(date_posted) if date_posted is not None and str(date_posted) != 'NaT' else None

            # Nível (LinkedIn specific)
            job['job_level'] = _safe_str(row.get('job_level'))

            # Indústria da empresa
            job['company_industry'] = _safe_str(row.get('company_industry'))
            job['company_num_employees'] = _safe_str(row.get('company_num_employees'))

            jobs_list.append(job)

        return JsonResponse({
            'jobs': jobs_list,
            'total': len(jobs_list),
            'search_term': search_term,
            'location': location,
        })

    except Exception as e:
        print(f"Erro ao buscar vagas: {e}")
        traceback.print_exc()
        return JsonResponse({
            'error': f'Erro ao buscar vagas: {str(e)}',
            'jobs': [],
            'total': 0
        }, status=500)


def _safe_str(value):
    """Converte valor para string segura, retornando None para valores nulos/NaN"""
    if value is None:
        return None
    s = str(value)
    if s in ('nan', 'NaN', 'None', 'NaT', ''):
        return None
    return s


def _safe_number(value):
    """Converte valor para número seguro"""
    if value is None:
        return None
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


# ── Admin Dashboard ───────────────────────────────────────────────────────

def admin_unlock(request):
    """Mantido por compatibilidade — acesso admin agora é por aluno.is_admin."""
    request.session.pop('admin_mode', None)
    return redirect('admin_dashboard')


def admin_dashboard(request):
    """Dashboard administrativo com métricas agregadas do curso."""
    aluno = _get_aluno_from_request(request)
    if not (aluno and aluno.is_admin):
        return HttpResponseForbidden(
            'Acesso restrito. Selecione um aluno com permissão de administrador.'
        )
    metrics = _build_dashboard_metrics()
    context = _aluno_context(request)
    context['nav_active'] = 'admin_dashboard'
    context['is_admin'] = True
    context['metrics_json'] = json.dumps(metrics, ensure_ascii=False, default=str)
    return render(request, 'admin_dashboard.html', context)


def _build_dashboard_metrics():
    """Agrega métricas do curso usando apenas ORM queries."""

    # ── 1. Totais por status ─────────────────────────────────────────────
    status_counts_qs = (
        Aluno.objects
        .values('status')
        .annotate(total=Count('pk'))
        .order_by('status')
    )
    status_counts = {row['status']: row['total'] for row in status_counts_qs}
    total = sum(status_counts.values())

    # ── 2. Alunos ativos por período ─────────────────────────────────────
    per_period = list(
        Aluno.objects
        .filter(status='ativo')
        .values('periodo_atual')
        .annotate(total=Count('pk'))
        .order_by('periodo_atual')
    )

    # ── 3. Distribuição de GPA ───────────────────────────────────────────
    gpa_qs = (
        Aluno.objects
        .exclude(coeficiente=0.0)
        .aggregate(
            lt4=Count('pk', filter=Q(coeficiente__lt=4)),
            g4a6=Count('pk', filter=Q(coeficiente__gte=4, coeficiente__lt=6)),
            g6a7=Count('pk', filter=Q(coeficiente__gte=6, coeficiente__lt=7)),
            g7a8=Count('pk', filter=Q(coeficiente__gte=7, coeficiente__lt=8)),
            g8a9=Count('pk', filter=Q(coeficiente__gte=8, coeficiente__lt=9)),
            gte9=Count('pk', filter=Q(coeficiente__gte=9)),
        )
    )
    gpa_buckets = {
        '<4':  gpa_qs['lt4'],
        '4-6': gpa_qs['g4a6'],
        '6-7': gpa_qs['g6a7'],
        '7-8': gpa_qs['g7a8'],
        '8-9': gpa_qs['g8a9'],
        '≥9':  gpa_qs['gte9'],
    }

    # ── 4. Top 10 disciplinas com menor taxa de aprovação ────────────────
    hardest_qs = (
        Matricula.objects
        .filter(status__in=['aprovada', 'reprovada'])
        .values('disciplina__nome', 'disciplina__codigo', 'disciplina__periodo')
        .annotate(
            total_finalizadas=Count('pk'),
            aprovadas=Count('pk', filter=Q(status='aprovada')),
        )
        .filter(total_finalizadas__gte=10)
        .annotate(
            taxa_aprovacao=ExpressionWrapper(
                Cast('aprovadas', FloatField()) / Cast('total_finalizadas', FloatField()) * 100,
                output_field=FloatField()
            )
        )
        .order_by('taxa_aprovacao')
        [:10]
    )
    hardest_subjects = [
        {
            'nome': r['disciplina__nome'],
            'codigo': r['disciplina__codigo'],
            'periodo': r['disciplina__periodo'],
            'taxa_aprovacao': round(r['taxa_aprovacao'], 1),
            'total': r['total_finalizadas'],
            'aprovadas': r['aprovadas'],
        }
        for r in hardest_qs
    ]

    # ── 5. Evasão por período ────────────────────────────────────────────
    evasion_by_period = list(
        Aluno.objects
        .filter(status='evadido')
        .values('periodo_atual')
        .annotate(total=Count('pk'))
        .order_by('periodo_atual')
    )

    # ── 6. Insights de egressos (formados) ──────────────────────────────
    alumni_qs = Aluno.objects.filter(status='formado')
    total_alumni = alumni_qs.count()

    top_companies = list(
        alumni_qs
        .exclude(empresa__isnull=True)
        .exclude(empresa='')
        .values('empresa')
        .annotate(total=Count('pk'))
        .order_by('-total')
        [:10]
    )

    remote_count = alumni_qs.filter(trabalha_remoto=True).count()
    remote_pct = round(remote_count / total_alumni * 100, 1) if total_alumni else 0

    mentoring_availability = list(
        alumni_qs
        .values('disponibilidade')
        .annotate(total=Count('pk'))
        .order_by('disponibilidade')
    )

    # Áreas de mentoria: split em Python (SQLite sem UNNEST)
    areas_raw = (
        alumni_qs
        .exclude(areas_mentoria__isnull=True)
        .exclude(areas_mentoria='')
        .values_list('areas_mentoria', flat=True)
    )
    areas_counter = {}
    for raw in areas_raw:
        for area in raw.split(','):
            area = area.strip()
            if area:
                areas_counter[area] = areas_counter.get(area, 0) + 1
    top_mentoring_areas = [
        {'area': a, 'count': c}
        for a, c in sorted(areas_counter.items(), key=lambda x: -x[1])[:10]
    ]

    # ── 7. Distribuição de carga horária concluída (%) ───────────────────
    workload_qs = (
        Aluno.objects
        .filter(carga_horaria_total__gt=0)
        .annotate(
            pct=ExpressionWrapper(
                Cast('carga_horaria_cumprida', FloatField()) /
                Cast('carga_horaria_total', FloatField()) * 100,
                output_field=FloatField()
            )
        )
        .aggregate(
            b0_20=Count('pk',  filter=Q(pct__lt=20)),
            b20_40=Count('pk', filter=Q(pct__gte=20, pct__lt=40)),
            b40_60=Count('pk', filter=Q(pct__gte=40, pct__lt=60)),
            b60_80=Count('pk', filter=Q(pct__gte=60, pct__lt=80)),
            b80_100=Count('pk', filter=Q(pct__gte=80)),
        )
    )
    workload_buckets = {
        '0-20%':   workload_qs['b0_20'],
        '20-40%':  workload_qs['b20_40'],
        '40-60%':  workload_qs['b40_60'],
        '60-80%':  workload_qs['b60_80'],
        '80-100%': workload_qs['b80_100'],
    }

    # ── 8. Coorte por ano de ingresso ────────────────────────────────────
    cohort_by_year = list(
        Aluno.objects
        .values('ano_curriculo')
        .annotate(total=Count('pk'))
        .order_by('ano_curriculo')
    )

    # ── KPIs ─────────────────────────────────────────────────────────────
    n_ativos = status_counts.get('ativo', 0)
    n_formados = status_counts.get('formado', 0)
    n_evadidos = status_counts.get('evadido', 0)

    return {
        'total': total,
        'status_counts': status_counts,
        'kpis': {
            'total': total,
            'active_pct':    round(n_ativos   / total * 100, 1) if total else 0,
            'grad_rate_pct': round(n_formados  / total * 100, 1) if total else 0,
            'evasion_pct':   round(n_evadidos  / total * 100, 1) if total else 0,
        },
        'per_period': per_period,
        'gpa_buckets': gpa_buckets,
        'hardest_subjects': hardest_subjects,
        'evasion_by_period': evasion_by_period,
        'alumni': {
            'total': total_alumni,
            'top_companies': top_companies,
            'remote_pct': remote_pct,
            'remote_count': remote_count,
            'mentoring_availability': mentoring_availability,
            'top_mentoring_areas': top_mentoring_areas,
        },
        'workload_buckets': workload_buckets,
        'cohort_by_year': cohort_by_year,
    }
