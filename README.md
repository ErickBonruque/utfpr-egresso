# Sistema CEA - Conexão Egresso-Aluno

## Descrição

Sistema para acompanhamento de egressos e pontuação de alunos da UTFPR. O sistema features uma "Árvore de Carreiras" onde os alunos podem acompanhar seu progresso, ver conquistas, e se conectar com egressos.

## Stack Tecnológico

- **Backend**: Django 6.0.1
- **Frontend**: Bootstrap 5, Bootstrap Icons
- **Banco de Dados**: SQLite (desenvolvimento)
- **Python**: 3.12

## Como Executar

1. **Ativar o ambiente virtual**:
   ```bash
   source venv/bin/activate
   ```

2. **Rodar as migrações**:
   ```bash
   python manage.py migrate
   ```

3. **Coletar arquivos estáticos**:
   ```bash
   python manage.py collectstatic --noinput
   ```

4. **Iniciar o servidor de desenvolvimento**:
   ```bash
   python manage.py runserver 0.0.0.0:9000
   ```

5. **Acessar o sistema**:
   - Login: http://localhost:9000/login/
   - Dashboard: http://localhost:9000/dashboard/
   - Admin: http://localhost:9000/admin/

## Estrutura do Projeto

```
utfpr_egresso/
├── core/                    # App principal
│   ├── templates/          # Templates HTML
│   │   ├── base.html       # Template base
│   │   ├── login.html      # Tela de login
│   │   └── dashboard.html  # Dashboard principal
│   ├── static/             # Arquivos estáticos
│   │   ├── css/
│   │   ├── js/
│   │   └── img/
│   ├── views.py            # Views do Django
│   └── urls.py             # URLs do app
├── utfpr_egresso/          # Configurações do projeto
│   ├── settings.py         # Configurações
│   └── urls.py             # URLs principais
└── manage.py               # Script de gerenciamento Django
```

## Funcionalidades Implementadas

### ✅ Login (Visual)
- Tela de login moderna com design responsivo
- Formulário de autenticação (apenas visual no momento)
- Informações sobre o sistema

### ✅ Dashboard
- **Seção de Boas-vindas**: Informações do aluno e progresso
- **Sistema de XP e Níveis**: Barra de progresso animada
- **Conquistas**: Badges de conquistas alcançadas
- **Ramos da Carreira**: Progresso em diferentes áreas
- **Estatísticas de Egressos**: Cards com dados empregabilidade
- **Lista de Egressos**: Cards detalhados com informações profissionais

## Próximos Passos

- [ ] Implementar sistema de autenticação real
- [ ] Criar models para Aluno, Egresso, Conquistas
- [ ] Implementar sistema de gamificação
- [ ] Adicionar funcionalidade de mentorias
- [ ] Criar sistema de vagas
- [ ] Implementar gráficos e relatórios

## Observações

- O sistema está configurado para português do Brasil (pt-br)
- Fuso horário configurado para America/Sao_Paulo
- Layout responsivo para dispositivos móveis
