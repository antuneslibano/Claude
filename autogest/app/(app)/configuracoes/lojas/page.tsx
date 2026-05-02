"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface Store {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  active: boolean
}

interface CompanyInfo {
  maxStores: number
  usedStores: number
}

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]

const EMPTY_FORM = {
  name: "",
  cnpj: "",
  phone: "",
  address: "",
  city: "",
  state: "",
}

export default function ConfigLojasPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const [stores, setStores] = useState<Store[]>([])
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState(EMPTY_FORM)

  async function loadData() {
    setLoading(true)
    const [storesRes, companyRes] = await Promise.all([
      fetch("/api/configuracoes/lojas"),
      fetch("/api/configuracoes/empresa"),
    ])
    const storesData = await storesRes.json()
    const companyData = await companyRes.json()
    setStores(Array.isArray(storesData) ? storesData : [])
    setCompany(companyData)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function setField(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError("")
    setSuccess("")
    setShowForm(true)
  }

  function openEdit(store: Store) {
    setEditingId(store.id)
    setForm({
      name: store.name,
      cnpj: store.cnpj ?? "",
      phone: store.phone ?? "",
      address: store.address ?? "",
      city: store.city ?? "",
      state: store.state ?? "",
    })
    setError("")
    setSuccess("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome da loja é obrigatório."); return }
    setSaving(true)
    setError("")

    let res: Response
    if (editingId) {
      res = await fetch(`/api/configuracoes/lojas/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } else {
      res = await fetch("/api/configuracoes/lojas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    }

    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setSuccess(editingId ? "Loja atualizada com sucesso." : "Loja criada com sucesso.")
      closeForm()
      loadData()
    } else {
      setError(data.error ?? "Erro ao salvar loja")
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Desativar esta loja? Ela não aparecerá mais nas operações.")) return
    const res = await fetch(`/api/configuracoes/lojas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    })
    if (res.ok) {
      setSuccess("Loja desativada.")
      loadData()
    } else {
      const d = await res.json()
      setError(d.error ?? "Erro ao desativar loja")
    }
  }

  async function handleActivate(id: string) {
    const res = await fetch(`/api/configuracoes/lojas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    })
    if (res.ok) {
      setSuccess("Loja reativada.")
      loadData()
    }
  }

  const isAdmin = role === "ADMIN"
  const atLimit = company ? company.usedStores >= company.maxStores : false

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Lojas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as unidades da empresa</p>
        </div>
        <div className="flex items-center gap-4">
          {company && (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${
              atLimit ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"
            }`}>
              {company.usedStores} de {company.maxStores} lojas usadas
            </span>
          )}
          {isAdmin && (
            <button
              onClick={openCreate}
              disabled={atLimit}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              + Nova Loja
            </button>
          )}
        </div>
      </div>

      {atLimit && isAdmin && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
          Limite de lojas atingido para o seu plano. Entre em contato para fazer upgrade.
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Formulario inline */}
      {showForm && isAdmin && (
        <form onSubmit={handleSave} className="bg-white border border-blue-200 rounded-lg p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            {editingId ? "Editar Loja" : "Nova Loja"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                placeholder="Ex: Loja Centro"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setField("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="(00) 0000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Rua, numero..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar...</option>
                {ESTADOS_BR.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar loja"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : stores.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhuma loja cadastrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade / Estado</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{store.name}</p>
                    {store.phone && <p className="text-xs text-gray-400">{store.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{store.cnpj ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {[store.city, store.state].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      store.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {store.active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(store)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        {store.active ? (
                          <button
                            onClick={() => handleDeactivate(store.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(store.id)}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
