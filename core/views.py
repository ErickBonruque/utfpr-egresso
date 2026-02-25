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
