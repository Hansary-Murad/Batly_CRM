import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setCredentials } from '@/store/slices/authSlice'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export function Login() {
  const [email, setEmail] = useState('admin@batly.com')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }))
      toast.success('Добро пожаловать в Batly CRM!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mb-2">B</div>
            <CardTitle className="text-2xl font-bold">Вход в Batly CRM</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Войдите в свою учетную запись</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="gradient" loading={loading} className="w-full">
                Войти
              </Button>
              <div className="text-center text-xs text-muted-foreground mt-2">
                <p>Демо: admin@batly.com / 123456</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
