// src/api.js — cliente HTTP fino pro backend do LifeQuest (contas + progresso sincronizado)
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.erro || "Erro de conexão com o servidor.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authRegister = (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const authLogin = (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const authLogout = () => request("/auth/logout", { method: "POST" });
export const authMe = () => request("/auth/me");
export const deleteAccount = () => request("/auth/account", { method: "DELETE" });
export const getState = () => request("/state");
export const putState = (state) => request("/state", { method: "PUT", body: JSON.stringify(state) });

export const getVapidPublicKey = () => request("/push/vapid-public-key");
export const subscribePush = (subscription) => request("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) });
export const unsubscribePush = (endpoint) => request("/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) });
export const testPush = () => request("/push/test", { method: "POST" });

export const adminLogin = (username, password) => request("/admin/login", { method: "POST", body: JSON.stringify({ username, password }) });
export const adminLogout = () => request("/admin/logout", { method: "POST" });
export const adminGetUsers = () => request("/admin/users");
