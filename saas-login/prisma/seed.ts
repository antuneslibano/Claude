import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Verificar se o usuário já existe
  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@saas.com' },
  })

  if (existingUser) {
    console.log('Usuário já existe, pulando seed.')
    return
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash('senha123', 12)

  // Criar usuário padrão
  const user = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@saas.com',
      password: hashedPassword,
    },
  })

  console.log(`Usuário criado com sucesso: ${user.email}`)
  console.log('Credenciais de acesso:')
  console.log('  Email: admin@saas.com')
  console.log('  Senha: senha123')
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
