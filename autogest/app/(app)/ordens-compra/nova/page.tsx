"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Store { id: string; name: string }
interface Supplier { id: string; name: string; avgDeliveryDays: number | null }
interface Product { id: string; brandName: string; model: string; amperage: number; costPrice: number }

interface OrderItem {
  productId: string
  brandName: string
  model: string
  amperage: number
  quantity: number
  costPrice: number
  batchNumber: string
}

export default function NovaOrdemCompraPage() {
  const router = useRouter()

  const [stores, setStores] = useState<Store[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [storeId, setStoreId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<OrderItem[]>([])
  const [productSearch, setProductSearch] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data: Store[]) => {
      setStores(data)
      if (data.length > 0) setStoreId(data[0].id)
    })
    fetch("/api/fornecedores?active=true").then((r) => r.json()).then((data: Supplier[]) => {
      setSuppliers(Array.isArray(data) ? data : [])
    })
    fetch("/api/produtos?limit=500").then((r) => r.json()).then((data: any) => {
      setProducts(
        (data.products ?? []).map((p: any) => ({
          id: p.id,
          brandName: p.brand?.name ?? "",
          model: p.model,
          amperage: p.amperage,
          costPrice: p.costPrice,
        }))
      )
    })
  }, [])

  const filteredProducts = productSearch.trim()
    ? products.filter((p) =>
        `${p.brandName} ${p.model} ${p.amperage}`.toLowerCase().includes(productSearch.toLowerCase())
      )
    : []

  function addItem(product: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product.id, brandName: product.brandName, model: product.model, amperage: product.amperage, quantity: 1, costPrice: product.costPrice, batchNumber: "" }]
    })
    setProductSearch("")
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function updateItem(productId: string, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, [field]: value } : i))
  }

  const totalCost = items.reduce((acc, i) => acc + i.quantity * i.costPrice, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!storeId || !supplierId || !purchaseDate) { setError("Preencha loja, fornecedor e data."); return }
    if (items.length === 0) { setError("Adicione ao menos um produto."); return }

    setLoading(true)
    const res = await fetch("/api/ordens-compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        supplierId,
        purchaseDate,
        invoiceNumber: invoiceNumber || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          costPrice: i.costPrice,
          batchNumber: i.batchNumber || undefined,
        })),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      router.push(`/ordens-compra/${data.id}`)
    } else {
      setError(data.error ?? "Erro ao registrar ordem de compra")
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nova Ordem de Compra</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registrar recebimento de baterias de um fornecedor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cabeçalho da ordem */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Dados da Compra</h2>

          <div className="grid grid-cols-2 gap-4">
            {stores.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loja *</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar fornecedor...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data da compra *</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número da Nota Fiscal</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: 000123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Busca de produto */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Produtos Comprados</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adicionar produto</label>
            <input
              type="text"
              placeholder="Buscar por marca, modelo ou amperagem..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filteredProducts.length > 0 && (
              <div className="border border-gray-200 rounded-md overflow-hidden max-h-40 overflow-y-auto mt-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p)}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <span><span className="font-medium">{p.brandName} {p.model}</span> <span className="text-gray-400 text-xs">({p.amperage}Ah)</span></span>
                    <span className="text-xs text-gray-500">Custo: R$ {p.costPrice.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="py-2 text-xs text-gray-500 font-medium">Produto</th>
                  <th className="py-2 text-xs text-gray-500 font-medium">Qtd</th>
                  <th className="py-2 text-xs text-gray-500 font-medium">Custo unit.</th>
                  <th className="py-2 text-xs text-gray-500 font-medium">Lote</th>
                  <th className="py-2 text-xs text-gray-500 font-medium">Subtotal</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-900">{item.brandName} {item.model}</p>
                      <p className="text-xs text-gray-400">{item.amperage}Ah</p>
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.productId, "quantity", parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => updateItem(item.productId, "costPrice", parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={(e) => updateItem(item.productId, "batchNumber", e.target.value)}
                        placeholder="Ex: L2025-01"
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 font-semibold text-gray-900 pr-3">
                      R$ {(item.quantity * item.costPrice).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <button type="button" onClick={() => removeItem(item.productId)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {items.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-900">Total: R$ {totalCost.toFixed(2)}</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors"
          >
            {loading ? "Registrando..." : `Registrar Compra · R$ ${totalCost.toFixed(2)}`}
          </button>
          <button
            type="button"
            onClick={() => router.push("/ordens-compra")}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
