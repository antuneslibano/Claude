"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const TIPOS = [
  { value: "INDIVIDUAL", label: "Pessoa Física" },
  { value: "WORKSHOP", label: "Oficina" },
  { value: "COMPANY", label: "Empresa" },
  { value: "FLEET", label: "Frota" },
  { value: "RESELLER", label: "Revendedor" },
]

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]

interface ClienteFormProps {
  initialData?: {
    id: string
    name: string
    cpfCnpj: string | null
    phone: string | null
    whatsapp: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    type: string
    notes: string | null
    active: boolean
  }
}

export default function ClienteForm({ initialData }: ClienteFormProps) {
  const router = useRouter()
  const isEdit = !!initialData
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    cpfCnpj: initialData?.cpfCnpj ?? "",
    phone: initialData?.phone ?? "",
    whatsapp: initialData?.whatsapp ?? "",
    email: initialData?.email ?? "",
    address: initialData?.address ?? "",
    city: initialData?.city ?? "",
    state: initialData?.state ?? "",
    type: initialData?.type ?? "INDIVIDUAL",
    notes: initialData?.notes ?? "",
    active: initialData?.active ?? true,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    setLoading(true)
    setError("")

    const url = isEdit ? `/api/clientes/${initialData!.id}` : "/api/clientes"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cpfCnpj: form.cpfCnpj || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        notes: form.notes || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/clientes/${isEdit ? initialData!.id : data.id}`)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? "Erro ao salvar")
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {isEdit ? "Editar Cliente" : "Novo Cliente"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEdit ? `Editando ${initialData!.name}` : "Preencha os dados do cliente"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dados principais */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Dados Principais</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome / Razão Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo ou razão social"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CPF / CNPJ</label>
              <input
                type="text"
                value={form.cpfCnpj}
                onChange={(e) => set("cpfCnpj", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Contato</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Endereço</h2>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Logradouro</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da cidade"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">UF</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Observações</h2>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Anotações internas sobre este cliente..."
          />

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="rounded"
              />
              <label htmlFor="active" className="text-sm text-gray-600">Cliente ativo</label>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Cliente"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
