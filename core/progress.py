from __future__ import annotations

from typing import Any


BRANCHES = [
    {"label": "Fundamentos", "codes": ["CC1ICC", "MA1FM", "MA1LM", "HU1LA", "CC1AED1", "CC2AED2", "CC3AED3", "MA2MA", "MA3CA", "MA3AL", "MA4PE", "MA5MN"]},
    {"label": "Engenharia de Software", "codes": ["CC2ER", "CC3ES", "CC5QS", "CC6PDSW"]},
    {"label": "Inteligencia Artificial", "codes": ["CC6FIA", "CC7IAA", "CC7VC"]},
    {"label": "Sistemas", "codes": ["CC4RC", "CC4SO", "CC6TRC", "CC7CS"]},
    {"label": "Banco de Dados", "codes": ["CC1MBD", "CC4LBD", "CC6IBDDA"]},
]

TREE_NODES = [
    {"id": "fundamentos", "title": "Fundamentos", "subtitle": "Base da Computacao", "icon": "bi-cpu", "color": "blue", "level": 1, "subjects": ["CC1ICC", "MA1FM", "MA1LM", "HU1LA"], "prerequisite": None},
    {"id": "algoritmos", "title": "Algoritmos", "subtitle": "Estruturas & Eficiencia", "icon": "bi-diagram-3", "color": "green", "level": 2, "subjects": ["CC1AED1", "CC2AED2", "CC3AED3", "CC4PO", "CC5AG"], "prerequisite": "fundamentos"},
    {"id": "matematica", "title": "Matematica", "subtitle": "Teoria & Aplicacoes", "icon": "bi-calculator", "color": "pink", "level": 2, "subjects": ["MA2MA", "MA3CA", "MA3AL", "MA4PE", "MA5MN", "MA6PO"], "prerequisite": "fundamentos"},
    {"id": "banco_dados", "title": "Banco de Dados", "subtitle": "Dados & Armazenamento", "icon": "bi-database", "color": "orange", "level": 2, "subjects": ["CC1MBD", "CC4LBD", "CC6IBDDA"], "prerequisite": "fundamentos"},
    {"id": "programacao", "title": "Programacao", "subtitle": "POO & Paradigmas", "icon": "bi-code-slash", "color": "teal", "level": 2, "subjects": ["CC2POO", "CC5PLDS", "CC5SDT", "CC5QS"], "prerequisite": "fundamentos"},
    {"id": "sistemas", "title": "Sistemas & Redes", "subtitle": "Infraestrutura", "icon": "bi-hdd-network", "color": "cyan", "level": 3, "subjects": ["CC2CLD", "CC3AOC", "CC4RC", "CC4SO", "CC6LFTC", "CC6TRC", "CC7C", "CC7CS"], "prerequisite": "algoritmos"},
    {"id": "ia", "title": "Inteligencia Artificial", "subtitle": "IA & Visao Computacional", "icon": "bi-robot", "color": "purple", "level": 3, "subjects": ["CC6FIA", "CC7IAA", "CC7VC"], "prerequisite": "banco_dados"},
    {"id": "engenharia", "title": "Eng. de Software", "subtitle": "Projetos & Qualidade", "icon": "bi-gear-wide-connected", "color": "red", "level": 3, "subjects": ["CC2ER", "CC3ES", "CC4IHC", "CC6PDSW", "CC3PI1", "CC5PI2", "CC7PI3"], "prerequisite": "programacao"},
    {"id": "pesquisa", "title": "Pesquisa & TCC", "subtitle": "Inovacao & Formatura", "icon": "bi-stars", "color": "yellow", "level": 4, "subjects": ["EO11", "TCC1", "TCC2", "CC8CG"], "prerequisite": None},
]

CAREER_PATHS = [
    {"title": "Engenheiro de IA & ML", "icon": "bi-robot", "desc": "Crie modelos inteligentes com machine learning e visao computacional.", "nodes": ["algoritmos", "matematica", "banco_dados", "ia"]},
    {"title": "Engenheiro de Software", "icon": "bi-code-square", "desc": "Desenvolva software com boas praticas, requisitos e sistemas web.", "nodes": ["fundamentos", "programacao", "engenharia"]},
    {"title": "Especialista em Seguranca", "icon": "bi-shield-check", "desc": "Proteja sistemas com redes, seguranca e ciberdefesa.", "nodes": ["algoritmos", "sistemas"]},
]


def _approved(subs: list[dict[str, Any]], code: str) -> bool:
    return any(x.get("code") == code and x.get("status") == "aprovada" for x in subs)


def _count_approved(subs: list[dict[str, Any]], codes: list[str]) -> int:
    return sum(1 for c in codes if _approved(subs, c))


def _build_achievements(student: dict[str, Any]) -> list[dict[str, Any]]:
    subs = student.get("subjects") or []
    wl = student.get("completedWorkload") or 0
    twl = student.get("totalCourseWorkload") or 1
    wl_pct = wl / twl
    approved_n = sum(1 for s in subs if s.get("status") == "aprovada")
    mandatory_subs = [s for s in subs if s.get("type") != "optativa"]
    total_subs = len(mandatory_subs) or len(subs) or 1
    max_attend = 0
    for s in subs:
        if s.get("status") == "aprovada":
            max_attend = max(max_attend, s.get("attendance") or 0)

    gpa = student.get("gpa") or 0

    achievements = [
        {"id": "primeiro_passo", "name": "Primeiro Passo", "category": "Academica", "icon": "bi-mortarboard", "xp": 50, "desc": "Aprovado em alguma disciplina", "unlocked": approved_n > 0, "progress": min(1.0, approved_n / total_subs)},
        {"id": "dedicado", "name": "Dedicado", "category": "Academica", "icon": "bi-book-half", "xp": 100, "desc": "CR igual ou acima de 7,0", "unlocked": gpa >= 7.0, "progress": min(1.0, gpa / 7.0)},
        {"id": "aluno_destaque", "name": "Aluno Destaque", "category": "Academica", "icon": "bi-trophy", "xp": 200, "desc": "CR igual ou acima de 9,0", "unlocked": gpa >= 9.0, "progress": min(1.0, gpa / 9.0)},
        {"id": "nota_10", "name": "Nota 10", "category": "Academica", "icon": "bi-star-fill", "xp": 150, "desc": "Obteve nota 10,0 em alguma disciplina", "unlocked": any((s.get("grade") or 0) >= 10.0 for s in subs), "progress": 1.0 if any((s.get("grade") or 0) >= 10.0 for s in subs) else 0.0},
        {"id": "sem_faltas", "name": "Sem Faltas", "category": "Academica", "icon": "bi-person-check", "xp": 75, "desc": "100% de presenca em alguma disciplina", "unlocked": any(s.get("status") == "aprovada" and (s.get("attendance") or 0) >= 100 for s in subs), "progress": min(1.0, max_attend / 100.0)},
        {"id": "metade_jornada", "name": "Metade da Jornada", "category": "Academica", "icon": "bi-pie-chart", "xp": 300, "desc": "Completou 50% da carga horaria total", "unlocked": wl_pct >= 0.5, "progress": min(1.0, wl_pct)},
        {"id": "quase_formado", "name": "Quase Formado", "category": "Academica", "icon": "bi-hourglass-bottom", "xp": 500, "desc": "Completou 75% da carga horaria total", "unlocked": wl_pct >= 0.75, "progress": min(1.0, wl_pct)},
        {"id": "formado", "name": "Formado!", "category": "Academica", "icon": "bi-patch-check-fill", "xp": 1000, "desc": "Concluiu o curso completamente", "unlocked": student.get("status") == "formado", "progress": min(1.0, wl_pct)},
        {"id": "programador", "name": "Programador", "category": "Programacao", "icon": "bi-code-slash", "xp": 100, "desc": "Aprovado em POO", "unlocked": _approved(subs, "CC2POO"), "progress": 1.0 if _approved(subs, "CC2POO") else 0.0},
        {"id": "mestre_algoritmos", "name": "Mestre dos Algoritmos", "category": "Programacao", "icon": "bi-diagram-3", "xp": 200, "desc": "Aprovado nas 3 AED", "unlocked": _count_approved(subs, ["CC1AED1", "CC2AED2", "CC3AED3"]) == 3, "progress": _count_approved(subs, ["CC1AED1", "CC2AED2", "CC3AED3"]) / 3.0},
        {"id": "arquiteto", "name": "Arquiteto de Software", "category": "Programacao", "icon": "bi-layers", "xp": 150, "desc": "Aprovado em ER e ES", "unlocked": _count_approved(subs, ["CC2ER", "CC3ES"]) == 2, "progress": _count_approved(subs, ["CC2ER", "CC3ES"]) / 2.0},
        {"id": "guru_bd", "name": "Guru de Banco de Dados", "category": "Programacao", "icon": "bi-database-fill", "xp": 150, "desc": "Aprovado em MBD e LBD", "unlocked": _count_approved(subs, ["CC1MBD", "CC4LBD"]) == 2, "progress": _count_approved(subs, ["CC1MBD", "CC4LBD"]) / 2.0},
        {"id": "esp_redes", "name": "Especialista em Redes", "category": "Infraestrutura", "icon": "bi-hdd-network", "xp": 150, "desc": "Aprovado nas disciplinas de Redes", "unlocked": _count_approved(subs, ["CC4RC", "CC6TRC"]) == 2, "progress": _count_approved(subs, ["CC4RC", "CC6TRC"]) / 2.0},
        {"id": "guardiao", "name": "Guardiao Digital", "category": "Infraestrutura", "icon": "bi-shield-lock", "xp": 200, "desc": "Aprovado em Ciberseguranca", "unlocked": _approved(subs, "CC7CS"), "progress": 1.0 if _approved(subs, "CC7CS") else 0.0},
        {"id": "cientista", "name": "Cientista de Dados", "category": "IA", "icon": "bi-graph-up-arrow", "xp": 200, "desc": "Aprovado em IA, Big Data e IA Aplicada", "unlocked": _count_approved(subs, ["CC6FIA", "CC6IBDDA", "CC7IAA"]) == 3, "progress": _count_approved(subs, ["CC6FIA", "CC6IBDDA", "CC7IAA"]) / 3.0},
        {"id": "visao", "name": "Visao de Futuro", "category": "IA", "icon": "bi-eye", "xp": 200, "desc": "Aprovado em Visao Computacional", "unlocked": _approved(subs, "CC7VC"), "progress": 1.0 if _approved(subs, "CC7VC") else 0.0},
        {"id": "estagiario", "name": "Estagiario", "category": "Marcos", "icon": "bi-briefcase", "xp": 300, "desc": "Completou Estagio Obrigatorio", "unlocked": _approved(subs, "EO11"), "progress": 1.0 if _approved(subs, "EO11") else 0.0},
        {"id": "tcc", "name": "TCC Concluido", "category": "Marcos", "icon": "bi-file-earmark-text", "xp": 500, "desc": "Concluiu o Trabalho de Conclusao de Curso", "unlocked": _approved(subs, "TCC2"), "progress": 1.0 if _approved(subs, "TCC2") else 0.0},
        {"id": "pi1", "name": "Projeto Integrador", "category": "Marcos", "icon": "bi-puzzle", "xp": 150, "desc": "Aprovado no Projeto Integrador I", "unlocked": _approved(subs, "CC3PI1"), "progress": 1.0 if _approved(subs, "CC3PI1") else 0.0},
        {"id": "trilha_pi", "name": "Trilha Completa de Projetos", "category": "Marcos", "icon": "bi-diagram-2", "xp": 400, "desc": "Aprovado nos 3 Projetos Integradores", "unlocked": _count_approved(subs, ["CC3PI1", "CC5PI2", "CC7PI3"]) == 3, "progress": _count_approved(subs, ["CC3PI1", "CC5PI2", "CC7PI3"]) / 3.0},
    ]

    for a in achievements:
        a["progress"] = max(0.0, min(1.0, float(a["progress"])))

    return achievements


def _build_branches(subs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    branches = []
    for b in BRANCHES:
        total = len(b["codes"]) or 1
        done = _count_approved(subs, b["codes"])
        pct = round(done / total * 100)
        branches.append({"label": b["label"], "done": done, "total": total, "pct": pct})
    return branches


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


def _build_subject_buckets(subs: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    return {
        "ongoing": [s for s in subs if s.get("status") == "cursando"],
        "failed": [s for s in subs if s.get("status") == "reprovada"],
        "mandatoryDone": [s for s in subs if s.get("type") == "obrigatoria" and s.get("status") == "aprovada"],
        "optSpecificDone": [s for s in subs if s.get("group") == "[412]" and s.get("status") == "aprovada"],
        "optHumanDone": [s for s in subs if s.get("group") == "[413]" and s.get("status") == "aprovada"],
        "mandatoryMissing": [s for s in subs if s.get("type") == "obrigatoria" and s.get("status") != "aprovada"],
    }


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
