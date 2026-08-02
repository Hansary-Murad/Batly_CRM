import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Plus, Loader2, Truck, CheckCircle, XCircle } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

export function Shipments() {
  const [shipments, setShipments] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [formData, setFormData] = useState({
    order_id: '',
    supplier_name: '',
    purchase_cost: '',
    logistics_cost: '0',
    customs_fee: '0',
    currency: 'USD',
    tracking_number: '',
    expected_arrival: ''
  })

  useEffect(() => {
    loadShipments()
    loadOrders()
  }, [])

  const loadShipments = async () => {
    try {
      setLoading(true)
      const res = await api.get('/shipments')
      setShipments(res.data || [])
    } catch (err) {
      console.error('Load shipments error:', err)
      toast.error('Ошибка загрузки поставок')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders')
      setOrders(res.data || [])
    } catch (err) {
      console.error('Load orders error:', err)
    }
  }

  // ✅ Функция обновления статуса поставки
  const updateShipmentStatus = async (id, status) => {
    try {
      setUpdating(id)
      const res = await api.put(`/shipments/${id}/status`, { status })
      
      toast.success(`Статус обновлён: ${status === 'arrived' ? 'Прибыло' : status === 'delivered' ? 'Доставлено' : status}`)
      loadShipments()
    } catch (err) {
      console.error('Update status error:', err)
      toast.error(err.response?.data?.error || 'Ошибка обновления статуса')
    } finally {
      setUpdating(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.order_id || !formData.supplier_name || !formData.purchase_cost) {
      toast.error('Заполните обязательные поля')
      return
    }

    try {
      setSubmitting(true)
      const data = {
        order_id: parseInt(formData.order_id),
        supplier_name: formData.supplier_name,
        purchase_cost: parseFloat(formData.purchase_cost),
        logistics_cost: parseFloat(formData.logistics_cost) || 0,
        customs_fee: parseFloat(formData.customs_fee) || 0,
        currency: formData.currency,
        tracking_number: formData.tracking_number || null,
        expected_arrival: formData.expected_arrival || null
      }

      const res = await api.post('/shipments', data)
      toast.success('Поставка добавлена!')
      setShipments([res.data, ...shipments])
      
      setFormData({
        order_id: '',
        supplier_name: '',
        purchase_cost: '',
        logistics_cost: '0',
        customs_fee: '0',
        currency: 'USD',
        tracking_number: '',
        expected_arrival: ''
      })
    } catch (err) {
      console.error('Create shipment error:', err)
      toast.error(err.response?.data?.error || 'Ошибка добавления поставки')
    } finally {
      setSubmitting(false)
    }
  }

  // Статусы для отображения
  const statusLabels = {
    'ordered': 'Заказано',
    'in_transit': 'В пути',
    'customs': 'На таможне',
    'arrived': 'Прибыло',
    'delivered': 'Доставлено'
  }

  const statusColors = {
    'ordered': 'warning',
    'in_transit': 'warning',
    'customs': 'warning',
    'arrived': 'success',
    'delivered': 'success'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Поставки</h1>
          <p className="text-muted-foreground">Управление логистикой и поставками</p>
        </div>
      </div>

      {/* Форма добавления поставки */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Заказ *</label>
                <select
                  value={formData.order_id}
                  onChange={(e) => setFormData({...formData, order_id: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Выберите заказ</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>Заказ #{o.id} - {o.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Поставщик *</label>
                <Input
                  placeholder="Название поставщика"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Валюта</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="TMT">TMT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Стоимость закупки *</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({...formData, purchase_cost: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Логистика</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.logistics_cost}
                  onChange={(e) => setFormData({...formData, logistics_cost: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Таможня</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.customs_fee}
                  onChange={(e) => setFormData({...formData, customs_fee: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Трек-номер</label>
                <Input
                  placeholder="Трек-номер"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ожидаемая дата</label>
              <Input
                type="date"
                value={formData.expected_arrival}
                onChange={(e) => setFormData({...formData, expected_arrival: e.target.value})}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Добавление...' : 'Добавить поставку'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Список поставок */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Поставок пока нет</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Поставщик</th>
                    <th className="p-3 text-left font-medium">Трек</th>
                    <th className="p-3 text-left font-medium">Статус</th>
                    <th className="p-3 text-left font-medium">Стоимость</th>
                    <th className="p-3 text-left font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => {
                    const isDelivered = s.status === 'delivered'
                    const isArrived = s.status === 'arrived'
                    const canDeliver = isArrived && !isDelivered
                    const cost = parseFloat(s.purchase_cost || 0)

                    return (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{s.supplier_name}</td>
                        <td className="p-3">{s.tracking_number || '—'}</td>
                        <td className="p-3">
                          <Badge variant={statusColors[s.status] || 'warning'}>
                            {statusLabels[s.status] || s.status}
                          </Badge>
                        </td>
                        <td className="p-3">${cost.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {/* ✅ Кнопка "Прибыло" */}
                            {s.status !== 'arrived' && s.status !== 'delivered' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => updateShipmentStatus(s.id, 'arrived')}
                                disabled={updating === s.id}
                                className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                              >
                                {updating === s.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Truck className="h-3 w-3 mr-1" />
                                )}
                                Прибыло
                              </Button>
                            )}

                            {/* ✅ Кнопка "Доставлено" (появляется после "Прибыло") */}
                            {canDeliver && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => updateShipmentStatus(s.id, 'delivered')}
                                disabled={updating === s.id}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                              >
                                {updating === s.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Доставлено
                              </Button>
                            )}

                            {/* Статус Доставлено */}
                            {isDelivered && (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Доставлено
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}