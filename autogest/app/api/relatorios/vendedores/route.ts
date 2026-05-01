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

  const sales = await prisma.sale.findMany({
    where: {
      store: { companyId, ...(storeId && { id: storeId }) },
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
    select: {
      total: true,
      estimatedProfit: true,
      discount: true,
      createdAt: true,
      userId: true,
      seller: { select: { name: true } },
      items: { select: { quantity: true } },
    },
  })

  const bySeller: Record<string, {
    sellerId: string; name: string
    salesCount: number; revenue: number; profit: number
    itemsSold: number; totalDiscount: number
  }> = {}

  for (const s of sales) {
    if (!bySeller[s.userId]) {
      bySeller[s.userId] = {
        sellerId: s.userId,
        name: s.seller.name,
        salesCount: 0, revenue: 0, profit: 0, itemsSold: 0, totalDiscount: 0,
      }
    }
    bySeller[s.userId].salesCount += 1
    bySeller[s.userId].revenue += s.total
    bySeller[s.userId].profit += s.estimatedProfit
    bySeller[s.userId].itemsSold += s.items.reduce((a, i) => a + i.quantity, 0)
    bySeller[s.userId].totalDiscount += s.discount
  }

  const ranked = Object.values(bySeller)
    .sort((a, b) => b.revenue - a.revenue)
    .map((v) => ({
      ...v,
      avgTicket: v.salesCount > 0 ? v.revenue / v.salesCount : 0,
      margin: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0,
    }))

  return NextResponse.json({ from: from.toISOString(), to: to.toISOString(), sellers: ranked })
}
