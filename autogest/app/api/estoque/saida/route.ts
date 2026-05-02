import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const REASON_STATUS: Record<string, string> = {
  LOSS: "DISPOSAL",
  ADJUSTMENT: "DISPOSAL",
  TRANSFER_OUT: "DISPOSAL",
  RETURN: "RETURNED",
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const companyId = (session.user as any).companyId

  const { productId, storeId, quantity, reason, notes, supplierId } = await req.json()

  if (!productId || !storeId || !quantity || !reason) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja inválida" }, { status: 400 })

  const available = await prisma.stockItem.findMany({
    where: { storeId, productId, status: "AVAILABLE" },
    take: quantity,
    orderBy: { entryDate: "asc" },
  })

  if (available.length < quantity) {
    return NextResponse.json(
      { error: `Apenas ${available.length} unidade(s) disponível(is)` },
      { status: 400 }
    )
  }

  const newStatus = REASON_STATUS[reason] ?? "DISPOSAL"

  await prisma.$transaction(async (tx) => {
    for (const item of available) {
      await tx.stockItem.update({
        where: { id: item.id },
        data: { status: newStatus },
      })
      await tx.stockMovement.create({
        data: {
          storeId,
          stockItemId: item.id,
          userId,
          type: reason,
          reason: notes || reason,
          ...(supplierId && { supplierId }),
        },
      })
    }
  })

  return NextResponse.json({ count: available.length })
}
