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

interface DebtOrder {
  id: string
  purchaseDate: string
  status: string
  required: number
  sent: number
  pending: number
  unit: "kg" | "un"
}

interface SupplierDebt {
  supplierId: string
  supplierName: string
  cascoMode: string
  totalRequired: number
  totalSent: number
  totalPending: number
  orders: DebtOrder[]
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

const PO_STATUS_LABELS: Record<string, string> = {
  ORDERED: "Aguardando",
  DELIVERED: "Recebido",
  CANCELLED: "Cancelado",
}

export default function CascosPage() {
  const [tab, setTab] = useState<"estoque" | "debito">("estoque")
  const [items, setItems] = useState<UsedBattery[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [debts, setDebts] = useState<SupplierDebt[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [sendingSupplierId, setSendingSupplierId] = useState<string | null>(null)
  const [sendForm, setSendForm] = useState({ storeId: "", quantity: "1", weightKg: "", notes: "" })
  const [sendSaving, setSendSaving] = useState(false)
  const [sendError, setSendError] = useState("")

  const [form, setForm] = useState({
    storeId: "",
    customerId: "",
    description: "",
    discountValue: "",
    notes: "",
    quantity: "1",
    weightKg: "",
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

  async function loadDebts() {
    setLoadingDebts(true)
    const res = await fetch("/api/cascos/debito")
    const data = await res.json()
    setDebts(Array.isArray(data) ? data : [])
    setLoadingDebts(false)
  }

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data: Store[]) => {
      setStores(data)
      if (data.length > 0) {
        setForm((p) => ({ ...p, storeId: data[0].id }))
        setSendForm((p) => ({ ...p, storeId: data[0].id }))
      }
    })
    load()
  }, [])

  useEffect(() => {
    if (tab === "debito") loadDebts()
  }, [tab])

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
        quantity: parseInt(form.quantity) || 1,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const qty = parseInt(form.quantity) || 1
      setSuccess(qty > 1 ? `${qty} cascos registrados com sucesso.` : "Casco registrado com sucesso.")
      setForm((p) => ({ ...p, customerId: "", description: "", discountValue: "", notes: "", quantity: "1", weightKg: "" }))
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

  async function handleSendCascos(supplierId: string, cascoMode: string) {
    setSendError("")
    setSendSaving(true)
    const res = await fetch("/api/cascos/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: sendForm.storeId,
        supplierId,
        quantity: parseInt(sendForm.quantity) || 1,
        weightKg: cascoMode === "WEIGHT" && sendForm.weightKg ? parseFloat(sendForm.weightKg) : undefined,
        notes: sendForm.notes || undefined,
      }),
    })
    setSendSaving(false)
    if (res.ok) {
      setSendingSupplierId(null)
      setSendForm((p) => ({ ...p, quantity: "1", weightKg: "", notes: "" }))
      loadDebts()
    } else {
      const d = await res.json()
      setSendError(d.error ?? "Erro ao registrar envio")
    }
  }

  const stored = items.filter((i) => i.status === "STORED").length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cascos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Baterias usadas e débito com fornecedores</p>
        </div>
        {tab === "estoque" && (
          <button onClick={() => { setShowForm((v) => !v); setError(""); setSuccess("") }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
            {showForm ? "Fechar" : "+ Registrar Casco"}
          </button>
        )}
      </div>

      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {([["estoque", "Em Estoque"], ["debito", "Dívida com Fornecedores"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "estoque" && (
        <>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
                  <input type="number" min="1" max="100" value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {parseInt(form.quantity) > 1 && (
                    <p className="text-xs text-gray-400 mt-1">Serao criados {form.quantity} registros</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso total (kg)</label>
                  <input type="number" step="0.1" min="0" value={form.weightKg}
                    onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
                    placeholder="Opcional"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descricao da bateria</label>
                <input type="text" value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: 60Ah sem identificacao, corrosao nos terminais..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes</label>
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

          {success && !showForm && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700">{success}</div>
          )}

          <div className="flex gap-2 mb-4">
            {["", "STORED", "SENT_TO_SUPPLIER", "DISCARDED", "SOLD_AS_SCRAP"].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setTimeout(load, 0) }}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                {s === "" ? "Todos" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

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
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto / Descricao</th>
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
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {item.stockItem ? (
                          <p className="text-gray-900">
                            {item.stockItem.product.brand.name} {item.stockItem.product.model} ({item.stockItem.product.amperage}Ah)
                          </p>
                        ) : (
                          <p className="text-gray-600 text-xs">{item.notes ?? "-"}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.discountValue != null
                          ? <span className="text-green-700 font-medium">R$ {item.discountValue.toFixed(2)}</span>
                          : <span className="text-gray-400 text-xs">-</span>}
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
        </>
      )}

      {tab === "debito" && (
        <div className="space-y-4">
          {loadingDebts ? (
            <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
          ) : debts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-sm text-gray-400">Nenhum debito de cascos com fornecedores.</p>
              <p className="text-xs text-gray-400 mt-1">Debitos sao gerados ao criar pedidos de compra com pagamento em troca de cascos.</p>
            </div>
          ) : (
            debts.map((debt) => (
              <div key={debt.supplierId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{debt.supplierName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total: deve <strong>{debt.totalRequired} {debt.cascoMode === "WEIGHT" ? "kg" : "un"}</strong> ·
                      enviou <strong>{debt.totalSent} {debt.cascoMode === "WEIGHT" ? "kg" : "un"}</strong> ·{" "}
                      {debt.totalPending > 0
                        ? <span className="text-red-600 font-medium">pendente: {debt.totalPending} {debt.cascoMode === "WEIGHT" ? "kg" : "un"}</span>
                        : <span className="text-green-600 font-medium">debito quitado</span>}
                    </p>
                  </div>
                  {debt.totalPending > 0 && (
                    <button
                      onClick={() => {
                        setSendingSupplierId(sendingSupplierId === debt.supplierId ? null : debt.supplierId)
                        setSendError("")
                        setSendForm((p) => ({ ...p, quantity: String(debt.totalPending), weightKg: "" }))
                      }}
                      className="text-xs font-medium text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {sendingSupplierId === debt.supplierId ? "Fechar" : "Registrar Envio"}
                    </button>
                  )}
                </div>

                {sendingSupplierId === debt.supplierId && (
                  <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-3">Registrar envio de cascos para {debt.supplierName}</p>
                    <div className="flex items-end gap-3 flex-wrap">
                      {stores.length > 1 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Loja</label>
                          <select value={sendForm.storeId} onChange={(e) => setSendForm((p) => ({ ...p, storeId: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantidade {debt.cascoMode === "WEIGHT" ? "(kg)" : "(un)"}
                        </label>
                        <input type="number" min="1" step={debt.cascoMode === "WEIGHT" ? "0.1" : "1"} value={sendForm.quantity}
                          onChange={(e) => setSendForm((p) => ({ ...p, quantity: e.target.value }))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      </div>
                      {debt.cascoMode === "WEIGHT" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                          <input type="number" step="0.1" min="0" value={sendForm.weightKg}
                            onChange={(e) => setSendForm((p) => ({ ...p, weightKg: e.target.value }))}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-32">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes</label>
                        <input type="text" value={sendForm.notes} onChange={(e) => setSendForm((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="Opcional..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      </div>
                      <button
                        onClick={() => handleSendCascos(debt.supplierId, debt.cascoMode)}
                        disabled={sendSaving}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        {sendSaving ? "Registrando..." : "Confirmar Envio"}
                      </button>
                    </div>
                    {sendError && <p className="text-xs text-red-600 mt-2">{sendError}</p>}
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {debt.orders.map((order) => (
                    <div key={order.id} className="px-5 py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{new Date(order.purchaseDate).toLocaleDateString("pt-BR")}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                          order.status === "ORDERED" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>{PO_STATUS_LABELS[order.status] ?? order.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">Deve: <strong className="text-gray-800">{order.required} {order.unit}</strong></span>
                        <span className="text-gray-500">Enviou: <strong className="text-gray-800">{order.sent} {order.unit}</strong></span>
                        {order.pending > 0
                          ? <span className="text-red-600 font-medium">Pendente: {order.pending} {order.unit}</span>
                          : <span className="text-green-600 font-medium">Quitado</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
