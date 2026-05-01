import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const companyId = (session.user as any).companyId

  const { productId, storeId, quantity, costPrice, supplierId, batchNumber, notes } =
    await req.json()

  if (!productId || !storeId || !quantity || !costPrice) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }
  if (quantity < 1 || quantity > 500) {
    return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })
  }

  // Validate store belongs to company
  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja inválida" }, { status: 400 })

  const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
  if (!product) return NextResponse.json({ error: "Produto inválido" }, { status: 400 })

  const items = await prisma.$transaction(async (tx) => {
    const created = []
    for (let i = 0; i < quantity; i++) {
      const item = await tx.stockItem.create({
        data: {
          storeId,
          productId,
          costPrice: parseFloat(costPrice),
          status: "AVAILABLE",
          ...(supplierId && { supplierId }),
          ...(batchNumber && { batchNumber }),
          ...(notes && { notes }),
        },
      })
      await tx.stockMovement.create({
        data: {
          storeId,
          stockItemId: item.id,
          userId,
          type: "PURCHASE",
          reason: notes || "Entrada de estoque",
        },
      })
      created.push(item)
    }
    return created
  })

  return NextResponse.json({ count: items.length }, { status: 201 })
}
