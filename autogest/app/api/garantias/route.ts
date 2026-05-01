import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? undefined
  const storeId = searchParams.get("storeId") ?? undefined
  const search = searchParams.get("search") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const where: any = {
    sale: { store: { companyId }, ...(storeId && { storeId }) },
    ...(status ? { status } : { status: { not: "EXPIRED" } }),
    ...(search && {
      OR: [
        { customer: { name: { contains: search } } },
        { stockItem: { serialNumber: { contains: search } } },
      ],
    }),
  }

  const [total, warranties] = await Promise.all([
    prisma.warranty.count({ where }),
    prisma.warranty.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true, whatsapp: true } },
        sale: { select: { id: true, store: { select: { name: true } } } },
        saleItem: {
          include: { product: { include: { brand: { select: { name: true } } } } },
        },
        stockItem: { select: { serialNumber: true, batchNumber: true } },
        customerVehicle: { select: { plate: true, year: true } },
      },
      orderBy: [{ status: "asc" }, { endDate: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, page, limit, warranties })
}
