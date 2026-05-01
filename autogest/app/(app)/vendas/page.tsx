"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Sale {
  id: string
  status: string
  total: number
  subtotal: number
  discount: number
  estimatedProfit: number
  createdAt: string
  store: { name: string }
  customer: { name: string; phone: string } | null
  seller: { name: string }
  items: { product: { brand: { name: string }; model: string; amperage: number }; unitPrice: number }[]
  payments: { method: string; amount: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  RETURNED: "Devolvida",
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-amber-100 text-amber-700",
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  INSTALLMENT_CARD: "Crédito Parc.",
  BANK_SLIP: "Boleto",
  STORE_CREDIT: "Crediário",
}

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const limit = 20

  async function load(p = 1, status = statusFilter) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (status) params.set("status", status)
    const res = await fetch(`/api/vendas?${params}`)
    const data = await res.json()
    setSales(data.sales ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  function handleFilter(status: string) {
    setStatusFilter(status)
    setPage(1)
    load(1, status)
  }

  const totalPages = Math.ceil(total / limit)

  const todaySales = sales.filter((s) => {
    const d = new Date(s.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString() && s.status === "COMPLETED"
  })
  const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vendas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Histórico e gerenciamento de vendas</p>
        </div>
        <Link
          href="/vendas/nova"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nova Venda
        </Link>
      </div>

      {/* Resumo */}
      {todaySales.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Vendas hoje</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{todaySales.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Receita hoje</p>
            <p className="text-2xl font-bold text-green-700 mt-1">R$ {todayRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Lucro estimado hoje</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              R$ {todaySales.reduce((a, s) => a + s.estimatedProfit, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {["", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => handleFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "Todas" : STATUS_LABELS[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 self-center">{total} venda(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Nenhuma venda encontrada.{" "}
            <Link href="/vendas/nova" className="text-blue-600 hover:underline">Registrar primeira venda</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Venda</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto(s)</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamento</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/vendas/${sale.id}`} className="font-medium text-blue-600 hover:underline">
                      #{sale.id.slice(-6).toUpperCase()}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(sale.createdAt).toLocaleDateString("pt-BR")}{" "}
                      {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-gray-400">{sale.store.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {sale.customer ? (
                      <>
                        <p className="font-medium text-gray-900">{sale.customer.name}</p>
                        {sale.customer.phone && <p className="text-xs text-gray-400">{sale.customer.phone}</p>}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Não informado</span>
                    )}
                    <p className="text-xs text-gray-400">{sale.seller.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {sale.items.map((item, i) => (
                      <p key={i} className="text-xs text-gray-700">
                        {item.product.brand.name} {item.product.model} ({item.product.amperage}Ah)
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {sale.payments.map((p, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        {METHOD_LABELS[p.method] ?? p.method}: R$ {p.amount.toFixed(2)}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">R$ {sale.total.toFixed(2)}</p>
                    {sale.discount > 0 && (
                      <p className="text-xs text-gray-400">Desc: R$ {sale.discount.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[sale.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[sale.status] ?? sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => { setPage(page - 1); load(page - 1) }}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => { setPage(page + 1); load(page + 1) }}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
