import React, { useState, useEffect, useMemo } from "react";
import {
  Swords, ChevronLeft, Flame, Dumbbell, GraduationCap, Zap, Moon,
  Target, Clock, CircleHelp, Compass, Lock, Mail, User as UserIcon,
} from "lucide-react";
import "./onboarding.css";
import { authRegister, authLogin } from "./api";

/* ============================================================ dados do quiz ============================================================ */
const AGE_BRACKETS = ["13-17", "18-24", "25-34", "35-44", "45-59", "60+"];

const SELF_DESCRIPTION_OPTIONS = [
  { id: "starter", label: "Começo com tudo e desisto rápido", icon: Zap },
  { id: "consistent", label: "Sou consistente, mas sei que dá pra evoluir", icon: Target },
  { id: "struggle", label: "Nunca consegui manter um hábito por muito tempo", icon: CircleHelp },
  { id: "optimize", label: "Já sou disciplinado(a), quero otimizar ainda mais", icon: Flame },
];

const OBSTACLE_OPTIONS = [
  { id: "procrastination", label: "Procrastinação", icon: Clock },
  { id: "time", label: "Falta de tempo", icon: Compass },
  { id: "motivation", label: "Falta de motivação", icon: Flame },
  { id: "direction", label: "Não sei por onde começar", icon: CircleHelp },
];

const FOCUS_OPTIONS = [
  { id: "Saúde", label: "Saúde", icon: Dumbbell },
  { id: "Estudo", label: "Estudo", icon: GraduationCap },
  { id: "Produtividade", label: "Produtividade", icon: Zap },
  { id: "Bem-estar", label: "Bem-estar", icon: Moon },
];

const ANALYZING_PHRASES = [
  "Analisando suas respostas...",
  "Calculando seu Índice de Disciplina...",
  "Cruzando dados com seu maior obstáculo...",
  "Montando seu plano de jogo personalizado...",
];

const OBSTACLE_INSIGHT = {
  procrastination: "Sua maior barreira é a procrastinação — o LifeQuest ataca isso com metas pequenas e recompensa em XP na hora, pra seu cérebro sentir progresso imediato.",
  time: "Falta de tempo geralmente é falta de sistema. Hábitos de um clique e missões curtas vão caber na sua rotina, não competir com ela.",
  motivation: "Motivação vai e vem — por isso o jogo não depende dela. Sequências, níveis e conquistas empurram você mesmo nos dias em que a vontade não aparece.",
  direction: "Não saber por onde começar trava mais gente do que a preguiça. Vamos te dar o primeiro hábito pronto — só marcar como feito hoje.",
};

function archetypeFor(score) {
  if (score <= 30) return { name: "Semente", emoji: "🌱", desc: "Toda jornada lendária começa em algum lugar. A sua começa agora." };
  if (score <= 55) return { name: "Aprendiz em Ascensão", emoji: "⚔️", desc: "Você já sabe o que quer — só falta um sistema pra sustentar isso todos os dias." };
  if (score <= 75) return { name: "Guerreiro(a) da Rotina", emoji: "🔥", desc: "Sua disciplina já é real. Agora é sobre transformar isso em hábito automático." };
  return { name: "Lenda em Formação", emoji: "👑", desc: "Poucos chegam até aqui com essa base. O próximo nível é virar referência pra você mesmo(a)." };
}

function sliderEmoji(v) {
  if (v <= 3) return "😅";
  if (v <= 6) return "😐";
  if (v <= 8) return "💪";
  return "🔥";
}

const QUESTION_STEPS = ["age", "discipline", "selfDescription", "obstacle", "focus"];
const STEP_ORDER = ["hero", ...QUESTION_STEPS, "reveal", "signup"];

/* ============================================================ fundo animado ============================================================ */
function FloatingBg() {
  const blobs = useMemo(() => ([
    { color: "var(--ob-c1)", size: 380, top: "-8%", left: "-6%", delay: "0s" },
    { color: "var(--ob-c2)", size: 320, top: "55%", left: "70%", delay: "-4s" },
    { color: "var(--ob-c5)", size: 260, top: "70%", left: "-4%", delay: "-9s" },
    { color: "var(--ob-c3)", size: 240, top: "0%", left: "68%", delay: "-6s" },
  ]), []);
  const particles = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 3 + Math.random() * 5,
    duration: 9 + Math.random() * 10,
    delay: -(Math.random() * 18),
    color: [ "var(--ob-c1)", "var(--ob-c2)", "var(--ob-c3)", "var(--ob-c4)", "var(--ob-c5)" ][i % 5],
  })), []);

  return (
    <div className="ob-bg" aria-hidden="true">
      {blobs.map((b, i) => (
        <div key={i} className="ob-blob" style={{
          width: b.size, height: b.size, top: b.top, left: b.left,
          background: b.color, animationDelay: b.delay,
        }} />
      ))}
      {particles.map((p) => (
        <div key={p.id} className="ob-particle" style={{
          left: p.left, width: p.size, height: p.size, background: p.color,
          animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* ============================================================ peças reutilizáveis ============================================================ */
function QuestionStep({ title, subtitle, children }) {
  return (
    <div className="ob-question">
      <h2 className="ob-question-title">{title}</h2>
      {subtitle && <p className="ob-question-sub">{subtitle}</p>}
      <div className="ob-question-body">{children}</div>
    </div>
  );
}

function ChoiceCard({ icon: Icon, label, selected, onClick, compact }) {
  return (
    <button className={"lq-reset ob-choice-card" + (compact ? " compact" : "") + (selected ? " selected" : "")} onClick={onClick}>
      <span className="ob-choice-icon"><Icon size={17} /></span>
      <span>{label}</span>
    </button>
  );
}

function DisciplineSlider({ value, onChange }) {
  return (
    <div className="ob-slider-wrap">
      <span className="ob-slider-emoji" key={value}>{sliderEmoji(value)}</span>
      <input
        type="range" min={1} max={10} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ob-slider"
      />
      <span className="ob-slider-value">Sua nota: <b>{value}</b>/10</span>
    </div>
  );
}

/* ============================================================ etapas ============================================================ */
function HeroStep({ onStart, onLogin }) {
  return (
    <div className="ob-hero">
      <span className="ob-hero-badge"><Swords size={14} className="ob-badge-icon" /> LifeQuest</span>
      <h1 className="ob-hero-title">Que tal transformar <span className="ob-gradient-text">sua vida em um jogo?</span></h1>
      <p className="ob-hero-sub">
        Hábitos viram XP. Disciplina vira nível. Sua rotina vira a maior missão que você já jogou.
        Responda 5 perguntas rápidas e descubra seu Índice de Disciplina agora.
      </p>
      <button className="lq-reset ob-btn-primary ob-hero-cta" onClick={onStart}>
        Começar minha jornada
      </button>
      <span className="ob-hero-hint">Leva menos de 60 segundos • Sem cartão de crédito</span>
      <button className="lq-reset ob-link-btn" onClick={onLogin}>Já tem conta? Entrar</button>
    </div>
  );
}

function LoginStep({ form, setForm, error, submitting, onSubmit, onBack }) {
  function handleKeyDown(e) {
    if (e.key === "Enter") onSubmit();
  }
  return (
    <div className="ob-signup">
      <div className="ob-signup-head">
        <h2 className="ob-question-title">Bem-vindo(a) de volta</h2>
        <p className="ob-question-sub">Entre para continuar sua jornada de onde parou.</p>
      </div>

      <div className="ob-field">
        <label>E-mail</label>
        <div className="ob-input-wrap">
          <Mail size={16} color="var(--text-faint)" />
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={handleKeyDown} placeholder="voce@email.com" autoFocus />
        </div>
      </div>
      <div className="ob-field">
        <label>Senha</label>
        <div className="ob-input-wrap">
          <Lock size={16} color="var(--text-faint)" />
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onKeyDown={handleKeyDown} placeholder="Sua senha" />
        </div>
      </div>

      {error && <p className="ob-form-error">{error}</p>}

      <button className="lq-reset ob-btn-primary" onClick={onSubmit} disabled={submitting}>
        {submitting ? "Entrando..." : "Entrar"}
      </button>
      <button className="lq-reset ob-link-btn" onClick={onBack}>Não tem conta? Criar conta</button>
    </div>
  );
}

function AnalyzingStep() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(ANALYZING_PHRASES.length - 1, v + 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ob-analyzing">
      <div className="ob-ring" />
      <p className="ob-analyzing-text" key={i}>{ANALYZING_PHRASES[i]}</p>
    </div>
  );
}

function RevealStep({ score, percentile, archetype, insight, onNext }) {
  return (
    <div className="ob-reveal">
      <span className="ob-reveal-kicker">Seu resultado</span>
      <span className="ob-reveal-score">{score}</span>
      <span className="ob-reveal-score-label">Índice de Disciplina (0-100)</span>

      <div className="ob-archetype-card">
        <span className="ob-archetype-emoji">{archetype.emoji}</span>
        <p className="ob-archetype-name">{archetype.name}</p>
        <p className="ob-archetype-desc">{archetype.desc}</p>
        <span className="ob-percentile">🚀 Isso te coloca à frente de {percentile}% de quem já fez esse teste</span>
      </div>

      {insight && <p className="ob-insight">{insight}</p>}

      <button className="lq-reset ob-btn-primary ob-reveal-cta" onClick={onNext}>
        Quero começar minha jornada
      </button>
      <span className="ob-reveal-loss">Crie sua conta agora pra não perder esse resultado</span>
    </div>
  );
}

function SignupStep({ form, setForm, error, submitting, onSubmit }) {
  function handleKeyDown(e) {
    if (e.key === "Enter") onSubmit();
  }
  return (
    <div className="ob-signup">
      <div className="ob-signup-head">
        <h2 className="ob-question-title">Salve seu progresso</h2>
        <p className="ob-question-sub">Crie sua conta para não perder seu perfil e começar a ganhar XP.</p>
      </div>

      <div className="ob-field">
        <label>Nome</label>
        <div className="ob-input-wrap">
          <UserIcon size={16} color="var(--text-faint)" />
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={handleKeyDown} placeholder="Como podemos te chamar?" autoFocus />
        </div>
      </div>
      <div className="ob-field">
        <label>E-mail</label>
        <div className="ob-input-wrap">
          <Mail size={16} color="var(--text-faint)" />
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={handleKeyDown} placeholder="voce@email.com" />
        </div>
      </div>
      <div className="ob-field">
        <label>Senha</label>
        <div className="ob-input-wrap">
          <Lock size={16} color="var(--text-faint)" />
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onKeyDown={handleKeyDown} placeholder="Mínimo 4 caracteres" />
        </div>
      </div>

      {error && <p className="ob-form-error">{error}</p>}

      <button className="lq-reset ob-btn-primary" onClick={onSubmit} disabled={submitting}>
        {submitting ? "Criando conta..." : "Criar minha conta"}
      </button>
      <span className="ob-trust-note">🔒 Sua conta fica salva com segurança e sincronizada entre dispositivos</span>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 6 + Math.random() * 6,
    duration: 2.2 + Math.random() * 1.6,
    delay: Math.random() * 0.4,
    color: [ "var(--ob-c1)", "var(--ob-c2)", "var(--ob-c3)", "var(--ob-c4)", "var(--ob-c5)" ][i % 5],
  })), []);
  return (
    <>
      {pieces.map((p) => (
        <span key={p.id} className="ob-confetti-piece" style={{
          left: p.left, width: p.size, height: p.size * 1.6, background: p.color,
          animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </>
  );
}

function CelebrateStep({ name }) {
  return (
    <div className="ob-celebrate">
      <Confetti />
      <div className="ob-check-circle">
        <Swords size={34} />
      </div>
      <h2 className="ob-celebrate-title">Conta criada{name ? `, ${name}` : ""}!</h2>
      <p className="ob-celebrate-sub">Preparando sua jornada...</p>
    </div>
  );
}

/* ============================================================ componente raiz ============================================================ */
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState("hero");
  const [answers, setAnswers] = useState({
    age: "", disciplineScore: 5, selfDescription: "", obstacle: "", focusArea: "",
  });
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [registeredAccount, setRegisteredAccount] = useState(null);

  const qIndex = QUESTION_STEPS.indexOf(step);
  const progressPct = qIndex >= 0 ? ((qIndex + 1) / QUESTION_STEPS.length) * 100 : 0;

  function pick(field, value, next) {
    setAnswers((a) => ({ ...a, [field]: value }));
    setTimeout(() => setStep(next), 320);
  }

  function goBack() {
    if (step === "login") return setStep("hero");
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  // avança sozinho da tela "analisando" pra revelação, depois de mostrar as frases
  useEffect(() => {
    if (step !== "analyzing") return;
    const t = setTimeout(() => setStep("reveal"), ANALYZING_PHRASES.length * 650 + 250);
    return () => clearTimeout(t);
  }, [step]);

  const score = useMemo(() => Math.min(100, Math.max(10, answers.disciplineScore * 10)), [answers.disciplineScore]);
  const percentile = useMemo(() => Math.min(96, 28 + answers.disciplineScore * 6), [answers.disciplineScore]);
  const archetype = useMemo(() => archetypeFor(score), [score]);

  // contador animado do número na revelação
  useEffect(() => {
    if (step !== "reveal") return;
    setDisplayScore(0);
    const duration = 1100;
    const start = performance.now();
    let raf;
    function tick(now) {
      const pct = Math.min(1, (now - start) / duration);
      setDisplayScore(Math.round(score * pct));
      if (pct < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, score]);

  async function handleSignup() {
    if (!form.name.trim()) return setFormError("Como podemos te chamar?");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setFormError("Digite um e-mail válido.");
    if (form.password.length < 4) return setFormError("A senha precisa ter pelo menos 4 caracteres.");
    setFormError("");
    setSubmitting(true);
    try {
      const { account } = await authRegister({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setRegisteredAccount(account);
      setStep("celebrate");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin() {
    if (!/^\S+@\S+\.\S+$/.test(loginForm.email)) return setLoginError("Digite um e-mail válido.");
    if (!loginForm.password) return setLoginError("Digite sua senha.");
    setLoginError("");
    setSubmitting(true);
    try {
      const { account } = await authLogin({ email: loginForm.email.trim(), password: loginForm.password });
      onComplete({ account, profile: null });
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // depois da comemoração, entrega os dados coletados e deixa o app raiz montar o jogo
  useEffect(() => {
    if (step !== "celebrate") return;
    const t = setTimeout(() => {
      onComplete({
        account: registeredAccount,
        profile: { ...answers, score, percentile, archetype: archetype.name },
      });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const showTopbar = step !== "hero" && step !== "analyzing" && step !== "celebrate";

  return (
    <div className="ob-app">
      <FloatingBg />

      {showTopbar && (
        <div className="ob-topbar">
          <button className="lq-reset ob-back" onClick={goBack} aria-label="Voltar"><ChevronLeft size={18} /></button>
          {qIndex >= 0 && <div className="ob-progress-track"><div className="ob-progress-fill" style={{ width: `${progressPct}%` }} /></div>}
        </div>
      )}

      <div className="ob-stage">
        {step === "hero" && <HeroStep onStart={() => setStep("age")} onLogin={() => setStep("login")} />}

        {step === "login" && (
          <LoginStep form={loginForm} setForm={setLoginForm} error={loginError} submitting={submitting}
            onSubmit={handleLogin} onBack={() => setStep("hero")} />
        )}

        {step === "age" && (
          <QuestionStep title="Quantos anos você tem?" subtitle="Isso ajuda a calibrar suas metas.">
            <div className="ob-choice-row">
              {AGE_BRACKETS.map((a) => (
                <button key={a} className={"lq-reset ob-choice-pill" + (answers.age === a ? " selected" : "")}
                  onClick={() => pick("age", a, "discipline")}>{a}</button>
              ))}
            </div>
          </QuestionStep>
        )}

        {step === "discipline" && (
          <QuestionStep title="De 1 a 10, o quanto você diria que é disciplinado(a) hoje?" subtitle="Seja honesto(a) — não existe resposta errada.">
            <DisciplineSlider value={answers.disciplineScore} onChange={(v) => setAnswers((a) => ({ ...a, disciplineScore: v }))} />
            <button className="lq-reset ob-btn-primary ob-continue" onClick={() => setStep("selfDescription")}>Continuar</button>
          </QuestionStep>
        )}

        {step === "selfDescription" && (
          <QuestionStep title="Qual dessas frases mais parece com você?">
            <div className="ob-choice-list">
              {SELF_DESCRIPTION_OPTIONS.map((o) => (
                <ChoiceCard key={o.id} icon={o.icon} label={o.label} selected={answers.selfDescription === o.id}
                  onClick={() => pick("selfDescription", o.id, "obstacle")} />
              ))}
            </div>
          </QuestionStep>
        )}

        {step === "obstacle" && (
          <QuestionStep title="O que mais atrapalha sua disciplina hoje?">
            <div className="ob-choice-list">
              {OBSTACLE_OPTIONS.map((o) => (
                <ChoiceCard key={o.id} icon={o.icon} label={o.label} selected={answers.obstacle === o.id}
                  onClick={() => pick("obstacle", o.id, "focus")} />
              ))}
            </div>
          </QuestionStep>
        )}

        {step === "focus" && (
          <QuestionStep title="Qual área da sua vida você mais quer transformar?">
            <div className="ob-choice-grid-2">
              {FOCUS_OPTIONS.map((o) => (
                <ChoiceCard key={o.id} icon={o.icon} label={o.label} selected={answers.focusArea === o.id}
                  onClick={() => pick("focusArea", o.id, "analyzing")} compact />
              ))}
            </div>
          </QuestionStep>
        )}

        {step === "analyzing" && <AnalyzingStep />}

        {step === "reveal" && (
          <RevealStep score={displayScore} percentile={percentile} archetype={archetype}
            insight={OBSTACLE_INSIGHT[answers.obstacle]} onNext={() => setStep("signup")} />
        )}

        {step === "signup" && (
          <SignupStep form={form} setForm={setForm} error={formError} submitting={submitting} onSubmit={handleSignup} />
        )}

        {step === "celebrate" && <CelebrateStep name={form.name.trim()} />}
      </div>
    </div>
  );
}
