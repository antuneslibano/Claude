import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function getCompanyId() {
  const session = await auth()
  if (!session) return null
  return (session.user as any).companyId as string
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const companyId = await getCompanyId()
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, companyId },
    include: {
      vehicles: {
        include: { make: true, model: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { sales: true, warranties: true } },
    },
  })

  if (!customer) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const companyId = await getCompanyId()
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const customer = await prisma.customer.findFirst({ where: { id: params.id, companyId } })
  if (!customer) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.customer.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      cpfCnpj: body.cpfCnpj?.trim() || null,
      phone: body.phone?.trim() || null,
      whatsapp: body.whatsapp?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      type: body.type,
      notes: body.notes?.trim() || null,
      active: body.active ?? true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const companyId = await getCompanyId()
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const customer = await prisma.customer.findFirst({ where: { id: params.id, companyId } })
  if (!customer) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Soft delete se tiver histórico
  const salesCount = await prisma.sale.count({ where: { customerId: params.id } })
  if (salesCount > 0) {
    await prisma.customer.update({ where: { id: params.id }, data: { active: false } })
    return NextResponse.json({ message: "Cliente inativado (possui histórico de compras)" })
  }

  await prisma.customer.delete({ where: { id: params.id } })
  return NextResponse.json({ message: "Cliente excluído" })
}
