from __future__ import annotations

from typing import Any


# ── Ramos de conhecimento (dashboard) ─────────────────────────────────────
BRANCHES = [
    {"label": "Fundamentos", "codes": ["CC1ICC", "MA1FM", "MA1LM", "HU1LA", "CC1AED1", "CC2AED2", "CC3AED3"]},
    {"label": "Matematica", "codes": ["MA2MA", "MA3CA", "MA3AL", "MA4PE", "MA5MN", "MA6PO"]},
    {"label": "Engenharia de Software", "codes": ["CC2ER", "CC3ES", "CC4IHC", "CC5QS", "CC6PDSW"]},
    {"label": "Programacao", "codes": ["CC2POO", "CC5PLDS", "CC5SDT", "CC7C"]},
    {"label": "Inteligencia Artificial", "codes": ["CC6FIA", "CC7IAA", "CC7VC", "CC6IBDDA"]},
    {"label": "Sistemas & Redes", "codes": ["CC2CLD", "CC3AOC", "CC4RC", "CC4SO", "CC6TRC", "CC7CS"]},
    {"label": "Banco de Dados", "codes": ["CC1MBD", "CC4LBD", "CC6IBDDA"]},
    {"label": "Projetos Integradores", "codes": ["CC3PI1", "CC5PI2", "CC7PI3"]},
]

# ── Arvore de carreiras (nodes hierarquicos) ──────────────────────────────
TREE_NODES = [
    {
        "id": "fundamentos", "title": "Fundamentos", "subtitle": "Base da Computacao",
        "icon": "bi-cpu", "color": "blue", "level": 1,
        "subjects": ["CC1ICC", "MA1FM", "MA1LM", "HU1LA"],
        "prerequisite": None,
    },
    {
        "id": "algoritmos", "title": "Algoritmos", "subtitle": "Estruturas & Eficiencia",
        "icon": "bi-diagram-3", "color": "green", "level": 2,
        "subjects": ["CC1AED1", "CC2AED2", "CC3AED3", "CC4PO", "CC5AG"],
        "prerequisite": "fundamentos",
    },
    {
        "id": "matematica", "title": "Matematica", "subtitle": "Teoria & Aplicacoes",
        "icon": "bi-calculator", "color": "pink", "level": 2,
        "subjects": ["MA2MA", "MA3CA", "MA3AL", "MA4PE", "MA5MN", "MA6PO"],
        "prerequisite": "fundamentos",
    },
    {
        "id": "banco_dados", "title": "Banco de Dados", "subtitle": "Dados & Armazenamento",
        "icon": "bi-database", "color": "orange", "level": 2,
        "subjects": ["CC1MBD", "CC4LBD", "CC6IBDDA"],
        "prerequisite": "fundamentos",
    },
    {
        "id": "programacao", "title": "Programacao", "subtitle": "POO & Paradigmas",
        "icon": "bi-code-slash", "color": "teal", "level": 2,
        "subjects": ["CC2POO", "CC5PLDS", "CC5SDT", "CC5QS"],
        "prerequisite": "fundamentos",
    },
    {
        "id": "hardware", "title": "Hardware & Circuitos", "subtitle": "Logica Digital & Arquitetura",
        "icon": "bi-motherboard", "color": "cyan", "level": 2,
        "subjects": ["CC2CLD", "CC3AOC"],
        "prerequisite": "fundamentos",
    },
    {
        "id": "sistemas", "title": "Sistemas & Redes", "subtitle": "Infraestrutura",
        "icon": "bi-hdd-network", "color": "cyan", "level": 3,
        "subjects": ["CC4RC", "CC4SO", "CC6LFTC", "CC6TRC", "CC7C", "CC7CS"],
        "prerequisite": "hardware",
    },
    {
        "id": "ia", "title": "Inteligencia Artificial", "subtitle": "IA & Visao Computacional",
        "icon": "bi-robot", "color": "purple", "level": 3,
        "subjects": ["CC6FIA", "CC7IAA", "CC7VC"],
        "prerequisite": "matematica",
    },
    {
        "id": "engenharia", "title": "Eng. de Software", "subtitle": "Projetos & Qualidade",
        "icon": "bi-gear-wide-connected", "color": "red", "level": 3,
        "subjects": ["CC2ER", "CC3ES", "CC4IHC", "CC6PDSW"],
        "prerequisite": "programacao",
    },
    {
        "id": "projetos", "title": "Projetos Integradores", "subtitle": "Pratica & Integracao",
        "icon": "bi-puzzle", "color": "yellow", "level": 3,
        "subjects": ["CC3PI1", "CC5PI2", "CC7PI3"],
        "prerequisite": "programacao",
    },
    {
        "id": "pesquisa", "title": "Pesquisa & TCC", "subtitle": "Inovacao & Formatura",
        "icon": "bi-stars", "color": "yellow", "level": 4,
        "subjects": ["EO11", "TCC1", "TCC2", "CC8CG"],
        "prerequisite": None,
    },
]

# ── Caminhos de carreira recomendados ─────────────────────────────────────
CAREER_PATHS = [
    {
        "title": "Engenheiro de IA & ML", "icon": "bi-robot",
        "desc": "Crie modelos inteligentes com machine learning e visao computacional.",
        "nodes": ["algoritmos", "matematica", "banco_dados", "ia"],
    },
    {
        "title": "Engenheiro de Software", "icon": "bi-code-square",
        "desc": "Desenvolva software com boas praticas, requisitos e sistemas web.",
        "nodes": ["fundamentos", "programacao", "engenharia", "projetos"],
    },
    {
        "title": "Especialista em Seguranca", "icon": "bi-shield-check",
        "desc": "Proteja sistemas com redes, seguranca e ciberdefesa.",
        "nodes": ["algoritmos", "hardware", "sistemas"],
    },
    {
        "title": "Cientista de Dados", "icon": "bi-graph-up-arrow",
        "desc": "Analise grandes volumes de dados com estatistica, BD e IA.",
        "nodes": ["matematica", "banco_dados", "ia"],
    },
    {
        "title": "Arquiteto de Sistemas", "icon": "bi-building-gear",
        "desc": "Projete infraestruturas complexas com redes, SO e compiladores.",
        "nodes": ["hardware", "sistemas", "algoritmos"],
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────

def _approved(subs: list[dict[str, Any]], code: str) -> bool:
    return any(x.get("code") == code and x.get("status") == "aprovada" for x in subs)


def _count_approved(subs: list[dict[str, Any]], codes: list[str]) -> int:
    return sum(1 for c in codes if _approved(subs, c))


def _has_any_approved(subs: list[dict[str, Any]], codes: list[str]) -> bool:
    return any(_approved(subs, c) for c in codes)


def _max_grade(subs: list[dict[str, Any]]) -> float:
    grades = [(s.get("grade") or 0) for s in subs if s.get("status") == "aprovada"]
    return max(grades) if grades else 0.0


def _min_grade_approved(subs: list[dict[str, Any]]) -> float:
    grades = [(s.get("grade") or 0) for s in subs if s.get("status") == "aprovada" and (s.get("grade") or 0) > 0]
    return min(grades) if grades else 0.0


def _count_failed(subs: list[dict[str, Any]]) -> int:
    return sum(1 for s in subs if s.get("status") == "reprovada")


def _count_status(subs: list[dict[str, Any]], status: str) -> int:
    return sum(1 for s in subs if s.get("status") == status)


def _has_phoenix(subs: list[dict[str, Any]]) -> bool:
    """Verifica se o aluno reprovou e depois aprovou na mesma disciplina."""
    failed_codes = {s.get("code") for s in subs if s.get("status") == "reprovada"}
    approved_codes = {s.get("code") for s in subs if s.get("status") == "aprovada"}
    return bool(failed_codes & approved_codes)


# ── Conquistas ────────────────────────────────────────────────────────────

def _build_achievements(student: dict[str, Any]) -> list[dict[str, Any]]:
    subs = student.get("subjects") or []
    wl = student.get("completedWorkload") or 0
    twl = student.get("totalCourseWorkload") or 1
    wl_pct = wl / twl
    approved_n = _count_status(subs, "aprovada")
    failed_n = _count_failed(subs)
    cursando_n = _count_status(subs, "cursando")
    mandatory_subs = [s for s in subs if s.get("type") != "optativa"]
    total_subs = len(mandatory_subs) or len(subs) or 1
    max_attend = 0
    perfect_attend_count = 0
    for s in subs:
        if s.get("status") == "aprovada":
            att = s.get("attendance") or 0
            max_attend = max(max_attend, att)
            if att >= 100:
                perfect_attend_count += 1

    gpa = student.get("gpa") or 0
    max_g = _max_grade(subs)
    min_g = _min_grade_approved(subs)

    # Optativas aprovadas
    opt_412 = sum(1 for s in subs if s.get("group") == "[412]" and s.get("status") == "aprovada")
    opt_413 = sum(1 for s in subs if s.get("group") == "[413]" and s.get("status") == "aprovada")

    achievements = [
        # ── Academicas ──────────────────────────────────────────────────
        {
            "id": "primeiro_passo", "name": "Primeiro Passo", "category": "Academica",
            "icon": "bi-mortarboard", "xp": 50,
            "desc": "Aprovado em pelo menos 1 disciplina",
            "unlocked": approved_n > 0,
            "progress": min(1.0, approved_n / 1) if approved_n > 0 else 0.0,
        },
        {
            "id": "dedicado", "name": "Dedicado", "category": "Academica",
            "icon": "bi-book-half", "xp": 100,
            "desc": "CR igual ou acima de 7,0",
            "unlocked": gpa >= 7.0,
            "progress": min(1.0, gpa / 7.0),
        },
        {
            "id": "aluno_destaque", "name": "Aluno Destaque", "category": "Academica",
            "icon": "bi-trophy", "xp": 200,
            "desc": "CR igual ou acima de 9,0",
            "unlocked": gpa >= 9.0,
            "progress": min(1.0, gpa / 9.0),
        },
        {
            "id": "nota_10", "name": "Nota 10!", "category": "Academica",
            "icon": "bi-star-fill", "xp": 150,
            "desc": "Obteve nota 10,0 em alguma disciplina",
            "unlocked": max_g >= 10.0,
            "progress": 1.0 if max_g >= 10.0 else min(1.0, max_g / 10.0),
        },
        {
            "id": "sem_faltas", "name": "Presenca Perfeita", "category": "Academica",
            "icon": "bi-person-check", "xp": 75,
            "desc": "100%% de presenca em alguma disciplina",
            "unlocked": perfect_attend_count > 0,
            "progress": min(1.0, max_attend / 100.0),
        },
        {
            "id": "assiduidade", "name": "Assiduidade Exemplar", "category": "Academica",
            "icon": "bi-calendar-check", "xp": 200,
            "desc": "100%% de presenca em 5 ou mais disciplinas",
            "unlocked": perfect_attend_count >= 5,
            "progress": min(1.0, perfect_attend_count / 5.0),
        },
        {
            "id": "metade_jornada", "name": "Metade da Jornada", "category": "Academica",
            "icon": "bi-pie-chart", "xp": 300,
            "desc": "Completou 50%% da carga horaria total",
            "unlocked": wl_pct >= 0.5,
            "progress": min(1.0, wl_pct / 0.5) if wl_pct < 0.5 else 1.0,
        },
        {
            "id": "quase_formado", "name": "Quase Formado", "category": "Academica",
            "icon": "bi-hourglass-bottom", "xp": 500,
            "desc": "Completou 75%% da carga horaria total",
            "unlocked": wl_pct >= 0.75,
            "progress": min(1.0, wl_pct / 0.75) if wl_pct < 0.75 else 1.0,
        },
        {
            "id": "formado", "name": "Formado!", "category": "Academica",
            "icon": "bi-patch-check-fill", "xp": 1000,
            "desc": "Concluiu o curso completamente",
            "unlocked": student.get("status") == "formado",
            "progress": min(1.0, wl_pct),
        },
        {
            "id": "explorador_optativas", "name": "Explorador de Optativas", "category": "Academica",
            "icon": "bi-compass", "xp": 150,
            "desc": "Aprovado em 3 ou mais optativas",
            "unlocked": (opt_412 + opt_413) >= 3,
            "progress": min(1.0, (opt_412 + opt_413) / 3.0),
        },

        # ── Programacao ─────────────────────────────────────────────────
        {
            "id": "programador", "name": "Programador", "category": "Programacao",
            "icon": "bi-code-slash", "xp": 100,
            "desc": "Aprovado em POO",
            "unlocked": _approved(subs, "CC2POO"),
            "progress": 1.0 if _approved(subs, "CC2POO") else 0.0,
        },
        {
            "id": "mestre_algoritmos", "name": "Mestre dos Algoritmos", "category": "Programacao",
            "icon": "bi-diagram-3", "xp": 200,
            "desc": "Aprovado nas 3 AED",
            "unlocked": _count_approved(subs, ["CC1AED1", "CC2AED2", "CC3AED3"]) == 3,
            "progress": _count_approved(subs, ["CC1AED1", "CC2AED2", "CC3AED3"]) / 3.0,
        },
        {
            "id": "arquiteto", "name": "Arquiteto de Software", "category": "Programacao",
            "icon": "bi-layers", "xp": 150,
            "desc": "Aprovado em ER e ES",
            "unlocked": _count_approved(subs, ["CC2ER", "CC3ES"]) == 2,
            "progress": _count_approved(subs, ["CC2ER", "CC3ES"]) / 2.0,
        },
        {
            "id": "guru_bd", "name": "Guru de Banco de Dados", "category": "Programacao",
            "icon": "bi-database-fill", "xp": 150,
            "desc": "Aprovado em MBD, LBD e Big Data",
            "unlocked": _count_approved(subs, ["CC1MBD", "CC4LBD", "CC6IBDDA"]) == 3,
            "progress": _count_approved(subs, ["CC1MBD", "CC4LBD", "CC6IBDDA"]) / 3.0,
        },
        {
            "id": "web_dev", "name": "Desenvolvedor Web", "category": "Programacao",
            "icon": "bi-globe", "xp": 150,
            "desc": "Aprovado em PDSW e IHC",
            "unlocked": _count_approved(subs, ["CC6PDSW", "CC4IHC"]) == 2,
            "progress": _count_approved(subs, ["CC6PDSW", "CC4IHC"]) / 2.0,
        },
        {
            "id": "poliglota", "name": "Poliglota Digital", "category": "Programacao",
            "icon": "bi-translate", "xp": 200,
            "desc": "Aprovado em POO, PLDS e Compiladores",
            "unlocked": _count_approved(subs, ["CC2POO", "CC5PLDS", "CC7C"]) == 3,
            "progress": _count_approved(subs, ["CC2POO", "CC5PLDS", "CC7C"]) / 3.0,
        },
        {
            "id": "grafos", "name": "Domador de Grafos", "category": "Programacao",
            "icon": "bi-share", "xp": 150,
            "desc": "Aprovado em Algoritmos em Grafos",
            "unlocked": _approved(subs, "CC5AG"),
            "progress": 1.0 if _approved(subs, "CC5AG") else 0.0,
        },

        # ── Infraestrutura ──────────────────────────────────────────────
        {
            "id": "esp_redes", "name": "Especialista em Redes", "category": "Infraestrutura",
            "icon": "bi-hdd-network", "xp": 150,
            "desc": "Aprovado em RC e TRC",
            "unlocked": _count_approved(subs, ["CC4RC", "CC6TRC"]) == 2,
            "progress": _count_approved(subs, ["CC4RC", "CC6TRC"]) / 2.0,
        },
        {
            "id": "guardiao", "name": "Guardiao Digital", "category": "Infraestrutura",
            "icon": "bi-shield-lock", "xp": 200,
            "desc": "Aprovado em Ciberseguranca",
            "unlocked": _approved(subs, "CC7CS"),
            "progress": 1.0 if _approved(subs, "CC7CS") else 0.0,
        },
        {
            "id": "sysadmin", "name": "SysAdmin", "category": "Infraestrutura",
            "icon": "bi-terminal", "xp": 150,
            "desc": "Aprovado em Sistemas Operacionais",
            "unlocked": _approved(subs, "CC4SO"),
            "progress": 1.0 if _approved(subs, "CC4SO") else 0.0,
        },
        {
            "id": "lowlevel", "name": "Baixo Nivel", "category": "Infraestrutura",
            "icon": "bi-cpu", "xp": 200,
            "desc": "Aprovado em CLD, AOC e Compiladores",
            "unlocked": _count_approved(subs, ["CC2CLD", "CC3AOC", "CC7C"]) == 3,
            "progress": _count_approved(subs, ["CC2CLD", "CC3AOC", "CC7C"]) / 3.0,
        },
        {
            "id": "full_infra", "name": "Full Infra", "category": "Infraestrutura",
            "icon": "bi-stack", "xp": 400,
            "desc": "Aprovado em CLD, AOC, RC, SO, TRC e CS",
            "unlocked": _count_approved(subs, ["CC2CLD", "CC3AOC", "CC4RC", "CC4SO", "CC6TRC", "CC7CS"]) == 6,
            "progress": _count_approved(subs, ["CC2CLD", "CC3AOC", "CC4RC", "CC4SO", "CC6TRC", "CC7CS"]) / 6.0,
        },

        # ── IA ──────────────────────────────────────────────────────────
        {
            "id": "cientista", "name": "Cientista de Dados", "category": "IA",
            "icon": "bi-graph-up-arrow", "xp": 200,
            "desc": "Aprovado em IA, Big Data e IA Aplicada",
            "unlocked": _count_approved(subs, ["CC6FIA", "CC6IBDDA", "CC7IAA"]) == 3,
            "progress": _count_approved(subs, ["CC6FIA", "CC6IBDDA", "CC7IAA"]) / 3.0,
        },
        {
            "id": "visao", "name": "Visao de Futuro", "category": "IA",
            "icon": "bi-eye", "xp": 200,
            "desc": "Aprovado em Visao Computacional",
            "unlocked": _approved(subs, "CC7VC"),
            "progress": 1.0 if _approved(subs, "CC7VC") else 0.0,
        },
        {
            "id": "skynet", "name": "Skynet v0.1", "category": "IA",
            "icon": "bi-robot", "xp": 500,
            "desc": "Aprovado em TODAS as disciplinas de IA (FIA, IAA, VC, IBDDA)",
            "unlocked": _count_approved(subs, ["CC6FIA", "CC7IAA", "CC7VC", "CC6IBDDA"]) == 4,
            "progress": _count_approved(subs, ["CC6FIA", "CC7IAA", "CC7VC", "CC6IBDDA"]) / 4.0,
        },

        # ── Marcos ──────────────────────────────────────────────────────
        {
            "id": "estagiario", "name": "Estagiario", "category": "Marcos",
            "icon": "bi-briefcase", "xp": 300,
            "desc": "Completou Estagio Obrigatorio",
            "unlocked": _approved(subs, "EO11"),
            "progress": 1.0 if _approved(subs, "EO11") else 0.0,
        },
        {
            "id": "tcc1", "name": "TCC I Feito", "category": "Marcos",
            "icon": "bi-file-earmark-text", "xp": 200,
            "desc": "Concluiu o TCC I",
            "unlocked": _approved(subs, "TCC1"),
            "progress": 1.0 if _approved(subs, "TCC1") else 0.0,
        },
        {
            "id": "tcc", "name": "TCC Concluido", "category": "Marcos",
            "icon": "bi-award", "xp": 500,
            "desc": "Concluiu o Trabalho de Conclusao de Curso II",
            "unlocked": _approved(subs, "TCC2"),
            "progress": _count_approved(subs, ["TCC1", "TCC2"]) / 2.0,
        },
        {
            "id": "pi1", "name": "Primeiro Integrador", "category": "Marcos",
            "icon": "bi-puzzle", "xp": 150,
            "desc": "Aprovado no Projeto Integrador I",
            "unlocked": _approved(subs, "CC3PI1"),
            "progress": 1.0 if _approved(subs, "CC3PI1") else 0.0,
        },
        {
            "id": "trilha_pi", "name": "Trilha Completa de Projetos", "category": "Marcos",
            "icon": "bi-diagram-2", "xp": 400,
            "desc": "Aprovado nos 3 Projetos Integradores",
            "unlocked": _count_approved(subs, ["CC3PI1", "CC5PI2", "CC7PI3"]) == 3,
            "progress": _count_approved(subs, ["CC3PI1", "CC5PI2", "CC7PI3"]) / 3.0,
        },
        {
            "id": "logico", "name": "Mestre da Logica", "category": "Marcos",
            "icon": "bi-lightbulb", "xp": 100,
            "desc": "Aprovado em Logica Matematica e LFTC",
            "unlocked": _count_approved(subs, ["MA1LM", "CC6LFTC"]) == 2,
            "progress": _count_approved(subs, ["MA1LM", "CC6LFTC"]) / 2.0,
        },
        {
            "id": "calculista", "name": "Calculista", "category": "Marcos",
            "icon": "bi-calculator", "xp": 200,
            "desc": "Aprovado em TODAS as disciplinas de Matematica",
            "unlocked": _count_approved(subs, ["MA1FM", "MA1LM", "MA2MA", "MA3CA", "MA3AL", "MA4PE", "MA5MN", "MA6PO"]) == 8,
            "progress": _count_approved(subs, ["MA1FM", "MA1LM", "MA2MA", "MA3CA", "MA3AL", "MA4PE", "MA5MN", "MA6PO"]) / 8.0,
        },

        # ── Diversos ─────────────────────────────────────────────────
        {
            "id": "sobrevivente_aed", "name": "Sobrevivente de AED", "category": "Diversos",
            "icon": "bi-fire", "xp": 75,
            "desc": "Passou por AED I, II e III sem reprovar em nenhuma",
            "unlocked": (
                _count_approved(subs, ["CC1AED1", "CC2AED2", "CC3AED3"]) == 3
                and not any(
                    s.get("code") in ["CC1AED1", "CC2AED2", "CC3AED3"] and s.get("status") == "reprovada"
                    for s in subs
                )
            ),
            "progress": _count_approved(subs, ["CC1AED1", "CC2AED2", "CC3AED3"]) / 3.0,
        },
        {
            "id": "cafe_compilando", "name": "Cafe Compilando...", "category": "Diversos",
            "icon": "bi-cup-hot", "xp": 50,
            "desc": "Aprovado em 10+ disciplinas (voce ja perdeu a conta dos cafes)",
            "unlocked": approved_n >= 10,
            "progress": min(1.0, approved_n / 10.0),
        },
        {
            "id": "madrugador", "name": "Madrugador Profissional", "category": "Diversos",
            "icon": "bi-moon-stars", "xp": 75,
            "desc": "Aprovado em 20+ disciplinas (quantas noites sem dormir?)",
            "unlocked": approved_n >= 20,
            "progress": min(1.0, approved_n / 20.0),
        },
        {
            "id": "veterano", "name": "Veterano de Guerra", "category": "Diversos",
            "icon": "bi-shield-exclamation", "xp": 100,
            "desc": "Aprovado em 30+ disciplinas (voce ja viu de tudo)",
            "unlocked": approved_n >= 30,
            "progress": min(1.0, approved_n / 30.0),
        },
        {
            "id": "fenix", "name": "Fenix Academica", "category": "Diversos",
            "icon": "bi-arrow-repeat", "xp": 100,
            "desc": "Reprovado e depois aprovado na mesma disciplina (a volta por cima!)",
            "unlocked": _has_phoenix(subs),
            "progress": 1.0 if _has_phoenix(subs) else 0.0,
        },
        {
            "id": "nota_raspando", "name": "Nota Raspando", "category": "Diversos",
            "icon": "bi-emoji-sunglasses", "xp": 50,
            "desc": "Aprovado com nota entre 6,0 e 6,5 em alguma disciplina",
            "unlocked": any(
                s.get("status") == "aprovada" and 6.0 <= (s.get("grade") or 0) <= 6.5
                for s in subs
            ),
            "progress": 1.0 if any(
                s.get("status") == "aprovada" and 6.0 <= (s.get("grade") or 0) <= 6.5
                for s in subs
            ) else 0.0,
        },
        {
            "id": "colecionador_reprov", "name": "Colecionador de Experiencias", "category": "Diversos",
            "icon": "bi-emoji-dizzy", "xp": 50,
            "desc": "Reprovado em 3+ disciplinas (e tudo bem, faz parte!)",
            "unlocked": failed_n >= 3,
            "progress": min(1.0, failed_n / 3.0),
        },
        {
            "id": "speedrunner", "name": "Speedrunner", "category": "Diversos",
            "icon": "bi-lightning-charge", "xp": 150,
            "desc": "Cursando 5+ disciplinas ao mesmo tempo (calma, respira!)",
            "unlocked": cursando_n >= 5,
            "progress": min(1.0, cursando_n / 5.0),
        },
        {
            "id": "humanista", "name": "Humanista Tech", "category": "Diversos",
            "icon": "bi-heart", "xp": 75,
            "desc": "Aprovado em 2+ optativas humanisticas",
            "unlocked": opt_412 >= 2,
            "progress": min(1.0, opt_412 / 2.0),
        },
        {
            "id": "bug_free", "name": "Bug Free (mentira)", "category": "Diversos",
            "icon": "bi-bug", "xp": 100,
            "desc": "CR acima de 8 e nenhuma reprovacao",
            "unlocked": gpa >= 8.0 and failed_n == 0,
            "progress": min(1.0, gpa / 8.0) if failed_n == 0 else 0.0,
        },
    ]

    for a in achievements:
        a["progress"] = max(0.0, min(1.0, float(a["progress"])))

    return achievements


# ── Ramos (dashboard) ────────────────────────────────────────────────────

def _build_branches(subs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    branches = []
    for b in BRANCHES:
        total = len(b["codes"]) or 1
        done = _count_approved(subs, b["codes"])
        pct = round(done / total * 100)
        branches.append({"label": b["label"], "done": done, "total": total, "pct": pct})
    return branches


# ── Arvore (pagina arvore) ────────────────────────────────────────────────

def _build_tree(subs: list[dict[str, Any]]) -> dict[str, Any]:
    progress_by_id: dict[str, dict[str, Any]] = {}
    nodes: list[dict[str, Any]] = []

    for node in TREE_NODES:
        done = _count_approved(subs, node["subjects"])
        cursando = sum(1 for c in node["subjects"] if any(s.get("code") == c and s.get("status") == "cursando" for s in subs))
        total = len(node["subjects"]) or 1
        pct = round(done / total * 100)
        progress_by_id[node["id"]] = {"done": done, "cursando": cursando, "total": total, "pct": pct}

    for node in TREE_NODES:
        prerequisite = node["prerequisite"]
        unlocked = True if not prerequisite else (progress_by_id.get(prerequisite, {}).get("pct", 0) > 0)
        completed = progress_by_id[node["id"]]["pct"] >= 100
        nodes.append({
            **node,
            **progress_by_id[node["id"]],
            "unlocked": unlocked,
            "completed": completed,
        })

    paths = []
    for p in CAREER_PATHS:
        total = len(p["nodes"]) or 1
        done = sum(1 for node_id in p["nodes"] if progress_by_id.get(node_id, {}).get("pct", 0) > 0)
        compat = round(done / total * 100)
        paths.append({**p, "compatibilityPct": compat})

    return {"nodes": nodes, "paths": paths}


# ── Buckets de disciplinas (dashboard) ────────────────────────────────────

def _build_subject_buckets(subs: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    return {
        "ongoing": [s for s in subs if s.get("status") == "cursando"],
        "failed": [s for s in subs if s.get("status") == "reprovada"],
        "mandatoryDone": [s for s in subs if s.get("type") == "obrigatoria" and s.get("status") == "aprovada"],
        "optSpecificDone": [s for s in subs if s.get("group") == "[412]" and s.get("status") == "aprovada"],
        "optHumanDone": [s for s in subs if s.get("group") == "[413]" and s.get("status") == "aprovada"],
        "mandatoryMissing": [s for s in subs if s.get("type") == "obrigatoria" and s.get("status") != "aprovada"],
    }


# ── Funcao principal ──────────────────────────────────────────────────────

def calcular_progresso_aluno(student: dict[str, Any] | None) -> dict[str, Any] | None:
    if not student:
        return None

    subs = student.get("subjects") or []
    achievements = _build_achievements(student)
    unlocked = [a for a in achievements if a.get("unlocked")]
    total_xp = sum(int(a.get("xp") or 0) for a in unlocked)
    next_achievement = None
    locked = [a for a in achievements if not a.get("unlocked")]
    if locked:
        locked.sort(key=lambda x: x.get("progress", 0.0), reverse=True)
        next_achievement = locked[0].get("name")

    return {
        "xp": {
            "total": total_xp,
            "unlockedCount": len(unlocked),
            "totalAchievements": len(achievements),
            "nextAchievement": next_achievement,
        },
        "achievements": achievements,
        "branches": _build_branches(subs),
        "tree": _build_tree(subs),
        "subjectBuckets": _build_subject_buckets(subs),
    }
