"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import MaskedInput from "@/components/masked-input"
import { applyPhone, applyCnpj } from "@/lib/masks"

interface FormData {
  name: string
  cnpj: string
  contactName: string
  phone: string
  email: string
  address: string
  paymentTerms: string
  avgDeliveryDays: string
  notes: string
  cascoReturnMode: "NONE" | "UNIT" | "WEIGHT"
  cascoWeightKg: string
}

interface Props {
  initialData?: Partial<FormData>
  supplierId?: string
}

export default function FornecedorForm({ initialData, supplierId }: Props) {
  const router = useRouter()
  const isEdit = !!supplierId

  const [form, setForm] = useState<FormData>({
    name: initialData?.name ?? "",
    cnpj: applyCnpj(initialData?.cnpj),
    contactName: initialData?.contactName ?? "",
    phone: applyPhone(initialData?.phone),
    email: initialData?.email ?? "",
    address: initialData?.address ?? "",
    paymentTerms: initialData?.paymentTerms ?? "",
    avgDeliveryDays: initialData?.avgDeliveryDays ?? "",
    notes: initialData?.notes ?? "",
    cascoReturnMode: initialData?.cascoReturnMode ?? "NONE",
    cascoWeightKg: initialData?.cascoWeightKg ?? "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function set(field: keyof FormData, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }

    setLoading(true)
    const url = isEdit ? `/api/fornecedores/${supplierId}` : "/api/fornecedores"
    const method = isEdit ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        avgDeliveryDays: form.avgDeliveryDays ? parseInt(form.avgDeliveryDays) : null,
        cascoWeightKg: form.cascoWeightKg ? parseFloat(form.cascoWeightKg) : null,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      router.push("/fornecedores")
      router.refresh()
    } else {
      setError(data.error ?? "Erro ao salvar fornecedor")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Dados do Fornecedor</h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            placeholder="Razão social ou nome fantasia"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
            <MaskedInput
              mask="cnpj"
              value={form.cnpj}
              onChange={(v) => set("cnpj", v)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contato</label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
            <MaskedInput
              mask="phone"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contato@fornecedor.com.br"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Rua, número, cidade — UF"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Condições Comerciais</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condição de pagamento</label>
            <input
              type="text"
              value={form.paymentTerms}
              onChange={(e) => set("paymentTerms", e.target.value)}
              placeholder="Ex: 30/60 DDL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prazo médio de entrega (dias)</label>
            <input
              type="number"
              min="0"
              value={form.avgDeliveryDays}
              onChange={(e) => set("avgDeliveryDays", e.target.value)}
              placeholder="Ex: 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Informações adicionais sobre o fornecedor..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Política de Cascos */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Política de Cascos</h2>
          <p className="text-xs text-gray-500 mt-2">
            Define como este fornecedor exige a devolução de cascos (baterias usadas) ao realizar novas compras.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Modo de devolução</label>
          <div className="space-y-2">
            {[
              { v: "NONE", l: "Não exige devolução", desc: "Este fornecedor não cobra cascos." },
              { v: "UNIT", l: "Por unidade", desc: "Cobra 1 casco por bateria comprada (mesma quantidade)." },
              { v: "WEIGHT", l: "Por peso (kg)", desc: "Cobra pelo peso equivalente. Informe o peso médio por unidade abaixo." },
            ].map((opt) => (
              <label
                key={opt.v}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  form.cascoReturnMode === opt.v
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="cascoReturnMode"
                  value={opt.v}
                  checked={form.cascoReturnMode === opt.v}
                  onChange={() => set("cascoReturnMode", opt.v as any)}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.l}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {form.cascoReturnMode === "WEIGHT" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Peso médio por unidade (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.cascoWeightKg}
              onChange={(e) => set("cascoWeightKg", e.target.value)}
              placeholder="Ex: 14.0"
              className="w-36 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Usado para calcular automaticamente o peso a devolver na entrada de estoque.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Fornecedor"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/fornecedores")}
          className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
