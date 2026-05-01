"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Pessoa Física",
  WORKSHOP: "Oficina",
  COMPANY: "Empresa",
  FLEET: "Frota",
  RESELLER: "Revendedor",
}

const TYPE_COLORS: Record<string, string> = {
  INDIVIDUAL: "bg-blue-100 text-blue-700",
  WORKSHOP: "bg-orange-100 text-orange-700",
  COMPANY: "bg-purple-100 text-purple-700",
  FLEET: "bg-green-100 text-green-700",
  RESELLER: "bg-yellow-100 text-yellow-700",
}

interface Make { id: string; name: string }
interface Model { id: string; name: string }
interface Vehicle {
  id: string
  year: number | null
  plate: string | null
  notes: string | null
  make: Make
  model: Model
}

interface Customer {
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
  vehicles: Vehicle[]
  _count: { sales: number; warranties: number }
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  // Add vehicle form state
  const [makes, setMakes] = useState<Make[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [addForm, setAddForm] = useState({ makeId: "", modelId: "", year: "", plate: "", notes: "" })
  const [addLoading, setAddLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const fetchCustomer = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/clientes/${id}`)
    if (res.ok) setCustomer(await res.json())
    else router.push("/clientes")
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchCustomer() }, [fetchCustomer])

  useEffect(() => {
    fetch("/api/veiculos/marcas").then((r) => r.json()).then(setMakes)
  }, [])

  useEffect(() => {
    if (!addForm.makeId) { setModels([]); setAddForm((p) => ({ ...p, modelId: "" })); return }
    fetch(`/api/veiculos/marcas/${addForm.makeId}/modelos`)
      .then((r) => r.json())
      .then(setModels)
    setAddForm((p) => ({ ...p, modelId: "" }))
  }, [addForm.makeId])

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.makeId || !addForm.modelId) return
    setAddLoading(true)
    await fetch(`/api/clientes/${id}/veiculos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        makeId: addForm.makeId,
        modelId: addForm.modelId,
        year: addForm.year ? parseInt(addForm.year) : null,
        plate: addForm.plate || null,
        notes: addForm.notes || null,
      }),
    })
    setAddForm({ makeId: "", modelId: "", year: "", plate: "", notes: "" })
    setShowAdd(false)
    setAddLoading(false)
    fetchCustomer()
  }

  async function handleRemoveVehicle(vehicleId: string, name: string) {
    if (!confirm(`Remover veículo "${name}"?`)) return
    setRemovingId(vehicleId)
    await fetch(`/api/clientes/${id}/veiculos/${vehicleId}`, { method: "DELETE" })
    setRemovingId(null)
    fetchCustomer()
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Carregando...</div>
  if (!customer) return null

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i)

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[customer.type]}`}>
              {TYPE_LABELS[customer.type]}
            </span>
            {!customer.active && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inativo</span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {customer._count.sales} {customer._count.sales === 1 ? "compra" : "compras"} ·{" "}
            {customer._count.warranties} {customer._count.warranties === 1 ? "garantia" : "garantias"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clientes/${id}/editar`}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
          <Link
            href="/clientes"
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Dados */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informações</h2>
          <Field label="CPF / CNPJ" value={customer.cpfCnpj} />
          <Field label="Telefone" value={customer.phone} />
          <Field label="WhatsApp" value={customer.whatsapp} />
          <Field label="E-mail" value={customer.email} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</h2>
          <Field label="Logradouro" value={customer.address} />
          <Field
            label="Cidade / Estado"
            value={customer.city ? `${customer.city}${customer.state ? ` / ${customer.state}` : ""}` : null}
          />
          {customer.notes && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Observações</p>
              <p className="text-sm text-gray-700 mt-0.5">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Veículos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            Veículos ({customer.vehicles.length})
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            + Adicionar Veículo
          </button>
        </div>

        {/* Formulário de adição */}
        {showAdd && (
          <form onSubmit={handleAddVehicle} className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Marca *</label>
                <select
                  value={addForm.makeId}
                  onChange={(e) => setAddForm((p) => ({ ...p, makeId: e.target.value }))}
                  required
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar...</option>
                  {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Modelo *</label>
                <select
                  value={addForm.modelId}
                  onChange={(e) => setAddForm((p) => ({ ...p, modelId: e.target.value }))}
                  required
                  disabled={!addForm.makeId}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Selecionar...</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ano</label>
                <select
                  value={addForm.year}
                  onChange={(e) => setAddForm((p) => ({ ...p, year: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Placa</label>
                <input
                  type="text"
                  value={addForm.plate}
                  onChange={(e) => setAddForm((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  maxLength={8}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addLoading}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {addLoading ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddForm({ makeId: "", modelId: "", year: "", plate: "", notes: "" }) }}
                className="text-xs px-4 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de veículos */}
        {customer.vehicles.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhum veículo cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Veículo</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Ano</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Placa</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {customer.vehicles.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {v.make.name} {v.model.name}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{v.year ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{v.plate ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRemoveVehicle(v.id, `${v.make.name} ${v.model.name}`)}
                      disabled={removingId === v.id}
                      className="text-xs text-red-500 hover:underline disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5">{value ?? "—"}</p>
    </div>
  )
}
