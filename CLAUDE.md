# CLAUDE.md

Guia para quem (humano ou IA) for mexer neste repositório.

## Arquitetura

App 100% client-side (HTML/CSS/JS puro, sem build tools, sem framework) sobre Supabase (Postgres + Auth + Storage). Cada arquivo `js/*.js` é um módulo IIFE que recebe `window.App` e pendura suas funções públicas nele:

```js
(function (App) {
  // ...
  App.nomeDoModulo = { funcaoPublica1, funcaoPublica2 };
})(window.App = window.App || {});
```

Um módulo consome outro lendo a propriedade correspondente de `App` (ex: `const { store, render, auth, migrate, api, utils } = App;` no topo de `js/app.js`). Por isso **a ordem de `<script>` em `index.html` importa** — um módulo só pode depender de quem já rodou antes dele:

```
js/utils.js          → App.utils (datas, formatação, uid)
js/localPrefs.js      → App.localPrefs (preferências de UI no localStorage)
js/supabaseClient.js  → App.supabaseClient (cliente Supabase) + App.auth (signUp/signIn/signOut/sessão)
js/api.js             → App.api (toda chamada .from()/.rpc() ao Supabase — camada fina, sem lógica de negócio)
js/migrate.js         → App.migrate (migra dados de uma versão antiga só-localStorage pra a conta logada, uma vez só)
js/store.js           → App.store (estado em memória + mutações otimistas; depende de utils/localPrefs/api)
js/render.js          → App.render (toda geração de HTML/DOM a partir do estado; depende de store/utils)
js/app.js             → wiring de eventos (cliques, forms, modais); depende de todos os anteriores
```

`admin/index.html` é uma página separada com seu próprio bootstrap: carrega só `supabaseClient.js` + `api.js` + `adminDashboard.js` (não carrega `store.js`/`render.js`/`app.js` — o painel admin não usa o app principal).

## Padrões obrigatórios

- **Toda mutação de dado é otimista com rollback.** Uma ação do usuário (criar/editar/excluir projeto, tarefa, sessão, tag, token...) atualiza `state` em memória e chama `emit()` **antes** da resposta do Supabase chegar. Se a chamada falhar, o handler desfaz a mutação local (restaura o valor anterior ou remove o item otimista) e chama `handleMutationError(contexto, error)` (`js/store.js`). Esse helper: loga o erro, checa se é erro de autenticação (nesse caso força logout via `onAuthError`), e senão mostra um `alert()` avisando a falha — nunca falha em silêncio. Ver `addSession`/`updateSession`/`deleteSession`/`createApiToken` em `js/store.js` como referência do padrão.
- **Todo texto vindo do usuário passa por `escapeHtml()` antes de entrar em `innerHTML`.** Existe uma cópia local dessa função em `js/render.js` e outra em `js/app.js` (cada módulo é seu próprio closure IIFE, não compartilham escopo) — ambas idênticas: criam uma `<div>`, atribuem `textContent`, leem `innerHTML` de volta. Nunca interpolar `task.title`, `project.name`, etc. direto numa template string de HTML.
- **Preferências de UI ficam só em `localPrefs` (localStorage), nunca no Supabase.** `view`, `period`, `projectFilter`, `tagFilter`, `theme`, `groupByProject`, `showCompleted`, `recurringOnly` — tudo isso é local ao navegador (`js/localPrefs.js`, chave `todolist.ui.v1`), lido uma vez em `state.ui = localPrefs.load()` e regravado via `persistUi()` (`js/store.js`) a cada mutador (`setPeriod`, `setProjectFilter`, etc.). Isso é intencional: são preferências de navegação de UI, não dado do usuário — não faz sentido sincronizar entre dispositivos nem consultar via RLS.

## Migrations (Supabase)

- **Nunca editar um arquivo `supabase/migrations/00XX_*.sql` já existente.** Uma correção ou mudança de schema sempre vira um arquivo **novo**, com o próximo número sequencial (ex: depois de `0009_api_tokens.sql`, a próxima é `0010_algo.sql`).
- Migrations são escritas para rodar com segurança mais de uma vez quando possível (`create table if not exists`, `drop policy if exists` antes de recriar, `create or replace function`), mas isso não substitui a regra acima — o arquivo antigo continua intacto como registro histórico do que já rodou.
- **O código nunca deve assumir que uma migration nova já rodou.** Quem aplica as migrations no SQL Editor do Supabase é o usuário, manualmente, uma de cada vez — nenhum código aqui roda migrations automaticamente. Isso significa: ao introduzir uma migration nova, avisar explicitamente que ela precisa ser rodada antes de testar/depender da funcionalidade que ela habilita, e não seguir para o próximo passo (testar, fazer deploy do JS que a usa) até o usuário confirmar que rodou.

## Service Worker (`sw.js`)

- `CACHE_NAME` (ex: `todolist-cache-v26`) precisa ser incrementado **toda vez** que algum arquivo listado em `APP_SHELL` mudar (hoje: `index.html`, `css/style.css`, e todos os `js/*.js` carregados por ele — `utils`, `localPrefs`, `supabaseClient`, `api`, `migrate`, `store`, `render`, `app`). O fetch handler é "rede primeiro, cache como reserva" (`self.addEventListener('fetch', ...)`), mas a instalação (`install`) só troca de cache quando `CACHE_NAME` muda — sem o bump, um usuário com o Service Worker antigo instalado pode continuar servindo uma versão desatualizada do app enquanto offline ou em condições de rede instável.
- Arquivos fora do `APP_SHELL` (ex: `admin/*`, `supabase/migrations/*`) não precisam de bump.
