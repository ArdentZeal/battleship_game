import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main starting');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {console.log('Rendering App inside StrictMode')}
    <App />
  </StrictMode>,
)
