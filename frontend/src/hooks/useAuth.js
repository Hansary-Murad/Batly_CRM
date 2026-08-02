import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true)
  const token = useSelector((state) => state.auth.token)
  const user = useSelector((state) => state.auth.user)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  return {
    isAuthenticated: !!token && !!user,
    user,
    token,
    isLoading,
  }
}