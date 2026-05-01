"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Store { id: string; name: string }
interface Product { id: string; brand: string; model: string; amperage: number; costPrice: number }

export default function EntradaEstoquePage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    storeId: "",
    productId: "",
    quantity: "1",
    costPrice: "",
    batchNumber: "",
    notes: "",
  })

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data) => {
      setStores(data)
      if (data.length > 0) setForm((p) => ({ ...p, storeId: data[0].id }))
    })
    fetch("/api/produtos?limit=500").then((r) => r.json()).then((data) => {
      setProducts(
        (data.products ?? []).map((p: any) => ({
          id: p.id,
          brand: p.brand?.name ?? "",
          model: p.model,
          amperage: p.amperage,
          costPrice: p.costPrice,
        }))
      )
    })
  }, [])

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleProductChange(productId: string) {
    const p = products.find((x) => x.id === productId)
    setForm((prev) => ({
      ...prev,
      productId,
      costPrice: p ? String(p.costPrice) : prev.costPrice,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!form.storeId || !form.productId || !form.quantity || !form.costPrice) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }
    setLoading(true)
    const res = await fetch("/api/estoque/entrada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: form.storeId,
        productId: form.productId,
        quantity: parseInt(form.quantity),
        costPrice: parseFloat(form.costPrice),
        batchNumber: form.batchNumber || null,
        notes: form.notes || null,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setSuccess(`${data.count} unidade(s) adicionada(s) ao estoque com sucesso.`)
      setForm((p) => ({ ...p, productId: "", quantity: "1", costPrice: "", batchNumber: "", notes: "" }))
    } else {
      setError(data.error ?? "Erro ao registrar entrada")
    }
  }

  const selectedProduct = products.find((p) => p.id === form.productId)

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Entrada de Estoque</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registrar recebimento de baterias</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Dados da Entrada</h2>

          {stores.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loja *</label>
              <select
                value={form.storeId}
                onChange={(e) => set("storeId", e.target.value)}
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
              onChange={(e) => handleProductChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} — {p.model} ({p.amperage}Ah)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                max="500"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Custo unitário (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
                required
                placeholder={selectedProduct ? String(selectedProduct.costPrice) : "0.00"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número do Lote</label>
            <input
              type="text"
              value={form.batchNumber}
              onChange={(e) => set("batchNumber", e.target.value)}
              placeholder="Ex: L2024-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Nota fiscal, fornecedor, etc..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {form.productId && form.quantity && form.costPrice && (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-700">
            Total estimado: <strong>R$ {(parseInt(form.quantity || "0") * parseFloat(form.costPrice || "0")).toFixed(2)}</strong>
            {" "}({form.quantity} × R$ {parseFloat(form.costPrice || "0").toFixed(2)})
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Registrar Entrada"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/estoque/posicao")}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Ver Posição
          </button>
        </div>
      </form>
    </div>
  )
}
