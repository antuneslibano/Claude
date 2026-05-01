import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId") ?? undefined
  const supplierId = searchParams.get("supplierId") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const where: any = {
    store: { companyId },
    ...(storeId && { storeId }),
    ...(supplierId && { supplierId }),
  }

  const [total, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        store: { select: { name: true } },
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { purchaseDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, page, limit, orders })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { storeId, supplierId, invoiceNumber, purchaseDate, items, notes } = body

  if (!storeId || !supplierId || !purchaseDate || !items?.length) {
    return NextResponse.json({ error: "storeId, supplierId, purchaseDate e items são obrigatórios" }, { status: 400 })
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId } })
  if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })

  const totalCost = items.reduce((acc: number, i: any) => acc + i.costPrice * i.quantity, 0)

  const order = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        storeId,
        supplierId,
        invoiceNumber: invoiceNumber?.trim() || null,
        purchaseDate: new Date(purchaseDate),
        totalCost,
        notes: notes?.trim() || null,
      },
    })

    // Criar itens de estoque (uma unidade por registro)
    for (const item of items) {
      const { productId, quantity, costPrice, batchNumber, serialNumbers } = item

      const stockItemData = Array.from({ length: quantity }, (_: unknown, i: number) => ({
        storeId,
        productId,
        supplierId,
        purchaseOrderId: po.id,
        costPrice: parseFloat(costPrice),
        batchNumber: batchNumber?.trim() || null,
        serialNumber: serialNumbers?.[i]?.trim() || null,
        entryDate: new Date(purchaseDate),
        status: "AVAILABLE",
      }))

      await tx.stockItem.createMany({ data: stockItemData })
    }

    return po
  })

  return NextResponse.json({ id: order.id }, { status: 201 })
}
