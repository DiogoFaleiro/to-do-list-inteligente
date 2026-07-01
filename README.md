# 📝 To-Do List Inteligente

Aplicação de lista de tarefas feita com **HTML, CSS e JavaScript puro** (sem frameworks, sem build), com backend em **Supabase** (Postgres + Auth) para contas multiusuário.

## Funcionalidades (MVP)

- ➕ Criar tarefas com título, projeto, data de vencimento ou repetição diária
- 📅 Filtrar tarefas por **Hoje**, **Semana**, **Mês** ou **Todas**
- 📋 Alternar entre visualização em **Lista** e em **Kanban** (A Fazer / Fazendo / Concluído, com drag-and-drop ou pelos botões de mover)
- 📁 Criar, editar e excluir **projetos**, com cor e contador de tarefas
- ✅ Marcar tarefas como concluídas
- 🔁 Tarefas recorrentes (diárias) reabrem automaticamente todo dia
- 🔐 **Login e cadastro** (e-mail/senha via Supabase Auth) — cada usuário só vê suas próprias tarefas e projetos
- 📱 Layout responsivo para tablets e celulares
- 📲 Instalável como **PWA** (ícone próprio, funciona offline via service worker)

## 🚀 Como usar

1. Clone este repositório:
   ```bash
   git clone https://github.com/DiogoFaleiro/to-do-list-inteligente.git
   ```
2. Crie um projeto gratuito em [supabase.com](https://supabase.com) e rode o SQL de `supabase/migrations/0001_init.sql` no **SQL Editor** do seu projeto (cria as tabelas, as regras de segurança e o super admin automático).
3. Configure a URL e a chave pública (`anon`/`publishable`) do seu projeto em `js/supabaseClient.js`.
4. Abra `index.html` diretamente no navegador, ou sirva a pasta com um servidor local (ex: extensão *Live Server* do VS Code, ou `npx serve`) — necessário para o service worker funcionar.

## Estrutura do projeto

```
index.html
manifest.json  -> manifesto do PWA (nome, ícones, cores)
sw.js          -> service worker (cache do app shell)
css/
  style.css
js/
  utils.js           -> funções de data/id
  localPrefs.js      -> preferências locais de UI (tema, view, filtro) no localStorage
  supabaseClient.js  -> inicialização do client Supabase e funções de autenticação
  api.js             -> CRUD assíncrono contra o Supabase (projetos, tarefas, métricas)
  migrate.js         -> migração única dos dados antigos do localStorage para o Supabase
  store.js           -> estado da aplicação e regras de negócio (mutações otimistas)
  render.js          -> renderização da UI (sidebar, lista, kanban)
  app.js             -> eventos de interface, autenticação e inicialização
supabase/
  migrations/0001_init.sql -> schema, RLS, triggers e RPC de métricas do Supabase
logo/
  1.png, 1.ico -> arte original da logo
icons/
  favicon.ico, icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png
```

## 🎯 Objetivo

Este projeto foi criado para praticar:

- Organização e lógica em JavaScript
- Manipulação do DOM
- Uso de `localStorage`
- Estruturação de um projeto simples com Git e GitHub
