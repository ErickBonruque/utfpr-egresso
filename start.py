import os
import sys
import traceback
from django.core.wsgi import get_wsgi_application

# Adicionar o diretório do projeto ao Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configurar variáveis de ambiente
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'utfpr_egresso.settings_production')


def _ensure_runtime_db_schema():
	"""
	Em Vercel com SQLite em /tmp, cada instância pode iniciar sem tabelas.
	Garante que as migrações sejam aplicadas antes de atender requests.
	"""
	if not os.environ.get('VERCEL'):
		return

	try:
		import django
		django.setup()
		from django.core.management import call_command
		call_command('migrate', interactive=False, run_syncdb=True, verbosity=0)
	except Exception:
		print('Falha ao preparar schema do banco em runtime.', file=sys.stderr)
		traceback.print_exc()


def _ensure_runtime_seed_data():
	"""
	Em Vercel com SQLite efêmero, garante dados mínimos para a POC.
	Carrega dados_fixos.json para manter a base idêntica ao localhost.
	"""
	if not os.environ.get('VERCEL'):
		return

	try:
		import django
		django.setup()
		from core.models import Aluno
		from django.core.management import call_command

		if Aluno.objects.exists():
			return

		# Carregar dados fixos exportados do localhost
		fixture = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dados_fixos.json')
		if os.path.exists(fixture):
			call_command('loaddata', fixture, verbosity=0)
			print(f'dados_fixos.json carregado ({Aluno.objects.count()} alunos).', file=sys.stderr)
		else:
			# Fallback: gerar dados sintéticos se fixture não existir
			call_command(
				'popular_banco',
				ativos=15,
				egressos=5,
				trancados=3,
				evadidos=2,
				limpar=False,
				verbosity=0,
			)
	except Exception:
		print('Falha ao popular dados iniciais em runtime.', file=sys.stderr)
		traceback.print_exc()


_ensure_runtime_db_schema()
_ensure_runtime_seed_data()

# Obter a aplicação WSGI
application = get_wsgi_application()

# Vercel espera 'app' como handler
app = application
