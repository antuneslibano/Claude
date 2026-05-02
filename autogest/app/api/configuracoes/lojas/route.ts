import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const stores = await prisma.store.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      cnpj: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      active: true,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(stores)
}

export async function POST(req: NextRequest) {
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

  const { name, cnpj, phone, address, city, state } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome da loja é obrigatório" }, { status: 400 })
  }

  // Verificar limite do plano (conta apenas lojas ativas)
  const [company, activeStoreCount] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { maxStores: true } }),
    prisma.store.count({ where: { companyId, active: true } }),
  ])

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  if (activeStoreCount >= company.maxStores) {
    return NextResponse.json(
      { error: "Limite de lojas atingido para o seu plano" },
      { status: 403 }
    )
  }

  const store = await prisma.store.create({
    data: {
      companyId,
      name: name.trim(),
      cnpj: cnpj?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
    },
  })

  return NextResponse.json(store, { status: 201 })
}
