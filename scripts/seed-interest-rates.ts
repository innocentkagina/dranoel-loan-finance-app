import { PrismaClient } from '@prisma/client'
import { seedDefaultInterestRates } from '../src/lib/interest-rates'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding default interest rates...')

  try {
    await seedDefaultInterestRates()
    console.log('✅ Interest rates seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding interest rates:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()