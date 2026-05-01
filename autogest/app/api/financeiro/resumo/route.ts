import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined

  // Período: mês atual por padrão
  const now = new Date()
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = toParam ? new Date(toParam + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const where: any = {
    store: { companyId },
    date: { gte: from, lte: to },
    ...(storeId && { storeId }),
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    include: { category: { select: { name: true, type: true } } },
    orderBy: { date: "desc" },
  })

  const income = transactions.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0)
  const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0)
  const balance = income - expense

  // Receita dos últimos 30 dias agrupada por dia
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const recent = await prisma.financialTransaction.findMany({
    where: { store: { companyId }, ...(storeId && { storeId }), date: { gte: thirtyDaysAgo } },
    select: { date: true, amount: true, type: true },
    orderBy: { date: "asc" },
  })

  // Agrupar por dia
  const byDay: Record<string, { income: number; expense: number }> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    byDay[d.toISOString().split("T")[0]] = { income: 0, expense: 0 }
  }
  for (const t of recent) {
    const day = new Date(t.date).toISOString().split("T")[0]
    if (byDay[day]) byDay[day][t.type === "INCOME" ? "income" : "expense"] += t.amount
  }
  const dailySeries = Object.entries(byDay).map(([date, v]) => ({ date, ...v }))

  // Receita por categoria no período
  const byCategory: Record<string, { name: string; type: string; total: number }> = {}
  for (const t of transactions) {
    const key = t.categoryId ?? "__sem_categoria__"
    if (!byCategory[key]) byCategory[key] = { name: t.category?.name ?? "Sem categoria", type: t.type, total: 0 }
    byCategory[key].total += t.amount
  }

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    income,
    expense,
    balance,
    dailySeries,
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
    recentTransactions: transactions.slice(0, 10),
  })
}
