# CEA — Conexão Egresso-Aluno

Plataforma de acompanhamento de egressos e gamificação acadêmica da UTFPR (multi-campus, multi-curso). Este diretório contém o sistema novo; a POC Django na raiz do repositório está congelada e será aposentada na transição final.

## Stack

Next.js 16 (App Router) · TypeScript strict · Prisma 7 · PostgreSQL 17 (Docker) · Tailwind CSS 4 · Biome · Vitest

## Como rodar (3 comandos)

Pré-requisitos: Node 20+, Docker.

```bash
cp .env.example .env && npm install   # 1. dependências (gera o Prisma Client)
npm run setup                          # 2. sobe o Postgres, aplica migrations e roda o seed
npm run dev                            # 3. http://localhost:3000
```

O seed cria o campus Santa Helena com seus 3 cursos e as matrizes curriculares 2026/1 reais (311 disciplinas).

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Build e execução de produção |
| `npm run lint` / `format` | Biome (também roda no pre-commit via lint-staged) |
| `npm test` | Testes unitários (Vitest) |
| `npm run setup` | `db:up` + migrations + seed, de uma vez |
| `npm run db:up` | Sobe só o Postgres (`docker compose up -d db`) |
| `npm run db:migrate` | `prisma migrate dev` (cria/aplica migration em dev) |
| `npm run db:deploy` | `prisma migrate deploy` (aplica migrations existentes) |
| `npm run db:seed` | Roda o seed (idempotente) |
| `npm run db:studio` | Prisma Studio (inspeção visual do banco) |

## Estrutura

```
app/
├── prisma/            # schema, migrations e seed (dados reais em prisma/data/)
├── src/
│   ├── app/           # rotas (App Router)
│   ├── components/    # UI (base + domínio) — a partir da Fase 5
│   ├── server/        # TODA a lógica de negócio (services, integrações, auth)
│   └── lib/           # utilitários e validações
├── tests/             # Vitest
└── docker-compose.yml # Postgres 17 com volume persistente
```

Regras de arquitetura (decididas na Fase 0 do plano de refatoração):

1. Código em inglês, UI em pt-BR.
2. Componentes de página não contêm lógica de negócio — chamam services de `src/server/`.
3. Todo conteúdo (disciplinas, conquistas, trilhas, níveis) é configurável por curso via banco — nada hardcoded.
4. Dados acadêmicos (matrículas, notas, situação) entram somente pela interface `AcademicDataProvider` (camada de integração com a UTFPR).

## Variáveis de ambiente

Documentadas em [.env.example](.env.example). Por enquanto só `DATABASE_URL`.

## CI

GitHub Actions (`.github/workflows/ci.yml` na raiz do repo): valida o schema Prisma, lint (Biome) e testes (Vitest) a cada push que toque em `app/`.
