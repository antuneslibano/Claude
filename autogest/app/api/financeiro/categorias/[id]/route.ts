import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const category = await prisma.financialCategory.findFirst({ where: { id: params.id, companyId } })
  if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })

  const updated = await prisma.financialCategory.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim() ?? category.name,
      active: body.active ?? category.active,
    },
  })

  return NextResponse.json(updated)
}
