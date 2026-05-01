"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface OrderDetail {
  id: string
  invoiceNumber: string | null
  purchaseDate: string
  totalCost: number
  notes: string | null
  store: { name: string }
  supplier: { id: string; name: string; phone: string | null; email: string | null }
  groupedItems: {
    product: { brand: { name: string }; model: string; amperage: number }
    costPrice: number
    units: { id: string; serialNumber: string | null; status: string }[]
  }[]
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponível",
  SOLD: "Vendido",
  RESERVED: "Reservado",
  WARRANTY: "Garantia",
  EXCHANGE: "Troca",
  RETURNED: "Devolvido",
  DISPOSAL: "Descarte",
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "text-green-700",
  SOLD: "text-gray-400",
  RESERVED: "text-amber-600",
  WARRANTY: "text-blue-600",
}

export default function OrdemCompraDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ordens-compra/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-8 text-sm text-gray-400">Carregando...</div>
  if (!order) return <div className="p-8 text-sm text-red-500">Ordem não encontrada.</div>

  const totalUnits = order.groupedItems.reduce((acc, g) => acc + g.units.length, 0)
  const availableUnits = order.groupedItems.reduce((acc, g) => acc + g.units.filter((u) => u.status === "AVAILABLE").length, 0)
  const soldUnits = order.groupedItems.reduce((acc, g) => acc + g.units.filter((u) => u.status === "SOLD").length, 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ordens-compra" className="text-xs text-gray-400 hover:text-gray-600">← Ordens de Compra</Link>
        <h1 className="text-xl font-semibold text-gray-900">
          Ordem #{order.id.slice(-6).toUpperCase()}
        </h1>
      </div>

      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Data da compra</p>
            <p className="font-medium">{new Date(order.purchaseDate).toLocaleDateString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Loja</p>
            <p className="font-medium">{order.store.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Fornecedor</p>
            <p className="font-medium">{order.supplier.name}</p>
            {order.supplier.phone && <p className="text-xs text-gray-400">{order.supplier.phone}</p>}
          </div>
          {order.invoiceNumber && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Nota Fiscal</p>
              <p className="font-medium">{order.invoiceNumber}</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Observações</p>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total pago", value: `R$ ${order.totalCost.toFixed(2)}`, color: "text-gray-900" },
            { label: "Unidades", value: String(totalUnits), color: "text-gray-900" },
            { label: "Disponíveis", value: String(availableUnits), color: "text-green-700" },
            { label: "Vendidas", value: String(soldUnits), color: "text-gray-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Produtos */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700">Produtos recebidos</p>
          </div>
          <div className="divide-y divide-gray-100">
            {order.groupedItems.map((group, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {group.product.brand.name} {group.product.model} ({group.product.amperage}Ah)
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {group.units.length} unidade(s) · R$ {group.costPrice.toFixed(2)} cada ·{" "}
                      Subtotal: R$ {(group.units.length * group.costPrice).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-green-700">{group.units.filter((u) => u.status === "AVAILABLE").length} disponíveis</p>
                    <p className="text-gray-400">{group.units.filter((u) => u.status === "SOLD").length} vendidas</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {group.units.map((unit) => (
                    <span
                      key={unit.id}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
                        unit.status === "AVAILABLE"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      {unit.serialNumber ? `S/N: ${unit.serialNumber}` : STATUS_LABELS[unit.status] ?? unit.status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
