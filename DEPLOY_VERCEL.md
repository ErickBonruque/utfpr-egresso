# Deploy no Vercel

## Deploy Automatico

O projeto esta configurado para deploy automatico na Vercel. Basta:

1. Conectar o repositorio GitHub na Vercel
2. Selecionar o repositorio
3. Clicar em "Deploy"

A Vercel detectara automaticamente as configuracoes do `vercel.json`.

## Arquivos de Configuracao

- `vercel.json` - Configuracao da Vercel (rotas, runtime Python 3.9)
- `start.py` - Ponto de entrada WSGI
- `requirements.txt` - Dependencias (Django 4.2.9)
- `utfpr_egresso/settings_production.py` - Configuracoes de producao
- `staticfiles/` - Arquivos estaticos pre-coletados

## Rotas Disponiveis

- `/` - Pagina inicial (login)
- `/login/` - Login
- `/dashboard/` - Dashboard
- `/egressos/` - Egressos
- `/vagas/` - Vagas
- `/conquistas/` - Conquistas
- `/arvore/` - Arvore de carreiras

## Observacoes Tecnicas

- **Framework**: Django 4.2.9 LTS
- **Runtime**: Python 3.9
- **Arquivos estaticos**: Servidos pelo WhiteNoise
- **Banco de dados**: SQLite em `/tmp` (ambiente serverless)
- **DEBUG**: Desativado em producao
