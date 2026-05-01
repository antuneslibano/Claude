import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("q") ?? ""
  const vehicleType = searchParams.get("tipo") ?? ""
  const brandId = searchParams.get("marca") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const where = {
    companyId,
    ...(vehicleType && { vehicleType }),
    ...(brandId && { brandId }),
    ...(search && {
      OR: [
        { model: { contains: search } },
        { internalCode: { contains: search } },
        { barcode: { contains: search } },
        { brand: { name: { contains: search } } },
      ],
    }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: true,
        _count: { select: { stockItems: { where: { status: "AVAILABLE" } } } },
      },
      orderBy: [{ brand: { name: "asc" } }, { model: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ products, total, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  // Valida se a marca pertence à empresa
  const brand = await prisma.brand.findFirst({
    where: { id: body.brandId, companyId },
  })
  if (!brand) return NextResponse.json({ error: "Marca inválida" }, { status: 400 })

  // Verifica código interno duplicado
  if (body.internalCode) {
    const existing = await prisma.product.findFirst({
      where: { companyId, internalCode: body.internalCode },
    })
    if (existing) return NextResponse.json({ error: "Código interno já cadastrado" }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      companyId,
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
    },
    include: { brand: true },
  })

  return NextResponse.json(product, { status: 201 })
}
