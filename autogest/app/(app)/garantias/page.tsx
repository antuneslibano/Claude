"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Warranty {
  id: string
  status: string
  startDate: string
  endDate: string
  claimedAt: string | null
  customer: { name: string; phone: string | null } | null
  sale: { id: string; store: { name: string } }
  saleItem: { product: { brand: { name: string }; model: string; amperage: number } }
  stockItem: { serialNumber: string | null }
  customerVehicle: { plate: string | null; year: number | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  CLAIMED: "Acionada",
  REPLACED: "Substituída",
  REJECTED: "Rejeitada",
  EXPIRED: "Expirada",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  CLAIMED: "bg-amber-100 text-amber-700",
  REPLACED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
}

const STATUS_FILTERS = [
  { value: "", label: "Em aberto" },
  { value: "ACTIVE", label: "Ativas" },
  { value: "CLAIMED", label: "Acionadas" },
  { value: "REPLACED", label: "Substituídas" },
  { value: "REJECTED", label: "Rejeitadas" },
  { value: "EXPIRED", label: "Expiradas" },
]

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function GarantiasPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const limit = 20

  async function load(p = 1, status = statusFilter, q = search) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (status) params.set("status", status)
    if (q) params.set("search", q)
    const res = await fetch(`/api/garantias?${params}`)
    const data = await res.json()
    setWarranties(data.warranties ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleFilter(status: string) {
    setStatusFilter(status)
    setPage(1)
    load(1, status, search)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(1, statusFilter, search)
  }

  const totalPages = Math.ceil(total / limit)

  const claimed = warranties.filter((w) => w.status === "CLAIMED")

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Garantias</h1>
        <p className="text-sm text-gray-500 mt-0.5">Acompanhamento e gestão de garantias de baterias</p>
      </div>

      {/* Alerta de pendências */}
      {claimed.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠</span>
          <p className="text-sm text-amber-800">
            <strong>{claimed.length}</strong> garantia{claimed.length > 1 ? "s" : ""} acionada{claimed.length > 1 ? "s" : ""} aguardando avaliação.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                statusFilter === f.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
          <input
            type="text"
            placeholder="Buscar cliente ou nº de série..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <button type="submit" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md">Buscar</button>
        </form>
        <span className="text-xs text-gray-400">{total} garantia(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : warranties.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhuma garantia encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Garantia</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Validade</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warranties.map((w) => {
                const days = daysUntil(w.endDate)
                const expiring = w.status === "ACTIVE" && days <= 30 && days > 0
                return (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/garantias/${w.id}`} className="font-medium text-blue-600 hover:underline">
                        #{w.id.slice(-6).toUpperCase()}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Venda #{w.sale.id.slice(-6).toUpperCase()} · {w.sale.store.name}
                      </p>
                      {w.stockItem.serialNumber && (
                        <p className="text-xs text-gray-400">S/N: {w.stockItem.serialNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {w.customer ? (
                        <>
                          <p className="font-medium text-gray-900">{w.customer.name}</p>
                          {w.customer.phone && <p className="text-xs text-gray-400">{w.customer.phone}</p>}
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                      {w.customerVehicle?.plate && (
                        <p className="text-xs text-gray-400">Placa: {w.customerVehicle.plate}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {w.saleItem.product.brand.name} {w.saleItem.product.model}
                      </p>
                      <p className="text-xs text-gray-400">{w.saleItem.product.amperage}Ah</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">
                        Até {new Date(w.endDate).toLocaleDateString("pt-BR")}
                      </p>
                      {w.status === "ACTIVE" && (
                        <p className={`text-xs mt-0.5 ${expiring ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                          {days > 0 ? `${days} dia${days > 1 ? "s" : ""}` : "Expirada"}
                          {expiring ? " ⚠" : ""}
                        </p>
                      )}
                      {w.status === "CLAIMED" && w.claimedAt && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Acionada em {new Date(w.claimedAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[w.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[w.status] ?? w.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
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
