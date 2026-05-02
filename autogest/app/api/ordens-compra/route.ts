import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined
  const supplierId = searchParams.get("supplierId") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const type = searchParams.get("type") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const where: any = {
    store: { companyId },
    ...(storeId && { storeId }),
    ...(supplierId && { supplierId }),
    ...(status && { status }),
    ...(type && { type }),
  }

  const [total, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        store: { select: { name: true } },
        supplier: { select: { name: true } },
        _count: { select: { orderItems: true, items: true } },
      },
      orderBy: { purchaseDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, page, limit, orders })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const {
    storeId, supplierId, invoiceNumber, purchaseDate,
    type, paymentType, expectedDeliveryDate, paidAt,
    cascoMode, cascosRequired, cascoWeightKg,
    items, notes,
  } = body

  if (!storeId || !supplierId || !purchaseDate || !items?.length) {
    return NextResponse.json({ error: "storeId, supplierId, purchaseDate e items são obrigatórios" }, { status: 400 })
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId } })
  if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  const totalCost = items.reduce((acc: number, i: any) => acc + (i.unitCost ?? i.costPrice ?? 0) * i.quantity, 0)

  const order = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        storeId,
        supplierId,
        invoiceNumber: invoiceNumber?.trim() || null,
        purchaseDate: new Date(purchaseDate),
        totalCost,
        type: type ?? "IMMEDIATE",
        paymentType: paymentType ?? "CASH",
        status: "ORDERED",
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        cascoMode: cascoMode || null,
        cascosRequired: cascosRequired ? parseInt(cascosRequired) : null,
        cascoWeightKg: cascoWeightKg ? parseFloat(cascoWeightKg) : null,
        notes: notes?.trim() || null,
      },
    })

    for (const item of items) {
      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: parseFloat(item.unitCost ?? item.costPrice ?? 0),
          batchNumber: item.batchNumber?.trim() || null,
        },
      })
    }

    return po
  })

  return NextResponse.json({ id: order.id }, { status: 201 })
}
