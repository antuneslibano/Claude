"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Store { id: string; name: string }
interface Product { id: string; brand: string; model: string; amperage: number; costPrice: number }
interface Supplier { id: string; name: string; cascoReturnMode: string; cascoWeightKg: number | null }
interface CascoRow { amperage: string; quantity: string; weightKg: string }

export default function EntradaEstoquePage() {
  const router = useRouter()

  const [dataLoaded, setDataLoaded] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [submitting, setSubmitting] = useState(false)
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

  const [cascosSent, setCascosSent] = useState(false)
  const [cascoRows, setCascoRows] = useState<CascoRow[]>([{ amperage: "", quantity: "1", weightKg: "" }])

  useEffect(() => {
    Promise.all([
      fetch("/api/lojas").then((r) => r.json()),
      fetch("/api/produtos?limit=500").then((r) => r.json()),
      fetch("/api/fornecedores?active=true").then((r) => r.json()),
    ]).then(([storesData, prodData, suppData]) => {
      const storeList: Store[] = Array.isArray(storesData) ? storesData : []
      setStores(storeList)
      if (storeList.length > 0) setForm((p) => ({ ...p, storeId: storeList[0].id }))

      setProducts(
        (prodData.products ?? []).map((p: any) => ({
          id: p.id,
          brand: p.brand?.name ?? "",
          model: p.model,
          amperage: p.amperage,
          costPrice: p.costPrice,
        }))
      )

      setSuppliers(
        (Array.isArray(suppData) ? suppData : []).map((s: any) => ({
          id: s.id,
          name: s.name,
          cascoReturnMode: s.cascoReturnMode ?? "NONE",
          cascoWeightKg: s.cascoWeightKg ?? null,
        }))
      )

      setDataLoaded(true)
    })
  }, [])

  function setField(field: string, value: string) {
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

  function handleSupplierChange(supplierId: string) {
    setForm((p) => ({ ...p, supplierId }))
    setCascosSent(false)
    setCascoRows([{ amperage: "", quantity: "1", weightKg: "" }])
  }

  // Atualiza linha de casco
  function setCascoRow(index: number, field: keyof CascoRow, value: string) {
    setCascoRows((rows) => {
      const updated = [...rows]
      updated[index] = { ...updated[index], [field]: value }

      // Auto-calcular peso se fornecedor usa WEIGHT e tem cascoWeightKg
      if (field === "quantity" && selectedSupplier?.cascoReturnMode === "WEIGHT" && selectedSupplier.cascoWeightKg) {
        const qty = parseFloat(value) || 0
        updated[index].weightKg = (qty * selectedSupplier.cascoWeightKg).toFixed(1)
      }

      return updated
    })
  }

  function addCascoRow() {
    setCascoRows((r) => [...r, { amperage: "", quantity: "1", weightKg: "" }])
  }

  function removeCascoRow(index: number) {
    setCascoRows((r) => r.filter((_, i) => i !== index))
  }

  const selectedProduct = products.find((p) => p.id === form.productId)
  const selectedSupplier = suppliers.find((s) => s.id === form.supplierId)
  const qty = parseInt(form.quantity) || 0
  const showWeight = selectedSupplier?.cascoReturnMode === "WEIGHT"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.storeId || !form.productId || !form.quantity || !form.costPrice) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }

    // Validar cascos se foram enviados
    if (cascosSent) {
      for (const row of cascoRows) {
        if (!row.amperage) { setError("Informe a amperagem de todos os cascos."); return }
        if (!row.quantity || parseInt(row.quantity) < 1) { setError("Informe a quantidade de cada casco."); return }
        if (showWeight && !row.weightKg) { setError("Informe o peso de todos os cascos."); return }
      }
    }

    setSubmitting(true)

    const cascos = cascosSent
      ? cascoRows.map((r) => ({
          amperage: r.amperage,
          quantity: r.quantity,
          weightKg: showWeight ? r.weightKg : null,
        }))
      : []

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
        cascos,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

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
      setCascosSent(false)
      setCascoRows([{ amperage: "", quantity: "1", weightKg: "" }])
    } else {
      setError(data.error ?? "Erro ao registrar entrada")
    }
  }

  if (!dataLoaded) {
    return (
      <div className="p-6 max-w-xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Entrada de Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registrar recebimento de baterias</p>
        </div>
        <div className="text-sm text-gray-400">Carregando dados...</div>
      </div>
    )
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
                onChange={(e) => setField("storeId", e.target.value)}
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
              onChange={(e) => handleSupplierChange(e.target.value)}
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
                onChange={(e) => setField("quantity", e.target.value)}
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
                onChange={(e) => setField("costPrice", e.target.value)}
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
              onChange={(e) => setField("batchNumber", e.target.value)}
              placeholder="Ex: L2024-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              placeholder="Nota fiscal, etc..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Seção de Sucatas */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Sucatas Enviadas</h2>
              {selectedSupplier && selectedSupplier.cascoReturnMode !== "NONE" && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedSupplier.name} exige devolução{" "}
                  {selectedSupplier.cascoReturnMode === "WEIGHT"
                    ? `por peso${selectedSupplier.cascoWeightKg ? ` (~${selectedSupplier.cascoWeightKg} kg/un)` : ""}`
                    : "por unidade"}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-gray-600">Foram enviadas sucatas?</span>
              <button
                type="button"
                onClick={() => {
                  setCascosSent((v) => !v)
                  setCascoRows([{ amperage: "", quantity: "1", weightKg: "" }])
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  cascosSent ? "bg-amber-500" : "bg-gray-300"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${cascosSent ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>

          {cascosSent && (
            <div className="space-y-3">
              {/* Cabeçalho da tabela */}
              <div className={`grid gap-2 text-xs font-medium text-gray-500 ${showWeight ? "grid-cols-[1fr_80px_100px_32px]" : "grid-cols-[1fr_80px_32px]"}`}>
                <span>Amperagem (Ah)</span>
                <span>Qtd</span>
                {showWeight && <span>Peso total (kg)</span>}
                <span />
              </div>

              {cascoRows.map((row, i) => (
                <div key={i} className={`grid gap-2 items-center ${showWeight ? "grid-cols-[1fr_80px_100px_32px]" : "grid-cols-[1fr_80px_32px]"}`}>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={row.amperage}
                    onChange={(e) => setCascoRow(i, "amperage", e.target.value)}
                    placeholder="Ex: 60"
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => setCascoRow(i, "quantity", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  {showWeight && (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={row.weightKg}
                      onChange={(e) => setCascoRow(i, "weightKg", e.target.value)}
                      placeholder="0.0"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeCascoRow(i)}
                    disabled={cascoRows.length === 1}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addCascoRow}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium"
              >
                + Adicionar amperagem
              </button>

              {showWeight && (
                <p className="text-xs text-gray-400">
                  Peso calculado automaticamente com base no fornecedor. Você pode ajustar manualmente.
                </p>
              )}
            </div>
          )}

          {!cascosSent && (
            <p className="text-xs text-gray-400">Nenhuma sucata foi enviada nesta compra.</p>
          )}
        </div>

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
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {submitting ? "Registrando..." : "Registrar Entrada"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/estoque/posicao")}
            disabled={submitting}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Ver Posição
          </button>
        </div>
      </form>
    </div>
  )
}
