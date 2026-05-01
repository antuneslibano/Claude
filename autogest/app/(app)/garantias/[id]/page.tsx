"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface WarrantyDetail {
  id: string
  status: string
  startDate: string
  endDate: string
  claimedAt: string | null
  problemReport: string | null
  technicalReport: string | null
  resolution: string | null
  approved: boolean | null
  notes: string | null
  customer: { id: string; name: string; phone: string | null; whatsapp: string | null; cpfCnpj: string | null } | null
  customerVehicle: { plate: string | null; year: number | null } | null
  sale: { id: string; createdAt: string; store: { name: string }; seller: { name: string } }
  saleItem: {
    unitPrice: number
    product: { brand: { name: string }; model: string; amperage: number; warrantyMonths: number }
  }
  stockItem: { serialNumber: string | null; batchNumber: string | null; costPrice: number }
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  CLAIMED: "Acionada — Aguardando Avaliação",
  REPLACED: "Substituída",
  REJECTED: "Rejeitada",
  EXPIRED: "Expirada",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  CLAIMED: "bg-amber-100 text-amber-700",
  REPLACED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
}

export default function GarantiaDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [warranty, setWarranty] = useState<WarrantyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Formulários de ação
  const [problemReport, setProblemReport] = useState("")
  const [technicalReport, setTechnicalReport] = useState("")
  const [resolution, setResolution] = useState("")
  const [actionNotes, setActionNotes] = useState("")

  useEffect(() => {
    fetch(`/api/garantias/${id}`)
      .then((r) => r.json())
      .then((data) => { setWarranty(data); setLoading(false) })
  }, [id])

  async function doAction(action: string, extra?: object) {
    setSubmitting(true)
    setError("")
    const res = await fetch(`/api/garantias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    if (res.ok) {
      // Recarregar garantia
      const updated = await fetch(`/api/garantias/${id}`).then((r) => r.json())
      setWarranty(updated)
    } else {
      setError(data.error ?? "Erro ao executar ação")
    }
    setSubmitting(false)
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Carregando...</div>
  if (!warranty) return <div className="p-8 text-sm text-red-500">Garantia não encontrada.</div>

  const daysLeft = Math.ceil((new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpiredByDate = daysLeft <= 0
  const expiringSoon = warranty.status === "ACTIVE" && daysLeft > 0 && daysLeft <= 30

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/garantias" className="text-xs text-gray-400 hover:text-gray-600">← Garantias</Link>
        <h1 className="text-xl font-semibold text-gray-900">
          Garantia #{warranty.id.slice(-6).toUpperCase()}
        </h1>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[warranty.status] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABELS[warranty.status] ?? warranty.status}
        </span>
      </div>

      {expiringSoon && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          ⚠ Esta garantia expira em <strong>{daysLeft} dia{daysLeft > 1 ? "s" : ""}</strong>.
        </div>
      )}

      <div className="space-y-5">
        {/* Dados da venda e produto */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Produto</p>
            <p className="font-semibold text-gray-900">
              {warranty.saleItem.product.brand.name} {warranty.saleItem.product.model} ({warranty.saleItem.product.amperage}Ah)
            </p>
            <p className="text-xs text-gray-400">{warranty.saleItem.product.warrantyMonths} meses de garantia</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Período de cobertura</p>
            <p className="font-medium">
              {new Date(warranty.startDate).toLocaleDateString("pt-BR")} →{" "}
              {new Date(warranty.endDate).toLocaleDateString("pt-BR")}
            </p>
            {!isExpiredByDate && warranty.status === "ACTIVE" && (
              <p className={`text-xs mt-0.5 ${expiringSoon ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                {daysLeft} dia{daysLeft > 1 ? "s" : ""} restante{daysLeft > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {warranty.stockItem.serialNumber && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Número de Série</p>
              <p className="font-medium">{warranty.stockItem.serialNumber}</p>
            </div>
          )}
          {warranty.stockItem.batchNumber && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Lote</p>
              <p className="font-medium">{warranty.stockItem.batchNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Venda</p>
            <Link href={`/vendas/${warranty.sale.id}`} className="text-blue-600 hover:underline text-sm">
              #{warranty.sale.id.slice(-6).toUpperCase()}
            </Link>
            <p className="text-xs text-gray-400">
              {new Date(warranty.sale.createdAt).toLocaleDateString("pt-BR")} · {warranty.sale.store.name}
            </p>
            <p className="text-xs text-gray-400">{warranty.sale.seller.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Preço de venda</p>
            <p className="font-medium">R$ {warranty.saleItem.unitPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Dados do cliente */}
        {warranty.customer && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-sm">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Cliente</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Nome</p>
                <p className="font-medium">{warranty.customer.name}</p>
              </div>
              {warranty.customer.phone && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Telefone</p>
                  <p>{warranty.customer.phone}</p>
                </div>
              )}
              {warranty.customer.cpfCnpj && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">CPF/CNPJ</p>
                  <p>{warranty.customer.cpfCnpj}</p>
                </div>
              )}
              {warranty.customerVehicle && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Veículo</p>
                  <p>
                    {warranty.customerVehicle.plate ?? "Sem placa"}
                    {warranty.customerVehicle.year ? ` (${warranty.customerVehicle.year})` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Histórico do acionamento */}
        {(warranty.problemReport || warranty.technicalReport || warranty.resolution) && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-sm space-y-4">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2">Histórico da Ocorrência</p>
            {warranty.claimedAt && (
              <p className="text-xs text-gray-400">
                Acionada em {new Date(warranty.claimedAt).toLocaleDateString("pt-BR")} {new Date(warranty.claimedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {warranty.problemReport && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Relato do cliente</p>
                <p className="text-gray-700 bg-gray-50 rounded p-3 text-sm">{warranty.problemReport}</p>
              </div>
            )}
            {warranty.technicalReport && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Laudo técnico</p>
                <p className="text-gray-700 bg-gray-50 rounded p-3 text-sm">{warranty.technicalReport}</p>
              </div>
            )}
            {warranty.resolution && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Resolução</p>
                <p className="text-gray-700 bg-gray-50 rounded p-3 text-sm">{warranty.resolution}</p>
              </div>
            )}
            {warranty.notes && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Observações</p>
                <p className="text-gray-600 text-sm">{warranty.notes}</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        {/* ─── ACIONAR GARANTIA (status ACTIVE) ─── */}
        {warranty.status === "ACTIVE" && !isExpiredByDate && (
          <div className="bg-white border border-amber-200 rounded-lg p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Acionar Garantia</p>
            <p className="text-xs text-gray-500">Registre o relato do cliente para iniciar a avaliação.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do problema *</label>
              <textarea
                value={problemReport}
                onChange={(e) => setProblemReport(e.target.value)}
                rows={3}
                placeholder="Descreva o problema relatado pelo cliente: sintomas, quando ocorreu, condições de uso..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações internas</label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Notas adicionais..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              onClick={() => doAction("claim", { problemReport, notes: actionNotes })}
              disabled={submitting || !problemReport.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              {submitting ? "Registrando..." : "Acionar Garantia"}
            </button>
          </div>
        )}

        {/* ─── AVALIAR GARANTIA (status CLAIMED) ─── */}
        {warranty.status === "CLAIMED" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Avaliação Técnica</p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Laudo técnico</label>
              <textarea
                value={technicalReport}
                onChange={(e) => setTechnicalReport(e.target.value)}
                rows={3}
                placeholder="Resultado da inspeção técnica da bateria..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Resolução / encaminhamento</label>
              <input
                type="text"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Ex: Substituição por bateria nova, bateria enviada ao fabricante..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => doAction("approve", { technicalReport, resolution, notes: actionNotes })}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {submitting ? "Salvando..." : "✓ Aprovar e Substituir"}
              </button>
              <button
                onClick={() => doAction("reject", { technicalReport, resolution, notes: actionNotes })}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {submitting ? "Salvando..." : "✕ Rejeitar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
