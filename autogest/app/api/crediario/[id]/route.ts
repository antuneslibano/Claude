import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = params
  const body = await req.json()
  const { action, paidAmount, paidAt } = body

  const installment = await prisma.installment.findFirst({
    where: { id, sale: { store: { companyId } } },
  })

  if (!installment) return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 })

  if (action === "pay") {
    if (installment.status === "PAID") {
      return NextResponse.json({ error: "Parcela já está paga" }, { status: 422 })
    }
    if (installment.status === "CANCELLED") {
      return NextResponse.json({ error: "Parcela cancelada não pode ser paga" }, { status: 422 })
    }

    const amount = paidAmount ? parseFloat(paidAmount) : installment.amount
    const date = paidAt ? new Date(paidAt) : new Date()

    const updated = await prisma.installment.update({
      where: { id },
      data: {
        status: "PAID",
        paidAmount: amount,
        paidAt: date,
      },
    })

    return NextResponse.json(updated)
  }

  if (action === "cancel") {
    if (installment.status === "PAID") {
      return NextResponse.json({ error: "Parcela paga não pode ser cancelada" }, { status: 422 })
    }
    if (installment.status === "CANCELLED") {
      return NextResponse.json({ error: "Parcela já está cancelada" }, { status: 422 })
    }

    const updated = await prisma.installment.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Ação inválida. Use 'pay' ou 'cancel'" }, { status: 400 })
}
