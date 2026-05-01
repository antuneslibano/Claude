"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const VEHICLE_LABELS: Record<string, string> = {
  CAR: "Carro",
  VAN: "Van",
  TRUCK: "Caminhão",
  MOTORCYCLE: "Moto",
  OTHER: "Outro",
}

const VEHICLE_COLORS: Record<string, string> = {
  CAR: "bg-blue-100 text-blue-700",
  VAN: "bg-purple-100 text-purple-700",
  TRUCK: "bg-orange-100 text-orange-700",
  MOTORCYCLE: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-600",
}

interface Brand { id: string; name: string }
interface Product {
  id: string
  internalCode: string | null
  model: string
  amperage: number
  vehicleType: string
  salePrice: number
  costPrice: number
  active: boolean
  brand: Brand
  _count: { stockItems: number }
}

export default function ProdutosList() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterBrand, setFilterBrand] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchBrands = async () => {
    const res = await fetch("/api/marcas")
    if (res.ok) setBrands(await res.json())
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      q: search,
      tipo: filterType,
      marca: filterBrand,
      page: String(page),
    })
    const res = await fetch(`/api/produtos?${params}`)
    if (res.ok) {
      const data = await res.json()
      setProducts(data.products)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [search, filterType, filterBrand, page])

  useEffect(() => { fetchBrands() }, [])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Debounce search
  const [searchInput, setSearchInput] = useState("")
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  async function handleDelete(id: string) {
    if (!confirm("Excluir este produto?")) return
    setDeleting(id)
    const res = await fetch(`/api/produtos/${id}`, { method: "DELETE" })
    const data = await res.json()
    alert(data.message)
    setDeleting(null)
    fetchProducts()
  }

  const margin = (sale: number, cost: number) =>
    cost > 0 ? (((sale - cost) / cost) * 100).toFixed(1) : "—"

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} {total === 1 ? "produto cadastrado" : "produtos cadastrados"}
          </p>
        </div>
        <Link
          href="/estoque/produtos/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + Novo Produto
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por modelo, código ou marca..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filterBrand}
          onChange={(e) => { setFilterBrand(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Código</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Marca / Modelo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amperagem</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Custo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Venda</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Margem</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estoque</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                  Nenhum produto encontrado.{" "}
                  <Link href="/estoque/produtos/novo" className="text-blue-600 hover:underline">
                    Cadastrar o primeiro
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {p.internalCode ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.brand.name}</p>
                    <p className="text-xs text-gray-500">{p.model}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.amperage} Ah</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VEHICLE_COLORS[p.vehicleType]}`}>
                      {VEHICLE_LABELS[p.vehicleType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    R$ {p.costPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    R$ {p.salePrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-medium ${parseFloat(margin(p.salePrice, p.costPrice)) >= 20 ? "text-green-600" : "text-orange-500"}`}>
                      {margin(p.salePrice, p.costPrice)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${p._count.stockItems === 0 ? "text-red-500" : "text-gray-900"}`}>
                      {p._count.stockItems}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/estoque/produtos/${p.id}/editar`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-40"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Página {page} de {pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
