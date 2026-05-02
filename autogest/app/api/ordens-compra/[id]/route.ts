import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = params

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, store: { companyId } },
    include: {
      store: { select: { id: true, name: true } },
      supplier: {
        select: {
          id: true, name: true, phone: true, email: true,
          cascoReturnMode: true, cascoWeightKg: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true, model: true, amperage: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
      items: {
        select: {
          id: true, serialNumber: true, batchNumber: true, status: true,
          costPrice: true, entryDate: true, productId: true,
          product: {
            select: {
              id: true, model: true, amperage: true,
              brand: { select: { name: true } },
            },
          },
        },
        orderBy: { entryDate: "asc" },
      },
      usedBatteries: {
        where: { status: "SENT_TO_SUPPLIER" },
        select: { quantity: true, weightKg: true, sentAt: true },
      },
    },
  })

  if (!po) return NextResponse.json({ error: "Ordem não encontrada" }, { status: 404 })

  const cascosSent = po.usedBatteries.reduce((acc, ub) => acc + ub.quantity, 0)
  const cascoWeightSent = po.usedBatteries.reduce((acc, ub) => acc + (ub.weightKg ?? 0), 0)

  // Group stock items by product for display
  const itemsByProduct = new Map<string, { product: any; costPrice: number; units: any[] }>()
  for (const item of po.items) {
    const key = `${item.productId}-${item.costPrice}`
    if (!itemsByProduct.has(key)) {
      itemsByProduct.set(key, { product: item.product, costPrice: item.costPrice, units: [] })
    }
    itemsByProduct.get(key)!.units.push({
      id: item.id,
      serialNumber: item.serialNumber,
      batchNumber: item.batchNumber,
      status: item.status,
    })
  }

  return NextResponse.json({
    ...po,
    groupedItems: Array.from(itemsByProduct.values()),
    cascosSent,
    cascoWeightSent,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = params
  const body = await req.json()

  const po = await prisma.purchaseOrder.findFirst({ where: { id, store: { companyId } } })
  if (!po) return NextResponse.json({ error: "Ordem não encontrada" }, { status: 404 })

  const { status, invoiceNumber, notes, deliveredAt } = body

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(invoiceNumber !== undefined && { invoiceNumber: invoiceNumber?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(deliveredAt !== undefined && { deliveredAt: deliveredAt ? new Date(deliveredAt) : null }),
    },
  })

  return NextResponse.json(updated)
}
