import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import './i18n/config' // 初始化 i18n

// Environment validation happens in env.ts on module load
// If validation fails, it will throw an error that ErrorBoundary will catch

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

