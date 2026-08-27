import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { CloudProvider } from './lib/CloudContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CloudProvider>
      <App />
    </CloudProvider>
  </StrictMode>,
)
