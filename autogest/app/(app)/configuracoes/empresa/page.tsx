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
  cascoReturnMode: "UNIT" | "WEIGHT"
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Modal de reset
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetInput, setResetInput] = useState("")
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/configuracoes/empresa")
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSaveCascoMode(mode: "UNIT" | "WEIGHT") {
    setSaving(true)
    setError("")
    setSuccess("")
    const res = await fetch("/api/configuracoes/empresa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cascoReturnMode: mode }),
    })
    const updated = await res.json()
    setSaving(false)
    if (res.ok) {
      setData((prev) => prev ? { ...prev, cascoReturnMode: updated.cascoReturnMode } : prev)
      setSuccess("Configuração salva.")
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

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Carregando...</div>
  }

  if (!data) {
    return <div className="p-6 text-sm text-red-500">Erro ao carregar dados da empresa.</div>
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Empresa</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dados e configurações operacionais</p>
      </div>

      {/* Dados da empresa */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">Dados Cadastrais</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-500">Nome</dt>
            <dd className="text-gray-900 mt-0.5">{data.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">CNPJ</dt>
            <dd className="text-gray-900 mt-0.5">{data.cnpj ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">E-mail</dt>
            <dd className="text-gray-900 mt-0.5">{data.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Telefone</dt>
            <dd className="text-gray-900 mt-0.5">{data.phone ?? "-"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-medium text-gray-500">Endereço</dt>
            <dd className="text-gray-900 mt-0.5">{data.address ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Lojas ativas</dt>
            <dd className="text-gray-900 mt-0.5">{data.usedStores} de {data.maxStores}</dd>
          </div>
        </dl>
      </section>

      {/* Configuracoes operacionais */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">Configurações Operacionais</h2>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Modo de devolução de cascos</p>
          <div className="flex gap-4">
            {[
              { v: "UNIT" as const, l: "Por unidade", desc: "Controla cascos por quantidade" },
              { v: "WEIGHT" as const, l: "Por peso (kg)", desc: "Controla cascos por quilograma" },
            ].map((opt) => (
              <label
                key={opt.v}
                className={`flex-1 flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  data.cascoReturnMode === opt.v
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="cascoReturnMode"
                  value={opt.v}
                  checked={data.cascoReturnMode === opt.v}
                  onChange={() => isAdmin && handleSaveCascoMode(opt.v)}
                  disabled={!isAdmin || saving}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.l}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {!isAdmin && (
            <p className="text-xs text-gray-400 mt-2">Apenas administradores podem alterar esta configuração.</p>
          )}
          {success && <p className="text-xs text-green-600 mt-2">{success}</p>}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      </section>

      {/* Zona de perigo (apenas ADMIN) */}
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

      {/* Modal de confirmacao de reset */}
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
