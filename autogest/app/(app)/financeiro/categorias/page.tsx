"use client"

import { useEffect, useState } from "react"

interface Category {
  id: string
  name: string
  type: string
  active: boolean
  _count: { transactions: number }
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<"INCOME" | "EXPENSE">("EXPENSE")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/financeiro/categorias")
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch("/api/financeiro/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok || res.status === 200) {
      setNewName("")
      load()
    } else {
      setError(data.error ?? "Erro ao criar categoria")
    }
  }

  async function toggleActive(cat: Category) {
    await fetch(`/api/financeiro/categorias/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !cat.active }),
    })
    load()
  }

  const income = categories.filter((c) => c.type === "INCOME")
  const expense = categories.filter((c) => c.type === "EXPENSE")

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Categorias Financeiras</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organize receitas e despesas por categoria</p>
      </div>

      {/* Formulário de nova categoria */}
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nova categoria</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da categoria..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "INCOME" | "EXPENSE")}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          {saving ? "Adicionando..." : "Adicionar"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>}

      {loading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Receitas */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-100">
              <p className="text-xs font-semibold text-green-800">Receitas ({income.length})</p>
            </div>
            {income.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">Nenhuma categoria cadastrada.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {income.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className={`text-sm ${c.active ? "text-gray-800" : "text-gray-400 line-through"}`}>{c.name}</p>
                      <p className="text-xs text-gray-400">{c._count.transactions} lançamento(s)</p>
                    </div>
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={c._count.transactions > 0 && c.active}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                      title={c._count.transactions > 0 && c.active ? "Categoria em uso" : ""}
                    >
                      {c.active ? "Desativar" : "Ativar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Despesas */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-100">
              <p className="text-xs font-semibold text-red-800">Despesas ({expense.length})</p>
            </div>
            {expense.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">Nenhuma categoria cadastrada.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {expense.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className={`text-sm ${c.active ? "text-gray-800" : "text-gray-400 line-through"}`}>{c.name}</p>
                      <p className="text-xs text-gray-400">{c._count.transactions} lançamento(s)</p>
                    </div>
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={c._count.transactions > 0 && c.active}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                      title={c._count.transactions > 0 && c.active ? "Categoria em uso" : ""}
                    >
                      {c.active ? "Desativar" : "Ativar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
