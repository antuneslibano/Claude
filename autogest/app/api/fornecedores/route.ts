import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const active = searchParams.get("active")

  const suppliers = await prisma.supplier.findMany({
    where: {
      companyId,
      ...(active !== null && { active: active === "true" }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { cnpj: { contains: search } },
          { contactName: { contains: search } },
        ],
      }),
    },
    include: {
      _count: { select: { purchaseOrders: true, stockItems: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, cnpj, contactName, phone, email, address, paymentTerms, avgDeliveryDays, notes, cascoReturnMode, cascoWeightKg } = body

  if (!name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const validModes = ["NONE", "UNIT", "WEIGHT"]
  const mode = cascoReturnMode && validModes.includes(cascoReturnMode) ? cascoReturnMode : "NONE"

  const supplier = await prisma.supplier.create({
    data: {
      companyId,
      name: name.trim(),
      cnpj: cnpj?.trim() || null,
      contactName: contactName?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      paymentTerms: paymentTerms?.trim() || null,
      avgDeliveryDays: avgDeliveryDays ? parseInt(avgDeliveryDays) : null,
      notes: notes?.trim() || null,
      cascoReturnMode: mode,
      cascoWeightKg: cascoWeightKg ? parseFloat(cascoWeightKg) : null,
    },
  })

  return NextResponse.json(supplier, { status: 201 })
}
