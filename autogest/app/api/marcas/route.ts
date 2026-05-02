import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const brands = await prisma.brand.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(brands)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const name = body?.name?.trim()
  if (!name) return NextResponse.json({ error: "Nome da marca é obrigatório" }, { status: 400 })

  try {
    const brand = await prisma.brand.create({
      data: { companyId, name },
    })
    return NextResponse.json(brand, { status: 201 })
  } catch (err: any) {
    // Prisma unique constraint violation: P2002
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Marca já existe" }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro interno ao criar marca" }, { status: 500 })
  }
}
