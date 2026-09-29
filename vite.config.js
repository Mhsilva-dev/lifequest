import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // tailwindcss() processa as classes utilitárias (flex, grid, gap-*...)
  // usadas em src/LifeQuest.jsx — sem ele essas classes não fazem nada.
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // service worker próprio (src/sw.js) em vez do gerado automaticamente —
      // necessário para ouvir o evento "push" (notificações mesmo com o app
      // fechado). O plugin injeta o manifest de precache nele.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: { injectionPoint: 'self.__WB_MANIFEST' },
      manifest: {
        // "id" fixa a identidade do app pro Chrome/Android — sem ele, cada
        // instalação pode ser tratada como um app novo/instável e o Chrome
        // às vezes desiste de gerar o WebAPK real, caindo num atalho comum
        // (aí notificação e ícone continuam aparecendo "via Chrome").
        id: '/',
        name: 'LifeQuest',
        short_name: 'LifeQuest',
        description: 'Transforme disciplina em hábito: hábitos, missões e sequências em um só lugar.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b0712',
        theme_color: '#863bff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // (sem bloco "workbox" aqui — só vale para o modo generateSW. Em
      // injectManifest o roteamento fica em src/sw.js; chamadas de /api/ não
      // entram no precache então já seguem direto pra rede, sem cache.)
    }),
  ],
  // porta fixa combinada para dev e preview; em dev o /api vai pro backend
  server: { port: 3006, proxy: { '/api': process.env.API_URL || 'http://localhost:3007' } },
  // allowedHosts: sem isso o "vite preview" bloqueia com 403 qualquer
  // requisição cujo header Host não seja localhost — o nginx repassa o
  // domínio público, então precisa estar na lista
  preview: { port: 3006, allowedHosts: ["lifequest.mhsilvadev.com.br"] },
})
