# Como contribuir

Projeto de pesquisa da UTFPR — Campus Santa Helena. O repositório é público
para leitura e avaliação científica, mas **não aceita contribuições externas**:
veja a [LICENSE](LICENSE). Este documento vale para a equipe do projeto.

## Autoria

**Nenhuma assinatura de ferramenta de IA entra no repositório.** Nem em
mensagem de commit, nem em comentário de código, nem em documentação.

Concretamente, não commite:

- trailers `Co-Authored-By:` apontando para Claude, Copilot, ChatGPT, Gemini,
  Cursor, Codex, Devin ou qualquer outro assistente;
- linhas do tipo `🤖 Generated with ...`, `Assisted-By:`, `AI-generated`;
- comentários de código que atribuam a autoria a uma ferramenta
  (`// gerado por IA`, `# Claude sugeriu ...`);
- nomes de branch derivados de ferramenta (`claude/...`, `copilot/...`).

Nomeie branches pelo que elas fazem: `fix/login-bloqueio-temporario`,
`feat/vitrine-egressos`.

**Por quê.** O trabalho é submetido a periódico científico e é objeto de
pedido de propriedade industrial. A autoria declarada no artigo precisa bater
com a autoria registrada no histórico do repositório: um trailer de
coautoria nomeando uma ferramenta cria uma discrepância que a revista pode
tratar como problema de autoria, e ruído desnecessário na análise de
titularidade junto à UTFPR. Ferramenta de IA é instrumento de trabalho, como
um compilador ou uma IDE — instrumentos não assinam a obra.

Isso **não** proíbe usar assistentes de IA no desenvolvimento. Proíbe
registrá-los como autores. A responsabilidade pelo código commitado é sempre
de quem assina o commit.

O hook `commit-msg` (`app/.husky/commit-msg`) recusa mensagens com essas
assinaturas. Ele é instalado pelo `npm install` dentro de `app/`.

### Se uma assinatura escapou

Ainda não empurrado, no último commit:

```bash
git commit --amend
```

Já empurrado: avise antes de reescrever, porque exige `--force-with-lease` e
todo mundo precisa realinhar a cópia local.

## Commits

Convenção `tipo(escopo): resumo no imperativo`, em português:

```
feat(app): vitrine de egressos com filtro por curso
fix(app): login para de acusar senha errada quando o bloqueio é temporário
docs: atualiza instruções de deploy
```

Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
Escopo `app` para o sistema Next.js; sem escopo para a raiz do repositório.

O corpo explica **por que**, não o que — o diff já mostra o que mudou.

## O que não é versionado

Fora do git, por decisão (ver [.gitignore](.gitignore)):

| Item | Motivo |
|------|--------|
| `artigo*/`, `*.docx` | manuscritos e material de submissão |
| `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.cursor/` | contexto de ferramentas de IA |
| `.planning/` | planejamento interno |
| `.env`, `.env.*` (exceto `.env.example`) | credenciais |
| `db.sqlite3`, `app/backups/` | bancos e dumps |

Segredo nenhum entra no repositório, nem em teste, nem em fixture, nem em
comentário. Toda variável nova precisa aparecer em `app/.env.example` com
valor de exemplo — nunca com o valor real.

## Antes de abrir PR

Dentro de `app/`:

```bash
npm run lint && npm run typecheck && npm test
npx playwright test          # E2E; sobe Postgres via Docker
```

O CI (`.github/workflows/ci.yml`) roda os mesmos passos a cada push que toque
em `app/`.

## Dados

Todo dado de aluno e egresso no repositório é **sintético**. Nenhum dado real
de terceiro — de seed, de teste ou de dump — pode ser commitado. Quando a
integração com a base da UTFPR entrar em produção, os dados ficam no banco,
nunca no git.

Única exceção existente: o histórico escolar verídico do autor em
`core/management/commands/seed_erick_e_egressos.py`, publicado pelo próprio
titular. Não abra precedente com dado de outra pessoa.
