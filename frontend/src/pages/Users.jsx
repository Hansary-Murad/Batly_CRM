import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { 
  Users as UsersIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Loader2,
  Shield,
  UserCog,
  Eye
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

export function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'manager',
    position: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users')
      setUsers(res.data || [])
    } catch (err) {
      console.error('Load users error:', err)
      toast.error('Ошибка загрузки сотрудников')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast.error('Email и пароль обязательны')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          role: formData.role,
          position: formData.position
        })
        toast.success('Сотрудник обновлён')
      } else {
        await api.post('/users', formData)
        toast.success('Сотрудник добавлен')
      }
      
      setFormData({ email: '', password: '', role: 'manager', position: '' })
      setShowForm(false)
      setEditingUser(null)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      position: user.position || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить этого сотрудника?')) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('Сотрудник удалён')
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка удаления')
    }
  }

  const roleLabels = {
    admin: { label: 'Администратор', color: 'destructive' },
    manager: { label: 'Менеджер', color: 'warning' },
    viewer: { label: 'Просмотр', color: 'default' }
  }

  const roleIcons = {
    admin: Shield,
    manager: UserCog,
    viewer: Eye
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
          <h1 className="text-3xl font-bold tracking-tight">Сотрудники</h1>
          <p className="text-muted-foreground">Управление персоналом и доступом</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-indigo-500 to-purple-500"
          onClick={() => {
            setEditingUser(null)
            setFormData({ email: '', password: '', role: 'manager', position: '' })
            setShowForm(!showForm)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить сотрудника
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!!editingUser}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {editingUser ? 'Новый пароль (оставьте пустым)' : 'Пароль *'}
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Должность</label>
                  <Input
                    placeholder="Менеджер по продажам"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Роль</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="admin">Администратор</option>
                    <option value="manager">Менеджер</option>
                    <option value="viewer">Только просмотр</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingUser ? (
                    'Обновить'
                  ) : (
                    'Добавить'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingUser(null)
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Сотрудников пока нет</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Email</th>
                    <th className="p-3 text-left font-medium">Должность</th>
                    <th className="p-3 text-left font-medium">Роль</th>
                    <th className="p-3 text-left font-medium">Статус</th>
                    <th className="p-3 text-left font-medium">Последний вход</th>
                    <th className="p-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const RoleIcon = roleIcons[user.role] || UserCog
                    const roleInfo = roleLabels[user.role] || roleLabels.manager
                    const isActive = user.is_active !== false

                    return (
                      <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium">{user.email}</td>
                        <td className="p-3">{user.position || '—'}</td>
                        <td className="p-3">
                          <Badge variant={roleInfo.color}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={isActive ? 'success' : 'destructive'}>
                            {isActive ? 'Активен' : 'Удалён'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {isActive && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(user)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(user.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
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