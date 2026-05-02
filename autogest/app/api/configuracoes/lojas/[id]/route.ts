import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const companyId = (session.user as any).companyId
  const { id } = params

  // Confirmar que a loja pertence à empresa
  const existing = await prisma.store.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { name, cnpj, phone, address, city, state, active } = body

  const updated = await prisma.store.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(cnpj !== undefined && { cnpj: cnpj?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(state !== undefined && { state: state?.trim() || null }),
      ...(active !== undefined && { active: Boolean(active) }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const companyId = (session.user as any).companyId
  const { id } = params

  // Confirmar que a loja pertence à empresa
  const existing = await prisma.store.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })

  // Desativação lógica — não deleta fisicamente
  const updated = await prisma.store.update({
    where: { id },
    data: { active: false },
  })

  return NextResponse.json(updated)
}
