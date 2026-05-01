"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Supplier {
  id: string
  name: string
  cnpj: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  paymentTerms: string | null
  avgDeliveryDays: number | null
  active: boolean
  _count: { purchaseOrders: number; stockItems: number }
}

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (!showInactive) params.set("active", "true")
    const res = await fetch(`/api/fornecedores?${params}`)
    const data = await res.json()
    setSuppliers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load()
  }

  async function toggleActive(supplier: Supplier) {
    await fetch(`/api/fornecedores/${supplier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !supplier.active }),
    })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fornecedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastro e histórico de compras por fornecedor</p>
        </div>
        <Link
          href="/fornecedores/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Novo Fornecedor
        </Link>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
        >
          Buscar
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => { setShowInactive(e.target.checked); setTimeout(load, 0) }}
            className="rounded"
          />
          Mostrar inativos
        </label>
      </form>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Nenhum fornecedor encontrado.{" "}
            <Link href="/fornecedores/novo" className="text-blue-600 hover:underline">Cadastrar primeiro fornecedor</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Condições</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Compras</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map((s) => (
                <tr key={s.id} className={`hover:bg-gray-50 ${!s.active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.cnpj && <p className="text-xs text-gray-400">CNPJ: {s.cnpj}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {s.contactName && <p className="text-gray-700">{s.contactName}</p>}
                    {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                    {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {s.paymentTerms && <p className="text-xs text-gray-600">{s.paymentTerms}</p>}
                    {s.avgDeliveryDays != null && (
                      <p className="text-xs text-gray-400">{s.avgDeliveryDays} dias de entrega</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{s._count.purchaseOrders} ordem(ns)</p>
                    <p className="text-xs text-gray-400">{s._count.stockItems} unidade(s)</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <Link href={`/fornecedores/${s.id}/editar`} className="text-xs text-blue-600 hover:underline">Editar</Link>
                      <button onClick={() => toggleActive(s)} className="text-xs text-gray-400 hover:text-gray-600">
                        {s.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
