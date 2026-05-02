import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, companyId },
    include: {
      purchaseOrders: {
        include: { store: { select: { name: true } } },
        orderBy: { purchaseDate: "desc" },
        take: 10,
      },
      _count: { select: { purchaseOrders: true, stockItems: true } },
    },
  })

  if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  return NextResponse.json(supplier)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const supplier = await prisma.supplier.findFirst({ where: { id: params.id, companyId } })
  if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  const validModes = ["NONE", "UNIT", "WEIGHT"]
  const updated = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim() ?? supplier.name,
      cnpj: body.cnpj?.trim() || null,
      contactName: body.contactName?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      paymentTerms: body.paymentTerms?.trim() || null,
      avgDeliveryDays: body.avgDeliveryDays != null ? parseInt(body.avgDeliveryDays) : null,
      notes: body.notes?.trim() || null,
      active: body.active ?? supplier.active,
      ...(body.cascoReturnMode !== undefined && validModes.includes(body.cascoReturnMode) && { cascoReturnMode: body.cascoReturnMode }),
      cascoWeightKg: body.cascoWeightKg != null ? parseFloat(body.cascoWeightKg) : null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const supplier = await prisma.supplier.findFirst({ where: { id: params.id, companyId } })
  if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  const hasOrders = await prisma.purchaseOrder.count({ where: { supplierId: params.id } })
  if (hasOrders > 0) {
    return NextResponse.json({ error: "Não é possível excluir: fornecedor possui ordens de compra" }, { status: 422 })
  }

  await prisma.supplier.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
