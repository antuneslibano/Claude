"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Store { id: string; name: string }
interface Category { id: string; name: string; type: string }

export default function NovaTransacaoPage() {
  const router = useRouter()

  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({
    storeId: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    categoryId: "",
    description: "",
    amount: "",
    date: today,
    dueDate: "",
    paidAt: today,
    notes: "",
    markPaid: true,
  })

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data: Store[]) => {
      setStores(data)
      if (data.length > 0) setForm((p) => ({ ...p, storeId: data[0].id }))
    })
    fetch("/api/financeiro/categorias").then((r) => r.json()).then(setCategories)
  }, [])

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  const filteredCategories = categories.filter((c) => c.type === form.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.storeId || !form.description.trim() || !form.amount || !form.date) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }
    setLoading(true)
    const res = await fetch("/api/financeiro/transacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: form.storeId,
        type: form.type,
        categoryId: form.categoryId || undefined,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        dueDate: form.dueDate || undefined,
        paidAt: form.markPaid ? form.paidAt || form.date : undefined,
        notes: form.notes || undefined,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      router.push("/financeiro/transacoes")
    } else {
      setError(data.error ?? "Erro ao criar lançamento")
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Novo Lançamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registrar receita ou despesa manualmente</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Dados do Lançamento</h2>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
            <div className="flex gap-2">
              {(["INCOME", "EXPENSE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                    form.type === t
                      ? t === "INCOME"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t === "INCOME" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>
          </div>

          {stores.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loja *</label>
              <select value={form.storeId} onChange={(e) => set("storeId", e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <div className="flex gap-2">
              <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <a href="/financeiro/categorias" target="_blank"
                className="px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-500 hover:bg-gray-50">
                Gerenciar
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
            <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)}
              required placeholder="Ex: Aluguel da loja, Conta de energia..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} required placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de competência *</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vencimento</label>
            <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Baixa */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.markPaid} onChange={(e) => set("markPaid", e.target.checked)}
              className="rounded" />
            <span className="text-sm font-medium text-gray-700">Já foi pago / recebido</span>
          </label>
          {form.markPaid && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data do pagamento</label>
              <input type="date" value={form.paidAt} onChange={(e) => set("paidAt", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
            {loading ? "Salvando..." : "Registrar Lançamento"}
          </button>
          <button type="button" onClick={() => router.push("/financeiro")}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
