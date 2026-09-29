import React, { useMemo } from "react";
import "./dashboard-bg.css";

// Pontos da trilha (em % da faixa de montanha) que o "viajante" percorre
// conforme o progresso geral sobe. Não é só decoração: dá pra ver o
// avanço de verdade, subindo a montanha junto com nível/XP reais.
const TRAIL = [
  { x: 8, y: 3 }, { x: 20, y: 12 }, { x: 14, y: 24 }, { x: 32, y: 32 },
  { x: 44, y: 46 }, { x: 36, y: 56 }, { x: 52, y: 66 }, { x: 60, y: 78 },
  { x: 56, y: 89 }, { x: 65, y: 97 },
];
const SUMMIT = TRAIL[TRAIL.length - 1];

function pointOnTrail(pct) {
  const p = Math.min(1, Math.max(0, pct));
  const idx = p * (TRAIL.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(TRAIL.length - 1, i0 + 1);
  const t = idx - i0;
  const a = TRAIL[i0];
  const b = TRAIL[i1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// tom de luz conforme a hora do dia — mesma lógica da saudação
// (Bom dia/Boa tarde/Boa noite), só que em cor. Fica por cima de
// var(--bg) com opacidade baixa, então funciona em qualquer tema.
function tintForHour(hour) {
  if (hour >= 5 && hour < 8) return "255,150,110";  // amanhecer, quente
  if (hour >= 8 && hour < 17) return "120,160,255"; // dia, frio
  if (hour >= 17 && hour < 20) return "255,110,150"; // entardecer
  return "130,100,255"; // noite, roxo suave
}

export default function DashboardBg({ hour, pct, accent }) {
  const tint = useMemo(() => tintForHour(hour), [hour]);
  const climber = useMemo(() => pointOnTrail(pct), [pct]);
  const embers = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 8.6) % 100}%`,
    duration: 14 + (i % 5) * 3,
    delay: -(i * 3.7),
  })), []);

  return (
    <div className="dbg-root" aria-hidden="true">
      <div className="dbg-tint" style={{ background: `radial-gradient(ellipse 60% 40% at 60% 0%, rgba(${tint},.16) 0%, transparent 70%)` }} />
      <div className="dbg-summit-glow" style={{ background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)` }} />

      {embers.map((e) => (
        <span key={e.id} className="dbg-ember" style={{
          left: e.left, background: accent,
          animationDuration: `${e.duration}s`, animationDelay: `${e.delay}s`,
        }} />
      ))}

      <div className="dbg-mountain-zone">
        <svg className="dbg-mountains" viewBox="0 0 1440 500" preserveAspectRatio="none">
          <polygon points="0,500 0,340 220,210 420,300 620,180 840,320 1040,190 1260,300 1440,240 1440,500" className="dbg-ridge-back" />
          <polygon points="0,500 0,400 180,300 360,380 560,260 760,380 980,290 1200,400 1440,330 1440,500" className="dbg-ridge-mid" />
          <polygon points="0,500 0,440 200,380 440,460 680,360 900,450 1150,370 1440,430 1440,500" className="dbg-ridge-front" />
        </svg>

        <div className="dbg-flag" style={{ left: `${SUMMIT.x}%`, bottom: `${SUMMIT.y}%` }}>🚩</div>
        <div className="dbg-climber" style={{ left: `${climber.x}%`, bottom: `${climber.y}%`, boxShadow: `0 0 8px 3px ${accent}` }} />
      </div>
    </div>
  );
}
