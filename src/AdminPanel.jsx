// src/AdminPanel.jsx — painel só de leitura em /admin, protegido por senha
// única (ADMIN_PASSWORD no backend). Mostra as contas cadastradas e uma
// "última atividade" pra dar noção de quem tá realmente usando o app.
// Fica fora da árvore do LifeQuest (ver src/main.jsx) — não faz parte da
// navegação normal do app nem do estado sincronizado por conta.
import { useEffect, useState } from "react";
import { Lock, LogOut, RefreshCw } from "lucide-react";
import { adminLogin, adminLogout, adminGetUsers } from "./api";
import "./lifequest.css";
import "./admin-panel.css";

function relativeTime(isoLike) {
  if (!isoLike) return "nunca";
  const then = new Date(isoLike.replace(" ", "T") + "Z").getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(then).toLocaleDateString("pt-BR");
}

function formatDate(isoLike) {
  if (!isoLike) return "—";
  return new Date(isoLike.replace(" ", "T") + "Z").toLocaleDateString("pt-BR");
}

function LoginScreen({ onSubmit, error, busy }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = username && password;
  return (
    <div className="lq-admin-center">
      <form
        className="lq-card p-6 flex flex-col gap-4"
        style={{ width: 320 }}
        onSubmit={(e) => { e.preventDefault(); onSubmit(username, password); }}
      >
        <div className="flex items-center gap-2">
          <Lock size={18} color="var(--accent)" />
          <h2 className="lq-display font-semibold text-[16px]">Painel — LifeQuest</h2>
        </div>
        <input
          className="lq-input" type="text" placeholder="Usuário" autoComplete="username"
          value={username} onChange={(e) => setUsername(e.target.value)} autoFocus
        />
        <input
          className="lq-input" type="password" placeholder="Senha" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" disabled={busy || !canSubmit} className="lq-reset lq-focus lq-btn lq-btn-primary lq-btn-block" style={{ opacity: busy || !canSubmit ? 0.5 : 1 }}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function UserRow({ u }) {
  return (
    <div className="lq-card lq-admin-row p-4">
      <div className="flex-1">
        <div className="text-sm font-medium">{u.name}</div>
        <div className="text-xs" style={{ color: "var(--text-dim)" }}>{u.email}</div>
      </div>
      <div className="lq-admin-stat">
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Cadastro</span>
        <span className="text-sm">{formatDate(u.createdAt)}</span>
      </div>
      <div className="lq-admin-stat">
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Última atividade</span>
        <span className="text-sm" title={formatDate(u.lastActiveAt)}>{relativeTime(u.lastActiveAt)}</span>
      </div>
      <div className="lq-admin-stat">
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Nível</span>
        <span className="text-sm">{u.level ?? "—"}</span>
      </div>
      <div className="lq-admin-stat">
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Hábitos / Missões</span>
        <span className="text-sm">{u.habits} / {u.missions + u.weeklyMissions}</span>
      </div>
      <div className="lq-admin-stat">
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Diário</span>
        <span className="text-sm">{u.journal}</span>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [status, setStatus] = useState("checking"); // checking | loggedOut | loggedIn
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadUsers() {
    try {
      const res = await adminGetUsers();
      if (!res.ok || !Array.isArray(res.users)) { setStatus("loggedOut"); return; }
      setUsers(res.users);
      setStatus("loggedIn");
    } catch {
      setStatus("loggedOut");
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleLogin(username, password) {
    setBusy(true);
    setError("");
    try {
      await adminLogin(username, password);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await adminLogout().catch(() => {});
    setUsers([]);
    setStatus("loggedOut");
  }

  if (status === "checking") return <div className="lq-admin-center" />;
  if (status === "loggedOut") return <LoginScreen onSubmit={handleLogin} error={error} busy={busy} />;

  return (
    <div className="lq-admin-page">
      <header className="lq-admin-header">
        <h1 className="lq-display font-semibold text-lg">Contas cadastradas ({users.length})</h1>
        <div className="flex gap-2">
          <button onClick={loadUsers} className="lq-reset lq-focus lq-btn-icon" title="Atualizar"><RefreshCw size={16} /></button>
          <button onClick={handleLogout} className="lq-reset lq-focus lq-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>
      <div className="flex flex-col gap-3">
        {users.length === 0 && <p className="lq-empty">Nenhuma conta cadastrada ainda.</p>}
        {users.map((u) => <UserRow key={u.id} u={u} />)}
      </div>
    </div>
  );
}
