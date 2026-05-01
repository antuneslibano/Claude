"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Pessoa Física",
  WORKSHOP: "Oficina",
  COMPANY: "Empresa",
  FLEET: "Frota",
  RESELLER: "Revendedor",
}

const TYPE_COLORS: Record<string, string> = {
  INDIVIDUAL: "bg-blue-100 text-blue-700",
  WORKSHOP: "bg-orange-100 text-orange-700",
  COMPANY: "bg-purple-100 text-purple-700",
  FLEET: "bg-green-100 text-green-700",
  RESELLER: "bg-yellow-100 text-yellow-700",
}

interface Customer {
  id: string
  name: string
  cpfCnpj: string | null
  phone: string | null
  whatsapp: string | null
  city: string | null
  state: string | null
  type: string
  _count: { vehicles: number; sales: number }
}

export default function ClientesList() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ q: search, tipo: filterType, page: String(page) })
    const res = await fetch(`/api/clientes?${params}`)
    if (res.ok) {
      const data = await res.json()
      setCustomers(data.customers)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [search, filterType, page])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir cliente "${name}"?`)) return
    setDeleting(id)
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" })
    const data = await res.json()
    alert(data.message)
    setDeleting(null)
    fetchCustomers()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} {total === 1 ? "cliente cadastrado" : "clientes cadastrados"}
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Novo Cliente
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">CPF / CNPJ</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Telefone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cidade</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Veículos</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Compras</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Carregando...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                  Nenhum cliente encontrado.{" "}
                  <Link href="/clientes/novo" className="text-blue-600 hover:underline">Cadastrar o primeiro</Link>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>
                      {TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cpfCnpj ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.phone ?? c.whatsapp ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.city ? `${c.city}${c.state ? ` / ${c.state}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{c._count.vehicles}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{c._count.sales}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/clientes/${c.id}`} className="text-xs text-gray-500 hover:text-gray-700">Ver</Link>
                      <Link href={`/clientes/${c.id}/editar`} className="text-xs text-blue-600 hover:underline">Editar</Link>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleting === c.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-40"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Página {page} de {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50">
                Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50">
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
