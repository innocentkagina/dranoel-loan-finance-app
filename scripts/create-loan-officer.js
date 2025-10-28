const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createLoanOfficer() {
  try {
    // Check if loan officer already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'loans@dranoel.com' }
    })

    if (existingUser) {
      console.log('Loan officer user already exists!')

      // Update the role if it's not correct
      if (existingUser.role !== 'LOANS_OFFICER') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'LOANS_OFFICER' }
        })
        console.log('Updated existing user role to LOANS_OFFICER')
      }

      return existingUser
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('loans123', 12)

    // Create the loan officer user
    const loanOfficer = await prisma.user.create({
      data: {
        email: 'loans@dranoel.com',
        password: hashedPassword,
        firstName: 'Loans',
        lastName: 'Officer',
        phone: '+256700000001',
        role: 'LOANS_OFFICER',
        isActive: true,
        employmentStatus: 'Employed',
        monthlyIncome: 2000000, // 2M UGX
        creditScore: 800,
      }
    })


    return loanOfficer

  } catch (error) {
    console.error('Error creating loan officer:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createLoanOfficer()
  .then(() => {
    console.log('Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
