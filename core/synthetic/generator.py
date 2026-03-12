"""
Deterministic synthetic student data generator for UTFPR Computer Science.

Usage
-----
    from core.synthetic.generator import get_students

    students = get_students(count=50, seed=42)

Each returned student dict has the shape described in the frontend TypeScript
interface StudentMock, plus ``subjects`` which is the full curriculum progress.

Subject progress rules
----------------------
- ativo  : past periods mostly *aprovada* (some *reprovada*); current period
           all *cursando*; future periods *nao_iniciada*.
- trancado: periods 1..P-1 completed (no *cursando*); period P and later
           *nao_iniciada*.
- evadido : periods 1..P-1 attempted with higher failure rate; period P+ are
           *nao_iniciada*.
- formado : ALL mandatory subjects *aprovada*; chosen optativas *aprovada*;
           missingWorkload == 0.
"""

import math
import unicodedata
from datetime import date
from .curriculum import get_curriculum
from .names import generate_name

# --------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------- #

SEED_DEFAULT = 42
CAMPUS = 'Santa Helena'
COURSE = 'Ciência da Computação'
# Current academic year used for admission-date calculations
_BASE_YEAR = 2026
# Required optional workload (hours) to graduate
REQUIRED_OPTATIVAS_H = 75

# Module-level student cache keyed by (count, seed)
_CACHE: dict = {}


# --------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------- #

def get_students(count: int = 50, seed: int = SEED_DEFAULT):
    """Return a cached list of synthetic student dicts."""
    key = (count, seed)
    if key not in _CACHE:
        _CACHE[key] = _generate_students(count, seed)
    return _CACHE[key]


# --------------------------------------------------------------------- #
# Internal helpers
# --------------------------------------------------------------------- #

def _ascii_lower(text: str) -> str:
    nfkd = unicodedata.normalize('NFD', text.lower())
    return ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')


def _name_to_email(name: str, suffix: int = 0) -> str:
    parts = _ascii_lower(name).split()
    local = f"{parts[0]}.{parts[-1]}" if len(parts) >= 2 else parts[0]
    if suffix:
        local = f"{local}{suffix}"
    return f"{local}@alunos.utfpr.edu.br"


def _fmt(d: date) -> str:
    return d.strftime('%Y-%m-%d')


def _curriculum_year_for_period(period: int) -> int:
    """
    Return the expected admission year for a student currently at *period*.

    Based on the UTFPR academic calendar where odd semesters start in February
    and even semesters start in August:

    Period  1 → admitted 2026  (1st semester 2026)
    Period  2 → admitted 2025  (2nd semester 2025 → now finishing)
    Period  3 → admitted 2025  (1st semester 2026, year 2)
    Period  4 → admitted 2024
    ...
    Period  8 → admitted 2022
    """
    return _BASE_YEAR - (period // 2)


def _completion_year_month(cy: int, period: int):
    """Return (year, month) when a student (admitted year cy) completed period."""
    years_in = (period - 1) // 2
    year = cy + years_in
    month = 7 if period % 2 == 1 else 12
    return year, month


def _completed_at(rng, cy: int, period: int) -> str:
    year, month = _completion_year_month(cy, period)
    day = rng.randint(5, 20)
    return _fmt(date(year, month, day))


def _grade(rng, passing: bool) -> float:
    if passing:
        return round(rng.uniform(5.0, 10.0), 1)
    return round(rng.uniform(0.0, 4.9), 1)


def _attendance(rng, passing: bool) -> int:
    return rng.randint(75, 100) if passing else rng.randint(40, 74)


def _subject_row(subj: dict, status: str, rng, cy: int) -> dict:
    """Build a SubjectProgress dict for a single curriculum subject."""
    passing = status == 'aprovada'
    cursando = status == 'cursando'
    done = status in ('aprovada', 'reprovada')
    return {
        'code': subj['code'],
        'name': subj['name'],
        'workload': subj['workload'],
        'period': subj['period'],
        'type': subj['type'],
        'group': subj.get('group'),
        'status': status,
        'grade': _grade(rng, passing) if done else None,
        'attendance': _attendance(rng, passing or cursando) if (done or cursando) else None,
        'completedAt': _completed_at(rng, cy, subj['period']) if passing else None,
    }


# --------------------------------------------------------------------- #
# Subject-progress generators per status
# --------------------------------------------------------------------- #

def _subjects_ativo(rng, current_period: int, cy: int,
                    mandatory_by_period: dict, optativas_412: list,
                    optativas_413: list) -> list:
    rows = []
    for p in range(1, 9):
        for subj in mandatory_by_period.get(p, []):
            if p < current_period:
                passing = rng.random() > 0.15  # 85 % pass rate
                rows.append(_subject_row(subj, 'aprovada' if passing else 'reprovada', rng, cy))
            elif p == current_period:
                rows.append(_subject_row(subj, 'cursando', rng, cy))
            else:
                rows.append(_subject_row(subj, 'nao_iniciada', rng, cy))

    # Optativas: one from group [412] if period ≥ 2
    if current_period >= 2 and optativas_412:
        opt = rng.choice(optativas_412)
        st = 'aprovada' if current_period > 2 else 'cursando'
        rows.append(_subject_row(opt, st, rng, cy))

    # Optativas: one from group [413] if period ≥ 7
    if current_period >= 7 and optativas_413:
        opt = rng.choice(optativas_413)
        rows.append(_subject_row(opt, 'cursando' if current_period == 7 else 'aprovada', rng, cy))

    return rows


def _subjects_trancado(rng, current_period: int, cy: int,
                       mandatory_by_period: dict, optativas_412: list,
                       optativas_413: list) -> list:
    """
    Trancado: completed attempts up to P-1; P and later are nao_iniciada.
    No *cursando* subjects.
    """
    rows = []
    for p in range(1, 9):
        for subj in mandatory_by_period.get(p, []):
            if p < current_period:
                passing = rng.random() > 0.20
                rows.append(_subject_row(subj, 'aprovada' if passing else 'reprovada', rng, cy))
            else:
                rows.append(_subject_row(subj, 'nao_iniciada', rng, cy))

    if current_period > 2 and optativas_412:
        opt = rng.choice(optativas_412)
        passing = rng.random() > 0.20
        rows.append(_subject_row(opt, 'aprovada' if passing else 'reprovada', rng, cy))

    return rows


def _subjects_evadido(rng, current_period: int, cy: int,
                      mandatory_by_period: dict, optativas_412: list,
                      optativas_413: list) -> list:
    """
    Evadido: attempted up to P-1 with higher failure rate; P+ are nao_iniciada.
    """
    rows = []
    for p in range(1, 9):
        for subj in mandatory_by_period.get(p, []):
            if p < current_period:
                passing = rng.random() > 0.35  # 65 % pass rate – more failures
                rows.append(_subject_row(subj, 'aprovada' if passing else 'reprovada', rng, cy))
            else:
                rows.append(_subject_row(subj, 'nao_iniciada', rng, cy))

    if current_period > 2 and optativas_412:
        opt = rng.choice(optativas_412)
        passing = rng.random() > 0.35
        rows.append(_subject_row(opt, 'aprovada' if passing else 'reprovada', rng, cy))

    return rows


def _subjects_formado(rng, cy: int, mandatory_subjects: list,
                      optativas_412: list, optativas_413: list,
                      required_opt_h: int) -> list:
    rows = []
    for subj in mandatory_subjects:
        rows.append(_subject_row(subj, 'aprovada', rng, cy))

    # Pick optativas until we reach the required workload
    all_opts = list(optativas_412) + list(optativas_413)
    rng.shuffle(all_opts)
    completed_opt_h = 0
    for opt in all_opts:
        if completed_opt_h >= required_opt_h:
            break
        rows.append(_subject_row(opt, 'aprovada', rng, cy))
        completed_opt_h += opt['workload']

    return rows


# --------------------------------------------------------------------- #
# Main generator
# --------------------------------------------------------------------- #

_STATUS_POOL = (
    ['ativo'] * 6 + ['trancado'] * 2 + ['evadido'] * 1 + ['formado'] * 1
)

# Cycle over all periods so every period is represented
_PERIOD_POOL = list(range(1, 9)) * 8  # 64 entries, one per "slot"


def _generate_students(count: int, seed: int) -> list:
    import random as _random
    rng = _random.Random(seed)

    curriculum = get_curriculum()
    mandatory = [s for s in curriculum if s['type'] == 'obrigatoria']
    optativas_412 = [s for s in curriculum if s.get('group') == '[412]']
    optativas_413 = [s for s in curriculum if s.get('group') == '[413]']

    mandatory_by_period: dict = {}
    for s in mandatory:
        mandatory_by_period.setdefault(s['period'], []).append(s)

    total_mandatory_h = sum(s['workload'] for s in mandatory)
    total_course_h = total_mandatory_h + REQUIRED_OPTATIVAS_H

    used_registrations: set = set()
    used_emails: set = set()
    students = []

    for i in range(count):
        status = _STATUS_POOL[i % len(_STATUS_POOL)]

        # ---- period / curriculum year ----------------------------------------
        if status == 'formado':
            current_period = 8
            cy = rng.randint(2019, 2023)
        elif status == 'evadido':
            current_period = rng.randint(2, 7)
            cy = _curriculum_year_for_period(current_period)
            cy -= rng.randint(0, 1)  # possibly an older cohort
            cy = max(2018, cy)
        elif status == 'trancado':
            current_period = rng.randint(2, 7)
            cy = _curriculum_year_for_period(current_period)
        else:  # ativo
            current_period = _PERIOD_POOL[i % len(_PERIOD_POOL)]
            cy = _curriculum_year_for_period(current_period)

        # ---- personal data --------------------------------------------------
        name = generate_name(rng)
        base_email = _name_to_email(name)
        email = base_email
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
        graduation_delay = rng.choice([0, 0, 0, 1, 1, 2])
        expected_graduation = date(cy + 4 + graduation_delay, 12, 15)

        birth_age = rng.randint(17, 22)
        birth_date = date(
            cy - birth_age,
            rng.randint(1, 12),
            rng.randint(1, 28),
        )

        # ---- subject progress -----------------------------------------------
        if status == 'formado':
            subjects = _subjects_formado(
                rng, cy, mandatory, optativas_412, optativas_413, REQUIRED_OPTATIVAS_H
            )
        elif status == 'ativo':
            subjects = _subjects_ativo(
                rng, current_period, cy, mandatory_by_period,
                optativas_412, optativas_413
            )
        elif status == 'trancado':
            subjects = _subjects_trancado(
                rng, current_period, cy, mandatory_by_period,
                optativas_412, optativas_413
            )
        else:  # evadido
            subjects = _subjects_evadido(
                rng, current_period, cy, mandatory_by_period,
                optativas_412, optativas_413
            )

        # ---- computed fields ------------------------------------------------
        completed_h = sum(
            s['workload'] for s in subjects if s['status'] == 'aprovada'
        )
        current_sem_h = sum(
            s['workload'] for s in subjects if s['status'] == 'cursando'
        )
        missing_h = max(0, total_course_h - completed_h)

        approved_grades = [
            s['grade'] for s in subjects
            if s['status'] == 'aprovada' and s['grade'] is not None
        ]
        gpa = (
            round(sum(approved_grades) / len(approved_grades), 2)
            if approved_grades else 0.0
        )

        students.append({
            'id': f'stu-{i + 1:03d}',
            'registration': reg,
            'name': name,
            'email': email,
            'currentPeriod': current_period,
            'status': status,
            'curriculumYear': cy,
            'totalCourseWorkload': total_course_h,
            'completedWorkload': completed_h,
            'missingWorkload': missing_h,
            'currentSemesterWorkload': current_sem_h,
            'gpa': gpa,
            'birthDate': _fmt(birth_date),
            'admissionDate': _fmt(admission_date),
            'expectedGraduation': _fmt(expected_graduation),
            'campus': CAMPUS,
            'course': COURSE,
            'subjects': subjects,
        })

    return students
