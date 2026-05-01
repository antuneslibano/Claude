"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

interface Tx {
  id: string
  type: string
  description: string
  amount: number
  date: string
  dueDate: string | null
  paidAt: string | null
  saleId: string | null
  notes: string | null
  category: { name: string; type: string } | null
  store: { name: string }
}

interface Category { id: string; name: string; type: string }

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const TYPE_LABELS: Record<string, string> = { INCOME: "Receita", EXPENSE: "Despesa" }

export default function TransacoesPage() {
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filtros
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [typeFilter, setTypeFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [paidFilter, setPaidFilter] = useState("")

  const limit = 30

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(limit), from, to })
    if (typeFilter) params.set("type", typeFilter)
    if (categoryFilter) params.set("categoryId", categoryFilter)
    if (paidFilter) params.set("paid", paidFilter)
    const res = await fetch(`/api/financeiro/transacoes?${params}`)
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [from, to, typeFilter, categoryFilter, paidFilter])

  useEffect(() => {
    fetch("/api/financeiro/categorias").then((r) => r.json()).then(setCategories)
    load()
  }, [])

  async function markPaid(id: string) {
    await fetch(`/api/financeiro/transacoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidAt: new Date().toISOString() }),
    })
    load(page)
  }

  async function deleteTx(id: string) {
    if (!confirm("Excluir este lançamento?")) return
    const res = await fetch(`/api/financeiro/transacoes/${id}`, { method: "DELETE" })
    if (res.ok) load(page)
    else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Todos os lançamentos financeiros</p>
        </div>
        <div className="flex gap-2">
          <Link href="/financeiro/nova" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
            + Novo Lançamento
          </Link>
          <Link href="/financeiro" className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2 rounded-md">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoria</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Situação</label>
          <select value={paidFilter} onChange={(e) => setPaidFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="true">Quitados</option>
            <option value="false">Pendentes</option>
          </select>
        </div>
        <button onClick={() => { setPage(1); load(1) }}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md">
          Filtrar
        </button>
      </div>

      {/* Totais do filtro */}
      {!loading && transactions.length > 0 && (
        <div className="flex gap-4 mb-3 text-sm">
          <span className="text-green-700 font-medium">Receitas: {fmt(totalIncome)}</span>
          <span className="text-red-600 font-medium">Despesas: {fmt(totalExpense)}</span>
          <span className={`font-bold ${totalIncome - totalExpense >= 0 ? "text-green-800" : "text-red-700"}`}>
            Saldo: {fmt(totalIncome - totalExpense)}
          </span>
          <span className="text-gray-400 ml-auto">{total} lançamento(s)</span>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Nenhum lançamento encontrado.{" "}
            <Link href="/financeiro/nova" className="text-blue-600 hover:underline">Criar lançamento</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>{new Date(t.date).toLocaleDateString("pt-BR")}</p>
                    {t.dueDate && !t.paidAt && (
                      <p className={`mt-0.5 ${new Date(t.dueDate) < new Date() ? "text-red-500 font-medium" : "text-gray-400"}`}>
                        Venc: {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.description}</p>
                    {t.saleId && (
                      <Link href={`/vendas/${t.saleId}`} className="text-xs text-blue-500 hover:underline">
                        Venda #{t.saleId.slice(-6).toUpperCase()}
                      </Link>
                    )}
                    {t.notes && <p className="text-xs text-gray-400 mt-0.5">{t.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.store.name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${t.type === "INCOME" ? "text-green-700" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{fmt(t.amount)}
                    </span>
                    <p className="text-xs text-gray-400">{TYPE_LABELS[t.type]}</p>
                  </td>
                  <td className="px-4 py-3">
                    {t.paidAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Quitado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      {!t.paidAt && (
                        <button onClick={() => markPaid(t.id)} className="text-xs text-green-600 hover:text-green-800">
                          Quitar
                        </button>
                      )}
                      {!t.saleId && (
                        <button onClick={() => deleteTx(t.id)} className="text-xs text-red-400 hover:text-red-600">
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => { setPage(page - 1); load(page - 1) }} disabled={page === 1}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
          <button onClick={() => { setPage(page + 1); load(page + 1) }} disabled={page === totalPages}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
