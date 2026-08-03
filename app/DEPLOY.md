# Deploy — Sistema CEA (Vercel + Neon)

> Guia do **sistema novo** (diretório `app/`). O `DEPLOY.md` e o `DEPLOY_VERCEL.md` da raiz do repositório são da POC Django, congelada na tag `poc-final`.

**Este deploy é de demonstração.** O sistema só vira produção de verdade quando a base de dados da UTFPR estiver disponível (Fase 8). Até lá ele sobe com `CEA_ENVIRONMENT=demo`: dados do seed, logins de teste ativos e uma faixa no topo dizendo isso a quem abrir.

---

## 1. Banco (Neon)

1. Crie um projeto em [neon.tech](https://neon.tech), região **South America (sa-east-1)** — mesma região do deploy, menos latência por consulta.
2. Copie as **duas** strings de conexão do painel:
   - **Pooled** (host com `-pooler`) → vira `DATABASE_URL`.
   - **Direct** (sem `-pooler`) → vira `DIRECT_URL`.

Por que duas: a aplicação roda em funções serverless que abrem e fecham conexão o tempo todo, então precisa do pooler. Já o `prisma migrate` usa advisory lock e DDL, que o pooler em modo transaction não suporta — por isso `prisma.config.ts` prefere `DIRECT_URL` quando ela existe.

## 2. Projeto na Vercel

Importe o repositório e configure:

| Campo | Valor |
|---|---|
| **Root Directory** | `app` |
| Framework | Next.js (detectado) |
| Build Command | `npm run vercel-build` (já vem do `app/vercel.json`) |

`vercel-build` = `prisma migrate deploy && next build`. As migrations entram no deploy, então subir código com migration pendente não deixa o banco para trás.

## 3. Variáveis de ambiente

Em **Settings → Environment Variables** (marque Production e Preview):

| Variável | Valor | Obrigatória |
|---|---|---|
| `DATABASE_URL` | string **pooled** do Neon | sim |
| `DIRECT_URL` | string **direct** do Neon | sim |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | sim |
| `BETTER_AUTH_URL` | a URL exata do deploy, com `https://` | sim |
| `CEA_ENVIRONMENT` | `demo` | recomendada |
| `LOG_LEVEL` | `info` | não |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | credenciais de [developer.adzuna.com](https://developer.adzuna.com) | não |
| `ACADEMIC_PROVIDER` | deixe ausente (= `seed`) até a UTFPR liberar acesso | não |

⚠️ **`BETTER_AUTH_URL` precisa bater exatamente com a origem servida** — protocolo, host e porta. Se divergir, o login falha com `Invalid origin` no log do servidor e a tela apenas fica girando, sem erro visível. Ao usar domínio próprio, atualize a variável e refaça o deploy.

⚠️ O boot **derruba a aplicação** se `BETTER_AUTH_SECRET` estiver ausente, curto (< 32) ou ainda for `change-me`. É de propósito: sessão assinada com segredo público é forjável. O motivo aparece no log de runtime.

## 4. Primeiro deploy e seed

O build aplica as migrations, mas **não** roda o seed — popular banco automaticamente a cada deploy é receita para sobrescrever dado real no dia em que este ambiente virar produção. Rode uma vez, da sua máquina, apontando para o banco novo:

```bash
cd app
DIRECT_URL="<direct do Neon>" DATABASE_URL="<direct do Neon>" npx prisma db seed
```

O seed é idempotente (`upsert`): pode rodar de novo sem duplicar nada, e é assim que os **logins de teste voltam a funcionar** se alguém trocar uma senha durante os testes.

Ele cria: campus Santa Helena, os 3 cursos com as matrizes 2026/1 reais (311 disciplinas), a base de gamificação e os usuários mockados — os mesmos do `README.md` e do `.planning/LOGINS_MOCK.md`.

## 5. Smoke test

```bash
curl -s https://<seu-deploy>/api/health
# {"status":"ok","environment":"demo","database":"ok","latencyMs":42}
```

Depois, no navegador:

1. `/` mostra a apresentação e a faixa "Ambiente de demonstração".
2. Login como aluno (`a2587246` / `@teste123`) → `/painel` com progresso, nível e mapa curricular.
3. `/arvore`, `/conquistas`, `/vagas`, `/egressos` abrem pelo menu.
4. Login como egressa (`a2190001` / `@teste123`) → card de egresso no painel e aba "Egresso" no perfil.
5. Login como admin (`admin@cea.local` / `@admin123`) → `/admin`, e `/admin/sincronizacao` lista as execuções.
6. Deslogado, `/painel` redireciona para `/login`.

A suíte E2E cobre exatamente esses caminhos e pode ser apontada para o deploy:

```bash
E2E_BASE_URL=https://<seu-deploy> npx playwright test
```

> Ela **escreve no banco** (cria e apaga um campus, liga e desliga a vitrine da egressa). Contra o ambiente de demonstração é aceitável — contra produção, nunca.

## 6. Backup

O Neon já mantém restore point-in-time no plano gratuito (7 dias), o que cobre o acidente comum. Para um backup que você controla:

```bash
cd app
DATABASE_URL="<direct do Neon>" ./scripts/backup.sh
./scripts/restore.sh backups/cea-<data>.dump postgresql://cea:cea_dev_password@localhost:5432/cea_conferencia
```

Backup que nunca foi restaurado não é backup — restaure num banco descartável de vez em quando.

## 7. Rollback

Na Vercel, **Deployments → o deploy anterior → Promote to Production**. O código volta em segundos.

⚠️ **Migration não volta junto.** Se o deploy ruim aplicou uma migration destrutiva, o rollback de código não desfaz o schema: restaure o banco (Neon point-in-time ou o dump do passo 6) antes de promover a versão antiga.

---

## O que falta para virar produção de verdade

1. **Base de dados da UTFPR** (Fase 8) — `ACADEMIC_PROVIDER=utfpr` + `UTFPR_DATABASE_URL`. Roteiro completo em `.planning/decisions/FASE_8_INTEGRACAO_UTFPR.md`.
2. **Trocar `CEA_ENVIRONMENT` para `producao`** — some a faixa de demonstração.
3. **Aposentar os logins mockados** — com a autenticação delegada à UTFPR, o seed de usuários deixa de rodar.
4. **Sincronização agendada** — hoje a rotina roda por CLI ou pelo botão do admin, dentro do request. Com muitos alunos reais isso estoura o tempo limite da Vercel: a saída é um cron chamando uma rota protegida por token, ou mover a rotina para fora.
5. **Domínio institucional e HTTPS próprio** — trocar o `*.vercel.app` e atualizar `BETTER_AUTH_URL`.
6. **Rate limit por conta**, além do por IP que existe hoje (ver `.planning/decisions/FASE_9_QUALIDADE_HARDENING.md`).
