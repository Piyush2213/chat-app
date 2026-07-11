import React from 'react'
import { Route, Routes } from 'react-router-dom'
import App from '../App'
import ChatPage from '../component/ChatPage'
import WaitingApproval from '../component/WaitingApproval'

function AppRoutes() {
  return (
    <div>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/waiting-approval" element={<WaitingApproval />} />
        </Routes>
    </div>
  )
}

export default AppRoutes;