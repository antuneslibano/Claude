"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface SaleDetail {
  id: string
  status: string
  subtotal: number
  discount: number
  total: number
  estimatedProfit: number
  notes: string | null
  receiptSent: boolean
  createdAt: string
  store: { name: string }
  customer: { id: string; name: string; phone: string | null; whatsapp: string | null; cpfCnpj: string | null } | null
  customerVehicle: { plate: string | null; year: number | null } | null
  seller: { name: string }
  items: {
    id: string
    unitPrice: number
    costPrice: number
    discount: number
    total: number
    product: { brand: { name: string }; model: string; amperage: number; warrantyMonths: number }
    stockItem: { serialNumber: string | null; batchNumber: string | null }
    warranty: { id: string; endDate: string; status: string } | null
  }[]
  payments: { method: string; amount: number; installments: number | null }[]
}

const STATUS_LABELS: Record<string, string> = { COMPLETED: "Concluída", CANCELLED: "Cancelada", RETURNED: "Devolvida" }
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-amber-100 text-amber-700",
}
const METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro", PIX: "Pix", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito",
  INSTALLMENT_CARD: "Crédito Parc.", BANK_SLIP: "Boleto", STORE_CREDIT: "Crediário",
}
const WARRANTY_COLORS: Record<string, string> = {
  ACTIVE: "text-green-700", EXPIRED: "text-gray-400", CLAIMED: "text-amber-600", REJECTED: "text-red-600", REPLACED: "text-blue-600",
}

export default function VendaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/vendas/${id}`)
      .then((r) => r.json())
      .then((data) => { setSale(data); setLoading(false) })
  }, [id])

  async function handleCancel() {
    if (!confirm("Cancelar esta venda? O estoque será devolvido automaticamente.")) return
    setCancelling(true)
    setError("")
    const res = await fetch(`/api/vendas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    })
    if (res.ok) {
      setSale((prev) => prev ? { ...prev, status: "CANCELLED" } : prev)
    } else {
      const data = await res.json()
      setError(data.error ?? "Erro ao cancelar")
    }
    setCancelling(false)
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Carregando...</div>
  if (!sale) return <div className="p-8 text-sm text-red-500">Venda não encontrada.</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vendas" className="text-xs text-gray-400 hover:text-gray-600">← Vendas</Link>
        <h1 className="text-xl font-semibold text-gray-900">
          Venda #{sale.id.slice(-6).toUpperCase()}
        </h1>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[sale.status] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABELS[sale.status] ?? sale.status}
        </span>
      </div>

      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Data</p>
            <p className="font-medium">{new Date(sale.createdAt).toLocaleDateString("pt-BR")} {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Loja</p>
            <p className="font-medium">{sale.store.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Vendedor</p>
            <p className="font-medium">{sale.seller.name}</p>
          </div>
          {sale.customer && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
              <p className="font-medium">{sale.customer.name}</p>
              {sale.customer.phone && <p className="text-xs text-gray-400">{sale.customer.phone}</p>}
              {sale.customer.cpfCnpj && <p className="text-xs text-gray-400">{sale.customer.cpfCnpj}</p>}
            </div>
          )}
          {sale.customerVehicle && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Veículo</p>
              <p className="font-medium">{sale.customerVehicle.plate ?? "—"}{sale.customerVehicle.year ? ` (${sale.customerVehicle.year})` : ""}</p>
            </div>
          )}
          {sale.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Observações</p>
              <p className="text-gray-700">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Itens */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700">Produtos</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="px-5 py-2 text-xs text-gray-500 font-medium">Produto</th>
                <th className="px-5 py-2 text-xs text-gray-500 font-medium">Preço</th>
                <th className="px-5 py-2 text-xs text-gray-500 font-medium">Total</th>
                <th className="px-5 py-2 text-xs text-gray-500 font-medium">Garantia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{item.product.brand.name} {item.product.model} ({item.product.amperage}Ah)</p>
                    {item.stockItem.serialNumber && <p className="text-xs text-gray-400">S/N: {item.stockItem.serialNumber}</p>}
                    {item.stockItem.batchNumber && <p className="text-xs text-gray-400">Lote: {item.stockItem.batchNumber}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <p>R$ {item.unitPrice.toFixed(2)}</p>
                    {item.discount > 0 && <p className="text-xs text-gray-400">Desc: R$ {item.discount.toFixed(2)}</p>}
                  </td>
                  <td className="px-5 py-3 font-semibold">R$ {item.total.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    {item.warranty ? (
                      <div>
                        <p className={`text-xs font-medium ${WARRANTY_COLORS[item.warranty.status] ?? ""}`}>
                          {item.warranty.status === "ACTIVE" ? "Ativa" : item.warranty.status}
                        </p>
                        <p className="text-xs text-gray-400">
                          Até {new Date(item.warranty.endDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{item.product.warrantyMonths}m (sem cliente)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais e pagamentos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2">Totais</p>
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>R$ {sale.subtotal.toFixed(2)}</span></div>
            {sale.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Desconto</span><span className="text-red-600">- R$ {sale.discount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-100 pt-2"><span>Total</span><span>R$ {sale.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-gray-400"><span>Lucro estimado</span><span className="text-green-600">R$ {sale.estimatedProfit.toFixed(2)}</span></div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2">Pagamentos</p>
            {sale.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-500">{METHOD_LABELS[p.method] ?? p.method}{p.installments ? ` ${p.installments}x` : ""}</span>
                <span>R$ {p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        {/* Ações */}
        {sale.status === "COMPLETED" && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelando..." : "Cancelar Venda"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
