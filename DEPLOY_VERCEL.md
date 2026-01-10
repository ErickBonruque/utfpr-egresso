# Deploy no Vercel

## Passos para fazer o deploy do Sistema CEA no Vercel

### 1. Preparar o repositório

Certifique-se de que todos os arquivos estão no seu repositório Git:
```bash
git add .
git commit -m "Preparando para deploy no Vercel"
git push origin main
```

### 2. Configurar o Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em "New Project"
3. Selecione o repositório do Sistema CEA
4. Configure as seguintes opções:

**Framework Preset**: Other
**Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
**Output Directory**: (deixe em branco)
**Install Command**: `pip install -r requirements.txt`

### 3. Variáveis de Ambiente

No Vercel, adicione as seguintes variáveis de ambiente:
- `DJANGO_SETTINGS_MODULE`: `utfpr_egresso.settings_production`

### 4. Arquivos de Configuração

O projeto já inclui os arquivos necessários:
- `vercel.json`: Configuração do Vercel
- `start.py`: Ponto de entrada WSGI
- `requirements.txt`: Dependências
- `utfpr_egresso/settings_production.py`: Configurações de produção

### 5. Deploy

Após configurar tudo, clique em "Deploy". O Vercel irá:
1. Instalar as dependências Python
2. Coletar arquivos estáticos
3. Fazer o deploy da aplicação

### 6. Acesso

Após o deploy, sua aplicação estará disponível em:
- URL fornecida pelo Vercel (ex: https://utfpr-egresso.vercel.app)
- Login: `[URL]/login/`
- Dashboard: `[URL]/dashboard/`

### Troubleshooting

Se encontrar erros:
1. Verifique os logs de build no Vercel
2. Certifique-se de que todos os arquivos estão no repositório
3. Verifique se as variáveis de ambiente estão corretas
4. Confirme se o `vercel.json` está configurado corretamente

### Observações

- O sistema usa SQLite em produção para simplicidade
- Arquivos estáticos são servidos pelo WhiteNoise
- DEBUG está desativado em produção
- ALLOWED_HOSTS está configurado para aceitar qualquer host
