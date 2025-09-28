import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDisbursementQuickAction() {
  try {
    console.log('🧪 Testing disbursement quick action integration...')

    // Test the disbursement stats API (same one used by the dashboard)
    console.log('\n📊 Testing disbursement stats API:')

    const stats = await prisma.loanApplication.count({
      where: {
        status: 'APPROVED',
        loanAccount: null
      }
    })

    console.log(`✅ Pending disbursements count: ${stats}`)

    if (stats > 0) {
      console.log(`🎯 Quick action should show: "${stats} approved loan${stats > 1 ? 's' : ''} ready for disbursement"`)
      console.log('🔄 Button should be orange/warning color and say "Process Disbursements"')
    } else {
      console.log('📋 Quick action should show: "Manage approved loan disbursements"')
      console.log('🔵 Button should be blue/primary color and say "View Disbursements"')
    }

    // Test the approved loans that would be shown
    const approvedLoans = await prisma.loanApplication.findMany({
      where: {
        status: 'APPROVED',
        loanAccount: null
      },
      include: {
        borrower: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      take: 3 // Just show first 3 for testing
    })

    if (approvedLoans.length > 0) {
      console.log(`\n📋 Loans ready for disbursement (first ${Math.min(3, approvedLoans.length)} of ${stats}):`)
      approvedLoans.forEach((loan, index) => {
        console.log(`   ${index + 1}. ${loan.applicationNumber} - ${loan.borrower.firstName} ${loan.borrower.lastName}`)
        console.log(`      Amount: ${loan.approvedAmount?.toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 })}`)
      })
    }

    console.log('\n✅ Quick action integration test completed!')

  } catch (error) {
    console.error('❌ Error testing quick action:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDisbursementQuickAction()