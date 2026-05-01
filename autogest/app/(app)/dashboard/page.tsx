"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface DashboardData {
  today: { salesCount: number; revenue: number; profit: number }
  month: { salesCount: number; revenue: number; profit: number; totalIncome: number }
  stock: { available: number; total: number }
  warranties: { active: number; claimed: number }
  installments: { overdue: number; dueSoon: number; dueSoonAmount: number }
  recentSales: {
    id: string; total: number; createdAt: string
    customer: { name: string } | null
    store: { name: string }
    items: { product: { brand: { name: string }; model: string; amperage: number } }[]
  }[]
  lowStockProducts: {
    id: string; model: string; amperage: number; availableCount: number
    brand: { name: string }
  }[]
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Dashboard</h1>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const hasAlerts = data.warranties.claimed > 0 || data.installments.overdue > 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ─── Alertas ─────────────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="space-y-2">
          {data.warranties.claimed > 0 && (
            <Link href="/garantias?status=CLAIMED"
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors">
              <span className="text-amber-500 text-lg">⚠</span>
              <p className="text-sm text-amber-800">
                <strong>{data.warranties.claimed}</strong> garantia{data.warranties.claimed > 1 ? "s" : ""} acionada{data.warranties.claimed > 1 ? "s" : ""} aguardando avaliação
              </p>
              <span className="ml-auto text-xs text-amber-600">Ver →</span>
            </Link>
          )}
          {data.installments.overdue > 0 && (
            <Link href="/crediario?status=OVERDUE"
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 hover:bg-red-100 transition-colors">
              <span className="text-red-500 text-lg">!</span>
              <p className="text-sm text-red-800">
                <strong>{data.installments.overdue}</strong> parcela{data.installments.overdue > 1 ? "s" : ""} de crediário vencida{data.installments.overdue > 1 ? "s" : ""}
              </p>
              <span className="ml-auto text-xs text-red-600">Ver →</span>
            </Link>
          )}
          {data.installments.dueSoon > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-blue-500 text-lg">◷</span>
              <p className="text-sm text-blue-800">
                <strong>{data.installments.dueSoon}</strong> parcela{data.installments.dueSoon > 1 ? "s" : ""} vencem nos próximos 7 dias
                {" — "}<strong>{fmt(data.installments.dueSoonAmount)}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── KPIs de hoje ────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Hoje</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs text-gray-400">Vendas realizadas</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{data.today.salesCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs text-gray-400">Receita</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{fmt(data.today.revenue)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs text-gray-400">Lucro estimado</p>
            <p className={`text-3xl font-bold mt-1 ${data.today.profit >= 0 ? "text-blue-700" : "text-red-600"}`}>
              {fmt(data.today.profit)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── KPIs do mês ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Vendas", value: String(data.month.salesCount), color: "text-gray-900" },
            { label: "Receita de vendas", value: fmt(data.month.revenue), color: "text-green-700" },
            { label: "Lucro estimado", value: fmt(data.month.profit), color: "text-blue-700" },
            { label: "Receita total (financeiro)", value: fmt(data.month.totalIncome), color: "text-gray-700" },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">{c.label}</p>
              <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* ─── Indicadores operacionais ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 content-start">
          {[
            {
              label: "Estoque disponível",
              value: `${data.stock.available}`,
              sub: `de ${data.stock.total} unidades`,
              color: data.stock.available < 10 ? "text-amber-600" : "text-gray-900",
              href: "/estoque/posicao",
            },
            {
              label: "Garantias ativas",
              value: String(data.warranties.active),
              sub: data.warranties.claimed > 0 ? `${data.warranties.claimed} acionada(s)` : "nenhuma pendência",
              color: data.warranties.claimed > 0 ? "text-amber-600" : "text-gray-900",
              href: "/garantias",
            },
          ].map((c) => (
            <Link key={c.label} href={c.href}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <p className="text-xs text-gray-400">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </Link>
          ))}

          {/* Estoque crítico */}
          {data.lowStockProducts.length > 0 && (
            <div className="col-span-2 bg-white border border-amber-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-800">Estoque crítico (≤ 2 unidades)</p>
                <Link href="/estoque/posicao" className="text-xs text-amber-600 hover:underline">Ver estoque →</Link>
              </div>
              <ul className="divide-y divide-gray-100">
                {data.lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-800">{p.brand.name} {p.model} ({p.amperage}Ah)</span>
                    <span className={`text-sm font-bold ${p.availableCount === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {p.availableCount === 0 ? "SEM ESTOQUE" : `${p.availableCount} un.`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ─── Vendas recentes ──────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Vendas recentes</p>
            <Link href="/vendas" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
          </div>
          {data.recentSales.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">Nenhuma venda registrada.</p>
              <Link href="/vendas/nova" className="text-xs text-blue-600 hover:underline mt-1 block">
                Registrar primeira venda
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentSales.map((sale) => {
                const firstItem = sale.items[0]
                return (
                  <li key={sale.id}>
                    <Link href={`/vendas/${sale.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">#{sale.id.slice(-6).toUpperCase()}</span>
                          {sale.customer && (
                            <span className="text-sm font-medium text-gray-900 truncate">{sale.customer.name}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {firstItem
                            ? `${firstItem.product.brand.name} ${firstItem.product.model} (${firstItem.product.amperage}Ah)${sale.items.length > 1 ? ` +${sale.items.length - 1}` : ""}`
                            : sale.store.name}
                          {" · "}
                          {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="font-semibold text-green-700 ml-3 shrink-0">{fmt(sale.total)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="px-4 py-3 border-t border-gray-100">
            <Link href="/vendas/nova"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-md transition-colors">
              + Nova Venda
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
