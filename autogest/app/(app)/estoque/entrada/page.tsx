"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Store { id: string; name: string }
interface Product { id: string; brand: string; model: string; amperage: number; costPrice: number; weight: number | null }
interface Supplier { id: string; name: string; cascoReturnMode: string; cascoWeightKg: number | null }

export default function EntradaEstoquePage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    storeId: "",
    productId: "",
    supplierId: "",
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
          weight: p.weight ?? null,
        }))
      )
    })
    fetch("/api/fornecedores?active=true").then((r) => r.json()).then((data) => {
      setSuppliers(
        (Array.isArray(data) ? data : []).map((s: any) => ({
          id: s.id,
          name: s.name,
          cascoReturnMode: s.cascoReturnMode ?? "NONE",
          cascoWeightKg: s.cascoWeightKg ?? null,
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

  const selectedProduct = products.find((p) => p.id === form.productId)
  const selectedSupplier = suppliers.find((s) => s.id === form.supplierId)
  const qty = parseInt(form.quantity) || 0

  // Cálculo automático de cascos com base no fornecedor
  const cascoInfo = (() => {
    if (!selectedSupplier || selectedSupplier.cascoReturnMode === "NONE") return null
    if (selectedSupplier.cascoReturnMode === "UNIT") {
      return { label: "Cascos a devolver", value: `${qty} unidade${qty !== 1 ? "s" : ""}` }
    }
    if (selectedSupplier.cascoReturnMode === "WEIGHT") {
      const unitWeight = selectedSupplier.cascoWeightKg ?? selectedProduct?.weight ?? null
      if (unitWeight && qty > 0) {
        return { label: "Peso a devolver", value: `${(qty * unitWeight).toFixed(1)} kg (${unitWeight} kg × ${qty})` }
      }
      return { label: "Peso a devolver", value: "Configure o peso médio no cadastro do fornecedor" }
    }
    return null
  })()

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
        supplierId: form.supplierId || null,
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
      setForm((p) => ({
        ...p,
        productId: "",
        supplierId: "",
        quantity: "1",
        costPrice: "",
        batchNumber: "",
        notes: "",
      }))
    } else {
      setError(data.error ?? "Erro ao registrar entrada")
    }
  }

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
            <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor</label>
            <select
              value={form.supplierId}
              onChange={(e) => set("supplierId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sem fornecedor vinculado</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

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
              placeholder="Nota fiscal, etc..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Devolução de cascos — calculada automaticamente pelo fornecedor */}
        {cascoInfo ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">Devolução de Cascos</p>
            <p className="text-sm text-amber-900">
              <span className="font-medium">{cascoInfo.label}:</span> {cascoInfo.value}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Regra configurada no cadastro do fornecedor <strong>{selectedSupplier?.name}</strong>.
            </p>
          </div>
        ) : selectedSupplier && selectedSupplier.cascoReturnMode === "NONE" ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">
              O fornecedor <strong>{selectedSupplier.name}</strong> não exige devolução de cascos.
            </p>
          </div>
        ) : null}

        {form.productId && form.quantity && form.costPrice && (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-700">
            Total estimado: <strong>R$ {(qty * parseFloat(form.costPrice || "0")).toFixed(2)}</strong>
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
