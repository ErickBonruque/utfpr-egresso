"""
Parse the UTFPR Computer Science curriculum matrix from matriz.txt.

Returns a list of subject dicts with the following fields:
  - code (str): subject code, e.g. "CC1AED1"
  - name (str): display name with proper PT-BR capitalisation
  - workload (int): workload in hours
  - period (int): semester number 1-8
  - type (str): "obrigatoria" or "optativa"
  - group (str|None): elective group identifier, e.g. "[412]", or None
"""

import re
from pathlib import Path

_CURRICULUM_CACHE = None

# Roman numerals and abbreviations that should remain uppercase
_ROMAN = {'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'}

# Articles/prepositions kept lowercase in the middle of a title
_SMALL_WORDS = {
    'e', 'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os',
    'em', 'na', 'no', 'nas', 'nos', 'para', 'com', 'por', 'à', 'ao',
    'às', 'aos', 'um', 'uma',
}


def get_curriculum():
    """Return the cached parsed curriculum (list of subject dicts)."""
    global _CURRICULUM_CACHE
    if _CURRICULUM_CACHE is None:
        _CURRICULUM_CACHE = _parse_curriculum()
    return _CURRICULUM_CACHE


def _parse_curriculum():
    from django.conf import settings
    matrix_path = Path(settings.BASE_DIR) / 'matriz.txt'
    subjects = []

    with open(matrix_path, 'r', encoding='utf-8') as fh:
        for raw_line in fh:
            line = raw_line.strip()
            # Skip separator and empty lines; header will fail the digit regex below
            if not line.startswith('|') or '---' in line:
                continue

            cols = [c.strip() for c in line.split('|')]
            cols = [c for c in cols if c]  # drop empty strings from split edges

            if len(cols) < 6:
                continue

            periodo_str, tipo_str, grupo_str, codigo, disciplina, ch_str = (
                cols[0], cols[1], cols[2], cols[3], cols[4], cols[5]
            )

            m = re.match(r'(\d+)', periodo_str)
            if not m:
                continue
            period = int(m.group(1))
            if period < 1 or period > 8:
                continue

            subject_type = 'optativa' if 'Optativa' in tipo_str else 'obrigatoria'
            group = grupo_str if grupo_str != '-' else None

            ch_match = re.search(r'\d+', ch_str)
            workload = int(ch_match.group()) if ch_match else 0

            subjects.append({
                'code': codigo,
                'name': _title_case_pt(disciplina),
                'workload': workload,
                'period': period,
                'type': subject_type,
                'group': group,
            })

    return subjects


def _title_case_pt(text):
    """Convert all-caps or irregular title-case text to proper PT-BR title case."""
    words = text.lower().split()
    result = []
    for idx, word in enumerate(words):
        if word in _ROMAN:
            result.append(word.upper())
        elif idx == 0 or word not in _SMALL_WORDS:
            result.append(word.capitalize())
        else:
            result.append(word)
    return ' '.join(result)
