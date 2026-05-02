import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { storeId, supplierId, quantity, weightKg, purchaseOrderId, notes } = body

  if (!storeId || !supplierId || !quantity || quantity < 1) {
    return NextResponse.json({ error: "storeId, supplierId e quantity são obrigatórios" }, { status: 400 })
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja inválida" }, { status: 400 })

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId } })
  if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  if (purchaseOrderId) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, store: { companyId } } })
    if (!po) return NextResponse.json({ error: "Ordem de compra não encontrada" }, { status: 404 })
  }

  const record = await prisma.usedBattery.create({
    data: {
      storeId,
      supplierId,
      quantity: parseInt(quantity),
      weightKg: weightKg ? parseFloat(weightKg) : null,
      status: "SENT_TO_SUPPLIER",
      sentAt: new Date(),
      receivedAt: new Date(),
      ...(purchaseOrderId && { purchaseOrderId }),
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
