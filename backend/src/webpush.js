// src/webpush.js — configuração única do web-push (chaves VAPID), compartilhada
// entre a rota de push e o agendador de lembretes.
const webpush = require('web-push');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:contato@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[Push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não definidos — notificações push desativadas');
}

module.exports = { webpush, vapidReady: Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) };
