import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? undefined
  const customerId = searchParams.get("customerId") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "30")

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Expirar automaticamente parcelas vencidas não pagas
  await prisma.installment.updateMany({
    where: {
      sale: { store: { companyId } },
      status: "PENDING",
      dueDate: { lt: todayStart },
    },
    data: { status: "OVERDUE" },
  })

  const where: any = {
    sale: { store: { companyId } },
    ...(status && { status }),
    ...(customerId && { customerId }),
  }

  const [total, installments] = await Promise.all([
    prisma.installment.count({ where }),
    prisma.installment.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true, whatsapp: true } },
        sale: { select: { id: true, store: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  // Totais por status
  const summary = await prisma.installment.groupBy({
    by: ["status"],
    where: { sale: { store: { companyId } } },
    _count: true,
    _sum: { amount: true },
  })

  return NextResponse.json({ total, page, limit, installments, summary })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { saleId, customerId, installments: items } = body

  if (!saleId || !customerId || !items?.length) {
    return NextResponse.json({ error: "saleId, customerId e parcelas são obrigatórios" }, { status: 400 })
  }

  const sale = await prisma.sale.findFirst({ where: { id: saleId, store: { companyId } } })
  if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })

  const existing = await prisma.installment.count({ where: { saleId } })
  if (existing > 0) {
    return NextResponse.json({ error: "Esta venda já possui parcelas cadastradas" }, { status: 422 })
  }

  const created = await prisma.installment.createMany({
    data: items.map((item: any, i: number) => ({
      saleId,
      customerId,
      number: i + 1,
      dueDate: new Date(item.dueDate),
      amount: parseFloat(item.amount),
      status: "PENDING",
      notes: item.notes?.trim() || null,
    })),
  })

  return NextResponse.json({ count: created.count }, { status: 201 })
}
