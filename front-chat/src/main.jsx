import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from './config/App-Routes'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ChatProvider } from './context/ChatContext'

createRoot(document.getElementById('root')).render(

    <BrowserRouter>
    <Toaster position='top-right'/>
      <ChatProvider>
        <AppRoutes />
      </ChatProvider>
    </BrowserRouter>
    

)
