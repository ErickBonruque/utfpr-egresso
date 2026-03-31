# Changelog

Todas as mudanças notáveis do projeto Sistema CEA serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere a [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Sistema completo de troca de aluno via modal
- Base fixa de dados para sincronização localhost ↔ Vercel
- Scripts de management para deploy e sincronização
- Documentação completa do projeto

### Mudanças
- Melhorada documentação do README.md
- Refatorado sistema de dados sintéticos para usar models Django
- Otimizado sistema de progresso e conquistas

## [2024-03-31] - Versão 1.2.0

### Adicionado
- Modal de seleção de aluno ativo com busca em tempo real
- Endpoint `/api/alunos-ativos/` para listagem de alunos
- Endpoint `/api/trocar-aluno/` para troca de sessão
- Management command `base_fixa_vercel` para configuração de produção
- Management command `adicionar_erick` para adicionar usuário admin
- Arquivo `dados_fixos.json` com backup dos dados
- Documentação de deploy (`DEPLOY.md`)

### Mudanças
- Sistema agora usa models Django em vez de dados sintéticos em tempo real
- Refatorada view `_get_aluno_from_request()` para priorizar `?id=` sobre sessão
- Melhorada interface de troca de aluno na árvore de carreiras
- Atualizada configuração de produção para Vercel

### Corrigido
- Bug onde Alex Silva Demo não aparecia no seletor de alunos
- Problema de sincronização de dados entre localhost e Vercel
- Performance na listagem de alunos ativos

## [2024-03-30] - Versão 1.1.0

### Adicionado
- Árvore de carreiras com 11 nós de progresso
- 8 ramos especializados (IA/ML, Software, Segurança, etc.)
- 5 trilhas de carreira baseadas em habilidades
- Sistema de conquistas expandido (42 conquistas totais)
- Categoria "Humorística" de conquistas
- Conquistas especiais: Fênix Acadêmica, Sobrevivente de AED, etc.

### Mudanças
- Expandido sistema de gamificação
- Melhorada visualização de progresso no dashboard
- Otimizado cálculo de XP e níveis

## [2024-03-29] - Versão 1.0.0

### Adicionado
- Sistema completo de dashboard para alunos
- Models: Aluno, Disciplina, Matricula
- Sistema de progresso acadêmico
- Vitrine de egressos com dados profissionais
- Sistema de vagas com integração JobSpy
- Admin dashboard com métricas agregadas
- API endpoints para dados de alunos e egressos
- Sistema de sessão e troca de aluno
- Design responsivo com Bootstrap 5

### Mudanças
- Migrado de dados sintéticos para banco de dados SQLite
- Implementado sistema completo de templates Django
- Adicionado sistema de URLs e views

## [2024-03-28] - Versão 0.9.0

### Adicionado
- Estrutura base do projeto Django
- Template base com navbar e layout responsivo
- Página de login (visual)
- Dashboard básico com cards de informações
- Sistema de dados sintéticos determinístico
- Matriz curricular real da UTFPR
- API endpoints para dados sintéticos

### Mudanças
- Configurado projeto Django do zero
- Implementado sistema de templates
- Adicionado Bootstrap 5 e Bootstrap Icons

## [2024-03-27] - Versão 0.1.0

### Adicionado
- Repositório inicial
- Estrutura de arquivos básica
- README.md inicial
- Configuração do ambiente virtual

---

## Notas de Versão

### Versão 1.2.0 - Sincronização Vercel
- Foco principal em sincronizar dados entre desenvolvimento e produção
- Adicionados scripts para facilitar deploy e manutenção
- Documentação completa para facilitar contribuições

### Versão 1.1.0 - Expansão de Gamificação
- Sistema de árvore de carreiras implementado
- Conquistas expandidas para melhor engajamento
- Melhorias na experiência do usuário

### Versão 1.0.0 - MVP Completo
- Sistema funcional com todas as features principais
- Banco de dados implementado
- API endpoints funcionais
- Interface completa e responsiva

### Roadmap Futuro

#### Versão 1.3.0 (Planejada)
- [ ] Sistema de autenticação real
- [ ] Integração com sistemas UTFPR
- [ ] Notificações push
- [ ] Chat entre alunos e egressos

#### Versão 2.0.0 (Planejada)
- [ ] Aplicativo mobile
- [ ] Sistema de mentorias agendadas
- [ ] Relatórios personalizados
- [ ] Integração com LinkedIn
