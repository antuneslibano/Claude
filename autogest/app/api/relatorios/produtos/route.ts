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

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        store: { companyId, ...(storeId && { id: storeId }) },
        status: "COMPLETED",
        createdAt: { gte: from, lte: to },
      },
    },
    include: {
      product: { include: { brand: { select: { name: true } } } },
    },
  })

  // Agregar por produto
  const byProduct: Record<string, {
    productId: string; name: string; brand: string
    qty: number; revenue: number; cogs: number; profit: number
  }> = {}

  for (const item of saleItems) {
    const key = item.productId
    if (!byProduct[key]) {
      byProduct[key] = {
        productId: item.productId,
        name: item.product.model,
        brand: item.product.brand.name,
        qty: 0, revenue: 0, cogs: 0, profit: 0,
      }
    }
    byProduct[key].qty += item.quantity
    byProduct[key].revenue += item.total
    byProduct[key].cogs += item.costPrice * item.quantity
    byProduct[key].profit += item.total - item.costPrice * item.quantity
  }

  const ranked = Object.values(byProduct)
    .sort((a, b) => b.revenue - a.revenue)
    .map((p) => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))

  return NextResponse.json({ from: from.toISOString(), to: to.toISOString(), products: ranked })
}
