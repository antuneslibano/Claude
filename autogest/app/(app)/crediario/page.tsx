"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

type Status = "PENDING" | "OVERDUE" | "PAID" | "CANCELLED"

interface Installment {
  id: string
  number: number
  dueDate: string
  amount: number
  paidAmount: number | null
  paidAt: string | null
  status: Status
  notes: string | null
  customer: { name: string; phone: string | null; whatsapp: string | null }
  sale: { id: string; store: { name: string } }
}

interface Summary {
  status: Status
  _count: number
  _sum: { amount: number | null }
}

interface ApiResponse {
  total: number
  page: number
  limit: number
  installments: Installment[]
  summary: Summary[]
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "Pendente",
  OVERDUE: "Vencida",
  PAID: "Paga",
  CANCELLED: "Cancelada",
}

const STATUS_CLASS: Record<Status, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  OVERDUE: "bg-red-100 text-red-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-500",
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function CrediarioPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [page, setPage] = useState(1)
  const [paying, setPaying] = useState<Installment | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "30" })
    if (statusFilter) params.set("status", statusFilter)
    fetch(`/api/crediario?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [statusFilter, page])

  useEffect(() => { load() }, [load])

  // Ler filtro da URL ao montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get("status")
    if (s) setStatusFilter(s)
  }, [])

  async function handlePay() {
    if (!paying) return
    setSaving(true)
    await fetch(`/api/crediario/${paying.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", paidAmount: payAmount || paying.amount, paidAt: payDate }),
    })
    setSaving(false)
    setPaying(null)
    load()
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta parcela?")) return
    await fetch(`/api/crediario/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    })
    load()
  }

  const getSummaryCount = (s: Status) =>
    data?.summary.find((x) => x.status === s)?._count ?? 0
  const getSummaryAmount = (s: Status) =>
    data?.summary.find((x) => x.status === s)?._sum.amount ?? 0

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Crediário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de parcelas e cobranças</p>
        </div>
      </div>

      {/* Resumo por status */}
      <div className="grid grid-cols-4 gap-3">
        {(["PENDING", "OVERDUE", "PAID", "CANCELLED"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1) }}
            className={`text-left bg-white border rounded-lg p-4 transition-colors ${
              statusFilter === s ? "border-blue-500 ring-1 ring-blue-400" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-2 ${STATUS_CLASS[s]}`}>
              {STATUS_LABEL[s]}
            </span>
            <p className="text-xl font-bold text-gray-900">{getSummaryCount(s)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{fmt(getSummaryAmount(s))}</p>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">
            {statusFilter ? `${STATUS_LABEL[statusFilter as Status]} — ` : "Todas as parcelas — "}
            {data ? `${data.total} registro${data.total !== 1 ? "s" : ""}` : "…"}
          </p>
          {statusFilter && (
            <button onClick={() => { setStatusFilter(""); setPage(1) }} className="text-xs text-blue-600 hover:underline">
              Limpar filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !data || data.installments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Nenhuma parcela encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                <th className="text-left px-4 py-2.5 font-medium">Venda</th>
                <th className="text-left px-4 py-2.5 font-medium">Parcela</th>
                <th className="text-left px-4 py-2.5 font-medium">Vencimento</th>
                <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                <th className="text-right px-4 py-2.5 font-medium">Pago em</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.installments.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inst.customer.name}</p>
                    {inst.customer.whatsapp && (
                      <a
                        href={`https://wa.me/55${inst.customer.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline"
                      >
                        {inst.customer.whatsapp}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <Link href={`/vendas/${inst.sale.id}`} className="hover:text-blue-600 font-mono text-xs">
                      #{inst.sale.id.slice(-6).toUpperCase()}
                    </Link>
                    <p className="text-xs text-gray-400">{inst.sale.store.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    Parcela {inst.number}
                    {inst.notes && <p className="text-gray-400 italic">{inst.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {fmtDate(inst.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {fmt(inst.amount)}
                    {inst.paidAmount != null && inst.paidAmount !== inst.amount && (
                      <p className="text-xs text-gray-400">pago: {fmt(inst.paidAmount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {inst.paidAt ? fmtDate(inst.paidAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASS[inst.status]}`}>
                      {STATUS_LABEL[inst.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(inst.status === "PENDING" || inst.status === "OVERDUE") && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setPaying(inst); setPayAmount(String(inst.amount)); setPayDate(new Date().toISOString().split("T")[0]) }}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded transition-colors"
                        >
                          Receber
                        </button>
                        <button
                          onClick={() => handleCancel(inst.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Receber pagamento */}
      {paying && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Registrar Recebimento</h2>
            <p className="text-sm text-gray-500 mb-4">
              {paying.customer.name} — Parcela {paying.number} de {fmt(paying.amount)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor recebido</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data do recebimento</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setPaying(null)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
