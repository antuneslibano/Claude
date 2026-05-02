"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface ReceiveItem {
  orderItemId: string
  productId: string
  productName: string
  orderedQty: number
  receiveQty: number
  unitCost: number
  batchNumber: string
}

interface POData {
  id: string
  status: string
  supplier: { id: string; name: string }
  store: { id: string; name: string }
  orderItems: {
    id: string
    productId: string
    quantity: number
    unitCost: number
    batchNumber: string | null
    product: { model: string; amperage: number; brand: { name: string } }
  }[]
}

export default function ReceberOrdemPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [po, setPo] = useState<POData | null>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReceiveItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/ordens-compra/${id}`)
      .then((r) => r.json())
      .then((data: POData) => {
        setPo(data)
        setItems(data.orderItems.map((oi) => ({
          orderItemId: oi.id,
          productId: oi.productId,
          productName: `${oi.product.brand.name} ${oi.product.model} (${oi.product.amperage}Ah)`,
          orderedQty: oi.quantity,
          receiveQty: oi.quantity,
          unitCost: oi.unitCost,
          batchNumber: oi.batchNumber ?? "",
        })))
        setLoading(false)
      })
  }, [id])

  function updateItem(orderItemId: string, field: "receiveQty" | "unitCost" | "batchNumber", value: string | number) {
    setItems((prev) => prev.map((i) => i.orderItemId === orderItemId ? { ...i, [field]: value } : i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!po) return
    setError("")
    setSaving(true)

    for (const item of items) {
      if (item.receiveQty < 1) continue
      const res = await fetch("/api/estoque/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          storeId: po.store.id,
          quantity: item.receiveQty,
          costPrice: item.unitCost,
          supplierId: po.supplier.id,
          batchNumber: item.batchNumber || null,
          purchaseOrderId: po.id,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaving(false)
        setError(`Erro ao receber ${item.productName}: ${d.error ?? "Erro desconhecido"}`)
        return
      }
    }

    setSaving(false)
    router.push(`/ordens-compra/${id}`)
    router.refresh()
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Carregando...</div>
  if (!po) return <div className="p-8 text-sm text-red-500">Ordem nao encontrada.</div>
  if (po.status !== "ORDERED") {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">Este pedido ja foi recebido ou cancelado.</p>
        <Link href={`/ordens-compra/${id}`} className="text-sm text-blue-600 hover:underline mt-2 block">Voltar ao pedido</Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/ordens-compra/${id}`} className="text-xs text-gray-400 hover:text-gray-600">Voltar ao pedido</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Registrar Recebimento</h1>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-700">
        Pedido de <strong>{po.supplier.name}</strong> para <strong>{po.store.name}</strong>.
        Confirme as quantidades recebidas e os numeros de lote.
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Itens a Receber</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs text-gray-500 font-medium">Produto</th>
                <th className="px-5 py-3 text-xs text-gray-500 font-medium">Pedido</th>
                <th className="px-5 py-3 text-xs text-gray-500 font-medium">Receber</th>
                <th className="px-5 py-3 text-xs text-gray-500 font-medium">Custo unit. (R$)</th>
                <th className="px-5 py-3 text-xs text-gray-500 font-medium">Lote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.orderItemId}>
                  <td className="px-5 py-3 font-medium text-gray-900">{item.productName}</td>
                  <td className="px-5 py-3 text-gray-500">{item.orderedQty}</td>
                  <td className="px-5 py-3">
                    <input type="number" min="0" max={item.orderedQty} value={item.receiveQty}
                      onChange={(e) => updateItem(item.orderItemId, "receiveQty", parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-5 py-3">
                    <input type="number" step="0.01" min="0" value={item.unitCost}
                      onChange={(e) => updateItem(item.orderItemId, "unitCost", parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-5 py-3">
                    <input type="text" value={item.batchNumber}
                      onChange={(e) => updateItem(item.orderItemId, "batchNumber", e.target.value)}
                      placeholder="Ex: L2025-01"
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
            {saving ? "Lancando no estoque..." : "Confirmar Recebimento"}
          </button>
          <Link href={`/ordens-compra/${id}`}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
