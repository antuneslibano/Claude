"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Resumo {
  period: { from: string; to: string }
  income: number
  expense: number
  balance: number
  dailySeries: { date: string; income: number; expense: number }[]
  byCategory: { name: string; type: string; total: number }[]
  recentTransactions: {
    id: string
    type: string
    description: string
    amount: number
    date: string
    paidAt: string | null
    saleId: string | null
    category: { name: string } | null
    store: { name: string }
  }[]
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function monthLabel(d: Date) {
  return d.toLocaleString("pt-BR", { month: "long", year: "numeric" })
}

export default function FinanceiroDashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0) // meses atrás

  async function load(off = offset) {
    setLoading(true)
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + off
    const from = new Date(y, m, 1).toISOString().split("T")[0]
    const to = new Date(y, m + 1, 0).toISOString().split("T")[0]
    const res = await fetch(`/api/financeiro/resumo?from=${from}&to=${to}`)
    const data = await res.json()
    setResumo(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function changeMonth(delta: number) {
    const next = offset + delta
    if (next > 0) return
    setOffset(next)
    load(next)
  }

  const periodLabel = (() => {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return monthLabel(d)
  })()

  // Calcular máximo para escalar o gráfico de barras
  const maxBar = resumo
    ? Math.max(...resumo.dailySeries.map((d) => Math.max(d.income, d.expense)), 1)
    : 1

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fluxo de caixa e resultados por período</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/financeiro/nova"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            + Lançamento
          </Link>
          <Link
            href="/financeiro/transacoes"
            className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Todos os lançamentos
          </Link>
        </div>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => changeMonth(-1)}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50"
        >
          ←
        </button>
        <span className="text-sm font-medium text-gray-700 capitalize w-40 text-center">{periodLabel}</span>
        <button
          onClick={() => changeMonth(1)}
          disabled={offset >= 0}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
        >
          →
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Carregando...</div>
      ) : resumo && (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Receitas</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{fmt(resumo.income)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Despesas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{fmt(resumo.expense)}</p>
            </div>
            <div className={`border rounded-lg p-5 ${resumo.balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo do período</p>
              <p className={`text-2xl font-bold mt-1 ${resumo.balance >= 0 ? "text-green-800" : "text-red-700"}`}>
                {fmt(resumo.balance)}
              </p>
            </div>
          </div>

          {/* Gráfico de barras diário (últimos 30 dias) */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs font-semibold text-gray-700 mb-4">Movimentação — últimos 30 dias</p>
            <div className="flex items-end gap-px h-24 overflow-hidden">
              {resumo.dailySeries.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col gap-px items-stretch justify-end h-full" title={`${d.date}\nReceita: ${fmt(d.income)}\nDespesa: ${fmt(d.expense)}`}>
                  <div
                    className="bg-red-300 rounded-sm"
                    style={{ height: `${(d.expense / maxBar) * 100}%`, minHeight: d.expense > 0 ? 2 : 0 }}
                  />
                  <div
                    className="bg-green-400 rounded-sm"
                    style={{ height: `${(d.income / maxBar) * 100}%`, minHeight: d.income > 0 ? 2 : 0 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400 inline-block" />Receita</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-300 inline-block" />Despesa</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Por categoria */}
            {resumo.byCategory.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Por categoria</p>
                <div className="space-y-2">
                  {resumo.byCategory.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.type === "INCOME" ? "bg-green-400" : "bg-red-400"}`} />
                        <span className="text-gray-700 truncate">{c.name}</span>
                      </div>
                      <span className={`font-medium ml-2 shrink-0 ${c.type === "INCOME" ? "text-green-700" : "text-red-600"}`}>
                        {fmt(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimos lançamentos */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <p className="text-xs font-semibold text-gray-700">Lançamentos recentes</p>
                <Link href="/financeiro/transacoes" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
              </div>
              {resumo.recentTransactions.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum lançamento no período.</p>
              ) : (
                <div className="space-y-2">
                  {resumo.recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-800 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(t.date).toLocaleDateString("pt-BR")}
                          {t.category && ` · ${t.category.name}`}
                          {t.saleId && " · Venda"}
                        </p>
                      </div>
                      <span className={`font-semibold ml-3 shrink-0 ${t.type === "INCOME" ? "text-green-700" : "text-red-600"}`}>
                        {t.type === "INCOME" ? "+" : "-"}{fmt(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
