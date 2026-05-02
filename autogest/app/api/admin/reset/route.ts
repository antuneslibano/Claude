import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as any).role
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const companyId = (session.user as any).companyId

  // Coletar IDs de todas as lojas da empresa para uso nos filtros relacionais
  const companyStores = await prisma.store.findMany({
    where: { companyId },
    select: { id: true },
  })
  const storeIds = companyStores.map((s) => s.id)

  // Coletar IDs de todos os usuários da empresa para filtrar AuditLog
  const companyUsers = await prisma.user.findMany({
    where: { companyId },
    select: { id: true },
  })
  const userIds = companyUsers.map((u) => u.id)

  // Coletar IDs de clientes da empresa para filtrar Installment
  const companyCustomers = await prisma.customer.findMany({
    where: { companyId },
    select: { id: true },
  })
  const customerIds = companyCustomers.map((c) => c.id)

  // Deleção em ordem topológica para respeitar foreign keys
  // 1. AuditLog (depende de User)
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })

  // 2. StockMovement (depende de StockItem via storeId)
  await prisma.stockMovement.deleteMany({ where: { storeId: { in: storeIds } } })

  // 3. Installment (depende de Sale e Customer)
  await prisma.installment.deleteMany({ where: { customerId: { in: customerIds } } })

  // 4. SalePayment (depende de Sale)
  //    Buscar saleIds das lojas da empresa
  const companySales = await prisma.sale.findMany({
    where: { storeId: { in: storeIds } },
    select: { id: true },
  })
  const saleIds = companySales.map((s) => s.id)
  await prisma.salePayment.deleteMany({ where: { saleId: { in: saleIds } } })

  // 5. UsedBattery (depende de Sale, StockItem, Warranty)
  await prisma.usedBattery.deleteMany({ where: { storeId: { in: storeIds } } })

  // 6. Warranty (depende de Sale, SaleItem, StockItem, Customer)
  await prisma.warranty.deleteMany({ where: { saleId: { in: saleIds } } })

  // 7. SaleItem (depende de Sale, StockItem, Product)
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } })

  // 8. Sale
  await prisma.sale.deleteMany({ where: { storeId: { in: storeIds } } })

  // 9. PurchaseOrder (depende de StockItem via purchaseOrderId — StockItem já sem FK aqui)
  await prisma.purchaseOrder.deleteMany({ where: { storeId: { in: storeIds } } })

  // 10. StockItem
  await prisma.stockItem.deleteMany({ where: { storeId: { in: storeIds } } })

  // 11. FinancialTransaction
  await prisma.financialTransaction.deleteMany({ where: { storeId: { in: storeIds } } })

  // 12. FinancialCategory (nível de empresa)
  await prisma.financialCategory.deleteMany({ where: { companyId } })

  // 13. CustomerVehicle (depende de Customer)
  await prisma.customerVehicle.deleteMany({ where: { customerId: { in: customerIds } } })

  // 14. Customer
  await prisma.customer.deleteMany({ where: { companyId } })

  return NextResponse.json({
    success: true,
    message: "Sistema restaurado com sucesso",
  })
}
