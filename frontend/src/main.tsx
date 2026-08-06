import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// BASE_URL 由 vite.config.ts 的 base 选项决定
// Vercel: '/'，GitHub Pages: '/monotasking-pomodoro/'
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

// GitHub Pages 404.html 重定向：读取保存的路径并替换当前 URL
const redirectPath = sessionStorage.getItem('gh-pages-redirect')
if (redirectPath) {
  sessionStorage.removeItem('gh-pages-redirect')
  window.history.replaceState(null, '', redirectPath)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
