import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const [company, usedStores] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        cnpj: true,
        cascoReturnMode: true,
        maxStores: true,
      },
    }),
    prisma.store.count({ where: { companyId, active: true } }),
  ])

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ ...company, usedStores })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const companyId = (session.user as any).companyId

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { cascoReturnMode, name, email, phone, address, cnpj } = body

  // Validar cascoReturnMode se fornecido
  if (cascoReturnMode !== undefined && !["UNIT", "WEIGHT"].includes(cascoReturnMode)) {
    return NextResponse.json(
      { error: "cascoReturnMode deve ser UNIT ou WEIGHT" },
      { status: 400 }
    )
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(cnpj !== undefined && { cnpj: cnpj?.trim() || null }),
      ...(cascoReturnMode !== undefined && { cascoReturnMode }),
    },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      cnpj: true,
      cascoReturnMode: true,
      maxStores: true,
    },
  })

  return NextResponse.json(updated)
}
