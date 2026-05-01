"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
    cnpj: initialData?.cnpj ?? "",
    contactName: initialData?.contactName ?? "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
    address: initialData?.address ?? "",
    paymentTerms: initialData?.paymentTerms ?? "",
    avgDeliveryDays: initialData?.avgDeliveryDays ?? "",
    notes: initialData?.notes ?? "",
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
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => set("cnpj", e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <input
              type="text"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
