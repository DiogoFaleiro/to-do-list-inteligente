# 📝 To-Do List Inteligente

Aplicação de lista de tarefas feita com **HTML, CSS e JavaScript puro** (sem frameworks, sem build), com backend em **Supabase** (Postgres + Auth) para contas multiusuário.

## Funcionalidades (MVP)

- ➕ Criar tarefas com título, projeto, data de vencimento ou repetição diária
- 📅 Filtrar tarefas por **Hoje**, **Semana**, **Mês** ou **Todas**
- 📋 Alternar entre visualização em **Lista** e em **Painel** (colunas por projeto)
- 📁 Agrupar tarefas por projeto (Lista em seções ou Painel em colunas) e mostrar/esconder tarefas concluídas
- 📁 Criar, editar e excluir **projetos**, com cor e contador de tarefas
- ✅ Marcar tarefas como concluídas
- 🔁 Tarefas recorrentes (diárias) reabrem automaticamente todo dia
- 🔐 **Login e cadastro** (e-mail/senha via Supabase Auth) — cada usuário só vê suas próprias tarefas e projetos
- 👤 **Minha conta**: editar nome, foto de perfil e senha
- 📊 **Painel Super Admin** (`/admin`) com métricas gerais, gráfico de tarefas concluídas por dia da semana e lista de todos os usuários cadastrados
- 📱 Layout responsivo para tablets e celulares
- 📲 Instalável como **PWA** (ícone próprio, funciona offline via service worker)

## 🚀 Como usar

1. Clone este repositório:
   ```bash
   git clone https://github.com/DiogoFaleiro/to-do-list-inteligente.git
   ```
2. Crie um projeto gratuito em [supabase.com](https://supabase.com) e rode, na ordem, os SQLs de `supabase/migrations/0001_init.sql`, `0002_admin_dashboard.sql` e `0003_profile_avatar.sql` no **SQL Editor** do seu projeto (criam as tabelas, as regras de segurança, o super admin automático, as métricas do painel admin e o bucket de fotos de avatar).
3. Configure a URL e a chave pública (`anon`/`publishable`) do seu projeto em `js/supabaseClient.js`.
4. Abra `index.html` diretamente no navegador, ou sirva a pasta com um servidor local (ex: extensão *Live Server* do VS Code, ou `npx serve`) — necessário para o service worker funcionar.

## Estrutura do projeto

```
index.html
manifest.json  -> manifesto do PWA (nome, ícones, cores)
sw.js          -> service worker (cache do app shell)
admin/
  index.html   -> painel super admin (rota /admin, acesso restrito a is_admin)
css/
  style.css
  admin.css    -> layout específico do painel admin
js/
  utils.js           -> funções de data/id
  localPrefs.js      -> preferências locais de UI (tema, view, filtro) no localStorage
  supabaseClient.js  -> inicialização do client Supabase e funções de autenticação
  api.js             -> CRUD assíncrono contra o Supabase (projetos, tarefas, métricas)
  migrate.js         -> migração única dos dados antigos do localStorage para o Supabase
  store.js           -> estado da aplicação e regras de negócio (mutações otimistas)
  render.js          -> renderização da UI (sidebar, lista, painel)
  app.js             -> eventos de interface, autenticação e inicialização
  adminDashboard.js  -> guarda de acesso, gráfico (Chart.js) e tabela do painel admin
supabase/
  migrations/0001_init.sql            -> schema, RLS, triggers e super admin
  migrations/0002_admin_dashboard.sql -> RPCs de métricas por dia da semana e lista de usuários
  migrations/0003_profile_avatar.sql  -> nome de exibição, foto de avatar e bucket de storage
logo/
  1.png, 1.ico -> arte original da logo
icons/
  favicon.ico, icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, social-preview.png
```

## 🎯 Objetivo

Este projeto foi criado para praticar:

- Organização e lógica em JavaScript
- Manipulação do DOM
- Uso de `localStorage`
- Estruturação de um projeto simples com Git e GitHub
