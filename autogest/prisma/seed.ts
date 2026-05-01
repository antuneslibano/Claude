import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// ─── Dados de compatibilidade ─────────────────────────────────────────────────

const vehicles: {
  make: string
  model: string
  type: string
  years: number[]
  min: number
  max: number
  recommended: string
}[] = [
  // FIAT
  { make: "Fiat", model: "Uno", type: "CAR", years: range(2004, 2022), min: 40, max: 45, recommended: "40AH/45AH" },
  { make: "Fiat", model: "Palio", type: "CAR", years: range(1996, 2016), min: 40, max: 45, recommended: "40AH/45AH" },
  { make: "Fiat", model: "Siena", type: "CAR", years: range(1997, 2016), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Fiat", model: "Argo", type: "CAR", years: range(2017, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Fiat", model: "Cronos", type: "CAR", years: range(2018, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Fiat", model: "Strada", type: "CAR", years: range(1998, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Fiat", model: "Toro", type: "CAR", years: range(2016, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Fiat", model: "Mobi", type: "CAR", years: range(2016, 2024), min: 40, max: 45, recommended: "40AH/45AH" },
  { make: "Fiat", model: "Punto", type: "CAR", years: range(2007, 2018), min: 60, max: 60, recommended: "60AH" },
  { make: "Fiat", model: "Bravo", type: "CAR", years: range(2010, 2015), min: 60, max: 60, recommended: "60AH" },
  { make: "Fiat", model: "Pulse", type: "CAR", years: range(2021, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Fiat", model: "Fastback", type: "CAR", years: range(2022, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Fiat", model: "Ducato", type: "VAN", years: range(2000, 2024), min: 90, max: 100, recommended: "90AH/100AH" },

  // VOLKSWAGEN
  { make: "Volkswagen", model: "Gol", type: "CAR", years: range(1994, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Volkswagen", model: "Voyage", type: "CAR", years: range(2009, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Volkswagen", model: "Saveiro", type: "CAR", years: range(1994, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Volkswagen", model: "Polo", type: "CAR", years: range(2018, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Volkswagen", model: "Virtus", type: "CAR", years: range(2018, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Volkswagen", model: "T-Cross", type: "CAR", years: range(2019, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Volkswagen", model: "Nivus", type: "CAR", years: range(2020, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Volkswagen", model: "Amarok", type: "CAR", years: range(2010, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Volkswagen", model: "Fox", type: "CAR", years: range(2003, 2015), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Volkswagen", model: "SpaceFox", type: "CAR", years: range(2006, 2015), min: 60, max: 60, recommended: "60AH" },
  { make: "Volkswagen", model: "Tiguan", type: "CAR", years: range(2008, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Volkswagen", model: "Kombi", type: "VAN", years: range(1950, 2014), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Volkswagen", model: "Delivery", type: "TRUCK", years: range(2002, 2024), min: 150, max: 150, recommended: "150AH" },

  // CHEVROLET / GM
  { make: "Chevrolet", model: "Onix", type: "CAR", years: range(2012, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Chevrolet", model: "Onix Plus", type: "CAR", years: range(2019, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Chevrolet", model: "Prisma", type: "CAR", years: range(2013, 2019), min: 60, max: 60, recommended: "60AH" },
  { make: "Chevrolet", model: "Celta", type: "CAR", years: range(2000, 2016), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Chevrolet", model: "Cruze", type: "CAR", years: range(2012, 2024), min: 70, max: 70, recommended: "70AH" },
  { make: "Chevrolet", model: "Tracker", type: "CAR", years: range(2013, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Chevrolet", model: "Spin", type: "CAR", years: range(2012, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Chevrolet", model: "S10", type: "CAR", years: range(1995, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Chevrolet", model: "Montana", type: "CAR", years: range(2003, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Chevrolet", model: "Equinox", type: "CAR", years: range(2017, 2024), min: 70, max: 70, recommended: "70AH" },
  { make: "Chevrolet", model: "Trailblazer", type: "CAR", years: range(2012, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Chevrolet", model: "Corsa", type: "CAR", years: range(1994, 2012), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Chevrolet", model: "Cobalt", type: "CAR", years: range(2011, 2019), min: 60, max: 60, recommended: "60AH" },
  { make: "Chevrolet", model: "Classic", type: "CAR", years: range(2006, 2016), min: 45, max: 60, recommended: "45AH/60AH" },

  // FORD
  { make: "Ford", model: "Ka", type: "CAR", years: range(1997, 2021), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Ford", model: "Ka Sedan", type: "CAR", years: range(2015, 2021), min: 60, max: 60, recommended: "60AH" },
  { make: "Ford", model: "EcoSport", type: "CAR", years: range(2003, 2022), min: 60, max: 60, recommended: "60AH" },
  { make: "Ford", model: "Fiesta", type: "CAR", years: range(2002, 2014), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Ford", model: "Focus", type: "CAR", years: range(2000, 2019), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Ford", model: "Fusion", type: "CAR", years: range(2006, 2019), min: 70, max: 70, recommended: "70AH" },
  { make: "Ford", model: "Ranger", type: "CAR", years: range(1998, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Ford", model: "Territory", type: "CAR", years: range(2020, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Ford", model: "Transit", type: "VAN", years: range(2013, 2024), min: 90, max: 100, recommended: "90AH/100AH" },

  // HYUNDAI
  { make: "Hyundai", model: "HB20", type: "CAR", years: range(2012, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Hyundai", model: "HB20S", type: "CAR", years: range(2012, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Hyundai", model: "Creta", type: "CAR", years: range(2017, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Hyundai", model: "Tucson", type: "CAR", years: range(2006, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Hyundai", model: "ix35", type: "CAR", years: range(2010, 2019), min: 60, max: 60, recommended: "60AH" },
  { make: "Hyundai", model: "Santa Fe", type: "CAR", years: range(2007, 2024), min: 70, max: 70, recommended: "70AH" },

  // HONDA
  { make: "Honda", model: "Civic", type: "CAR", years: range(1992, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Honda", model: "Fit", type: "CAR", years: range(2004, 2022), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Honda", model: "City", type: "CAR", years: range(2009, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Honda", model: "HR-V", type: "CAR", years: range(2015, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Honda", model: "WR-V", type: "CAR", years: range(2017, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Honda", model: "CR-V", type: "CAR", years: range(1997, 2024), min: 60, max: 70, recommended: "60AH/70AH" },

  // TOYOTA
  { make: "Toyota", model: "Corolla", type: "CAR", years: range(1993, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Toyota", model: "Yaris", type: "CAR", years: range(2018, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Toyota", model: "Hilux", type: "CAR", years: range(1992, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Toyota", model: "SW4", type: "CAR", years: range(2005, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Toyota", model: "RAV4", type: "CAR", years: range(1996, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Toyota", model: "Etios", type: "CAR", years: range(2012, 2022), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Toyota", model: "Prius", type: "CAR", years: range(2012, 2024), min: 45, max: 60, recommended: "45AH/60AH" },

  // RENAULT
  { make: "Renault", model: "Kwid", type: "CAR", years: range(2017, 2024), min: 40, max: 45, recommended: "40AH/45AH" },
  { make: "Renault", model: "Sandero", type: "CAR", years: range(2008, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Renault", model: "Logan", type: "CAR", years: range(2007, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Renault", model: "Duster", type: "CAR", years: range(2012, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Renault", model: "Captur", type: "CAR", years: range(2017, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Renault", model: "Oroch", type: "CAR", years: range(2015, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Renault", model: "Master", type: "VAN", years: range(1997, 2024), min: 90, max: 100, recommended: "90AH/100AH" },

  // JEEP
  { make: "Jeep", model: "Renegade", type: "CAR", years: range(2015, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Jeep", model: "Compass", type: "CAR", years: range(2017, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Jeep", model: "Commander", type: "CAR", years: range(2021, 2024), min: 70, max: 70, recommended: "70AH" },
  { make: "Jeep", model: "Wrangler", type: "CAR", years: range(2000, 2024), min: 70, max: 90, recommended: "70AH/90AH" },

  // NISSAN
  { make: "Nissan", model: "Kicks", type: "CAR", years: range(2016, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Nissan", model: "Frontier", type: "CAR", years: range(2001, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Nissan", model: "March", type: "CAR", years: range(2011, 2022), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Nissan", model: "Versa", type: "CAR", years: range(2011, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Nissan", model: "Sentra", type: "CAR", years: range(2007, 2024), min: 60, max: 60, recommended: "60AH" },

  // MITSUBISHI
  { make: "Mitsubishi", model: "L200", type: "CAR", years: range(2000, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Mitsubishi", model: "Pajero", type: "CAR", years: range(1994, 2024), min: 70, max: 90, recommended: "70AH/90AH" },
  { make: "Mitsubishi", model: "Eclipse Cross", type: "CAR", years: range(2018, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Mitsubishi", model: "Outlander", type: "CAR", years: range(2004, 2024), min: 70, max: 70, recommended: "70AH" },

  // PEUGEOT
  { make: "Peugeot", model: "208", type: "CAR", years: range(2013, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Peugeot", model: "2008", type: "CAR", years: range(2014, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Peugeot", model: "308", type: "CAR", years: range(2012, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Peugeot", model: "3008", type: "CAR", years: range(2010, 2024), min: 60, max: 70, recommended: "60AH/70AH" },

  // CITROËN
  { make: "Citroën", model: "C3", type: "CAR", years: range(2013, 2024), min: 45, max: 60, recommended: "45AH/60AH" },
  { make: "Citroën", model: "C4 Cactus", type: "CAR", years: range(2019, 2024), min: 60, max: 60, recommended: "60AH" },
  { make: "Citroën", model: "Aircross", type: "CAR", years: range(2011, 2022), min: 60, max: 60, recommended: "60AH" },
  { make: "Citroën", model: "Jumper", type: "VAN", years: range(2000, 2024), min: 90, max: 100, recommended: "90AH/100AH" },

  // KIA
  { make: "Kia", model: "Sportage", type: "CAR", years: range(2010, 2024), min: 60, max: 70, recommended: "60AH/70AH" },
  { make: "Kia", model: "Sorento", type: "CAR", years: range(2008, 2024), min: 70, max: 70, recommended: "70AH" },
  { make: "Kia", model: "Stinger", type: "CAR", years: range(2018, 2024), min: 70, max: 70, recommended: "70AH" },

  // MERCEDES
  { make: "Mercedes-Benz", model: "Sprinter", type: "VAN", years: range(1997, 2024), min: 90, max: 100, recommended: "90AH/100AH" },
  { make: "Mercedes-Benz", model: "Accelo", type: "TRUCK", years: range(2004, 2024), min: 150, max: 150, recommended: "150AH" },

  // IVECO
  { make: "Iveco", model: "Daily", type: "VAN", years: range(1997, 2024), min: 90, max: 100, recommended: "90AH/100AH" },

  // CAMINHÕES
  { make: "Volkswagen", model: "Constellation", type: "TRUCK", years: range(2005, 2024), min: 150, max: 150, recommended: "150AH" },
  { make: "Ford", model: "Cargo", type: "TRUCK", years: range(1999, 2024), min: 150, max: 150, recommended: "150AH" },
  { make: "Mercedes-Benz", model: "Atego", type: "TRUCK", years: range(1999, 2024), min: 150, max: 150, recommended: "150AH" },
  { make: "Volvo", model: "FH", type: "TRUCK", years: range(2000, 2024), min: 150, max: 150, recommended: "150AH" },
  { make: "Scania", model: "R Series", type: "TRUCK", years: range(2000, 2024), min: 150, max: 150, recommended: "150AH" },

  // MOTOS
  { make: "Honda", model: "CG 160", type: "MOTORCYCLE", years: range(2015, 2024), min: 5, max: 7, recommended: "5AH/7AH" },
  { make: "Honda", model: "CB 500", type: "MOTORCYCLE", years: range(2013, 2024), min: 8, max: 10, recommended: "8AH/10AH" },
  { make: "Yamaha", model: "Factor 150", type: "MOTORCYCLE", years: range(2015, 2024), min: 5, max: 7, recommended: "5AH/7AH" },
  { make: "Yamaha", model: "MT-07", type: "MOTORCYCLE", years: range(2014, 2024), min: 8, max: 10, recommended: "8AH/10AH" },
  { make: "Suzuki", model: "V-Strom 650", type: "MOTORCYCLE", years: range(2012, 2024), min: 8, max: 10, recommended: "8AH/10AH" },
  { make: "Kawasaki", model: "Z400", type: "MOTORCYCLE", years: range(2019, 2024), min: 8, max: 10, recommended: "8AH/10AH" },
]

// ─── Seed principal ───────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed...")

  // 1. Veículos e compatibilidades (dados globais, sem companyId)
  console.log("🚗 Criando tabela de veículos e compatibilidades...")

  for (const v of vehicles) {
    const make = await prisma.vehicleMake.upsert({
      where: { name: v.make },
      update: {},
      create: { name: v.make },
    })

    const model = await prisma.vehicleModel.upsert({
      where: { makeId_name: { makeId: make.id, name: v.model } },
      update: {},
      create: { makeId: make.id, name: v.model, vehicleType: v.type },
    })

    for (const year of v.years) {
      const modelYear = await prisma.vehicleModelYear.upsert({
        where: { modelId_year: { modelId: model.id, year } },
        update: {},
        create: { modelId: model.id, year },
      })

      // Verifica se já existe compatibilidade para não duplicar
      const existing = await prisma.vehicleCompatibility.findFirst({
        where: { vehicleModelYearId: modelYear.id, companyId: null, brandId: null },
      })

      if (!existing) {
        await prisma.vehicleCompatibility.create({
          data: {
            vehicleModelYearId: modelYear.id,
            minAmperage: v.min,
            maxAmperage: v.max,
            recommendedModel: v.recommended,
            source: "Base Geral",
          },
        })
      }
    }
  }

  // 2. Empresa e loja demo
  console.log("🏢 Criando empresa demo...")

  const company = await prisma.company.upsert({
    where: { cnpj: "00.000.000/0001-00" },
    update: {},
    create: {
      name: "Baterias Demo Ltda",
      cnpj: "00.000.000/0001-00",
      email: "contato@bateriasdemo.com.br",
      phone: "(11) 99999-0000",
    },
  })

  const store = await prisma.store.create({
    data: {
      companyId: company.id,
      name: "Loja Central",
      city: "São Paulo",
      state: "SP",
    },
  })

  // 3. Usuário admin
  console.log("👤 Criando usuário admin...")

  const hash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@bateriasdemo.com.br" },
    update: {},
    create: {
      companyId: company.id,
      name: "Administrador",
      email: "admin@bateriasdemo.com.br",
      password: hash,
      role: "ADMIN",
    },
  })

  await prisma.userStoreAccess.upsert({
    where: { userId_storeId: { userId: admin.id, storeId: store.id } },
    update: {},
    create: { userId: admin.id, storeId: store.id },
  })

  // 4. Marcas de bateria
  console.log("🔋 Criando marcas de bateria...")

  const brandNames = ["Moura", "Heliar", "Bosch", "Tudor", "Cral", "Zetta", "Willard", "Pioneiro"]

  for (const name of brandNames) {
    await prisma.brand.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: { companyId: company.id, name },
    })
  }

  // 5. Categorias financeiras padrão
  console.log("💰 Criando categorias financeiras...")

  const incomeCategories = ["Venda de Baterias", "Venda de Serviços", "Outros Recebimentos"]
  const expenseCategories = ["Compra de Estoque", "Aluguel", "Energia Elétrica", "Salários", "Comissões", "Manutenção", "Marketing", "Outros"]

  for (const name of incomeCategories) {
    await prisma.financialCategory.upsert({
      where: { companyId_name_type: { companyId: company.id, name, type: "INCOME" } },
      update: {},
      create: { companyId: company.id, name, type: "INCOME" },
    })
  }

  for (const name of expenseCategories) {
    await prisma.financialCategory.upsert({
      where: { companyId_name_type: { companyId: company.id, name, type: "EXPENSE" } },
      update: {},
      create: { companyId: company.id, name, type: "EXPENSE" },
    })
  }

  console.log("\n✅ Seed concluído com sucesso!")
  console.log(`   🏢 Empresa: Baterias Demo Ltda`)
  console.log(`   🏪 Loja: Loja Central`)
  console.log(`   👤 Admin: admin@bateriasdemo.com.br / admin123`)
  console.log(`   🚗 Veículos cadastrados: ${vehicles.length} modelos`)
  const totalYears = vehicles.reduce((acc, v) => acc + v.years.length, 0)
  console.log(`   📋 Compatibilidades criadas: ~${totalYears} registros`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
