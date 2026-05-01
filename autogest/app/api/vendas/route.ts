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

  const where: any = { store: { companyId }, ...(storeId && { storeId }), ...(status && { status }) }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        store: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        seller: { select: { name: true } },
        items: {
          include: { product: { include: { brand: { select: { name: true } } } } },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, page, limit, sales })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const companyId = (session.user as any).companyId as string

  const body = await req.json()
  const { storeId, customerId, customerVehicleId, items, discount = 0, payments, notes } = body

  if (!storeId || !items?.length || !payments?.length) {
    return NextResponse.json({ error: "storeId, items e payments são obrigatórios" }, { status: 400 })
  }

  // Verificar que a loja pertence à empresa
  const store = await prisma.store.findFirst({ where: { id: storeId, companyId } })
  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  // Buscar itens de estoque disponíveis para cada produto solicitado
  const stockItemIds: string[] = []
  const resolvedItems: { stockItem: any; productId: string; unitPrice: number; discount: number; quantity: number }[] = []

  for (const item of items) {
    const { productId, quantity = 1, unitPrice, discount: itemDiscount = 0 } = item

    const availableUnits = await prisma.stockItem.findMany({
      where: { storeId, productId, status: "AVAILABLE" },
      orderBy: { entryDate: "asc" },
      take: quantity,
    })

    if (availableUnits.length < quantity) {
      const product = await prisma.product.findUnique({ where: { id: productId }, include: { brand: true } })
      return NextResponse.json({
        error: `Estoque insuficiente para ${product?.brand?.name} ${product?.model}: solicitado ${quantity}, disponível ${availableUnits.length}`,
      }, { status: 422 })
    }

    for (const unit of availableUnits) {
      stockItemIds.push(unit.id)
      resolvedItems.push({ stockItem: unit, productId, unitPrice, discount: itemDiscount, quantity: 1 })
    }
  }

  // Calcular totais
  const subtotal = resolvedItems.reduce((acc, i) => acc + (i.unitPrice - i.discount), 0)
  const total = subtotal - discount
  const estimatedProfit = resolvedItems.reduce((acc, i) => acc + (i.unitPrice - i.discount - i.stockItem.costPrice), 0) - discount

  const paymentsTotal = payments.reduce((acc: number, p: any) => acc + p.amount, 0)
  if (Math.abs(paymentsTotal - total) > 0.01) {
    return NextResponse.json({ error: `Total dos pagamentos (${paymentsTotal}) difere do total da venda (${total})` }, { status: 422 })
  }

  // Criar venda em transação
  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        storeId,
        customerId: customerId || null,
        customerVehicleId: customerVehicleId || null,
        userId,
        subtotal,
        discount,
        total,
        estimatedProfit,
        notes: notes || null,
        items: {
          create: resolvedItems.map((i) => ({
            stockItemId: i.stockItem.id,
            productId: i.productId,
            quantity: 1,
            unitPrice: i.unitPrice,
            costPrice: i.stockItem.costPrice,
            discount: i.discount,
            total: i.unitPrice - i.discount,
          })),
        },
        payments: {
          create: payments.map((p: any) => ({
            method: p.method,
            amount: p.amount,
            installments: p.installments || null,
            notes: p.notes || null,
          })),
        },
      },
      include: { items: true },
    })

    // Atualizar status dos itens de estoque para SOLD
    await tx.stockItem.updateMany({
      where: { id: { in: stockItemIds } },
      data: { status: "SOLD" },
    })

    // Criar movimentações de estoque
    await tx.stockMovement.createMany({
      data: stockItemIds.map((id) => ({
        storeId,
        stockItemId: id,
        userId,
        type: "SALE",
        reason: `Venda #${createdSale.id.slice(-6).toUpperCase()}`,
        saleId: createdSale.id,
      })),
    })

    // Criar garantias para cada item vendido
    if (customerId) {
      for (const saleItem of createdSale.items) {
        const product = await tx.product.findUnique({ where: { id: saleItem.productId } })
        if (!product) continue
        const startDate = new Date()
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + product.warrantyMonths)

        await tx.warranty.create({
          data: {
            saleId: createdSale.id,
            saleItemId: saleItem.id,
            stockItemId: saleItem.stockItemId,
            customerId,
            customerVehicleId: customerVehicleId || null,
            startDate,
            endDate,
          },
        })
      }
    }

    // Registrar transação financeira
    await tx.financialTransaction.create({
      data: {
        storeId,
        type: "INCOME",
        description: `Venda #${createdSale.id.slice(-6).toUpperCase()}`,
        amount: total,
        date: new Date(),
        paidAt: new Date(),
        saleId: createdSale.id,
      },
    })

    return createdSale
  })

  return NextResponse.json({ id: sale.id }, { status: 201 })
}
