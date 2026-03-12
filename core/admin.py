from django.contrib import admin
from core.models import Aluno, Disciplina, Matricula


@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nome', 'periodo', 'tipo', 'carga_horaria')
    list_filter = ('periodo', 'tipo', 'grupo')
    search_fields = ('codigo', 'nome')


class MatriculaInline(admin.TabularInline):
    model = Matricula
    extra = 0
    fields = ('disciplina', 'status', 'nota', 'frequencia', 'data_conclusao')
    raw_id_fields = ('disciplina',)


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ('registro', 'nome', 'status', 'periodo_atual', 'coeficiente', 'campus')
    list_filter = ('status', 'periodo_atual', 'campus')
    search_fields = ('nome', 'registro', 'email')
    inlines = [MatriculaInline]


@admin.register(Matricula)
class MatriculaAdmin(admin.ModelAdmin):
    list_display = ('aluno', 'disciplina', 'status', 'nota', 'frequencia')
    list_filter = ('status', 'disciplina__periodo')
    search_fields = ('aluno__nome', 'disciplina__codigo')
    raw_id_fields = ('aluno', 'disciplina')
