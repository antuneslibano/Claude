import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.upsert({
    where: { cnpj: "00.000.000/0001-00" },
    update: {},
    create: {
      name: "Minha Empresa",
      cnpj: "00.000.000/0001-00",
    },
  })

  const store = await prisma.store.upsert({
    where: { id: "store-principal" },
    update: {},
    create: {
      id: "store-principal",
      companyId: company.id,
      name: "Loja Principal",
    },
  })

  const hash = await bcrypt.hash("admin123", 10)

  const user = await prisma.user.upsert({
    where: { email: "admin@autogest.com" },
    update: {},
    create: {
      companyId: company.id,
      name: "Administrador",
      email: "admin@autogest.com",
      password: hash,
      role: "ADMIN",
    },
  })

  await prisma.userStoreAccess.upsert({
    where: { userId_storeId: { userId: user.id, storeId: store.id } },
    update: {},
    create: { userId: user.id, storeId: store.id },
  })

  console.log("✔ Empresa:", company.name)
  console.log("✔ Loja:", store.name)
  console.log("✔ Usuário admin criado:", user.email)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
