"use client"

import { useEffect, useState, useCallback } from "react"

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function pct(v: number) {
  return `${v.toFixed(1)}%`
}

// ─── tipos ───────────────────────────────────────────────────────────────────

interface DRE {
  salesCount: number
  grossRevenue: number; cogs: number; grossProfit: number; grossMargin: number
  otherIncome: number; totalExpenses: number; expenseByCategory: Record<string, number>
  ebit: number; ebitMargin: number
  monthlySeries: { month: string; revenue: number; cogs: number; expenses: number; profit: number }[]
}

interface ProductRanking {
  productId: string; name: string; brand: string
  qty: number; revenue: number; profit: number; margin: number
}

interface SellerRanking {
  sellerId: string; name: string
  salesCount: number; revenue: number; profit: number
  itemsSold: number; totalDiscount: number; avgTicket: number; margin: number
}

type Tab = "dre" | "produtos" | "vendedores"

// ─── componente ──────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const [tab, setTab] = useState<Tab>("dre")
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [loading, setLoading] = useState(false)

  const [dre, setDre] = useState<DRE | null>(null)
  const [products, setProducts] = useState<ProductRanking[]>([])
  const [sellers, setSellers] = useState<SellerRanking[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const qs = `from=${from}&to=${to}`
    const [dreRes, prodRes, sellRes] = await Promise.all([
      fetch(`/api/relatorios/dre?${qs}`),
      fetch(`/api/relatorios/produtos?${qs}`),
      fetch(`/api/relatorios/vendedores?${qs}`),
    ])
    const [dreData, prodData, sellData] = await Promise.all([dreRes.json(), prodRes.json(), sellRes.json()])
    setDre(dreData)
    setProducts(prodData.products ?? [])
    setSellers(sellData.sellers ?? [])
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [])

  // ── gráfico de barras mensal ──────────────────────────────────────────────
  const maxBar = dre ? Math.max(...dre.monthlySeries.map((m) => Math.max(m.revenue, 1)), 1) : 1

  // ── DRE ──────────────────────────────────────────────────────────────────
  function DreTab() {
    if (!dre) return null
    const rows = [
      { label: "Receita bruta de vendas", value: dre.grossRevenue, indent: false, bold: false, color: "text-green-700" },
      { label: "(-) Custo das mercadorias", value: -dre.cogs, indent: true, bold: false, color: "text-red-600" },
      { label: "Lucro bruto", value: dre.grossProfit, indent: false, bold: true, color: dre.grossProfit >= 0 ? "text-gray-900" : "text-red-700" },
      { label: `Margem bruta`, value: null as null, extra: pct(dre.grossMargin), indent: true, bold: false, color: "text-gray-500" },
      { label: "Outras receitas", value: dre.otherIncome, indent: true, bold: false, color: "text-green-600" },
      { label: "(-) Despesas operacionais", value: -dre.totalExpenses, indent: true, bold: false, color: "text-red-600" },
      { label: "Resultado operacional (EBIT)", value: dre.ebit, indent: false, bold: true, color: dre.ebit >= 0 ? "text-blue-700" : "text-red-700" },
      { label: `Margem EBIT`, value: null as null, extra: pct(dre.ebitMargin), indent: true, bold: false, color: "text-gray-500" },
    ]

    return (
      <div className="space-y-5">
        {/* Cards rápidos */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Vendas no período", value: String(dre.salesCount), color: "text-gray-900" },
            { label: "Receita bruta", value: fmt(dre.grossRevenue), color: "text-green-700" },
            { label: "Lucro bruto", value: fmt(dre.grossProfit), color: dre.grossProfit >= 0 ? "text-blue-700" : "text-red-700" },
            { label: "EBIT", value: fmt(dre.ebit), color: dre.ebit >= 0 ? "text-green-800" : "text-red-700" },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">{c.label}</p>
              <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Demonstrativo */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">DRE Simplificado</p>
            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <div key={i} className={`flex justify-between text-sm ${r.indent ? "pl-4" : ""}`}>
                  <span className={r.bold ? "font-semibold text-gray-800" : "text-gray-600"}>{r.label}</span>
                  <span className={`${r.bold ? "font-bold" : ""} ${r.color}`}>
                    {r.value !== null ? fmt(Math.abs(r.value)) : r.extra}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Despesas por categoria */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">
              Despesas por Categoria
            </p>
            {Object.keys(dre.expenseByCategory).length === 0 ? (
              <p className="text-xs text-gray-400">Sem despesas no período.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(dre.expenseByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, value]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 flex-1 truncate">{name}</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${(value / dre.totalExpenses) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-red-600 w-20 text-right">{fmt(value)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico mensal */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-semibold text-gray-700 mb-4">Receita x Lucro — últimos 12 meses</p>
          <div className="flex items-end gap-1 h-28">
            {dre.monthlySeries.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col gap-0.5 items-stretch justify-end h-full"
                title={`${m.month}\nReceita: ${fmt(m.revenue)}\nLucro: ${fmt(m.profit)}`}>
                <div className="bg-blue-400 rounded-t-sm"
                  style={{ height: `${(m.profit / maxBar) * 100}%`, minHeight: m.profit > 0 ? 2 : 0 }} />
                <div className="bg-green-200 rounded-t-sm"
                  style={{ height: `${((m.revenue - m.profit) / maxBar) * 100}%`, minHeight: m.revenue > 0 ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-gray-400 overflow-x-auto pb-1">
            {dre.monthlySeries.map((m) => (
              <span key={m.month} className="flex-1 text-center text-[10px] whitespace-nowrap">
                {m.month.slice(5)}
              </span>
            ))}
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-200 inline-block" />Receita</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />Lucro</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Produtos ──────────────────────────────────────────────────────────────
  function ProdutosTab() {
    if (!products.length) return <p className="text-sm text-gray-400 py-8 text-center">Nenhuma venda no período.</p>
    const maxRev = Math.max(...products.map((p) => p.revenue), 1)
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Margem</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Participação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p, i) => (
              <tr key={p.productId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.brand} {p.name}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{p.qty}</td>
                <td className="px-4 py-3 font-medium text-green-700">{fmt(p.revenue)}</td>
                <td className="px-4 py-3 font-medium text-blue-700">{fmt(p.profit)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${p.margin >= 20 ? "text-green-600" : p.margin >= 10 ? "text-amber-600" : "text-red-600"}`}>
                    {pct(p.margin)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{pct((p.revenue / maxRev) * 100)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Vendedores ────────────────────────────────────────────────────────────
  function VendedoresTab() {
    if (!sellers.length) return <p className="text-sm text-gray-400 py-8 text-center">Nenhuma venda no período.</p>
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket médio</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Margem</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Descontos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sellers.map((s, i) => (
              <tr key={s.sellerId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-700">{s.salesCount}</td>
                <td className="px-4 py-3 text-gray-700">{s.itemsSold}</td>
                <td className="px-4 py-3 font-medium text-green-700">{fmt(s.revenue)}</td>
                <td className="px-4 py-3 text-gray-700">{fmt(s.avgTicket)}</td>
                <td className="px-4 py-3 font-medium text-blue-700">{fmt(s.profit)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${s.margin >= 20 ? "text-green-600" : s.margin >= 10 ? "text-amber-600" : "text-red-600"}`}>
                    {pct(s.margin)}
                  </span>
                </td>
                <td className="px-4 py-3 text-red-500 text-xs">{s.totalDiscount > 0 ? fmt(s.totalDiscount) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-0.5">DRE, ranking de produtos e desempenho de vendedores</p>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-3 mb-6 bg-white border border-gray-200 rounded-lg p-3">
        <span className="text-xs text-gray-500 font-medium">Período:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400 text-xs">até</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={load}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md">
          Atualizar
        </button>
        {/* Atalhos */}
        {[
          { label: "Este mês", from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0] },
          { label: "Mês passado", from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0] },
          { label: "Este ano", from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` },
        ].map((s) => (
          <button key={s.label} onClick={() => { setFrom(s.from); setTo(s.to); setTimeout(load, 0) }}
            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600">
            {s.label}
          </button>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(["dre", "produtos", "vendedores"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "dre" ? "DRE" : t === "produtos" ? "Produtos" : "Vendedores"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Calculando relatório...</div>
      ) : (
        <>
          {tab === "dre" && <DreTab />}
          {tab === "produtos" && <ProdutosTab />}
          {tab === "vendedores" && <VendedoresTab />}
        </>
      )}
    </div>
  )
}
