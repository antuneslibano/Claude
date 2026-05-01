"use client"

import { useEffect, useState } from "react"

const VEHICLE_LABELS: Record<string, string> = {
  CAR: "Carro",
  VAN: "Van",
  TRUCK: "Caminhão",
  MOTORCYCLE: "Moto",
  OTHER: "Outro",
}

interface Store { id: string; name: string }
interface Position {
  id: string
  brand: string
  model: string
  amperage: number
  vehicleType: string
  salePrice: number
  costPrice: number
  available: number
  reserved: number
  total: number
}

export default function PosicaoEstoquePage() {
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState("")
  const [items, setItems] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/lojas").then((r) => r.json()).then((data) => {
      setStores(data)
      if (data.length > 0) setStoreId(data[0].id)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const qs = storeId ? `?storeId=${storeId}` : ""
    fetch(`/api/estoque/posicao${qs}`)
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false) })
  }, [storeId])

  const filtered = items.filter((i) => {
    const q = search.toLowerCase()
    return (
      !q ||
      i.brand.toLowerCase().includes(q) ||
      i.model.toLowerCase().includes(q) ||
      String(i.amperage).includes(q)
    )
  })

  const totalAvailable = filtered.reduce((a, b) => a + b.available, 0)
  const totalItems = filtered.reduce((a, b) => a + b.total, 0)

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Posição de Estoque</h1>
        <p className="text-sm text-gray-500 mt-0.5">Quantidade disponível por produto</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        {stores.length > 1 && (
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as lojas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
        <span className="text-xs text-gray-400 ml-auto">
          {totalAvailable} disponíveis · {totalItems} total
        </span>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Nenhum produto encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Produto</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Disponível</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Reservado</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Total</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Preço Venda</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{item.brand} — {item.model}</p>
                    <p className="text-xs text-gray-400">{item.amperage}Ah</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {VEHICLE_LABELS[item.vehicleType] ?? item.vehicleType}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-semibold ${item.available === 0 ? "text-red-500" : item.available <= 2 ? "text-yellow-600" : "text-green-600"}`}>
                      {item.available}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{item.reserved}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{item.total}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    R$ {item.salePrice.toFixed(2)}
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
