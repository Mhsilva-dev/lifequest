// src/sw.js — service worker próprio do LifeQuest (modo injectManifest do
// vite-plugin-pwa). Faz o precache dos assets do build e ouve os eventos de
// push do navegador — é o que permite notificação real com o app fechado.
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

precacheAndRoute(self.__WB_MANIFEST)

// Sem isso, abrir o app offline (ou recarregar a página) cai na tela de erro
// do navegador em vez do app: precacheAndRoute só serve URLs que batem exato
// com o que foi precacheado ("/index.html"), e o navegador pede "/" — não é
// a mesma URL. NavigationRoute intercepta qualquer navegação (abrir o app,
// F5, etc.) e devolve o index.html cacheado, deixando o React Router (só tem
// uma tela real, tudo client-side) cuidar do resto. Chamadas de /api/ não
// são "navegação" (são fetch/XHR), então não passam por aqui.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Sem isso, um service worker novo fica "esperando" indefinidamente e só
// assume quando TODAS as abas/instâncias do app forem fechadas por completo
// — num PWA instalado que fica só em segundo plano (sem ser realmente
// fechado), isso pode nunca acontecer, e o celular continua rodando a
// versão antiga do sw.js pra sempre (foi o que quebrou push/alarme e o
// banner de instalar depois de uma atualização). skipWaiting + clients.claim
// forçam a nova versão a assumir assim que instala, na próxima vez que o
// navegador checar por atualização (o que já acontece sozinho a cada
// abertura do app).
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* payload não é JSON, ignora */ }

  // "alarm" (evento marcado na agenda) fica mais insistente que o lembrete
  // normal de hábito/missão: vibra em padrão de alarme e não some sozinha
  // (requireInteraction). O som em si é controlado pelo sistema — a Web
  // Notification API não permite tocar um arquivo de áudio custom, então a
  // diferença real fica na vibração/persistência, não no som do alarme.
  const isAlarm = data.type === 'alarm'
  const title = data.title || 'LifeQuest'
  const baseOptions = {
    body: data.body || '',
    icon: '/icon-192.png',
    // "badge" é o selo monocromático que o Android usa na barra de status e
    // no cabeçalho da notificação — um ícone colorido nesse campo faz o
    // Android cair no ícone genérico do Chrome em vez do desenho do app.
    badge: '/badge-monochrome.png',
    tag: isAlarm ? `lifequest-alarm-${Date.now()}` : 'lifequest-reminder',
    requireInteraction: isAlarm,
    vibrate: isAlarm ? [300, 150, 300, 150, 300, 150, 300] : [150],
    data: { url: data.url || '/' },
  }
  // botão "Desligar" só no alarme de agenda — silencia sem precisar abrir o
  // app. Alguns Android/Chrome rejeitam a notificação inteira se não
  // gostarem do formato de "actions" — sem o catch, a notificação de alarme
  // simplesmente sumia (a de teste, sem actions, sempre funcionou).
  const optionsWithAction = isAlarm
    ? { ...baseOptions, actions: [{ action: 'dismiss', title: '🔕 Desligar' }] }
    : baseOptions
  event.waitUntil(
    self.registration.showNotification(title, optionsWithAction)
      .catch(() => self.registration.showNotification(title, baseOptions))
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return // só fecha, não abre o app

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
