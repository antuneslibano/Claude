import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: { makeId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const models = await prisma.vehicleModel.findMany({
    where: { makeId: params.makeId },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(models)
}
