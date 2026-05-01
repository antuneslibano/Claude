import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined
  const type = searchParams.get("type") ?? undefined
  const categoryId = searchParams.get("categoryId") ?? undefined
  const paid = searchParams.get("paid")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "30")

  const where: any = {
    store: { companyId },
    ...(storeId && { storeId }),
    ...(type && { type }),
    ...(categoryId && { categoryId }),
    ...(paid === "true" && { paidAt: { not: null } }),
    ...(paid === "false" && { paidAt: null }),
    ...(from && to && { date: { gte: new Date(from), lte: new Date(to + "T23:59:59") } }),
  }

  const [total, transactions] = await Promise.all([
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.findMany({
      where,
      include: {
        category: { select: { name: true, type: true } },
        store: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, page, limit, transactions })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { storeId, categoryId, type, description, amount, date, dueDate, paidAt, notes } = body

  if (!storeId || !type || !description?.trim() || !amount || !date) {
    return NextResponse.json({ error: "storeId, type, description, amount e date são obrigatórios" }, { status: 400 })
  }
  if (!["INCOME", "EXPENSE"].includes(type)) {
    return NextResponse.json({ error: "type deve ser INCOME ou EXPENSE" }, { status: 400 })
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  const transaction = await prisma.financialTransaction.create({
    data: {
      storeId,
      categoryId: categoryId || null,
      type,
      description: description.trim(),
      amount: parseFloat(amount),
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      paidAt: paidAt ? new Date(paidAt) : null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(transaction, { status: 201 })
}
