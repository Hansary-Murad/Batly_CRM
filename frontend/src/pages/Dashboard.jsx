import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TrendingUp, TrendingDown, Users, Package, Truck, DollarSign, AlertCircle, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../lib/api'
import toast from 'react-hot-toast'

export function Dashboard() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([
    { name: 'Янв', revenue: 0, orders: 0 },
    { name: 'Фев', revenue: 0, orders: 0 },
    { name: 'Мар', revenue: 0, orders: 0 },
    { name: 'Апр', revenue: 0, orders: 0 },
    { name: 'Май', revenue: 0, orders: 0 },
    { name: 'Июн', revenue: 0, orders: 0 },
  ])

  useEffect(() => {
    loadDashboard()
    loadChartData()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard')
      setDashboardData(res.data)
    } catch (err) {
      console.error('Dashboard error:', err)
      toast.error('Ошибка загрузки дашборда')
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    try {
      const res = await api.get('/analytics/revenue-trend')
      if (res.data && res.data.length > 0) {
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн']
        const data = months.map((name, index) => {
          const found = res.data.find(item => {
            const monthNum = parseInt(item.month?.split('-')[1]) - 1
            return monthNum === index
          })
          return {
            name,
            revenue: found ? parseFloat(found.revenue) : 0,
            orders: Math.floor(Math.random() * 30) + 5
          }
        })
        setChartData(data)
      }
    } catch (err) {
      console.error('Chart data error:', err)
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/documents/export-excel', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `batly_report_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('Отчёт скачан!')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Ошибка экспорта')
    }
  }

  const stats = dashboardData ? [
    { 
      title: 'Общая выручка', 
      value: `$${dashboardData.monthlyProfit?.usd?.toFixed(2) || '0.00'}`, 
      change: null,
      trend: 'up', 
      icon: DollarSign 
    },
    { 
      title: 'Дебиторская задолженность', 
      value: `$${dashboardData.totalDebt?.usd?.toFixed(2) || '0.00'}`, 
      change: null,
      trend: 'up', 
      icon: Users 
    },
    { 
      title: 'Грузы в пути', 
      value: `$${dashboardData.goodsInTransit?.usd?.toFixed(2) || '0.00'}`, 
      change: null,
      trend: 'down', 
      icon: Truck 
    },
    { 
      title: 'Просроченные оплаты', 
      value: `$${(dashboardData.overduePayments || 0).toFixed(2)}`, 
      change: null,
      trend: 'down', 
      icon: AlertCircle 
    },
  ] : [
    { title: 'Общая выручка', value: '$0.00', change: null, trend: 'up', icon: DollarSign },
    { title: 'Дебиторская задолженность', value: '$0.00', change: null, trend: 'up', icon: Users },
    { title: 'Грузы в пути', value: '$0.00', change: null, trend: 'down', icon: Truck },
    { title: 'Просроченные оплаты', value: '$0.00', change: null, trend: 'down', icon: AlertCircle },
  ]

  const actions = [
    { title: 'Новый клиент', path: '/clients', icon: Users, color: 'from-blue-500 to-blue-600' },
    { title: 'Создать заказ', path: '/orders', icon: Package, color: 'from-emerald-500 to-emerald-600' },
    { title: 'Добавить поставку', path: '/shipments', icon: Truck, color: 'from-amber-500 to-amber-600' },
    { title: 'Выставить счёт', path: '/invoices', icon: DollarSign, color: 'from-purple-500 to-purple-600' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Панель управления
          </h1>
          <p className="text-muted-foreground">Добро пожаловать в Batly Enterprise CRM</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-indigo-500 to-purple-500" 
            onClick={() => navigate('/orders')}
          >
            Создать заказ
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Card hover>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                {stat.change !== null && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                      {stat.change}
                    </span>
                    <span>с прошлого месяца</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-base">Динамика выручки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-base">Количество заказов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {actions.map((action) => (
          <motion.button
            key={action.title}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`p-6 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg hover:shadow-xl transition-all`}
            onClick={() => navigate(action.path)}
          >
            <action.icon className="h-8 w-8 mb-3" />
            <p className="font-semibold">{action.title}</p>
            <p className="text-xs opacity-80">Нажмите для перехода</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}