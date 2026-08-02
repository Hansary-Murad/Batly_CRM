import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Plus, Loader2, Download, FileSpreadsheet, CheckCircle } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

export function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [paying, setPaying] = useState(null)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const res = await api.get('/invoices')
      setInvoices(res.data || [])
    } catch (err) {
      console.error('Load invoices error:', err)
      toast.error('Ошибка загрузки счетов')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Функция оплаты счёта
  const handlePayInvoice = async (id) => {
    if (!confirm('Отметить этот счёт как оплаченный?')) return
    
    try {
      setPaying(id)
      const invoice = invoices.find(inv => inv.id === id)
      const amount = invoice?.amount || 0
      
      const res = await api.put(`/invoices/pay/${id}`, {
        paid_amount: amount
      })
      
      toast.success('Счёт оплачен!')
      loadInvoices()
    } catch (err) {
      console.error('Pay invoice error:', err)
      toast.error(err.response?.data?.error || 'Ошибка оплаты')
    } finally {
      setPaying(null)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExporting(true)
      const response = await api.get('/documents/export-excel', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('Экспорт успешно выполнен!')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Ошибка экспорта')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async (id) => {
    try {
      const response = await api.get(`/documents/invoice/${id}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('PDF скачан!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Ошибка скачивания PDF')
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
          <h1 className="text-3xl font-bold tracking-tight">Счета</h1>
          <p className="text-muted-foreground">Управление финансами и счетами</p>
        </div>
        <Button
          onClick={handleExportExcel}
          disabled={exporting}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600"
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          {exporting ? 'Экспорт...' : 'Экспорт Excel'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Счетов пока нет</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">ID</th>
                    <th className="p-3 text-left font-medium">Клиент</th>
                    <th className="p-3 text-left font-medium">Сумма</th>
                    <th className="p-3 text-left font-medium">Оплачено</th>
                    <th className="p-3 text-left font-medium">Остаток</th>
                    <th className="p-3 text-left font-medium">Статус</th>
                    <th className="p-3 text-left font-medium">Срок</th>
                    <th className="p-3 text-left font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const amount = parseFloat(inv.amount || 0)
                    const paidAmount = parseFloat(inv.paid_amount || 0)
                    const remaining = amount - paidAmount
                    const isPaid = inv.status === 'paid' || remaining <= 0.01

                    return (
                      <tr key={inv.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">#{inv.id}</td>
                        <td className="p-3">{inv.client_name || '—'}</td>
                        <td className="p-3">${amount.toFixed(2)}</td>
                        <td className="p-3">${paidAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={remaining > 0.01 ? 'text-red-500 font-semibold' : 'text-green-500'}>
                            ${remaining.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant={
                            isPaid ? 'success' :
                            inv.status === 'overdue' ? 'destructive' :
                            'warning'
                          }>
                            {isPaid ? 'Оплачен' : inv.status || 'pending'}
                          </Badge>
                        </td>
                        <td className="p-3">{inv.due_date?.split('T')[0] || '—'}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {/* ✅ КНОПКА ОПЛАТЫ */}
                            {!isPaid && remaining > 0.01 && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handlePayInvoice(inv.id)}
                                disabled={paying === inv.id}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                              >
                                {paying === inv.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Оплатить
                              </Button>
                            )}
                            
                            {/* Кнопка PDF */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportPDF(inv.id)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
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