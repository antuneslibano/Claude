import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const companyId = (session.user as any).companyId

  const { productId, storeId, quantity, costPrice, supplierId, batchNumber, notes, cascos } =
    await req.json()

  if (!productId || !storeId || !quantity || !costPrice) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }
  if (quantity < 1 || quantity > 500) {
    return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })
  }

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
          ...(supplierId && { supplierId }),
        },
      })
      created.push(item)
    }

    // Registra cascos enviados ao fornecedor (agrupados por amperagem)
    if (Array.isArray(cascos) && cascos.length > 0) {
      for (const c of cascos) {
        const qty = parseInt(c.quantity) || 0
        if (qty <= 0) continue
        await tx.usedBattery.create({
          data: {
            storeId,
            supplierId: supplierId || null,
            amperage: c.amperage ? parseFloat(c.amperage) : null,
            quantity: qty,
            weightKg: c.weightKg ? parseFloat(c.weightKg) : null,
            status: "SENT_TO_SUPPLIER",
            notes: `Enviado com entrada de estoque`,
          },
        })
      }
    }

    return created
  })

  return NextResponse.json({ count: items.length }, { status: 201 })
}
