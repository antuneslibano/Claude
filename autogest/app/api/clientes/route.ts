import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("q") ?? ""
  const type = searchParams.get("tipo") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = 20

  const where = {
    companyId,
    active: true,
    ...(type && { type }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { cpfCnpj: { contains: search } },
        { phone: { contains: search } },
        { whatsapp: { contains: search } },
        { email: { contains: search } },
      ],
    }),
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { vehicles: true, sales: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  return NextResponse.json({ customers, total, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  }

  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: body.name.trim(),
      cpfCnpj: body.cpfCnpj?.trim() || null,
      phone: body.phone?.trim() || null,
      whatsapp: body.whatsapp?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      type: body.type ?? "INDIVIDUAL",
      notes: body.notes?.trim() || null,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}
