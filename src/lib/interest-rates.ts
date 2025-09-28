import { prisma } from './prisma'
import { LoanType } from '@prisma/client'

export interface DefaultInterestRates {
  PERSONAL: number
  MORTGAGE: number
  AUTO: number
  BUSINESS: number
  STUDENT: number
  PAYDAY: number
}

export async function getDefaultInterestRate(loanType: LoanType): Promise<number> {
  try {
    // First try to get from system settings
    const settingKey = `LOAN_DEFAULT_INTEREST_RATE_${loanType}`
    const setting = await prisma.systemSettings.findUnique({
      where: { key: settingKey }
    })

    if (setting && setting.value) {
      const rate = parseFloat(setting.value)
      if (!isNaN(rate) && rate > 0) {
        return rate
      }
    }

    // Fallback to InterestRate table (if implemented)
    const interestRate = await prisma.interestRate.findFirst({
      where: {
        loanType,
        isActive: true,
        effectiveDate: { lte: new Date() },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }
    })

    if (interestRate) {
      return interestRate.rate
    }

    // Final fallback to hardcoded defaults
    return getHardcodedDefaultRate(loanType)

  } catch (error) {
    console.error('Error fetching default interest rate:', error)
    return getHardcodedDefaultRate(loanType)
  }
}

function getHardcodedDefaultRate(loanType: LoanType): number {
  const defaultRates: DefaultInterestRates = {
    PERSONAL: 15.0,
    MORTGAGE: 8.5,
    AUTO: 12.0,
    BUSINESS: 18.0,
    STUDENT: 6.5,
    PAYDAY: 25.0
  }

  return defaultRates[loanType] || 15.0
}

export async function getAllDefaultInterestRates(): Promise<DefaultInterestRates> {
  const loanTypes: LoanType[] = ['PERSONAL', 'MORTGAGE', 'AUTO', 'BUSINESS', 'STUDENT', 'PAYDAY']

  const rates = await Promise.all(
    loanTypes.map(async (type) => ({
      type,
      rate: await getDefaultInterestRate(type)
    }))
  )

  return rates.reduce((acc, { type, rate }) => {
    acc[type] = rate
    return acc
  }, {} as DefaultInterestRates)
}

export async function updateDefaultInterestRate(loanType: LoanType, rate: number): Promise<void> {
  const settingKey = `LOAN_DEFAULT_INTEREST_RATE_${loanType}`
  const description = `Default interest rate for ${loanType.toLowerCase()} loans`

  try {
    await prisma.systemSettings.upsert({
      where: { key: settingKey },
      update: { value: rate.toString() },
      create: {
        key: settingKey,
        value: rate.toString(),
        description
      }
    })
  } catch (error) {
    console.error(`Error updating default interest rate for ${loanType}:`, error)
    throw error
  }
}

export async function seedDefaultInterestRates(): Promise<void> {
  const defaultRates: DefaultInterestRates = {
    PERSONAL: 15.0,
    MORTGAGE: 8.5,
    AUTO: 12.0,
    BUSINESS: 18.0,
    STUDENT: 6.5,
    PAYDAY: 25.0
  }

  try {
    for (const [loanType, rate] of Object.entries(defaultRates)) {
      await updateDefaultInterestRate(loanType as LoanType, rate)
    }
    console.log('✅ Default interest rates seeded successfully')
  } catch (error) {
    console.error('❌ Error seeding default interest rates:', error)
    throw error
  }
}