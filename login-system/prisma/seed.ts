import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash("senha123", 10)

  await prisma.user.upsert({
    where: { email: "teste@saas.com" },
    update: {},
    create: {
      name: "Usuário Teste",
      email: "teste@saas.com",
      password: hash,
    },
  })

  console.log("✅ Seed concluído — usuário: teste@saas.com / senha: senha123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
