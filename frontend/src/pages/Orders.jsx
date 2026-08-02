import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

export function Orders() {
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    currency: 'USD',
    items: [{ name: '', quantity: 1, unit_price: 0 }],
    notes: ''
  })

  useEffect(() => {
    loadOrders()
    loadClients()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/orders')
      setOrders(res.data || [])
    } catch (err) {
      console.error('Load orders error:', err)
      toast.error('Ошибка загрузки заказов')
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const res = await api.get('/clients')
      setClients(res.data || [])
    } catch (err) {
      console.error('Load clients error:', err)
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unit_price: 0 }]
    })
  }

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    setFormData({ ...formData, items: newItems })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.client_id) {
      toast.error('Выберите клиента')
      return
    }

    const validItems = formData.items.filter(item => 
      item.name.trim() && item.quantity > 0 && item.unit_price > 0
    )
    
    if (validItems.length === 0) {
      toast.error('Добавьте хотя бы одну позицию')
      return
    }

    try {
      setSubmitting(true)
      const orderData = {
        client_id: parseInt(formData.client_id),
        currency: formData.currency,
        items: validItems.map(item => ({
          name: item.name,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          unit: 'pcs'
        })),
        notes: formData.notes
      }

      const res = await api.post('/orders', orderData)
      toast.success('Заказ создан!')
      setOrders([res.data.order, ...orders])
      
      setFormData({
        client_id: '',
        currency: 'USD',
        items: [{ name: '', quantity: 1, unit_price: 0 }],
        notes: ''
      })
    } catch (err) {
      console.error('Create order error:', err)
      toast.error(err.response?.data?.error || 'Ошибка создания заказа')
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Заказы</h1>
          <p className="text-muted-foreground">Управление заявками на поставку</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Клиент *</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Выберите клиента</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
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

            <div>
              <label className="block text-sm font-medium mb-1">Позиции заказа</label>
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-5">
                    <Input
                      placeholder="Название товара *"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Кол-во"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Цена"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить позицию
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Примечания</label>
              <Input
                placeholder="Дополнительная информация"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
              {submitting ? 'Создание...' : 'Создать заказ'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Заказов пока нет</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">ID</th>
                    <th className="p-3 text-left font-medium">Клиент</th>
                    <th className="p-3 text-left font-medium">Сумма</th>
                    <th className="p-3 text-left font-medium">Статус</th>
                    <th className="p-3 text-left font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const totalAmount = parseFloat(order?.total_amount || 0)
                    return (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">#{order.id}</td>
                        <td className="p-3">{order.client_name || '—'}</td>
                        <td className="p-3">${totalAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <Badge variant={order.status === 'completed' ? 'success' : 'warning'}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-3">{order.order_date?.split('T')[0]}</td>
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