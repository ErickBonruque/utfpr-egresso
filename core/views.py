from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET
import math
import traceback


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


# ---------------------------------------------------------------------------
# Synthetic data API endpoints
# ---------------------------------------------------------------------------

def _parse_seed_count(request):
    """Parse seed and count query params with safe defaults."""
    try:
        seed = int(request.GET.get('seed', 42))
    except (ValueError, TypeError):
        seed = 42
    try:
        count = min(int(request.GET.get('count', 50)), 500)
        count = max(count, 1)
    except (ValueError, TypeError):
        count = 50
    return seed, count


@require_GET
def api_synthetic_dashboard(request):
    """
    GET /api/synthetic/dashboard

    Aggregate metrics for the synthetic student population.

    Query params:
        seed  (int, default 42)  – RNG seed for deterministic data
        count (int, default 50)  – number of students to generate (max 500)
    """
    from .synthetic.generator import get_students

    seed, count = _parse_seed_count(request)
    students = get_students(count=count, seed=seed)

    total = len(students)
    active = sum(1 for s in students if s['status'] == 'ativo')
    graduated = sum(1 for s in students if s['status'] == 'formado')
    locked = sum(1 for s in students if s['status'] == 'trancado')
    dropped = sum(1 for s in students if s['status'] == 'evadido')

    gpas = [s['gpa'] for s in students if s['gpa'] > 0]
    avg_gpa = round(sum(gpas) / len(gpas), 2) if gpas else 0.0

    by_period: dict = {}
    for s in students:
        key = str(s['currentPeriod'])
        by_period[key] = by_period.get(key, 0) + 1

    total_course_h = students[0]['totalCourseWorkload'] if students else 0
    avg_completion = round(
        sum(s['completedWorkload'] for s in students) / (total * total_course_h) * 100, 1
    ) if total and total_course_h else 0.0

    return JsonResponse({
        'totalStudents': total,
        'activeStudents': active,
        'graduatedStudents': graduated,
        'lockedStudents': locked,
        'droppedStudents': dropped,
        'averageGpa': avg_gpa,
        'averageCompletionPercent': avg_completion,
        'studentsByPeriod': by_period,
    })


@require_GET
def api_synthetic_students(request):
    """
    GET /api/synthetic/students

    Paginated list of synthetic students (without subject detail).

    Query params:
        seed         (int, default 42)
        count        (int, default 50, max 500)
        status       filter by status: ativo | trancado | formado | evadido
        currentPeriod filter by period number (1-8)
        curriculumYear filter by admission year
        page         (int, default 1)
        page_size    (int, default 20, max 100)
    """
    from .synthetic.generator import get_students

    seed, count = _parse_seed_count(request)
    students = get_students(count=count, seed=seed)

    # Filters
    status_filter = request.GET.get('status', '').strip()
    period_filter = request.GET.get('currentPeriod', '').strip()
    year_filter = request.GET.get('curriculumYear', '').strip()

    filtered = students
    if status_filter:
        filtered = [s for s in filtered if s['status'] == status_filter]
    if period_filter:
        try:
            pf = int(period_filter)
            filtered = [s for s in filtered if s['currentPeriod'] == pf]
        except ValueError:
            pass
    if year_filter:
        try:
            yf = int(year_filter)
            filtered = [s for s in filtered if s['curriculumYear'] == yf]
        except ValueError:
            pass

    # Pagination
    try:
        page = max(1, int(request.GET.get('page', 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(100, max(1, int(request.GET.get('page_size', 20))))
    except (ValueError, TypeError):
        page_size = 20

    total_count = len(filtered)
    total_pages = math.ceil(total_count / page_size) if total_count else 1
    start = (page - 1) * page_size
    end = start + page_size
    page_items = filtered[start:end]

    # Return summary (no subjects list)
    results = [
        {k: v for k, v in s.items() if k != 'subjects'}
        for s in page_items
    ]

    return JsonResponse({
        'count': total_count,
        'page': page,
        'pageSize': page_size,
        'totalPages': total_pages,
        'results': results,
    })


@require_GET
def api_synthetic_student_detail(request, student_id):
    """
    GET /api/synthetic/students/<student_id>

    Full student record including subject-progress list.

    Query params:
        seed  (int, default 42)
        count (int, default 50)  – must match the list call to find the same id
    """
    from .synthetic.generator import get_students

    seed, count = _parse_seed_count(request)
    students = get_students(count=count, seed=seed)

    student = next((s for s in students if s['id'] == student_id), None)
    if student is None:
        return JsonResponse({'error': 'Student not found.'}, status=404)

    return JsonResponse(student)


@require_GET
def api_synthetic_curriculum(request):
    """
    GET /api/synthetic/curriculum

    Full parsed curriculum catalog derived from matriz.txt.
    """
    from .synthetic.curriculum import get_curriculum

    curriculum = get_curriculum()

    mandatory = [s for s in curriculum if s['type'] == 'obrigatoria']
    optativas = [s for s in curriculum if s['type'] == 'optativa']

    total_mandatory_h = sum(s['workload'] for s in mandatory)

    # Group optativas by group label
    opt_groups: dict = {}
    for s in optativas:
        g = s.get('group') or 'other'
        opt_groups.setdefault(g, []).append(s)

    return JsonResponse({
        'totalMandatoryWorkload': total_mandatory_h,
        'requiredOptativasWorkload': 75,
        'totalCourseWorkload': total_mandatory_h + 75,
        'subjectCount': len(curriculum),
        'mandatoryCount': len(mandatory),
        'optativaCount': len(optativas),
        'optativaGroups': list(opt_groups.keys()),
        'subjects': curriculum,
    })
