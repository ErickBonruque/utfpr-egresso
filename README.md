# Sistema CEA - Conexão Egresso-Aluno

## Descrição

Sistema para acompanhamento de egressos e pontuação de alunos da UTFPR - Campus Santa Helena. O sistema features uma "Árvore de Carreiras" onde os alunos podem acompanhar seu progresso acadêmico, ver conquistas, conectar-se com egressos e explorar oportunidades de carreira.

## Stack Tecnológico

- **Backend**: Django 6.0.1
- **Frontend**: Bootstrap 5, Bootstrap Icons
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção Vercel)
- **Python**: 3.12
- **Deployment**: Vercel

## Estrutura do Projeto

```
utfpr_egresso/
├── core/                           # App principal
│   ├── management/commands/        # Commands customizados
│   │   ├── popular_banco.py       # Gera dados sintéticos
│   │   ├── base_fixa_vercel.py    # Configura base fixa para produção
│   │   └── adicionar_erick.py     # Adiciona usuário Erick
│   ├── models.py                  # Models: Aluno, Disciplina, Matricula
│   ├── views.py                   # Views principais
│   ├── serializers.py             # Serializers para API
│   ├── progress.py                # Lógica de progresso do aluno
│   ├── synthetic/                 # Módulo de dados sintéticos
│   │   ├── curriculum.py          # Parse da matriz curricular
│   │   ├── names.py               # Nomes PT-BR para geração
│   │   └── generator.py           # Gerador de dados
│   ├── templates/                 # Templates HTML
│   │   ├── base.html              # Template base
│   │   ├── dashboard.html         # Dashboard principal
│   │   ├── arvore.html            # Árvore de carreiras
│   │   ├── conquistas.html        # Conquistas
│   │   ├── perfil.html            # Perfil do aluno
│   │   └── partials/              # Componentes reutilizáveis
│   └── static/                    # Arquivos estáticos
├── utfpr_egresso/                 # Configurações do projeto
│   ├── settings.py                # Configurações
│   ├── settings_production.py     # Configurações de produção
│   └── urls.py                    # URLs principais
├── dados_fixos.json               # Backup dos dados fixos
├── matriz.txt                     # Matriz curricular real
└── requirements.txt               # Dependências Python
```

## Como Executar Localmente

1. **Clonar o repositório**:
   ```bash
   git clone https://github.com/ErickBonruque/utfpr-egresso.git
   cd utfpr-egresso
   ```

2. **Criar e ativar ambiente virtual**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # ou
   venv\Scripts\activate     # Windows
   ```

3. **Instalar dependências**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Rodar as migrações**:
   ```bash
   python manage.py migrate
   ```

5. **Popular banco de dados**:
   ```bash
   # Opção 1: Base fixa (recomendado)
   python manage.py popular_banco --base-fixa
   
   # Opção 2: Parâmetros customizados
   python manage.py popular_banco --ativos 500 --egressos 300 --seed 42
   
   # Opção 3: Adicionar Erick manualmente
   python manage.py adicionar_erick
   ```

6. **Coletar arquivos estáticos**:
   ```bash
   python manage.py collectstatic --noinput
   ```

7. **Iniciar o servidor**:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

8. **Acessar o sistema**:
   - Dashboard: http://localhost:8000/dashboard/
   - Árvore de Carreiras: http://localhost:8000/arvore/
   - Egressos: http://localhost:8000/egressos/
   - Admin: http://localhost:8000/admin/

## Funcionalidades Implementadas

### ✅ Sistema de Alunos
- **Troca de Aluno**: Modal para selecionar aluno ativo
- **Dashboard Personalizado**: Progresso individual, XP, níveis
- **Perfil Completo**: Histórico acadêmico, conquistas, estatísticas

### ✅ Árvore de Carreiras
- **11 Nós de Progresso**: Fundamentos, Algoritmos, Matemática, etc.
- **8 Ramos Especializados**: IA/ML, Software, Segurança, etc.
- **5 Trilhas de Carreira**: Com base em habilidades e interesses

### ✅ Sistema de Conquistas
- **42 Conquistas Totais**: Distribuídas em 6 categorias
- **Categorias**: Acadêmica, Programação, Infraestrutura, IA, Marcos, Humorística
- **Conquistas Especiais**: Fênix Acadêmica, Sobrevivente de AED, etc.

### ✅ Egressos
- **Vitrine Pública**: Perfil de egressos formados
- **Sistema de Mentoria**: Áreas de disponibilidade
- **Dados Profissionais**: Empresa, cargo, LinkedIn, GitHub

### ✅ Vagas de Emprego
- **Integração JobSpy**: Busca em tempo real
- **Filtros Avançados**: Localização, tipo, remoto
- **Fontes Múltiplas**: Indeed, LinkedIn, Glassdoor

### ✅ Admin Dashboard
- **Métricas Agregadas**: Estatísticas do curso
- **Análise de Evasão**: Por período e GPA
- **Disciplinas Difíceis**: Taxa de aprovação
- **Insights de Egressos**: Empresas, áreas de mentoria

## API Endpoints

### Alunos
- `GET /api/alunos-ativos/` - Lista alunos ativos (para modal de troca)
- `GET /api/alunos/<id>/` - Detalhes do aluno (próprio aluno apenas)
- `POST /api/trocar-aluno/` - Troca aluno da sessão

### Egressos
- `GET /api/egressos/` - Vitrine pública de egressos
- Parâmetros: `search`, `campus`

### Vagas
- `GET /api/vagas/` - Busca vagas via JobSpy
- Parâmetros: `search_term`, `estado`, `cidade`, `job_type`, `is_remote`

## Management Commands

### `popular_banco`
Gera dados sintéticos para teste:
```bash
python manage.py popular_banco --ativos 500 --egressos 300 --seed 42 --limpar
```

Opções:
- `--ativos`: Quantidade de alunos ativos (default: 500)
- `--egressos`: Quantidade de formados (default: 20)
- `--trancados`: Quantidade de trancados (default: 80)
- `--evadidos`: Quantidade de evadidos (default: 50)
- `--seed`: Seed para reprodutibilidade (default: 42)
- `--limpar`: Limpa dados antes de popular
- `--base-fixa`: Usa valores canônicos (600 ativos, 30 formados, etc.)

### `base_fixa_vercel`
Configura base fixa para produção na Vercel:
```bash
python manage.py base_fixa_vercel
```

### `adicionar_erick`
Adiciona Alex Silva Demo como aluno admin:
```bash
python manage.py adicionar_erick
```

## Deploy na Vercel

### Configuração
1. **Variáveis de Ambiente**:
   - `DJANGO_SETTINGS_MODULE`: `utfpr_egresso.settings_production`
   - `DATABASE_URL`: URL do PostgreSQL (fornecida pela Vercel)
   - `SECRET_KEY`: Chave secreta do Django

2. **Build Command**:
   ```bash
   python manage.py collectstatic --noinput
   ```

3. **Start Command**:
   ```bash
   gunicorn utfpr_egresso.wsgi:application
   ```

### Sincronização de Dados
Para sincronizar dados do localhost para Vercel:
```bash
# 1. Exportar dados locais
python manage.py dumpdata core --natural-foreign --natural-primary > dados_fixos.json

# 2. Na Vercel, importar dados
python manage.py base_fixa_vercel
```

## Models Principais

### Aluno
- **Campos**: registro, nome, email, periodo_atual, status, coeficiente
- **Status**: ativo, trancado, evadido, formado
- **Dados Profissionais**: empresa, cargo, linkedin, github
- **Mentoria**: disponibilidade, areas_mentoria

### Disciplina
- **Campos**: codigo, nome, carga_horaria, periodo, tipo, grupo
- **Tipos**: obrigatoria, optativa
- **Grupos**: Optativas específicas (ex: [412])

### Matricula
- **Relação**: Aluno ↔ Disciplina
- **Campos**: status, nota, frequencia, data_conclusao
- **Status**: aprovada, reprovada, cursando, nao_iniciada

## Sistema de Gamificação

### XP e Níveis
- **Cálculo**: Baseado em disciplinas aprovadas e conquistas
- **Níveis**: 1 a 10, com títulos progressivos
- **Progresso**: Barra visual animada no dashboard

### Conquistas (42 total)
- **Acadêmica (10)**: Baseado em métricas acadêmicas
- **Programação (7)**: Relacionadas a disciplinas de programação
- **Infraestrutura (5)**: Sistemas, redes, segurança
- **IA (3)**: Inteligência Artificial e Machine Learning
- **Marcos (7)**: Progressão acadêmica
- **Humorística (10)**: Conquistas divertidas e especiais

## Observações

- **Idioma**: Todo o sistema em português do Brasil
- **Timezone**: America/Sao_Paulo
- **Design Responsivo**: Mobile-first
- **Acessibilidade**: Semântica HTML5, ARIA labels
- **Performance**: Lazy loading, cache otimizado

## Contribuição

1. Fork do repositório
2. Criar branch para feature: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Add nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Pull Request

## Licença

MIT License - Ver arquivo LICENSE para detalhes
