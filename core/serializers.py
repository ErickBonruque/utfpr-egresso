"""
Funções para serializar models em dicts compatíveis com o frontend JS.

Os nomes dos campos usam camelCase para manter compatibilidade com o JS existente
nos templates (dashboard.html, arvore.html, conquistas.html, etc.).
"""

from core.models import Aluno, Disciplina


def serializar_aluno(aluno, incluir_disciplinas=True):
    """Serializa um Aluno em dict compatível com o frontend."""
    data = {
        'id': aluno.pk,
        'registration': aluno.registro,
        'name': aluno.nome,
        'email': aluno.email,
        'currentPeriod': aluno.periodo_atual,
        'status': aluno.status,
        'curriculumYear': aluno.ano_curriculo,
        'totalCourseWorkload': aluno.carga_horaria_total,
        'completedWorkload': aluno.carga_horaria_cumprida,
        'missingWorkload': aluno.carga_horaria_pendente,
        'currentSemesterWorkload': aluno.carga_horaria_semestre,
        'gpa': aluno.coeficiente,
        'birthDate': aluno.data_nascimento.isoformat() if aluno.data_nascimento else None,
        'admissionDate': aluno.data_ingresso.isoformat() if aluno.data_ingresso else None,
        'expectedGraduation': aluno.previsao_formatura.isoformat() if aluno.previsao_formatura else None,
        'campus': aluno.campus,
        'course': aluno.curso,
    }

    if incluir_disciplinas:
        # Buscar matrículas existentes indexadas por disciplina
        matriculas = (
            aluno.matriculas
            .select_related('disciplina')
            .order_by('disciplina__periodo', 'disciplina__codigo')
        )
        matricula_por_disc = {m.disciplina_id: m for m in matriculas}

        # Incluir TODAS as disciplinas da grade, marcando sem matrícula como nao_iniciada
        todas_disciplinas = Disciplina.objects.all().order_by('periodo', 'codigo')
        subjects = []
        for disc in todas_disciplinas:
            mat = matricula_por_disc.get(disc.pk)
            if mat:
                subjects.append(_serializar_matricula(mat))
            else:
                subjects.append({
                    'code': disc.codigo,
                    'name': disc.nome,
                    'workload': disc.carga_horaria,
                    'period': disc.periodo,
                    'type': disc.tipo,
                    'group': disc.grupo,
                    'status': 'nao_iniciada',
                    'grade': None,
                    'attendance': None,
                    'completedAt': None,
                })
        data['subjects'] = subjects

    return data


def serializar_egresso_publico(aluno):
    """Serializa apenas dados públicos de egressos para listagem/contato."""
    nome_partes = (aluno.nome or '').split()
    first_name = nome_partes[0] if nome_partes else 'Egresso'
    last_name = nome_partes[-1] if len(nome_partes) > 1 else ''
    initials = (first_name[:1] + last_name[:1]).upper() if last_name else first_name[:2].upper()

    graduation_year = aluno.previsao_formatura.year if aluno.previsao_formatura else None
    admission_year = aluno.data_ingresso.year if aluno.data_ingresso else None

    if aluno.coeficiente >= 8.5:
        mentoring_focus = 'Mentoria em desempenho acadêmico e preparação de carreira'
    elif aluno.coeficiente >= 7.0:
        mentoring_focus = 'Mentoria em organização de estudos e trilhas profissionais'
    else:
        mentoring_focus = 'Mentoria sobre adaptação ao mercado e transição da graduação'

    # Parse áreas de mentoria
    areas = []
    if aluno.areas_mentoria:
        areas = [a.strip() for a in aluno.areas_mentoria.split(',') if a.strip()]

    return {
        'id': aluno.pk,
        'name': aluno.nome,
        'email': aluno.email,
        'campus': aluno.campus,
        'course': aluno.curso,
        'status': aluno.status,
        'curriculumYear': aluno.ano_curriculo,
        'graduationYear': graduation_year,
        'admissionYear': admission_year,
        'initials': initials,
        'mentoringFocus': mentoring_focus,
        'jobTitle': aluno.cargo or 'Egresso(a)',
        'company': aluno.empresa or 'Não informado',
        'worksRemote': aluno.trabalha_remoto,
        'availability': aluno.disponibilidade,
        'mentoringAreas': areas,
    }


def serializar_aluno_resumo(aluno):
    """Serializa um Aluno sem disciplinas (para listagens)."""
    return serializar_aluno(aluno, incluir_disciplinas=False)


def _serializar_matricula(matricula):
    """Serializa uma Matrícula em dict compatível com o frontend."""
    d = matricula.disciplina
    return {
        'code': d.codigo,
        'name': d.nome,
        'workload': d.carga_horaria,
        'period': d.periodo,
        'type': d.tipo,
        'group': d.grupo,
        'status': matricula.status,
        'grade': matricula.nota,
        'attendance': matricula.frequencia,
        'completedAt': matricula.data_conclusao.isoformat() if matricula.data_conclusao else None,
    }
