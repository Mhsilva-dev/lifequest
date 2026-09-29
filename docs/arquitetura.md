# Arquitetura

O LifeQuest é dividido em duas aplicações que rodam na mesma VPS, atrás do Nginx:

| Parte | Tecnologia | Porta | Função |
|---|---|---|---|
| Front-end | React 19 + Vite + Tailwind CSS | 3006 | SPA/PWA com todas as telas e a lógica do jogo |
| Back-end | Node.js + Express + SQLite | 3007 | Contas, sincronização do progresso e notificações push |

```mermaid
flowchart LR
    U[Navegador / PWA] -->|HTTPS| N[Nginx]
    N -->|/| F[Front-end<br/>vite preview :3006]
    N -->|/api/| B[Express :3007]
    B --> DB[(SQLite)]
    B --> S[Sessões<br/>session-file-store]
    SCH[Agendador<br/>a cada 1 min] --> DB
    SCH -->|Web Push VAPID| PS[Serviço de push<br/>do navegador]
    PS --> SW[Service worker<br/>src/sw.js]
    SW --> U
```

## Front-end

- `LifeQuest.jsx` concentra o estado do jogo (`useState`) e as telas: dashboard, hábitos, missões, agenda, desenvolvimento, artigos, diário, estatísticas, perfil e configurações.
- As regras de progressão (XP, nível, sequências, gráficos) são funções puras no topo do arquivo: `applyXp`, `computeStreak`, `computeWeek`, `buildChartData`.
- Toda alteração do estado é salva no servidor com `PUT /api/state` e também em cache local. Sem internet, o app abre a partir desse cache e reenvia o estado quando o evento `online` dispara.
- O alarme da agenda é tocado com a Web Audio API e exibido em uma sobreposição com botão para desligar.

## Back-end

- `server.js` configura CORS por lista de origens, sessão em cookie `httpOnly`/`sameSite=lax` (com `secure` em produção) e `Cache-Control: no-store` em todas as respostas.
- O estado do jogador é tratado como um documento JSON por conta; o servidor não conhece as regras do jogo, apenas guarda e devolve.
- `reminderScheduler.js` lê esse documento para decidir quais notificações enviar. Detalhes em [notificacoes.md](notificacoes.md).

## Fluxo de uma ação

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Front-end
    participant C as Cache local
    participant A as API
    U->>F: conclui um hábito
    F->>F: applyXp + histórico do dia
    F->>C: salva o estado
    F->>A: PUT /api/state
    A-->>F: { ok: true }
    Note over F,A: sem conexão, o PUT é refeito quando o navegador volta a ficar online
```
