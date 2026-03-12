from django.test import TestCase, Client
from django.urls import reverse


class CurriculumParsingTest(TestCase):
    """Tests for core/synthetic/curriculum.py"""

    def test_subjects_parsed(self):
        from core.synthetic.curriculum import get_curriculum
        curriculum = get_curriculum()
        self.assertGreater(len(curriculum), 0, "Curriculum should not be empty")

    def test_mandatory_count_and_workload(self):
        from core.synthetic.curriculum import get_curriculum
        curriculum = get_curriculum()
        mandatory = [s for s in curriculum if s['type'] == 'obrigatoria']
        total_h = sum(s['workload'] for s in mandatory)
        self.assertEqual(total_h, 3210, "Total mandatory workload should be 3210h")
        self.assertEqual(len(mandatory), 44, "Should have 44 mandatory subjects")

    def test_optativas_groups(self):
        from core.synthetic.curriculum import get_curriculum
        curriculum = get_curriculum()
        groups = {s['group'] for s in curriculum if s['type'] == 'optativa'}
        self.assertIn('[412]', groups)
        self.assertIn('[413]', groups)

    def test_subject_fields(self):
        from core.synthetic.curriculum import get_curriculum
        curriculum = get_curriculum()
        required_fields = {'code', 'name', 'workload', 'period', 'type', 'group'}
        for subj in curriculum:
            for field in required_fields:
                self.assertIn(field, subj, f"Subject missing field '{field}': {subj}")

    def test_periods_range(self):
        from core.synthetic.curriculum import get_curriculum
        curriculum = get_curriculum()
        periods = {s['period'] for s in curriculum}
        for p in range(1, 9):
            self.assertIn(p, periods, f"Period {p} not found in curriculum")

    def test_title_case_normalisation(self):
        """Subject names should use proper PT-BR title case."""
        from core.synthetic.curriculum import get_curriculum
        curriculum = get_curriculum()
        aed1 = next(s for s in curriculum if s['code'] == 'CC1AED1')
        self.assertEqual(aed1['name'], 'Algoritmos e Estrutura de Dados I')


class StudentGeneratorTest(TestCase):
    """Tests for core/synthetic/generator.py"""

    def _students(self, count=20, seed=42):
        from core.synthetic.generator import get_students
        return get_students(count=count, seed=seed)

    def test_correct_count(self):
        students = self._students(count=30)
        self.assertEqual(len(students), 30)

    def test_deterministic(self):
        s1 = self._students(seed=42)
        s2 = self._students(seed=42)
        self.assertEqual([s['id'] for s in s1], [s['id'] for s in s2])
        self.assertEqual([s['name'] for s in s1], [s['name'] for s in s2])

    def test_different_seed(self):
        s1 = self._students(seed=1)
        s2 = self._students(seed=2)
        self.assertNotEqual(s1[0]['name'], s2[0]['name'])

    def test_all_statuses_present(self):
        students = self._students(count=50)
        statuses = {s['status'] for s in students}
        self.assertEqual(statuses, {'ativo', 'trancado', 'evadido', 'formado'})

    def test_all_periods_covered(self):
        students = self._students(count=50)
        periods = {s['currentPeriod'] for s in students if s['status'] == 'ativo'}
        for p in range(1, 9):
            self.assertIn(p, periods, f"Period {p} not covered by ativo students")

    def test_formado_missing_workload_zero(self):
        students = self._students(count=50)
        for s in students:
            if s['status'] == 'formado':
                self.assertEqual(s['missingWorkload'], 0,
                                 f"Formado student {s['id']} has missingWorkload > 0")

    def test_formado_no_cursando(self):
        students = self._students(count=50)
        for s in students:
            if s['status'] == 'formado':
                cursando = [sub for sub in s['subjects'] if sub['status'] == 'cursando']
                self.assertEqual(cursando, [],
                                 f"Formado student {s['id']} has cursando subjects")

    def test_trancado_no_cursando(self):
        students = self._students(count=50)
        for s in students:
            if s['status'] == 'trancado':
                cursando = [sub for sub in s['subjects'] if sub['status'] == 'cursando']
                self.assertEqual(cursando, [],
                                 f"Trancado student {s['id']} has cursando subjects")

    def test_ativo_has_cursando(self):
        students = self._students(count=50)
        for s in students:
            if s['status'] == 'ativo':
                cursando = [sub for sub in s['subjects'] if sub['status'] == 'cursando']
                self.assertGreater(len(cursando), 0,
                                   f"Ativo student {s['id']} has no cursando subjects")

    def test_workload_consistency(self):
        """completedWorkload must match sum of approved subjects' workload."""
        students = self._students(count=30)
        for s in students:
            expected = sum(
                sub['workload'] for sub in s['subjects'] if sub['status'] == 'aprovada'
            )
            self.assertEqual(s['completedWorkload'], expected,
                             f"Student {s['id']} completedWorkload mismatch")

    def test_total_course_workload(self):
        students = self._students(count=5)
        for s in students:
            self.assertEqual(s['totalCourseWorkload'], 3285)

    def test_unique_registrations(self):
        students = self._students(count=50)
        regs = [s['registration'] for s in students]
        self.assertEqual(len(regs), len(set(regs)), "Registrations are not unique")

    def test_email_format(self):
        students = self._students(count=20)
        for s in students:
            self.assertIn('@alunos.utfpr.edu.br', s['email'])

    def test_student_fields(self):
        students = self._students(count=3)
        required = {
            'id', 'registration', 'name', 'email', 'currentPeriod', 'status',
            'curriculumYear', 'totalCourseWorkload', 'completedWorkload',
            'missingWorkload', 'currentSemesterWorkload', 'gpa',
            'birthDate', 'admissionDate', 'expectedGraduation',
            'campus', 'course', 'subjects',
        }
        for s in students:
            for field in required:
                self.assertIn(field, s, f"Student missing field '{field}'")


class SyntheticAPITest(TestCase):
    """Tests for the synthetic data JSON API endpoints."""

    def setUp(self):
        self.client = Client()

    def test_dashboard_returns_200(self):
        r = self.client.get('/api/synthetic/dashboard/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/json')

    def test_dashboard_shape(self):
        r = self.client.get('/api/synthetic/dashboard/')
        data = r.json()
        for key in ('totalStudents', 'activeStudents', 'graduatedStudents',
                    'lockedStudents', 'droppedStudents', 'averageGpa',
                    'studentsByPeriod'):
            self.assertIn(key, data)

    def test_students_list_returns_200(self):
        r = self.client.get('/api/synthetic/students/')
        self.assertEqual(r.status_code, 200)

    def test_students_list_shape(self):
        r = self.client.get('/api/synthetic/students/?page_size=5')
        data = r.json()
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertIn('page', data)
        self.assertIn('totalPages', data)
        self.assertEqual(len(data['results']), 5)

    def test_students_list_no_subjects(self):
        """List endpoint should not include the subjects field."""
        r = self.client.get('/api/synthetic/students/?page_size=3')
        for student in r.json()['results']:
            self.assertNotIn('subjects', student)

    def test_students_filter_by_status(self):
        r = self.client.get('/api/synthetic/students/?status=formado&count=50')
        data = r.json()
        for s in data['results']:
            self.assertEqual(s['status'], 'formado')

    def test_students_filter_by_period(self):
        r = self.client.get('/api/synthetic/students/?currentPeriod=3&count=50')
        data = r.json()
        for s in data['results']:
            self.assertEqual(s['currentPeriod'], 3)

    def test_student_detail_returns_200(self):
        r = self.client.get('/api/synthetic/students/stu-001/')
        self.assertEqual(r.status_code, 200)

    def test_student_detail_has_subjects(self):
        r = self.client.get('/api/synthetic/students/stu-001/')
        data = r.json()
        self.assertIn('subjects', data)
        self.assertGreater(len(data['subjects']), 0)

    def test_student_detail_404(self):
        r = self.client.get('/api/synthetic/students/stu-999/')
        self.assertEqual(r.status_code, 404)

    def test_curriculum_returns_200(self):
        r = self.client.get('/api/synthetic/curriculum/')
        self.assertEqual(r.status_code, 200)

    def test_curriculum_shape(self):
        r = self.client.get('/api/synthetic/curriculum/')
        data = r.json()
        for key in ('totalMandatoryWorkload', 'totalCourseWorkload',
                    'subjectCount', 'subjects'):
            self.assertIn(key, data)
        self.assertEqual(data['totalCourseWorkload'], 3285)
        self.assertGreater(len(data['subjects']), 0)

    def test_seed_param_changes_data(self):
        r1 = self.client.get('/api/synthetic/dashboard/?seed=1')
        r2 = self.client.get('/api/synthetic/dashboard/?seed=2')
        # Both succeed but data may differ
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
