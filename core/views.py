import json
import math
import traceback

from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_GET

from core.models import Aluno
from core.progress import calcular_progresso_aluno
from core.serializers import serializar_aluno, serializar_aluno_resumo, serializar_egresso_publico


# ── Helpers ───────────────────────────────────────────────────────────────

def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _get_aluno_from_request(request):
    """Obtém o aluno visualizador persistido em sessão."""
    session_viewer_id = request.session.get('viewer_id')
    if session_viewer_id:
        viewer = Aluno.objects.filter(pk=session_viewer_id).first()
        if viewer:
            return viewer

    requested_id = _safe_int(request.GET.get('id'))
    if requested_id:
        viewer = Aluno.objects.filter(pk=requested_id).first()
        if viewer:
            request.session['viewer_id'] = viewer.pk
            return viewer

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
    context['stats_json'] = json.dumps(stats, ensure_ascii=False)
    return render(request, 'egressos.html', context)


def vagas(request):
    """View para a página de vagas"""
    context = _aluno_context(request)
    return render(request, 'vagas.html', context)


def conquistas(request):
    """View para a página de conquistas"""
    context = _aluno_context(request)
    return render(request, 'conquistas.html', context)


def arvore(request):
    """View para a página da árvore de carreiras"""
    context = _aluno_context(request)
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
            aluno_data = serializar_egresso_publico(aluno)
            aluno_data['subjects'] = []
            aluno_data['currentPeriod'] = None
            aluno_data['gpa'] = None
            aluno_data['registration'] = None
            aluno_data['totalCourseWorkload'] = None
            aluno_data['completedWorkload'] = None
            progresso = None
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
