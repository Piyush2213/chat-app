import React from 'react'
import { Route, Routes } from 'react-router-dom'
import App from '../App'
import ChatPage from '../component/ChatPage'
import WaitingApproval from '../component/WaitingApproval'
import AdminLogin from '../component/AdminLogin'
import AdminDashboard from '../component/AdminDashboard'
function AppRoutes() {
  return (
    <div>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/waiting-approval" element={<WaitingApproval />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
    </div>
  )
}
export default AppRoutes;