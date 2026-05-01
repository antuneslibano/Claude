import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const storeFilter = { store: { companyId } }

  const [
    todaySales,
    monthSales,
    stockCounts,
    activeWarranties,
    claimedWarranties,
    overdueInstallments,
    pendingInstallments,
    recentSales,
    lowStockProducts,
  ] = await Promise.all([
    // Vendas de hoje
    prisma.sale.aggregate({
      where: { ...storeFilter, status: "COMPLETED", createdAt: { gte: todayStart } },
      _count: true,
      _sum: { total: true, estimatedProfit: true },
    }),
    // Vendas do mês
    prisma.sale.aggregate({
      where: { ...storeFilter, status: "COMPLETED", createdAt: { gte: monthStart, lte: monthEnd } },
      _count: true,
      _sum: { total: true, estimatedProfit: true },
    }),
    // Estoque disponível vs total
    prisma.stockItem.groupBy({
      by: ["status"],
      where: { store: { companyId } },
      _count: true,
    }),
    // Garantias ativas
    prisma.warranty.count({
      where: { sale: { store: { companyId } }, status: "ACTIVE" },
    }),
    // Garantias acionadas (aguardando avaliação)
    prisma.warranty.count({
      where: { sale: { store: { companyId } }, status: "CLAIMED" },
    }),
    // Parcelas vencidas
    prisma.installment.count({
      where: {
        sale: { store: { companyId } },
        status: "PENDING",
        dueDate: { lt: todayStart },
      },
    }),
    // Parcelas a vencer nos próximos 7 dias
    prisma.installment.aggregate({
      where: {
        sale: { store: { companyId } },
        status: "PENDING",
        dueDate: { gte: todayStart, lte: new Date(todayStart.getTime() + 7 * 86400000) },
      },
      _count: true,
      _sum: { amount: true },
    }),
    // Últimas 6 vendas
    prisma.sale.findMany({
      where: { ...storeFilter, status: "COMPLETED" },
      include: {
        customer: { select: { name: true } },
        store: { select: { name: true } },
        items: {
          include: { product: { include: { brand: { select: { name: true } } } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Produtos com estoque crítico (≤ 2 unidades disponíveis)
    prisma.product.findMany({
      where: { companyId, active: true },
      include: {
        brand: { select: { name: true } },
        stockItems: {
          where: { store: { companyId }, status: "AVAILABLE" },
          select: { id: true },
        },
      },
      orderBy: [{ brand: { name: "asc" } }, { model: "asc" }],
    }).then((products) =>
      products
        .map((p) => ({ ...p, availableCount: p.stockItems.length }))
        .filter((p) => p.availableCount <= 2)
        .slice(0, 8)
    ),
  ])

  const stockAvailable = stockCounts.find((s) => s.status === "AVAILABLE")?._count ?? 0
  const stockTotal = stockCounts.reduce((a, s) => a + s._count, 0)

  // Faturamento financeiro do mês (todas as receitas, não só vendas)
  const monthFinancial = await prisma.financialTransaction.aggregate({
    where: {
      store: { companyId },
      type: "INCOME",
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  })

  return NextResponse.json({
    today: {
      salesCount: todaySales._count,
      revenue: todaySales._sum.total ?? 0,
      profit: todaySales._sum.estimatedProfit ?? 0,
    },
    month: {
      salesCount: monthSales._count,
      revenue: monthSales._sum.total ?? 0,
      profit: monthSales._sum.estimatedProfit ?? 0,
      totalIncome: monthFinancial._sum.amount ?? 0,
    },
    stock: {
      available: stockAvailable,
      total: stockTotal,
    },
    warranties: {
      active: activeWarranties,
      claimed: claimedWarranties,
    },
    installments: {
      overdue: overdueInstallments,
      dueSoon: pendingInstallments._count,
      dueSoonAmount: pendingInstallments._sum.amount ?? 0,
    },
    recentSales,
    lowStockProducts,
  })
}
