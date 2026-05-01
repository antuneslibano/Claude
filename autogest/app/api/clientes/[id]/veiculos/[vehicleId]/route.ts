import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; vehicleId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const customer = await prisma.customer.findFirst({ where: { id: params.id, companyId } })
  if (!customer) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  await prisma.customerVehicle.delete({ where: { id: params.vehicleId } })
  return NextResponse.json({ message: "Veículo removido" })
}
