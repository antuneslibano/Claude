import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = (session.user as any).companyId

  const warranty = await prisma.warranty.findFirst({
    where: { id: params.id, sale: { store: { companyId } } },
    include: {
      customer: { select: { id: true, name: true, phone: true, whatsapp: true, cpfCnpj: true } },
      customerVehicle: { select: { plate: true, year: true } },
      sale: {
        select: {
          id: true,
          createdAt: true,
          store: { select: { name: true } },
          seller: { select: { name: true } },
        },
      },
      saleItem: {
        include: { product: { include: { brand: { select: { name: true } } } } },
      },
      stockItem: { select: { serialNumber: true, batchNumber: true, costPrice: true } },
    },
  })

  if (!warranty) return NextResponse.json({ error: "Garantia não encontrada" }, { status: 404 })

  return NextResponse.json(warranty)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { action, problemReport, technicalReport, resolution, notes } = body

  const warranty = await prisma.warranty.findFirst({
    where: { id: params.id, sale: { store: { companyId } } },
    include: { sale: { select: { storeId: true } }, saleItem: true },
  })

  if (!warranty) return NextResponse.json({ error: "Garantia não encontrada" }, { status: 404 })

  // ACIONAR: cliente reporta problema (ACTIVE → CLAIMED)
  if (action === "claim") {
    if (warranty.status !== "ACTIVE") {
      return NextResponse.json({ error: "Somente garantias ativas podem ser acionadas" }, { status: 422 })
    }
    if (!problemReport?.trim()) {
      return NextResponse.json({ error: "Descrição do problema é obrigatória" }, { status: 400 })
    }
    const updated = await prisma.warranty.update({
      where: { id: params.id },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
        problemReport: problemReport.trim(),
        notes: notes?.trim() || warranty.notes,
      },
    })
    return NextResponse.json(updated)
  }

  // APROVAR: gerente aprova → item volta para WARRANTY, cria movimentação
  if (action === "approve") {
    if (warranty.status !== "CLAIMED") {
      return NextResponse.json({ error: "Somente garantias acionadas podem ser aprovadas" }, { status: 422 })
    }
    await prisma.$transaction(async (tx) => {
      await tx.warranty.update({
        where: { id: params.id },
        data: {
          status: "REPLACED",
          approved: true,
          technicalReport: technicalReport?.trim() || null,
          resolution: resolution?.trim() || null,
          notes: notes?.trim() || warranty.notes,
        },
      })
      await tx.stockItem.update({
        where: { id: warranty.stockItemId },
        data: { status: "WARRANTY" },
      })
      await tx.stockMovement.create({
        data: {
          storeId: warranty.sale.storeId,
          stockItemId: warranty.stockItemId,
          userId,
          type: "WARRANTY",
          reason: `Garantia aprovada — ${resolution?.trim() || "substituição"}`,
          warrantyId: params.id,
        },
      })
    })
    return NextResponse.json({ ok: true })
  }

  // REJEITAR: gerente rejeita → status REJECTED
  if (action === "reject") {
    if (warranty.status !== "CLAIMED") {
      return NextResponse.json({ error: "Somente garantias acionadas podem ser rejeitadas" }, { status: 422 })
    }
    const updated = await prisma.warranty.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        approved: false,
        technicalReport: technicalReport?.trim() || null,
        resolution: resolution?.trim() || null,
        notes: notes?.trim() || warranty.notes,
      },
    })
    return NextResponse.json(updated)
  }

  // EXPIRAR manualmente (administrativo)
  if (action === "expire") {
    if (!["ACTIVE", "CLAIMED"].includes(warranty.status)) {
      return NextResponse.json({ error: "Ação inválida para o status atual" }, { status: 422 })
    }
    const updated = await prisma.warranty.update({
      where: { id: params.id },
      data: { status: "EXPIRED" },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}
