import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const tx = await prisma.financialTransaction.findFirst({
    where: { id: params.id, store: { companyId } },
  })
  if (!tx) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })

  // Não permite editar lançamentos automáticos (originados de vendas)
  if (tx.saleId && (body.amount !== undefined || body.type !== undefined)) {
    return NextResponse.json({ error: "Lançamentos de vendas não podem ser editados" }, { status: 422 })
  }

  const updated = await prisma.financialTransaction.update({
    where: { id: params.id },
    data: {
      categoryId: body.categoryId !== undefined ? (body.categoryId || null) : tx.categoryId,
      description: body.description?.trim() ?? tx.description,
      amount: body.amount !== undefined ? parseFloat(body.amount) : tx.amount,
      date: body.date ? new Date(body.date) : tx.date,
      dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : tx.dueDate,
      paidAt: body.paidAt !== undefined ? (body.paidAt ? new Date(body.paidAt) : null) : tx.paidAt,
      notes: body.notes !== undefined ? (body.notes?.trim() || null) : tx.notes,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const tx = await prisma.financialTransaction.findFirst({
    where: { id: params.id, store: { companyId } },
  })
  if (!tx) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 })
  if (tx.saleId) return NextResponse.json({ error: "Lançamentos de vendas não podem ser excluídos" }, { status: 422 })

  await prisma.financialTransaction.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
