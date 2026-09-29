import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminPanel from './AdminPanel.jsx'

// /admin é uma página à parte (painel de contas, com senha própria) — o app
// não usa react-router, então o desvio mais simples é checar o caminho aqui
// mesmo, antes de montar a árvore normal do LifeQuest.
const isAdminRoute = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdminRoute ? <AdminPanel /> : <App />}
  </StrictMode>,
)
