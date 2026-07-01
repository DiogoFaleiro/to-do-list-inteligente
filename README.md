# 📝 To-Do List Inteligente

Aplicação de lista de tarefas feita com **HTML, CSS e JavaScript puro** (sem frameworks, sem build).

## Funcionalidades (MVP)

- ➕ Criar tarefas com título, projeto, data de vencimento ou repetição diária
- 📅 Filtrar tarefas por **Hoje**, **Semana**, **Mês** ou **Todas**
- 📋 Alternar entre visualização em **Lista** e em **Kanban** (A Fazer / Fazendo / Concluído, com drag-and-drop)
- 📁 Criar, editar e excluir **projetos**, com cor e contador de tarefas
- ✅ Marcar tarefas como concluídas
- 🔁 Tarefas recorrentes (diárias) reabrem automaticamente todo dia
- 💾 Tudo salvo no **localStorage** do navegador (sem backend)

## 🚀 Como usar

1. Clone este repositório:
   ```bash
   git clone https://github.com/DiogoFaleiro/to-do-list-inteligente.git
   ```
2. Abra `index.html` diretamente no navegador, ou sirva a pasta com um servidor local (ex: extensão *Live Server* do VS Code, ou `npx serve`).

## Estrutura do projeto

```
index.html
css/
  style.css
js/
  utils.js     -> funções de data/id
  storage.js   -> persistência em localStorage
  store.js     -> estado da aplicação e regras de negócio
  render.js    -> renderização da UI (sidebar, lista, kanban)
  app.js       -> eventos de interface e inicialização
```

## 🎯 Objetivo

Este projeto foi criado para praticar:

- Organização e lógica em JavaScript
- Manipulação do DOM
- Uso de `localStorage`
- Estruturação de um projeto simples com Git e GitHub
