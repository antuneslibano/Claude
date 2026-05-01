import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const VALID_STATUS = ["STORED", "SENT_TO_SUPPLIER", "DISCARDED", "SOLD_AS_SCRAP"]

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { status, notes, discountValue } = body

  const item = await prisma.usedBattery.findFirst({
    where: { id: params.id, store: { companyId } },
  })
  if (!item) return NextResponse.json({ error: "Casco não encontrado" }, { status: 404 })

  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  }

  const updated = await prisma.usedBattery.update({
    where: { id: params.id },
    data: {
      status: status ?? item.status,
      notes: notes !== undefined ? (notes?.trim() || null) : item.notes,
      discountValue: discountValue !== undefined ? (discountValue ? parseFloat(discountValue) : null) : item.discountValue,
    },
  })

  return NextResponse.json(updated)
}
