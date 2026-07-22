const CACHE_NAME = 'todolist-cache-v79';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/utils.js',
  './js/localPrefs.js',
  './js/supabaseClient.js',
  './js/api.js',
  './js/migrate.js',
  './js/recurrence.js',
  './js/nlDate.js',
  './js/store.js',
  './js/render.js',
  './js/statsCharts.js',
  './js/stats.js',
  './js/importTodoist.js',
  './js/importCampaigns.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (sempre busca a versão mais nova quando online), com o
// cache como reserva só quando a rede falhar (uso offline do PWA). Evita
// que o app fique preso servindo uma versão antiga em cache indefinidamente.
//
// Só intercepta requisições same-origin (o app shell: HTML/CSS/JS/ícones).
// Chamadas cross-origin (API do Supabase, CDN do Chart.js/SheetJS) NUNCA
// passam por aqui — bug real encontrado: como fetchAllDoneTasks/
// fetchTaskCompletions/fetchTaskProjectMap (js/api.js) sempre montam a
// mesma URL, uma falha de rede pontual fazia o catch() abaixo cair pro
// cache e servir pra sempre a primeira resposta bem-sucedida daquela URL —
// "Minhas estatísticas" ficou travada numa data fixa e o botão Atualizar
// não tinha efeito algum, porque a "atualização" vinha do próprio cache do
// Service Worker, não da rede. Dados de API nunca devem ser cacheados aqui;
// erros de rede na API já são tratados pelos handlers de erro do próprio
// app (estado de erro + retry), não precisam de fallback do SW.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
