# Referência da API

Base: `/api`. Todas as rotas respondem JSON e usam o cookie de sessão. Erros seguem o formato `{ "ok": false, "erro": "mensagem" }`.

## Saúde

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verificação usada pelo CI e pelo monitoramento |

## Conta (`/auth`)

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | Cria a conta e já inicia a sessão. `409` se o e-mail já existe |
| POST | `/auth/login` | `{ email, password }` | Inicia a sessão |
| POST | `/auth/logout` | — | Encerra a sessão |
| GET | `/auth/me` | — | Conta da sessão atual, ou `401` |
| DELETE | `/auth/account` | — | Apaga a conta e todo o progresso (cascade) |

## Progresso (`/state`)

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| GET | `/state` | — | Estado do jogador (ou o estado inicial, para contas novas) |
| PUT | `/state` | estado completo | Substitui o estado salvo |

O formato do estado está em [banco-de-dados.md](banco-de-dados.md).

## Notificações (`/push`)

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| GET | `/push/vapid-public-key` | — | Chave pública VAPID; `503` se o push não estiver configurado |
| POST | `/push/subscribe` | `PushSubscription` serializada | Registra o dispositivo |
| POST | `/push/unsubscribe` | `{ endpoint }` | Remove o dispositivo |
| POST | `/push/test` | — | Envia uma notificação de teste para os dispositivos da conta |

## Administração (`/admin`)

Login separado das contas de usuário, com credenciais definidas em `ADMIN_USERNAME` e `ADMIN_PASSWORD`.

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| POST | `/admin/login` | `{ username, password }` | Inicia a sessão de administrador |
| POST | `/admin/logout` | — | Encerra a sessão de administrador |
| GET | `/admin/users` | — | Contas cadastradas com nível, XP, quantidade de hábitos, missões e entradas do diário, e a última atividade |
