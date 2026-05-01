import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const brands = await prisma.brand.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(brands)
}
