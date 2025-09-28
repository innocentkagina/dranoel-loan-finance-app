const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAndUpdateUser() {
  try {
    // Check the current user
    const user = await prisma.user.findUnique({
      where: { email: 'loans@dranoel.com' }
    })

    if (!user) {
      console.log('User not found!')
      return
    }

    console.log('Current user details:')
    console.log('Email:', user.email)
    console.log('Role:', user.role)
    console.log('First Name:', user.firstName)
    console.log('Last Name:', user.lastName)
    console.log('Is Active:', user.isActive)

    // Update role if it's not LOANS_OFFICER
    if (user.role !== 'LOANS_OFFICER') {
      console.log(`Updating role from ${user.role} to LOANS_OFFICER...`)

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'LOANS_OFFICER' }
      })

      console.log('✅ Role updated successfully!')
      console.log('New role:', updatedUser.role)
    } else {
      console.log('✅ User already has LOANS_OFFICER role!')
    }

  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkAndUpdateUser()
  .then(() => {
    console.log('Check completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Check failed:', error)
    process.exit(1)
  })