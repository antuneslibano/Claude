import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ClienteForm from "../../cliente-form"

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const session = await auth()
  const companyId = (session?.user as any)?.companyId

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, companyId },
  })

  if (!customer) notFound()

  return (
    <ClienteForm
      initialData={{
        id: customer.id,
        name: customer.name,
        cpfCnpj: customer.cpfCnpj,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        type: customer.type,
        notes: customer.notes,
        active: customer.active,
      }}
    />
  )
}
