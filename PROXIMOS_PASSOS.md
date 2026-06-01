# Próximos Passos — Da POC à Plataforma

Documento de planejamento para a saída da fase de Prova de Conceito e construção da plataforma definitiva. Foco em (1) revisão da stack, (2) refatoração para multi-câmpus / multi-curso e (3) o que conseguimos deixar pronto **antes** de termos acesso aos dados reais da UTFPR.

---

## 1. Diagnóstico do que existe hoje

A POC entregou as funcionalidades previstas, mas várias decisões foram feitas assumindo um único curso (Ciência da Computação) e um único câmpus (Santa Helena). Os pontos que precisam evoluir:

| Área | Estado atual (POC) | Limitação para a plataforma real |
|---|---|---|
| **Modelagem** | `Aluno`, `Disciplina`, `Matricula` com `campus` e `curso` como `CharField` default | Não há entidade `Campus` nem `Curso`; impossível ter grades diferentes |
| **Árvore de carreiras** | 11 nós + 8 ramos + 5 trilhas **hardcoded** em `core/progress.py` | Cada curso/câmpus tem áreas distintas — precisa ser configurável |
| **Conquistas** | 42 conquistas hardcoded em `_build_achievements` referenciando códigos de disciplina (`CC1AED1`, etc.) | Códigos não existem fora do CC-SH; precisa virar configuração |
| **XP / Níveis** | Regra fixa em `progress.py` | Cada coordenação pode querer pesos diferentes |
| **Autenticação** | `login.html` é decorativa — troca de aluno via sessão sem senha | Sem login real; sem perfil de coordenador |
| **Dados** | `dados_fixos.json` (6.8 MB) versionado + `db.sqlite3` (5 MB) versionado | Não escala; impede múltiplas instâncias |
| **Deploy** | Vercel + SQLite/Postgres | Vercel é serverless: ruim para Django (cold start, sem jobs longos, FS efêmero) |
| **Frontend** | Templates Django + JS vanilla + Bootstrap 5 | Funciona, mas a árvore/dashboard pedem interatividade que cresce mal sem framework |
| **Vagas** | JobSpy chamado on-demand na request | Scraping em request síncrono → timeout em produção |
| **Ingestão de dados UTFPR** | Inexistente — usa gerador sintético | Não sabemos ainda *como* a UTFPR vai entregar (API? CSV? scraping de SIGAA?) |

---

## 2. Stack proposta

A escolha-guia é: **mudar só o que a POC provou ser limitante**. Django, Bootstrap e Postgres seguem; o que troca é o entorno (hospedagem, autenticação, jobs assíncronos, e a forma como a árvore/conquistas são definidas).

### 2.1 Backend

- **Django 5.x (LTS)** — manter. ORM, admin, migrations e auth já resolvem boa parte do que vem por aí. Atualizar de 4.2 → 5.x agora, antes do código crescer.
- **Django REST Framework** — adicionar. A POC mistura views que renderizam HTML com endpoints `api_*` feitos à mão; conforme o frontend ficar mais interativo, padronizar em DRF reduz retrabalho.
- **PostgreSQL 16** em todos os ambientes — chega de SQLite em dev. Diferenças sutis (constraints, JSON, full-text) só aparecem em produção e a POC já bateu nisso ao precisar do `dados_fixos.json`.
- **Celery + Redis** — para jobs que não cabem em uma request: scraping de vagas (JobSpy), sincronização periódica com a UTFPR quando existir, recálculo de XP/conquistas em lote, envio de e-mail.
- **django-allauth** — autenticação real (e-mail + senha agora; SSO institucional depois). Já suporta SAML/OIDC, então a porta para SSO da UTFPR fica aberta sem refatoração.

### 2.2 Frontend

Duas opções, em ordem de preferência:

**Opção A (recomendada): manter server-rendered + Alpine.js + HTMX**
Mantém o que já existe, adiciona reatividade só onde precisa (árvore, dashboard, filtros). Curva de aprendizado quase zero, deploy continua simples, SEO/acessibilidade vêm de graça. Bootstrap 5 fica.

**Opção B: separar em SPA (Next.js / React + Django REST puro)**
Só vale se planejamos **app mobile** ou se a árvore de carreiras virar realmente interativa (drag-and-drop, edição inline pelo coordenador). Custa um frontend inteiro a mais para manter.

Sugestão: **começar pela Opção A** e migrar páginas pontuais para SPA só se a necessidade aparecer.

### 2.3 Hospedagem

Sair da Vercel. Ela é boa para Next.js, ruim para Django:

- **Railway / Render / Fly.io** — Django + Postgres + Redis + worker Celery na mesma plataforma, com FS persistente e jobs longos. Custo equivalente.
- Manter Vercel **só** se aparecer um frontend Next.js separado.

### 2.4 Observabilidade e qualidade

- **Sentry** (free tier) para erros em produção.
- **GitHub Actions** rodando `pytest` + `ruff` + `mypy` em todo PR. A POC já tem testes, falta o CI.
- **pre-commit** com `ruff`, `black`, `django-upgrade`.

### 2.5 Resumo da stack

```
Backend:        Django 5.x + DRF + Celery
Banco:          PostgreSQL 16 (dev e prod)
Cache/Queue:    Redis
Auth:           django-allauth (e-mail/senha → SSO institucional depois)
Frontend:       Templates Django + Alpine.js + HTMX + Bootstrap 5
Jobs:           Celery worker (JobSpy, sync UTFPR, recálculos)
Hospedagem:     Railway ou Render
Observ.:        Sentry + GitHub Actions (ruff, pytest, mypy)
```

---

## 3. Refatoração para multi-câmpus / multi-curso

O coração da plataforma. Precisa estar pronto **antes** de qualquer integração com dados reais, porque define a forma do schema.

### 3.1 Novas entidades

```
Campus
  - codigo, nome, cidade, estado, ativo

Curso
  - campus (FK)
  - codigo, nome, modalidade (bacharelado/tecnólogo/...)
  - carga_horaria_total, duracao_semestres

MatrizCurricular (versionada)
  - curso (FK)
  - versao, ano_inicio, ativa
  - Substitui o parse do matriz.txt — vira dado no banco

Disciplina
  - matriz (FK)  ← deixa de ser global
  - codigo, nome, carga_horaria, periodo, tipo, grupo

Aluno
  - campus (FK), curso (FK), matriz (FK)  ← em vez dos CharField atuais
  - registro único por campus (não global)

Coordenador
  - user (FK django.contrib.auth.User)
  - campus (FK), curso (FK, opcional — null = todos os cursos do câmpus)
  - permissoes (configura_arvore, configura_conquistas, modera_egressos, ...)
```

### 3.2 Configurabilidade da gamificação

Em vez das listas hardcoded em `progress.py`, modelar:

```
ArvoreCarreira
  - curso (FK)
  - nome, ativa

NoArvore
  - arvore (FK), parent (FK self, null)
  - codigo, nome, descricao, icone, ordem
  - disciplinas (M2M Disciplina)  ← critério "todas aprovadas" para desbloquear

TrilhaCarreira
  - arvore (FK)
  - nome, descricao, area_atuacao
  - nos (M2M NoArvore)

Conquista
  - curso (FK)
  - codigo, nome, descricao, categoria, icone, xp
  - regra (JSONField com DSL)  ← ver §3.3

RegraXP
  - curso (FK)
  - evento (aprovou_disciplina, completou_no, conquista_X, ...)
  - pontos
```

### 3.3 DSL para conquistas

Como cada curso tem disciplinas diferentes, conquistas como `"Sobrevivente de AED" → aprovou em CC1AED1` não podem ser hardcoded. Proposta de DSL simples em JSON, avaliada pelo backend:

```json
{
  "all": [
    {"aprovou": "CC1AED1"},
    {"reprovou_antes_em": "CC1AED1"}
  ]
}
```

Operadores do MVP: `aprovou`, `reprovou`, `nota_min`, `count_aprovadas_no_grupo`, `all`, `any`, `not`. Mantém o coordenador no controle sem precisar deploy de código. **Importante:** avaliar do servidor com whitelist de operadores — nada de `eval()`.

### 3.4 Painel do coordenador

Página separada (`/coord/...`) onde o coordenador autenticado:

1. Faz upload / edita a **matriz curricular** do seu curso (CSV ou formulário).
2. Monta a **árvore de carreiras** (nós, hierarquia, vincula disciplinas).
3. Define **trilhas de carreira** combinando nós.
4. Cria/edita **conquistas** com builder visual da DSL.
5. Ajusta **regras de XP**.
6. **Modera** cadastros voluntários de egressos.
7. Vê o **dashboard administrativo** restrito ao seu câmpus/curso.

O `admin_dashboard.html` que existe vira a base, mas filtrado por `request.user.coordenador.campus_id`.

### 3.5 Isolamento por câmpus

Toda query precisa filtrar por câmpus/curso. Estratégia: middleware que injeta `request.tenant` (câmpus do usuário logado) + manager customizado em cada model:

```python
class CampusManager(models.Manager):
    def for_request(self, request):
        return self.filter(campus=request.tenant)
```

Evita o bug clássico de coordenador de Pato Branco ver aluno de Santa Helena.

---

## 4. Camada de ingestão de dados (o "não sabemos como")

Como ainda não há definição de **como** a UTFPR vai entregar os dados, projetamos uma camada de adaptadores para que o resto da plataforma não dependa disso.

### 4.1 Contrato interno

Definir um *schema canônico* (Pydantic / dataclasses) que representa o que a plataforma consome:

```
CanonicalAluno   { registro, nome, email, curso_codigo, campus_codigo, ... }
CanonicalMatricula { aluno_registro, disciplina_codigo, status, nota, periodo }
CanonicalDisciplina { codigo, nome, carga_horaria, periodo, tipo }
```

Tudo o que entra na plataforma passa por esse formato. O resto do código só conhece o canônico.

### 4.2 Adaptadores plugáveis

```
core/ingestion/
  base.py            # interface Source
  adapters/
    csv_source.py    # upload manual de CSV pelo coord
    json_source.py   # arquivo / endpoint que retorna JSON no formato canônico
    sigaa_source.py  # placeholder p/ quando soubermos o sistema da UTFPR
    api_source.py    # REST genérico (auth configurável)
    sintetico.py     # o que já existe, vira só mais um adapter
```

Cada `Source` implementa:

```python
def fetch_alunos(self) -> Iterator[CanonicalAluno]: ...
def fetch_matriculas(self) -> Iterator[CanonicalMatricula]: ...
def fetch_disciplinas(self) -> Iterator[CanonicalDisciplina]: ...
```

### 4.3 Sincronização

- Job Celery `sync_campus(campus_id)` lê o `Source` configurado para aquele câmpus e faz upsert idempotente.
- Logs de sincronização (`SyncRun`: timestamp, source, ok/erro, contadores) — coordenador vê na UI.
- Botão "sincronizar agora" no painel do coord, além de schedule periódico.

### 4.4 Cadastro voluntário de egresso

Independente de sincronização: egresso entra no site, confirma e-mail, preenche perfil (empresa, cargo, disponibilidade para mentoria), coordenador aprova. Funciona sem nenhum dado da UTFPR.

---

## 5. O que dá para deixar pronto antes dos dados reais

Ordem sugerida de execução. Cada item gera uma plataforma já mais sólida que a POC, e nenhum deles depende de termos a integração com a UTFPR.

### Sprint 1 — Fundação multi-tenant
- [ ] Criar models `Campus`, `Curso`, `MatrizCurricular`, `Coordenador`.
- [ ] Migrar `Disciplina`, `Aluno`, `Matricula` para FK em vez de `CharField`.
- [ ] Data migration: tudo que existe hoje vira "Campus Santa Helena / CC".
- [ ] Manager + middleware de isolamento por tenant.
- [ ] Atualizar todas as queries em `views.py` para filtrar por tenant.

### Sprint 2 — Autenticação real
- [ ] django-allauth com e-mail + senha.
- [ ] Modelos `Coordenador` ligado a `auth.User`.
- [ ] Remover a "troca de aluno" da POC (vira ferramenta de admin só, atrás de feature flag).
- [ ] Fluxo de cadastro voluntário do egresso com confirmação de e-mail.
- [ ] Permissões por grupo (egresso, aluno, coordenador, admin).

### Sprint 3 — Gamificação configurável
- [ ] Models `ArvoreCarreira`, `NoArvore`, `TrilhaCarreira`, `Conquista`, `RegraXP`.
- [ ] Migrar as 11 nós + 5 trilhas + 42 conquistas do CC-SH para fixtures (vira dado, não código).
- [ ] Motor de avaliação da DSL de conquistas (com testes — é o ponto mais crítico).
- [ ] Refatorar `progress.py` para consumir os models em vez das listas hardcoded.

### Sprint 4 — Painel do coordenador
- [ ] CRUD da matriz curricular (upload CSV + edição).
- [ ] Builder da árvore de carreiras.
- [ ] Builder de conquistas (com a DSL).
- [ ] Moderação de egressos cadastrados.
- [ ] Dashboard administrativo filtrado por câmpus.

### Sprint 5 — Camada de ingestão
- [ ] Schema canônico (Pydantic).
- [ ] Adapter CSV + JSON (manual, suficiente para começar).
- [ ] Job Celery `sync_campus` idempotente.
- [ ] Tela de "fontes de dados" no painel do coord.
- [ ] `SyncRun` log com UI.

### Sprint 6 — Infra & qualidade
- [ ] Migrar deploy para Railway/Render (Django + Postgres + Redis + worker).
- [ ] Celery em produção para o JobSpy (parar de chamar scraping na request).
- [ ] CI no GitHub Actions (ruff, pytest, mypy, coverage).
- [ ] Sentry.
- [ ] Tirar `db.sqlite3` e `dados_fixos.json` do versionamento — vira seed de teste só.

### Backlog (depende de informação externa)
- [ ] **Integração real UTFPR** — abre adapter específico quando soubermos o protocolo.
- [ ] **SSO institucional** — quando a UTFPR liberar SAML/OIDC, configurar em allauth.
- [ ] **Testes de usabilidade** com alunos/egressos reais (já previsto no relatório).
- [ ] **App mobile** — só se a Opção B do frontend for tomada.

---

## 6. Riscos e pontos de atenção

- **DSL de conquistas é o item mais arriscado.** Se ficar complexa demais, vira linguagem de programação mal-feita. Manter o conjunto de operadores enxuto e cobrir com muitos testes; resistir à tentação de adicionar `if/else` ou variáveis.
- **Migração de dados da POC** — `dados_fixos.json` foi útil, mas amarrou o projeto a uma fixture gigante. Recriar via management command parametrizado, não via dump.
- **Coordenador editando árvore ao vivo** pode quebrar progresso já calculado de alunos. Versionar a árvore (igual matriz curricular) e congelar histórico.
- **Multi-tenant tem armadilhas de segurança** — toda view nova precisa passar pelo manager `for_request`. Vale escrever um teste meta que pega view sem filtro de tenant.
- **JobSpy quebra com frequência** (scrapers sempre quebram). Isolar atrás de Celery + cache + fallback é obrigatório antes de prometer a feature em produção.
- **LGPD** — quando entrarem dados reais de alunos/egressos, precisamos de termo de consentimento, política de privacidade e endpoint de exclusão. Melhor desenhar isso já no fluxo de cadastro voluntário.

---

## 7. Decisões que precisam de input

Antes de cravar o plano, pontos que dependem de combinação com o orientador / coordenação:

1. **Login do coordenador** — e-mail/senha gerido pela plataforma, ou exigir SSO da UTFPR desde o início?
2. **Frontend** — Opção A (server-rendered evoluído) ou B (SPA Next.js)?
3. **Hospedagem** — Railway, Render ou Fly.io? Há restrição de custo / domínio `.utfpr.edu.br`?
4. **Escopo de cursos no MVP** — só CC ou já modelar para 2-3 cursos como exemplo?
5. **Cadastro de egresso** — moderação manual pelo coordenador ou auto-aprovação com verificação de e-mail institucional?
