import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId")
  const productId = searchParams.get("productId")

  if (!storeId || !productId) {
    return NextResponse.json({ error: "storeId e productId são obrigatórios" }, { status: 400 })
  }

  const items = await prisma.stockItem.findMany({
    where: {
      storeId,
      productId,
      status: "AVAILABLE",
      store: { companyId },
    },
    select: { id: true, serialNumber: true, batchNumber: true, costPrice: true, entryDate: true },
    orderBy: { entryDate: "asc" },
  })

  return NextResponse.json(items)
}
