import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const sale = await prisma.sale.findFirst({
    where: { id: params.id, store: { companyId } },
    include: {
      store: { select: { name: true } },
      customer: { select: { id: true, name: true, phone: true, whatsapp: true, cpfCnpj: true } },
      customerVehicle: { select: { plate: true, year: true } },
      seller: { select: { name: true } },
      items: {
        include: {
          product: { include: { brand: { select: { name: true } } } },
          stockItem: { select: { serialNumber: true, batchNumber: true } },
          warranty: { select: { id: true, endDate: true, status: true } },
        },
      },
      payments: true,
    },
  })

  if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })

  return NextResponse.json(sale)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { action } = body

  if (action !== "cancel") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  }

  const sale = await prisma.sale.findFirst({
    where: { id: params.id, store: { companyId } },
    include: { items: { select: { stockItemId: true } } },
  })

  if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
  if (sale.status !== "COMPLETED") {
    return NextResponse.json({ error: "Apenas vendas concluídas podem ser canceladas" }, { status: 422 })
  }

  const stockItemIds = sale.items.map((i) => i.stockItemId)

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED" } })

    await tx.stockItem.updateMany({
      where: { id: { in: stockItemIds } },
      data: { status: "AVAILABLE" },
    })

    await tx.stockMovement.createMany({
      data: stockItemIds.map((id) => ({
        storeId: sale.storeId,
        stockItemId: id,
        userId,
        type: "RETURN",
        reason: `Cancelamento da venda #${sale.id.slice(-6).toUpperCase()}`,
        saleId: sale.id,
      })),
    })

    await tx.warranty.updateMany({
      where: { saleId: sale.id },
      data: { status: "EXPIRED" },
    })
  })

  return NextResponse.json({ ok: true })
}
