import React from 'react'
import { Route, Routes } from 'react-router-dom'
import App from '../App'
import ChatPage from '../component/ChatPage'

function AppRoutes() {
  return (
    <div>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
    </div>
  )
}

export default AppRoutes;
