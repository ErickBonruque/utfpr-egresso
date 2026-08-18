# Deploy na Vercel

## Overview

Este documento descreve o processo de deploy do Sistema CEA na Vercel, incluindo configuração de variáveis de ambiente, sincronização de dados e troubleshooting.

## Configuração do Projeto

### 1. vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "utfpr_egresso/wsgi.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "utfpr_egresso/wsgi.py"
    }
  ],
  "env": {
    "DJANGO_SETTINGS_MODULE": "utfpr_egresso.settings_production"
  }
}
```

### 2. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no dashboard da Vercel:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DJANGO_SETTINGS_MODULE` | `utfpr_egresso.settings_production` | Settings de produção |
| `DATABASE_URL` | `${postgres}` | URL do PostgreSQL (automática) |
| `SECRET_KEY` | `<chave-secreta>` | Chave secreta do Django |
| `DEBUG` | `False` | Modo debug desativado |
| `ALLOWED_HOSTS` | `.vercel.app` | Hosts permitidos |

## Processo de Deploy

### Deploy Automático (GitHub Integration)

1. Conecte o repositório GitHub à Vercel
2. Configure as variáveis de ambiente
3. Faça push para a branch main
4. Deploy automático será iniciado

### Deploy Manual

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Sincronização de Dados

### Exportar Dados do Localhost

```bash
# Ativar ambiente virtual
source venv/bin/activate

# Exportar dados
python manage.py dumpdata core --natural-foreign --natural-primary > dados_fixos.json

# Opcional: Compactar
gzip dados_fixos.json
```

### Importar na Vercel

```bash
# Acessar o servidor via Vercel CLI
vercel logs

# Executar command de importação
vercel env pull .env
python manage.py base_fixa_vercel
```

### Script de Sincronização Automática

Crie um script `sync_vercel.sh`:

```bash
#!/bin/bash
echo "Exportando dados do localhost..."
source venv/bin/activate
python manage.py dumpdata core --natural-foreign --natural-primary > dados_fixos.json

echo "Fazendo deploy para Vercel..."
git add dados_fixos.json
git commit -m "Update dados_fixos.json"
git push origin main

echo "Aguardando deploy..."
vercel --prod

echo "Configurando base na Vercel..."
vercel run base_fixa_vercel
```

## Configurações de Produção

### settings_production.py

```python
import os
from .settings import *

# Security
DEBUG = False
ALLOWED_HOSTS = ['.vercel.app', 'localhost', '127.0.0.1']
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Database
import dj_database_url
DATABASES = {
    'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
}

# Sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Static Files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

## Troubleshooting

### Erros Comuns

#### 1. ModuleNotFoundError: No module named 'django'
**Solução**: Verifique se requirements.txt está completo e o build está instalando dependências.

#### 2. 502: Bad Gateway
**Causa**: Aplicação não está rodando ou crashou.
**Solução**: Verifique os logs na Vercel.

#### 3. Dados não aparecem
**Causa**: Banco de dados vazio ou desatualizado.
**Solução**: Execute `python manage.py base_fixa_vercel`.

#### 4. Static files não carregam
**Solução**: Execute `python manage.py collectstatic --noinput` no build.

### Debugging

```bash
# Ver logs em tempo real
vercel logs --follow

# Ver builds
vercel ls

# Ver ambiente
vercel env ls

# Acessar shell remoto (se disponível)
vercel env pull .env
python manage.py shell
```

## Performance

### Otimizações Implementadas

1. **Database Indexing**
   - Índices em campos frequentemente consultados
   - Optimized queries no admin dashboard

2. **Caching**
   - Session cookies otimizadas
   - Static files servidos pela Vercel CDN

3. **Lazy Loading**
   - Imagens carregadas sob demanda
   - JavaScript assíncrono

### Monitoramento

Configure monitoramento na Vercel:

1. **Speed Insights**: Métricas de performance
2. **Analytics**: Tráfego e usuários
3. **Logs**: Erros e eventos

## Backup e Recovery

### Backup Automático

```bash
# Script de backup (rodar semanalmente)
python manage.py dumpdata core > backup_$(date +%Y%m%d).json
```

### Recovery

```bash
# Restaurar backup
python manage.py flush --noinput
python manage.py loaddata backup_20240331.json
```

## Segurança

### Best Practices

1. **Variáveis de Ambiente**: Nunca commitar secrets
2. **HTTPS**: Forçado em produção
3. **CORS**: Configurado para domínios específicos
4. **Rate Limiting**: Implementar se necessário
5. **Input Validation**: Sanitizar todos os inputs

### Security Headers

```python
# settings_production.py
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
}
```

## Contato

Para dúvidas sobre o deploy:
- Erick Bonruque: https://github.com/ErickBonruque
- Repository: https://github.com/ErickBonruque/utfpr-egresso
