import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  // Get all POs with casco obligations
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      store: { companyId },
      cascoMode: { not: null },
      status: { not: "CANCELLED" },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      usedBatteries: {
        where: { status: "SENT_TO_SUPPLIER" },
        select: { quantity: true, weightKg: true },
      },
    },
    orderBy: { purchaseDate: "desc" },
  })

  // Group by supplier
  const bySupplier = new Map<string, {
    supplierId: string
    supplierName: string
    cascoMode: string
    orders: any[]
    totalRequired: number
    totalSent: number
  }>()

  for (const po of orders) {
    if (!po.cascoMode || po.cascoMode === "NONE") continue

    const suppId = po.supplier.id
    if (!bySupplier.has(suppId)) {
      bySupplier.set(suppId, {
        supplierId: suppId,
        supplierName: po.supplier.name,
        cascoMode: po.cascoMode,
        orders: [],
        totalRequired: 0,
        totalSent: 0,
      })
    }

    const entry = bySupplier.get(suppId)!

    const required = po.cascoMode === "WEIGHT"
      ? (po.cascoWeightKg ?? 0)
      : (po.cascosRequired ?? 0)

    const sent = po.cascoMode === "WEIGHT"
      ? po.usedBatteries.reduce((acc, ub) => acc + (ub.weightKg ?? 0), 0)
      : po.usedBatteries.reduce((acc, ub) => acc + ub.quantity, 0)

    entry.orders.push({
      id: po.id,
      purchaseDate: po.purchaseDate,
      status: po.status,
      required,
      sent,
      pending: Math.max(0, required - sent),
      unit: po.cascoMode === "WEIGHT" ? "kg" : "un",
    })

    entry.totalRequired += required
    entry.totalSent += sent
  }

  const result = Array.from(bySupplier.values()).map((s) => ({
    ...s,
    totalPending: Math.max(0, s.totalRequired - s.totalSent),
  }))

  return NextResponse.json(result)
}
