import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loader2 } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed']

export function Analytics() {
  const [loading, setLoading] = useState(true)
  const [topClients, setTopClients] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [logisticsStats, setLogisticsStats] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const [clientsRes, productsRes, revenueRes, logisticsRes] = await Promise.all([
        api.get('/analytics/top-clients'),
        api.get('/analytics/top-products'),
        api.get('/analytics/revenue-trend'),
        api.get('/analytics/logistics-stats')
      ])

      setTopClients(clientsRes.data || [])
      setTopProducts(productsRes.data || [])
      setRevenueData(revenueRes.data || [])
      setLogisticsStats(logisticsRes.data || null)
    } catch (err) {
      console.error('Analytics error:', err)
      toast.error('Ошибка загрузки аналитики')
    } finally {
      setLoading(false)
    }
  }

  const pieData = topClients.length > 0 ? topClients.map((client, index) => ({
    name: client.company_name || `Клиент ${index + 1}`,
    value: parseFloat(client.total_revenue || 0)
  })) : [
    { name: 'Нет данных', value: 1 }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Аналитика</h1>
        <p className="text-muted-foreground">Расширенная аналитика и отчёты</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-base">Топ клиенты по выручке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {topClients.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-2">Нет данных о клиентах</p>
            )}
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-base">Топ товаров</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Нет данных о товарах</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm">{item.product_name || 'Товар'}</span>
                    <span className="text-sm font-medium">
                      ${parseFloat(item.total_revenue || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-base">Динамика выручки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {revenueData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-base">Эффективность логистики</CardTitle>
          </CardHeader>
          <CardContent>
            {logisticsStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Всего поставок</span>
                  <span className="text-lg font-bold">{logisticsStats.total_shipments || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Своевременность доставки</span>
                  <span className="text-lg font-bold text-emerald-500">
                    {logisticsStats.on_time_percentage?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Средняя задержка</span>
                  <span className="text-lg font-bold text-amber-500">
                    {logisticsStats.avg_delay_days?.toFixed(1) || 0} дн.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет данных по логистике
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}