import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import FornecedorForm from "../../fornecedor-form"

export default async function EditarFornecedorPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const companyId = (session?.user as any)?.companyId

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, companyId },
  })

  if (!supplier) notFound()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Editar Fornecedor</h1>
        <p className="text-sm text-gray-500 mt-0.5">{supplier.name}</p>
      </div>
      <FornecedorForm
        supplierId={supplier.id}
        initialData={{
          name: supplier.name,
          cnpj: supplier.cnpj ?? "",
          contactName: supplier.contactName ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          paymentTerms: supplier.paymentTerms ?? "",
          avgDeliveryDays: supplier.avgDeliveryDays != null ? String(supplier.avgDeliveryDays) : "",
          notes: supplier.notes ?? "",
        }}
      />
    </div>
  )
}
