"use client"

import { useEffect, useState } from "react"

interface Store { id: string; name: string }
interface Customer { id: string; name: string; phone: string | null }
interface UsedBattery {
  id: string
  status: string
  discountValue: number | null
  receivedAt: string
  notes: string | null
  store: { name: string }
  customer: { name: string; phone: string | null } | null
  stockItem: { product: { brand: { name: string }; model: string; amperage: number } } | null
}

const STATUS_LABELS: Record<string, string> = {
  STORED: "Armazenado",
  SENT_TO_SUPPLIER: "Enviado ao Fornecedor",
  DISCARDED: "Descartado",
  SOLD_AS_SCRAP: "Vendido como Sucata",
}

const STATUS_COLORS: Record<string, string> = {
  STORED: "bg-blue-100 text-blue-700",
  SENT_TO_SUPPLIER: "bg-amber-100 text-amber-700",
  DISCARDED: "bg-gray-100 text-gray-500",
  SOLD_AS_SCRAP: "bg-green-100 text-green-700",
}

export default function CascosPage() {
  const [items, setItems] = useState<UsedBattery[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    storeId: "",
    customerId: "",
    description: "",
    discountValue: "",
    notes: "",
  })

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: "1", limit: "30" })
    if (statusFilter) params.set("status", statusFilter)
    const res = await fetch(`/api/cascos?${params}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data: Store[]) => {
      setStores(data)
      if (data.length > 0) setForm((p) => ({ ...p, storeId: data[0].id }))
    })
    load()
  }, [])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return }
    const t = setTimeout(() => {
      fetch(`/api/clientes?search=${encodeURIComponent(customerSearch)}&limit=8`)
        .then((r) => r.json())
        .then((d) => setCustomers(d.customers ?? []))
    }, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!form.storeId) { setError("Selecione uma loja."); return }
    setSaving(true)
    const res = await fetch("/api/cascos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: form.storeId,
        customerId: form.customerId || undefined,
        description: form.description || undefined,
        discountValue: form.discountValue || undefined,
        notes: form.notes || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess("Casco registrado com sucesso.")
      setForm((p) => ({ ...p, customerId: "", description: "", discountValue: "", notes: "" }))
      setCustomerSearch("")
      setShowForm(false)
      load()
    } else {
      const data = await res.json()
      setError(data.error ?? "Erro ao registrar")
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/cascos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const stored = items.filter((i) => i.status === "STORED").length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cascos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Baterias usadas recebidas em troca ou devolução</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); setSuccess("") }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          {showForm ? "Fechar" : "+ Registrar Casco"}
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total cadastrado", value: total, color: "text-gray-900" },
          { label: "Armazenados", value: stored, color: "text-blue-700" },
          { label: "Enviados ao fornecedor", value: items.filter((i) => i.status === "SENT_TO_SUPPLIER").length, color: "text-amber-700" },
          { label: "Descartados / sucata", value: items.filter((i) => ["DISCARDED", "SOLD_AS_SCRAP"].includes(i.status)).length, color: "text-gray-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Formulário de registro */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-blue-200 rounded-lg p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Registrar Casco Recebido</h2>

          {stores.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loja *</label>
              <select value={form.storeId} onChange={(e) => setForm((p) => ({ ...p, storeId: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente (opcional)</label>
              {form.customerId ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  <span className="text-sm text-blue-800">{customers.find((c) => c.id === form.customerId)?.name ?? customerSearch}</span>
                  <button type="button" onClick={() => { setForm((p) => ({ ...p, customerId: "" })); setCustomerSearch("") }}
                    className="text-xs text-red-500">Remover</button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {customers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {customers.map((c) => (
                        <button key={c.id} type="button"
                          onClick={() => { setForm((p) => ({ ...p, customerId: c.id })); setCustomerSearch(c.name); setCustomers([]) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desconto concedido (R$)</label>
              <input type="number" step="0.01" min="0" value={form.discountValue}
                onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição da bateria</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ex: 60Ah sem identificação, corrosão nos terminais..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md">
              {saving ? "Registrando..." : "Registrar Casco"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {["", "STORED", "SENT_TO_SUPPLIER", "DISCARDED", "SOLD_AS_SCRAP"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setTimeout(load, 0) }}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
            {s === "" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum casco registrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Recebido em</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto / Descrição</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Desconto</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p>{new Date(item.receivedAt).toLocaleDateString("pt-BR")}</p>
                    <p className="text-gray-400">{item.store.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.customer ? (
                      <>
                        <p className="font-medium text-gray-900">{item.customer.name}</p>
                        {item.customer.phone && <p className="text-xs text-gray-400">{item.customer.phone}</p>}
                      </>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {item.stockItem ? (
                      <p className="text-gray-900">
                        {item.stockItem.product.brand.name} {item.stockItem.product.model} ({item.stockItem.product.amperage}Ah)
                      </p>
                    ) : (
                      <p className="text-gray-600 text-xs">{item.notes ?? "—"}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.discountValue != null
                      ? <span className="text-green-700 font-medium">R$ {item.discountValue.toFixed(2)}</span>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "STORED" && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => updateStatus(item.id, "SENT_TO_SUPPLIER")}
                          className="text-xs text-amber-600 hover:text-amber-800">Enviar</button>
                        <button onClick={() => updateStatus(item.id, "SOLD_AS_SCRAP")}
                          className="text-xs text-green-600 hover:text-green-800">Sucata</button>
                        <button onClick={() => updateStatus(item.id, "DISCARDED")}
                          className="text-xs text-gray-400 hover:text-gray-600">Descartar</button>
                      </div>
                    )}
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
