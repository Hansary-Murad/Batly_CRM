import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount, currency = 'USD') => {
  const num = parseFloat(amount) || 0
  return currency === 'USD' ? `$${num.toFixed(2)}` : `${num.toFixed(2)} TMT`
}

export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
