# CEA — Conexão Egresso-Aluno

Plataforma de acompanhamento de egressos e gamificação acadêmica da UTFPR (multi-campus, multi-curso). Este diretório contém o sistema novo; a POC Django na raiz do repositório está congelada e será aposentada na transição final.

## Stack

Next.js 16 (App Router) · TypeScript strict · Prisma 7 · PostgreSQL 17 (Docker) · Tailwind CSS 4 · Biome · Vitest · Playwright

## Como rodar (3 comandos)

Pré-requisitos: Node 20+, Docker.

```bash
cp .env.example .env && npm install   # 1. dependências (gera o Prisma Client)
npm run setup                          # 2. sobe o Postgres, aplica migrations e roda o seed
npm run dev                            # 3. http://localhost:3000
```

O seed cria o campus Santa Helena com seus 3 cursos e as matrizes curriculares 2026/1 reais (311 disciplinas), a base de gamificação (conquistas, trilhas e carreiras por curso) e os logins mockados abaixo.

## Logins de teste (mockados até a integração com a UTFPR)

Acesse `/login`. Alunos entram com **RA + senha** (aba "Aluno / Egresso"); administradores com **e-mail + senha** (aba "Administração"). Senha de todos os alunos mock: `@teste123`.

| Perfil | Login | Escopo/Curso |
|--------|-------|--------------|
| SUPER_ADMIN | `admin@cea.local` / `@admin123` | global |
| CAMPUS_ADMIN | `campus.sh@cea.local` / `@admin123` | campus Santa Helena |
| COURSE_ADMIN | `coord.cc@cea.local` / `@admin123` | Ciência da Computação |
| Aluno | `a2587246` | Ciência da Computação |
| Aluno | `a2601001` | Agronomia |
| Aluno | `a2601002` | Licenciatura em Ciências Biológicas |
| Egresso | `a2190001` | Ciência da Computação (formada 2023/2) |

Não há cadastro público: contas de aluno virão da integração com a UTFPR (Fase 8) e admins entram por convite (painel → Administradores; o link do convite é copiado do painel — não há envio de e-mail/SMTP, ver `src/server/mailer.ts`). Recuperação de senha não é responsabilidade desta plataforma: acontece no ecossistema da UTFPR (portal do aluno).

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Build e execução de produção |
| `npm run lint` / `format` | Biome (também roda no pre-commit via lint-staged) |
| `npm test` | Testes unitários (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:e2e` | Testes E2E (Playwright); sobe o dev server sozinho |
| `npm run test:e2e:ui` | Mesmo, no modo interativo |
| `npm run setup` | `db:up` + migrations + seed, de uma vez |
| `npm run db:up` | Sobe só o Postgres (`docker compose up -d db`) |
| `npm run db:migrate` | `prisma migrate dev` (cria/aplica migration em dev) |
| `npm run db:deploy` | `prisma migrate deploy` (aplica migrations existentes) |
| `npm run db:seed` | Roda o seed (idempotente) |
| `npm run db:studio` | Prisma Studio (inspeção visual do banco) |
| `./scripts/backup.sh` | Dump do Postgres em `backups/` (formato custom) |
| `./scripts/restore.sh <dump> [url]` | Restaura um dump; sem destino, pede confirmação |

## Estrutura

```
app/
├── prisma/            # schema, migrations e seed (dados reais em prisma/data/)
├── src/
│   ├── app/           # rotas (App Router)
│   ├── components/    # UI (base + domínio) — a partir da Fase 5
│   ├── server/        # TODA a lógica de negócio (services, integrações, auth)
│   └── lib/           # utilitários e validações
├── tests/             # Vitest (regra pura)
├── e2e/               # Playwright (fluxos com navegador + banco)
├── scripts/           # sincronização acadêmica, backup e restore
└── docker-compose.yml # Postgres 17 com volume persistente
```

Regras de arquitetura (decididas na Fase 0 do plano de refatoração):

1. Código em inglês, UI em pt-BR.
2. Componentes de página não contêm lógica de negócio — chamam services de `src/server/`.
3. Todo conteúdo (disciplinas, conquistas, trilhas, níveis) é configurável por curso via banco — nada hardcoded.
4. Dados acadêmicos (matrículas, notas, situação) entram somente pela interface `AcademicDataProvider` (camada de integração com a UTFPR).

## Variáveis de ambiente

Documentadas em [.env.example](.env.example): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e, opcionalmente, `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD`, `LOG_LEVEL`, credenciais da Adzuna e da integração UTFPR.

No boot, `src/lib/env-check.ts` confere essas variáveis. **Em produção**, secret ausente/curto/igual ao exemplo ou `BETTER_AUTH_URL` sem https derrubam a subida — de propósito: sessão assinada com segredo público é forjável. Fora de produção, os mesmos problemas viram só aviso no log.

`BETTER_AUTH_URL` precisa bater **exatamente** com a origem servida (protocolo, host e porta). Divergiu, o Better Auth recusa o login com `Invalid origin` e a tela só fica girando.

## Backup e restore

```bash
./scripts/backup.sh                                   # backups/cea-<data>.dump
./scripts/restore.sh backups/cea-<data>.dump \
  postgresql://cea:cea_dev_password@localhost:5432/cea_restore_test
```

As ferramentas rodam dentro da imagem `postgres:17-alpine`, não com o cliente da máquina — um `pg_dump` mais antigo que o servidor recusa o dump. `backups/` está no `.gitignore`: dado real não é versionado. **Restaure num banco descartável de tempos em tempos** — backup não conferido não é backup.

## Observabilidade

Uma linha por evento em stdout/stderr, JSON quando `NODE_ENV=production` e legível em dev; nível mínimo por `LOG_LEVEL`. Log só sai por `src/server/logger.ts` (`console.*` direto em código de app é o que a revisão da Fase 9 proíbe), e o contexto passa por redação: chave com `password`/`secret`/`token`/`cookie`/`hash` vira `[redacted]` e credencial em connection string é mascarada.

Em `catch` de server action use `actionCatch(evento, erro, mensagem)`: `DomainError` volta como está para o usuário; qualquer outro erro vai inteiro para o log e a tela recebe texto genérico — mensagem de ORM expõe tabela, coluna e às vezes credencial.

## CI

GitHub Actions (`.github/workflows/ci.yml` na raiz do repo), a cada push que toque em `app/`:

- **check** — schema Prisma, Biome, `tsc --noEmit` e Vitest.
- **e2e** — sobe um Postgres 17, aplica migrations + seed e roda a suíte Playwright; o relatório vira artefato quando falha.
