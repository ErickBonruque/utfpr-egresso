from django.db import models


class Disciplina(models.Model):
    """Disciplina da grade curricular de Ciência da Computação."""

    TIPO_CHOICES = [
        ('obrigatoria', 'Obrigatória'),
        ('optativa', 'Optativa'),
    ]

    codigo = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=200)
    carga_horaria = models.PositiveIntegerField()
    periodo = models.PositiveSmallIntegerField()
    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES)
    grupo = models.CharField(max_length=20, blank=True, null=True,
                             help_text='Grupo de optativas, ex: [412]')

    class Meta:
        ordering = ['periodo', 'codigo']
        verbose_name = 'Disciplina'
        verbose_name_plural = 'Disciplinas'

    def __str__(self):
        return f'{self.codigo} - {self.nome}'


class Aluno(models.Model):
    """Aluno do curso de Ciência da Computação."""

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('trancado', 'Trancado'),
        ('evadido', 'Evadido'),
        ('formado', 'Formado'),
    ]

    AVAILABILITY_CHOICES = [
        ('alta', 'Muito disponível'),
        ('media', 'Moderadamente disponível'),
        ('baixa', 'Pouco disponível'),
    ]

    registro = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    periodo_atual = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ativo')
    ano_curriculo = models.PositiveIntegerField()
    carga_horaria_total = models.PositiveIntegerField(default=0)
    carga_horaria_cumprida = models.PositiveIntegerField(default=0)
    carga_horaria_pendente = models.PositiveIntegerField(default=0)
    carga_horaria_semestre = models.PositiveIntegerField(default=0)
    coeficiente = models.FloatField(default=0.0)
    data_nascimento = models.DateField()
    data_ingresso = models.DateField()
    previsao_formatura = models.DateField()
    campus = models.CharField(max_length=100, default='Santa Helena')
    curso = models.CharField(max_length=200, default='Ciência da Computação')

    # Novos campos para egressos e mentoria
    cargo = models.CharField(max_length=150, blank=True, null=True, help_text='Cargo/Posição atual do egresso')
    empresa = models.CharField(max_length=200, blank=True, null=True, help_text='Empresa atual do egresso')
    trabalha_remoto = models.BooleanField(default=False, help_text='Trabalha em modelo remoto')
    disponibilidade = models.CharField(max_length=10, choices=AVAILABILITY_CHOICES, default='media',
                                       help_text='Disponibilidade para mentoria')
    areas_mentoria = models.TextField(blank=True, null=True,
                                      help_text='Áreas de expertise para mentoria (separadas por comma)')
    is_admin = models.BooleanField(default=False,
                                   help_text='Acesso ao painel administrativo')

    class Meta:
        ordering = ['registro']
        verbose_name = 'Aluno'
        verbose_name_plural = 'Alunos'

    def __str__(self):
        return f'{self.registro} - {self.nome}'

    def percentual_conclusao(self):
        if self.carga_horaria_total > 0:
            return round(self.carga_horaria_cumprida / self.carga_horaria_total * 100)
        return 0


class Matricula(models.Model):
    """Matrícula de um aluno em uma disciplina (progresso individual)."""

    STATUS_CHOICES = [
        ('aprovada', 'Aprovada'),
        ('reprovada', 'Reprovada'),
        ('cursando', 'Cursando'),
        ('nao_iniciada', 'Não Iniciada'),
    ]

    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE,
                              related_name='matriculas')
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE,
                                   related_name='matriculas')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES,
                              default='nao_iniciada')
    nota = models.FloatField(blank=True, null=True)
    frequencia = models.PositiveSmallIntegerField(blank=True, null=True,
                                                   help_text='Percentual de presença')
    data_conclusao = models.DateField(blank=True, null=True)

    class Meta:
        ordering = ['disciplina__periodo', 'disciplina__codigo']
        verbose_name = 'Matrícula'
        verbose_name_plural = 'Matrículas'
        unique_together = ['aluno', 'disciplina']

    def __str__(self):
        return f'{self.aluno.nome} — {self.disciplina.codigo} ({self.status})'
