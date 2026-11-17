import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { watchForUpdates } from '@/lib/autoUpdate'

watchForUpdates()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
