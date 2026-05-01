import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined

  const products = await prisma.product.findMany({
    where: { companyId, active: true },
    include: {
      brand: { select: { name: true } },
      stockItems: {
        where: {
          store: { companyId },
          ...(storeId && { storeId }),
        },
        select: { status: true, storeId: true, costPrice: true },
      },
    },
    orderBy: [{ brand: { name: "asc" } }, { model: "asc" }],
  })

  const data = products
    .map((p) => {
      const available = p.stockItems.filter((s) => s.status === "AVAILABLE").length
      const reserved = p.stockItems.filter((s) => s.status === "RESERVED").length
      const sold = p.stockItems.filter((s) => s.status === "SOLD").length
      const total = p.stockItems.length
      const avgCost =
        p.stockItems.length > 0
          ? p.stockItems.reduce((a, b) => a + b.costPrice, 0) / p.stockItems.length
          : p.costPrice
      return {
        id: p.id,
        brand: p.brand.name,
        model: p.model,
        amperage: p.amperage,
        vehicleType: p.vehicleType,
        salePrice: p.salePrice,
        costPrice: avgCost,
        available,
        reserved,
        sold,
        total,
      }
    })
    .filter((p) => p.total > 0 || true)

  return NextResponse.json(data)
}
