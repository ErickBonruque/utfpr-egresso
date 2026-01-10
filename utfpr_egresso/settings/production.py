from .settings import *
import os

# Configurações de produção
DEBUG = False
ALLOWED_HOSTS = ['*']

# Middleware para arquivos estáticos
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Configurações de segurança
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Configurações de arquivos estáticos
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Configurações de mídia
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Configurações de banco de dados (usando SQLite para simplicidade)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Configurações de sessão
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Desabilitar migrar automaticamente em produção
MIGRATION_MODULES = {}
