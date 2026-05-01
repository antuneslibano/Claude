import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined

  const now = new Date()
  const from = new Date(searchParams.get("from") ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
  const to = new Date(searchParams.get("to") ? searchParams.get("to")! + "T23:59:59" : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString())

  const storeWhere: any = { companyId, ...(storeId && { id: storeId }) }

  // Vendas concluídas no período
  const sales = await prisma.sale.findMany({
    where: {
      store: storeWhere,
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
    select: {
      total: true,
      estimatedProfit: true,
      items: { select: { costPrice: true, total: true, quantity: true } },
    },
  })

  const grossRevenue = sales.reduce((a, s) => a + s.total, 0)
  const cogs = sales.reduce((a, s) => a + s.items.reduce((b, i) => b + i.costPrice * i.quantity, 0), 0)
  const grossProfit = grossRevenue - cogs

  // Despesas operacionais do período
  const expenses = await prisma.financialTransaction.findMany({
    where: {
      store: storeWhere,
      type: "EXPENSE",
      date: { gte: from, lte: to },
      saleId: null, // excluir lançamentos vinculados a vendas
    },
    include: { category: { select: { name: true } } },
  })
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0)

  // Agrupar despesas por categoria
  const expenseByCategory: Record<string, number> = {}
  for (const e of expenses) {
    const key = e.category?.name ?? "Sem categoria"
    expenseByCategory[key] = (expenseByCategory[key] ?? 0) + e.amount
  }

  // Outras receitas manuais
  const otherIncome = await prisma.financialTransaction.aggregate({
    where: { store: storeWhere, type: "INCOME", date: { gte: from, lte: to }, saleId: null },
    _sum: { amount: true },
  })
  const otherIncomeTotal = otherIncome._sum.amount ?? 0

  const ebit = grossProfit + otherIncomeTotal - totalExpenses

  // Série mensal dos últimos 12 meses
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const monthlySales = await prisma.sale.findMany({
    where: { store: storeWhere, status: "COMPLETED", createdAt: { gte: twelveMonthsAgo } },
    select: { total: true, createdAt: true, items: { select: { costPrice: true, quantity: true } } },
  })
  const monthlyExpenses = await prisma.financialTransaction.findMany({
    where: { store: storeWhere, type: "EXPENSE", date: { gte: twelveMonthsAgo }, saleId: null },
    select: { amount: true, date: true },
  })

  const byMonth: Record<string, { revenue: number; cogs: number; expenses: number }> = {}
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    byMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = { revenue: 0, cogs: 0, expenses: 0 }
  }
  for (const s of monthlySales) {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`
    if (byMonth[key]) {
      byMonth[key].revenue += s.total
      byMonth[key].cogs += s.items.reduce((a, i) => a + i.costPrice * i.quantity, 0)
    }
  }
  for (const e of monthlyExpenses) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`
    if (byMonth[key]) byMonth[key].expenses += e.amount
  }

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    salesCount: sales.length,
    grossRevenue,
    cogs,
    grossProfit,
    grossMargin: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
    otherIncome: otherIncomeTotal,
    totalExpenses,
    expenseByCategory,
    ebit,
    ebitMargin: grossRevenue > 0 ? (ebit / grossRevenue) * 100 : 0,
    monthlySeries: Object.entries(byMonth).map(([month, v]) => ({ month, ...v, profit: v.revenue - v.cogs - v.expenses })),
  })
}
