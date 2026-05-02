import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  // Buscar todas as lojas da empresa
  const stores = await prisma.store.findMany({
    where: { companyId },
    select: { id: true },
  })
  const storeIds = stores.map((s) => s.id)

  // Buscar PurchaseOrders relevantes (cascoMode preenchido e diferente de NONE)
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      storeId: { in: storeIds },
      cascoMode: { not: null },
      NOT: { cascoMode: "NONE" },
    },
    select: {
      supplierId: true,
      cascoMode: true,
      cascosRequired: true,
      cascoWeightKg: true,
      supplier: { select: { name: true } },
    },
  })

  // Agrupar por supplierId para calcular totais requeridos
  const requiredBySupplier = new Map<
    string,
    {
      supplierId: string
      supplierName: string
      cascoMode: string
      totalCascosRequired: number
      totalWeightRequired: number
    }
  >()

  for (const po of purchaseOrders) {
    const key = po.supplierId
    if (!requiredBySupplier.has(key)) {
      requiredBySupplier.set(key, {
        supplierId: po.supplierId,
        supplierName: po.supplier.name,
        cascoMode: po.cascoMode!,
        totalCascosRequired: 0,
        totalWeightRequired: 0,
      })
    }

    const entry = requiredBySupplier.get(key)!

    if (po.cascoMode === "UNIT") {
      entry.totalCascosRequired += po.cascosRequired ?? 0
    } else if (po.cascoMode === "WEIGHT") {
      entry.totalWeightRequired += po.cascoWeightKg ?? 0
    }
  }

  if (requiredBySupplier.size === 0) {
    return NextResponse.json([])
  }

  const supplierIds = Array.from(requiredBySupplier.keys())

  // Buscar cascos já enviados agrupados por supplierId
  const sentBatteries = await prisma.usedBattery.findMany({
    where: {
      storeId: { in: storeIds },
      supplierId: { in: supplierIds },
      status: "SENT_TO_SUPPLIER",
    },
    select: {
      supplierId: true,
      quantity: true,
      weightKg: true,
    },
  })

  // Calcular totais enviados por fornecedor
  const sentBySupplier = new Map<string, { sentUnits: number; sentWeight: number }>()
  for (const ub of sentBatteries) {
    if (!ub.supplierId) continue
    const current = sentBySupplier.get(ub.supplierId) ?? { sentUnits: 0, sentWeight: 0 }
    current.sentUnits += ub.quantity ?? 0
    current.sentWeight += ub.weightKg ?? 0
    sentBySupplier.set(ub.supplierId, current)
  }

  // Montar resposta final
  const result = Array.from(requiredBySupplier.values()).map((entry) => {
    const sent = sentBySupplier.get(entry.supplierId) ?? { sentUnits: 0, sentWeight: 0 }

    const isUnit = entry.cascoMode === "UNIT"
    const required = isUnit ? entry.totalCascosRequired : entry.totalWeightRequired
    const sentAmount = isUnit ? sent.sentUnits : sent.sentWeight
    const pending = Math.max(0, required - sentAmount)

    return {
      supplierId: entry.supplierId,
      supplierName: entry.supplierName,
      cascoMode: entry.cascoMode,
      required,
      sent: sentAmount,
      pending,
      unit: isUnit ? "unidades" : "kg",
    }
  })

  return NextResponse.json(result)
}
