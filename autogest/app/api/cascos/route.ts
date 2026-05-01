import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const where: any = {
    store: { companyId },
    ...(storeId && { storeId }),
    ...(status && { status }),
  }

  const [total, items] = await Promise.all([
    prisma.usedBattery.count({ where }),
    prisma.usedBattery.findMany({
      where,
      include: {
        store: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        stockItem: {
          include: { product: { include: { brand: { select: { name: true } } } } },
        },
      },
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, page, limit, items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { storeId, customerId, saleId, discountValue, notes, description } = body

  if (!storeId) return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 })

  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  const item = await prisma.usedBattery.create({
    data: {
      storeId,
      customerId: customerId || null,
      saleId: saleId || null,
      discountValue: discountValue ? parseFloat(discountValue) : null,
      notes: [description, notes].filter(Boolean).join(" — ") || null,
      status: "STORED",
    },
  })

  return NextResponse.json(item, { status: 201 })
}
