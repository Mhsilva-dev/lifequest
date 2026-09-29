// src/pushNotifications.js — opt-in de notificações push (celular). Fica de
// fora do estado sincronizado (st) porque é permissão/inscrição do
// navegador/dispositivo, não preferência de usuário — cada aparelho tem a sua.
import { getVapidPublicKey, subscribePush, unsubscribePush } from "./api";

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Converte a chave pública VAPID (base64url) pro formato Uint8Array que o
// PushManager.subscribe espera — conversão padrão da Push API, sem lib.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function getPushPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error("Este navegador não suporta notificações push.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada.");

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { publicKey } = await getVapidPublicKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await subscribePush(subscription.toJSON());
  return subscription;
}

// Permissão "granted" não garante inscrição ativa — o navegador pode ter
// descartado a PushSubscription (troca de service worker, storage limpo,
// reinstalação do PWA) sem revogar a permissão. Sem essa checagem o toggle
// fica "ligado" pra sempre e os lembretes somem sem nenhum aviso.
export async function hasActivePushSubscription() {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await unsubscribePush(subscription.endpoint).catch(() => {});
  await subscription.unsubscribe();
}
