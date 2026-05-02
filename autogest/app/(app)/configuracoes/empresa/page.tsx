"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface CompanyData {
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  address: string | null
  maxStores: number
  usedStores: number
}

export default function ConfigEmpresaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as any)?.role as string | undefined
  const isAdmin = role === "ADMIN"

  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
  })

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetInput, setResetInput] = useState("")
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/configuracoes/empresa")
    const d = await res.json()
    setData(d)
    setForm({
      name: d.name ?? "",
      cnpj: d.cnpj ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
      address: d.address ?? "",
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit() {
    setError("")
    setSuccess("")
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError("")
    if (data) {
      setForm({
        name: data.name ?? "",
        cnpj: data.cnpj ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true)
    setError("")
    setSuccess("")
    const res = await fetch("/api/configuracoes/empresa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const updated = await res.json()
    setSaving(false)
    if (res.ok) {
      setData((prev) => prev ? { ...prev, ...updated } : prev)
      setEditing(false)
      setSuccess("Dados atualizados com sucesso.")
      setTimeout(() => setSuccess(""), 3000)
    } else {
      setError(updated.error ?? "Erro ao salvar")
    }
  }

  async function handleReset() {
    if (resetInput !== "RESETAR") {
      setResetError('Digite exatamente "RESETAR" para confirmar.')
      return
    }
    setResetting(true)
    setResetError("")
    const res = await fetch("/api/admin/reset", { method: "POST" })
    setResetting(false)
    if (res.ok) {
      setShowResetModal(false)
      setResetInput("")
      router.push("/dashboard")
    } else {
      const d = await res.json()
      setResetError(d.error ?? "Erro ao resetar sistema")
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Carregando...</div>
  if (!data) return <div className="p-6 text-sm text-red-500">Erro ao carregar dados da empresa.</div>

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Empresa</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dados cadastrais e configurações operacionais</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Dados da empresa */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Dados Cadastrais</h2>
          {isAdmin && !editing && (
            <button
              onClick={startEdit}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contato@empresa.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Rua, número, cidade — UF"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500">Nome</dt>
              <dd className="text-gray-900 mt-0.5">{data.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">CNPJ</dt>
              <dd className="text-gray-900 mt-0.5">{data.cnpj ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">E-mail</dt>
              <dd className="text-gray-900 mt-0.5">{data.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Telefone</dt>
              <dd className="text-gray-900 mt-0.5">{data.phone ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium text-gray-500">Endereço</dt>
              <dd className="text-gray-900 mt-0.5">{data.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Lojas ativas</dt>
              <dd className="text-gray-900 mt-0.5">{data.usedStores} de {data.maxStores}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Zona de perigo */}
      {isAdmin && (
        <section className="bg-white border border-red-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-red-700 border-b border-red-100 pb-2">Zona de Perigo</h2>
          <p className="text-xs text-gray-600">
            Reset de fábrica apaga todos os dados operacionais: estoque, vendas, compras, clientes, garantias,
            financeiro e cascos. Marcas, produtos (catálogo) e fornecedores serão mantidos.
          </p>
          <button
            onClick={() => { setShowResetModal(true); setResetInput(""); setResetError("") }}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Resetar sistema para padrão de fábrica
          </button>
        </section>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg font-bold shrink-0">!</div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Confirmar Reset do Sistema</h3>
                <p className="text-xs text-gray-500 mt-0.5">Esta ação é irreversível</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Todos os dados operacionais serão apagados permanentemente. Para confirmar, digite{" "}
              <strong className="text-red-600">RESETAR</strong> abaixo:
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="Digite RESETAR"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {resetError && <p className="text-xs text-red-600">{resetError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={resetting || resetInput !== "RESETAR"}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-md transition-colors"
              >
                {resetting ? "Resetando..." : "Confirmar Reset"}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
