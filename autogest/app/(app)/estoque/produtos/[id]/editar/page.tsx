import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ProdutoForm from "../../produto-form"

export default async function EditarProdutoPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const companyId = (session?.user as any)?.companyId

  const product = await prisma.product.findFirst({
    where: { id: params.id, companyId },
  })

  if (!product) notFound()

  return (
    <ProdutoForm
      initialData={{
        id: product.id,
        brandId: product.brandId,
        internalCode: product.internalCode,
        barcode: product.barcode,
        model: product.model,
        amperage: product.amperage,
        coldCrankAmps: product.coldCrankAmps,
        voltage: product.voltage,
        vehicleType: product.vehicleType,
        description: product.description,
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        wholesalePrice: product.wholesalePrice,
        warrantyMonths: product.warrantyMonths,
        weight: product.weight,
        active: product.active,
      }}
    />
  )
}
