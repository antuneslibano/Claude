"use client"

import { useEffect, useState } from "react"

const REASONS = [
  { value: "LOSS", label: "Perda / Avaria" },
  { value: "ADJUSTMENT", label: "Ajuste de Inventário" },
  { value: "TRANSFER_OUT", label: "Transferência para outra loja" },
  { value: "RETURN", label: "Devolução ao Fornecedor" },
]

interface Store { id: string; name: string }
interface Product { id: string; brand: string; model: string; amperage: number; available: number }

export default function SaidaEstoquePage() {
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    productId: "",
    quantity: "1",
    reason: "LOSS",
    notes: "",
  })

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data) => {
      setStores(data)
      if (data.length > 0) setStoreId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!storeId) return
    fetch(`/api/estoque/posicao?storeId=${storeId}`)
      .then((r) => r.json())
      .then((data) =>
        setProducts(
          data
            .filter((p: any) => p.available > 0)
            .map((p: any) => ({
              id: p.id,
              brand: p.brand,
              model: p.model,
              amperage: p.amperage,
              available: p.available,
            }))
        )
      )
  }, [storeId])

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!storeId || !form.productId || !form.quantity || !form.reason) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }
    setLoading(true)
    const res = await fetch("/api/estoque/saida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        productId: form.productId,
        quantity: parseInt(form.quantity),
        reason: form.reason,
        notes: form.notes || null,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setSuccess(`${data.count} unidade(s) baixada(s) do estoque.`)
      setForm((p) => ({ ...p, productId: "", quantity: "1", notes: "" }))
      // Refresh products list
      fetch(`/api/estoque/posicao?storeId=${storeId}`)
        .then((r) => r.json())
        .then((d) =>
          setProducts(
            d.filter((p: any) => p.available > 0).map((p: any) => ({
              id: p.id, brand: p.brand, model: p.model, amperage: p.amperage, available: p.available,
            }))
          )
        )
    } else {
      setError(data.error ?? "Erro ao registrar saída")
    }
  }

  const selectedProduct = products.find((p) => p.id === form.productId)

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Saída de Estoque</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registrar baixa, perda ou ajuste</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Dados da Saída</h2>

          {stores.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loja *</label>
              <select
                value={storeId}
                onChange={(e) => { setStoreId(e.target.value); setForm((p) => ({ ...p, productId: "" })) }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
            <select
              value={form.productId}
              onChange={(e) => set("productId", e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} — {p.model} ({p.amperage}Ah) · {p.available} disponível
                </option>
              ))}
            </select>
            {products.length === 0 && storeId && (
              <p className="text-xs text-gray-400 mt-1">Nenhum produto com estoque disponível.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.available ?? 999}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedProduct && (
                <p className="text-xs text-gray-400 mt-1">Máx: {selectedProduct.available}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
              <select
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Detalhes sobre a saída..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Registrar Saída"}
          </button>
        </div>
      </form>
    </div>
  )
}
