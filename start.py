import os
import sys
from django.core.wsgi import get_wsgi_application

# Adicionar o diretório do projeto ao Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configurar variáveis de ambiente
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'utfpr_egresso.settings.production')

# Aplicar configurações de produção
from django.conf import settings
settings.DEBUG = False

# Obter a aplicação WSGI
application = get_wsgi_application()
