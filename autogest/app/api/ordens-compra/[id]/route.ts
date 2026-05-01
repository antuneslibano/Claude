import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: params.id, store: { companyId } },
    include: {
      store: { select: { name: true } },
      supplier: { select: { id: true, name: true, phone: true, email: true } },
      items: {
        include: {
          product: { include: { brand: { select: { name: true } } } },
        },
        orderBy: { entryDate: "asc" },
      },
    },
  })

  if (!order) return NextResponse.json({ error: "Ordem não encontrada" }, { status: 404 })

  // Agrupar itens por produto para exibição
  const grouped: Record<string, { product: any; units: any[]; costPrice: number }> = {}
  for (const item of order.items) {
    if (!grouped[item.productId]) {
      grouped[item.productId] = { product: item.product, units: [], costPrice: item.costPrice }
    }
    grouped[item.productId].units.push({ id: item.id, serialNumber: item.serialNumber, status: item.status })
  }

  return NextResponse.json({ ...order, groupedItems: Object.values(grouped) })
}
