import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { watchForUpdates } from '@/lib/autoUpdate'
import { onSheetChange } from '@/api/base44Client'
import { queryClientInstance } from '@/lib/query-client'

watchForUpdates()

// When newer data arrives from the sheet (someone else logged a game, or ours finished saving), redraw.
onSheetChange(() => queryClientInstance.invalidateQueries())

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
