"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Order {
  id: string
  invoiceNumber: string | null
  purchaseDate: string
  totalCost: number
  notes: string | null
  store: { name: string }
  supplier: { name: string }
  _count: { items: number }
}

export default function OrdensCompraPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 20

  async function load(p = 1) {
    setLoading(true)
    const res = await fetch(`/api/ordens-compra?page=${p}&limit=${limit}`)
    const data = await res.json()
    setOrders(data.orders ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ordens de Compra</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de entradas por nota fiscal / fornecedor</p>
        </div>
        <Link
          href="/ordens-compra/nova"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Nova Ordem
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Nenhuma ordem de compra registrada.{" "}
            <Link href="/ordens-compra/nova" className="text-blue-600 hover:underline">Registrar primeira compra</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ordem</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/ordens-compra/${o.id}`} className="font-medium text-blue-600 hover:underline">
                      #{o.id.slice(-6).toUpperCase()}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(o.purchaseDate).toLocaleDateString("pt-BR")}
                    </p>
                    {o.invoiceNumber && <p className="text-xs text-gray-400">NF: {o.invoiceNumber}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.supplier.name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.store.name}</td>
                  <td className="px-4 py-3 text-gray-600">{o._count.items} unidade(s)</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">R$ {o.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
