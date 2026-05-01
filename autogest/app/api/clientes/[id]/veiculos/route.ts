import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const customer = await prisma.customer.findFirst({ where: { id: params.id, companyId } })
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

  const body = await req.json()

  const vehicle = await prisma.customerVehicle.create({
    data: {
      customerId: params.id,
      plate: body.plate?.trim().toUpperCase() || null,
      makeId: body.makeId || null,
      modelId: body.modelId || null,
      year: body.year ? parseInt(body.year) : null,
      vehicleType: body.vehicleType || null,
      color: body.color?.trim() || null,
      notes: body.notes?.trim() || null,
    },
    include: { make: true, model: true },
  })

  return NextResponse.json(vehicle, { status: 201 })
}
