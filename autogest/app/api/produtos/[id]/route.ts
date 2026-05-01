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

  const product = await prisma.product.findFirst({
    where: { id: params.id, companyId },
    include: { brand: true },
  })

  if (!product) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const companyId = await getCompanyId()
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({ where: { id: params.id, companyId } })
  if (!product) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = await req.json()

  // Verifica código interno duplicado (excluindo o próprio produto)
  if (body.internalCode && body.internalCode !== product.internalCode) {
    const existing = await prisma.product.findFirst({
      where: { companyId, internalCode: body.internalCode, NOT: { id: params.id } },
    })
    if (existing) return NextResponse.json({ error: "Código interno já cadastrado" }, { status: 400 })
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      brandId: body.brandId,
      internalCode: body.internalCode || null,
      barcode: body.barcode || null,
      model: body.model,
      amperage: parseFloat(body.amperage),
      coldCrankAmps: body.coldCrankAmps ? parseFloat(body.coldCrankAmps) : null,
      voltage: parseFloat(body.voltage ?? 12),
      vehicleType: body.vehicleType,
      description: body.description || null,
      costPrice: parseFloat(body.costPrice),
      salePrice: parseFloat(body.salePrice),
      wholesalePrice: body.wholesalePrice ? parseFloat(body.wholesalePrice) : null,
      warrantyMonths: parseInt(body.warrantyMonths ?? 12),
      weight: body.weight ? parseFloat(body.weight) : null,
      active: body.active ?? true,
    },
    include: { brand: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const companyId = await getCompanyId()
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findFirst({ where: { id: params.id, companyId } })
  if (!product) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Verifica se tem itens de estoque vinculados
  const stockCount = await prisma.stockItem.count({ where: { productId: params.id } })
  if (stockCount > 0) {
    // Inativa em vez de deletar
    await prisma.product.update({ where: { id: params.id }, data: { active: false } })
    return NextResponse.json({ message: "Produto inativado (possui movimentações)" })
  }

  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ message: "Produto excluído" })
}
