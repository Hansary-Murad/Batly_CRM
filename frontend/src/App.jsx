import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from './components/layouts/RootLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { Orders } from './pages/Orders'
import { Shipments } from './pages/Shipments'
import { Invoices } from './pages/Invoices'
import { Analytics } from './pages/Analytics'
import { Users } from './pages/Users'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('batly_token')
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><RootLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="orders" element={<Orders />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App