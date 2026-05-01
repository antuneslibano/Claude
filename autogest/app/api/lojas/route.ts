import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const stores = await prisma.store.findMany({
    where: { companyId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(stores)
}
