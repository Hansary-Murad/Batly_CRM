import { Outlet, useNavigate } from 'react-router-dom'
import React from 'react'
import { useDispatch } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { Button } from '../ui/Button'
import {
  LayoutDashboard, Users, FileText, Truck, Receipt, BarChart3,
  LogOut, Menu, X, UserCog
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { path: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/clients', label: 'Клиенты', icon: Users },
  { path: '/orders', label: 'Заказы', icon: FileText },
  { path: '/shipments', label: 'Поставки', icon: Truck },
  { path: '/invoices', label: 'Счета', icon: Receipt },
  { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { path: '/users', label: 'Сотрудники', icon: UserCog },
]

export function RootLayout() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = JSON.parse(localStorage.getItem('batly_user') || '{}')

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-card lg:relative lg:translate-x-0 flex flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Batly CRM
          </span>
          <button className="lg:hidden" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setIsOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role || 'user'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center border-b px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setIsOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}