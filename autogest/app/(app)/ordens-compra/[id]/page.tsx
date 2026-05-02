"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface OrderDetail {
  id: string
  invoiceNumber: string | null
  purchaseDate: string
  totalCost: number
  type: string
  paymentType: string
  status: string
  expectedDeliveryDate: string | null
  deliveredAt: string | null
  paidAt: string | null
  cascoMode: string | null
  cascosRequired: number | null
  cascoWeightKg: number | null
  cascosSent: number
  cascoWeightSent: number
  notes: string | null
  store: { name: string }
  supplier: { id: string; name: string; phone: string | null; email: string | null }
  orderItems: {
    id: string
    quantity: number
    unitCost: number
    batchNumber: string | null
    product: { model: string; amperage: number; brand: { name: string } }
  }[]
  groupedItems: {
    product: { brand: { name: string }; model: string; amperage: number }
    costPrice: number
    units: { id: string; serialNumber: string | null; batchNumber: string | null; status: string }[]
  }[]
}

const PO_STATUS_LABELS: Record<string, string> = {
  ORDERED: "Aguardando entrega",
  DELIVERED: "Recebido",
  CANCELLED: "Cancelado",
}

const PO_STATUS_COLORS: Record<string, string> = {
  ORDERED: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
}

const UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponível",
  SOLD: "Vendido",
  RESERVED: "Reservado",
  WARRANTY: "Garantia",
  EXCHANGE: "Troca",
  RETURNED: "Devolvido",
  DISPOSAL: "Descarte",
}

export default function OrdemCompraDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    fetch(`/api/ordens-compra/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false) })
  }, [id])

  async function handleCancel() {
    if (!confirm("Confirma o cancelamento deste pedido?")) return
    setCancelling(true)
    const res = await fetch(`/api/ordens-compra/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    })
    setCancelling(false)
    if (res.ok) {
      const updated = await res.json()
      setOrder(updated)
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Carregando...</div>
  if (!order) return <div className="p-8 text-sm text-red-500">Ordem não encontrada.</div>

  const hasCascoDebt = order.cascoMode && order.cascoMode !== "NONE"
  const unit = order.cascoMode === "WEIGHT" ? "kg" : "un"
  const required = order.cascoMode === "WEIGHT" ? (order.cascoWeightKg ?? 0) : (order.cascosRequired ?? 0)
  const sent = order.cascoMode === "WEIGHT" ? order.cascoWeightSent : order.cascosSent
  const pending = Math.max(0, required - sent)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ordens-compra" className="text-xs text-gray-400 hover:text-gray-600">Ordens de Compra</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">
          Pedido #{order.id.slice(-6).toUpperCase()}
        </h1>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PO_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
          {PO_STATUS_LABELS[order.status] ?? order.status}
        </span>
        {order.type === "PROGRAMMED" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            Programada
          </span>
        )}
      </div>

      {order.status === "ORDERED" && (
        <div className="flex items-center gap-4 mb-5 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Pedido aguardando recebimento</p>
            <p className="text-xs text-amber-600 mt-0.5">Ao receber as baterias, lance no estoque clicando no botão ao lado.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/ordens-compra/${id}/receber`}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
            >
              Registrar Recebimento
            </Link>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {cancelling ? "Cancelando..." : "Cancelar Pedido"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{order.type === "PROGRAMMED" ? "Data do pedido" : "Data da compra"}</p>
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
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Pagamento</p>
            <p className="font-medium">{order.paymentType === "CASH" ? "Dinheiro" : "Troca de Cascos"}</p>
          </div>
          {order.invoiceNumber && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Nota Fiscal</p>
              <p className="font-medium">{order.invoiceNumber}</p>
            </div>
          )}
          {order.type === "PROGRAMMED" && order.expectedDeliveryDate && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Data prevista de entrega</p>
              <p className="font-medium">{new Date(order.expectedDeliveryDate).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
          {order.paidAt && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Data do pagamento</p>
              <p className="font-medium">{new Date(order.paidAt).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
          {order.deliveredAt && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Recebido em</p>
              <p className="font-medium">{new Date(order.deliveredAt).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Observações</p>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>

        {hasCascoDebt && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Débito de Cascos</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Deve devolver</p>
                <p className="text-lg font-bold text-gray-900">{required} {unit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Já enviou</p>
                <p className="text-lg font-bold text-gray-900">{sent} {unit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Pendente</p>
                <p className={`text-lg font-bold ${pending > 0 ? "text-red-600" : "text-green-600"}`}>
                  {pending > 0 ? `${pending} ${unit}` : "Quitado"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Itens Pedidos</p>
            <p className="text-xs text-gray-500">Total: <span className="font-semibold text-gray-900">R$ {order.totalCost.toFixed(2)}</span></p>
          </div>
          {order.orderItems.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">Nenhum item registrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Produto</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Qtd</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Custo unit.</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Lote</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.orderItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {item.product.brand.name} {item.product.model} ({item.product.amperage}Ah)
                    </td>
                    <td className="px-5 py-3 text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-3 text-gray-600">R$ {item.unitCost.toFixed(2)}</td>
                    <td className="px-5 py-3 text-gray-500">{item.batchNumber ?? "-"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">R$ {(item.quantity * item.unitCost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700">Estoque Recebido</p>
          </div>
          {order.groupedItems.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              {order.status === "ORDERED"
                ? "Nenhum item recebido ainda. Clique em Registrar Recebimento quando as baterias chegarem."
                : "Nenhum item recebido."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {order.groupedItems.map((group, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {group.product.brand.name} {group.product.model} ({group.product.amperage}Ah)
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {group.units.length} unidade(s) · R$ {group.costPrice.toFixed(2)} cada · Subtotal: R$ {(group.units.length * group.costPrice).toFixed(2)}
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
                        {unit.serialNumber ? `S/N: ${unit.serialNumber}` : UNIT_STATUS_LABELS[unit.status] ?? unit.status}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
