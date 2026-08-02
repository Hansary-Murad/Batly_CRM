import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Search, Plus, Trash2, Building, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export function Clients() {
  console.log('🔴 CLIENTS COMPONENT RENDERED!')

  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: ''
  })

  // ⚠️ ВАЖНО: функция ДОЛЖНА БЫТЬ ОПРЕДЕЛЕНА
  const loadClients = async () => {
    console.log('📡 loadClients STARTED!')
    console.log('🔑 Token:', localStorage.getItem('batly_token')?.slice(0, 30) + '...')
    try {
      setLoading(true)
      console.log('📡 Sending GET /api/clients...')
      const res = await api.get('/clients')
      console.log('✅ Response:', res.data)
      setClients(res.data || [])
    } catch (err) {
      console.error('❌ Load clients error:', err)
      toast.error('Ошибка загрузки клиентов')
    } finally {
      setLoading(false)
      console.log('📡 loadClients FINISHED')
    }
  }

  useEffect(() => {
    console.log('🔵 useEffect triggered!')
    console.log('📞 Calling loadClients...')
    loadClients()
    console.log('📞 loadClients called!')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.company_name.trim()) {
      toast.error('Название компании обязательно')
      return
    }

    try {
      setSubmitting(true)
      const res = await api.post('/clients', formData)
      setClients([res.data, ...clients])
      setFormData({ company_name: '', contact_person: '', phone: '', email: '' })
      toast.success('Клиент добавлен!')
    } catch (err) {
      console.error('Add client error:', err)
      toast.error(err.response?.data?.error || 'Ошибка добавления клиента')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить этого клиента?')) return
    try {
      await api.delete(`/clients/${id}`)
      setClients(clients.filter(c => c.id !== id))
      toast.success('Клиент удалён')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка удаления')
    }
  }

  const filteredClients = clients.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Клиенты</h1>
          <p className="text-muted-foreground">Управление корпоративными клиентами</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Название компании *"
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              required
            />
            <Input
              placeholder="Контактное лицо"
              value={formData.contact_person}
              onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
            />
            <Input
              placeholder="Телефон"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Добавление...' : 'Добавить клиента'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск клиентов..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              Загрузка клиентов...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Клиенты не найдены</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Компания</th>
                    <th className="p-3 text-left font-medium">Контакт</th>
                    <th className="p-3 text-left font-medium">Телефон</th>
                    <th className="p-3 text-left font-medium">Email</th>
                    <th className="p-3 text-left font-medium">Долг</th>
                    <th className="p-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-medium">{client.company_name}</td>
                      <td className="p-3">{client.contact_person || '—'}</td>
                      <td className="p-3">{client.phone || '—'}</td>
                      <td className="p-3">{client.email || '—'}</td>
                      <td className="p-3">
                        <Badge variant={client.current_debt > 0 ? 'destructive' : 'success'}>
                          {client.current_debt > 0 ? `$${client.current_debt}` : 'Нет долга'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(client.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}