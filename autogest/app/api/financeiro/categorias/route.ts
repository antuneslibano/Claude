import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const categories = await prisma.financialCategory.findMany({
    where: { companyId, active: true },
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, type } = body

  if (!name?.trim() || !["INCOME", "EXPENSE"].includes(type)) {
    return NextResponse.json({ error: "name e type (INCOME|EXPENSE) são obrigatórios" }, { status: 400 })
  }

  const existing = await prisma.financialCategory.findFirst({
    where: { companyId, name: name.trim(), type },
  })
  if (existing) {
    if (!existing.active) {
      const reactivated = await prisma.financialCategory.update({ where: { id: existing.id }, data: { active: true } })
      return NextResponse.json(reactivated, { status: 200 })
    }
    return NextResponse.json({ error: "Categoria já existe" }, { status: 409 })
  }

  const category = await prisma.financialCategory.create({
    data: { companyId, name: name.trim(), type },
  })

  return NextResponse.json(category, { status: 201 })
}
