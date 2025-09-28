import { PrismaClient, UserRole, LoanType, LoanStatus, PaymentStatus, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Use lower bcrypt rounds for development environment for faster authentication
  const bcryptRounds = process.env.NODE_ENV === 'production' ? 12 : 8

  // Create admin user (pre-approved for system initialization)
  const adminPassword = await bcrypt.hash('admin123', bcryptRounds)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dranoel.com' },
    update: {},
    create: {
      email: 'admin@dranoel.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMINISTRATOR,
      status: 'ACTIVE',
      phone: '+1234567890',
      address: '123 Admin Street, Admin City, AC 12345',
      isActive: true,
      mustChangePassword: false,
      approvedAt: new Date(),
    },
  })

  // Create loans officer (pre-approved for demo)
  const loansOfficerPassword = await bcrypt.hash('loans123', bcryptRounds)
  const loansOfficer = await prisma.user.upsert({
    where: { email: 'loans@dranoel.com' },
    update: {},
    create: {
      email: 'loans@dranoel.com',
      password: loansOfficerPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: 'LOANS_OFFICER',
      status: 'ACTIVE',
      phone: '+1234567891',
      address: '456 Loans Officer Lane, Finance City, FC 12346',
      isActive: true,
      mustChangePassword: false,
      approvedAt: new Date(),
    },
  })

  // Create treasurer (pre-approved for demo)
  const treasurerPassword = await bcrypt.hash('treasurer123', bcryptRounds)
  const treasurer = await prisma.user.upsert({
    where: { email: 'treasurer@dranoel.com' },
    update: {},
    create: {
      email: 'treasurer@dranoel.com',
      password: treasurerPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'TREASURER',
      status: 'ACTIVE',
      phone: '+1234567892',
      address: '789 Treasurer Ave, Finance City, FC 12347',
      isActive: true,
      mustChangePassword: false,
      approvedAt: new Date(),
    },
  })

  // Create member (pre-approved for demo)
  const memberPassword = await bcrypt.hash('member123', bcryptRounds)
  const member = await prisma.user.upsert({
    where: { email: 'member@dranoel.com' },
    update: {},
    create: {
      email: 'member@dranoel.com',
      password: memberPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'MEMBER',
      status: 'ACTIVE',
      phone: '+1234567893',
      address: '321 Member Blvd, Client City, CC 12348',
      dateOfBirth: new Date('1990-05-15'),
      nationalId: '123456789',
      employmentStatus: 'Full-time',
      monthlyIncome: 5000.0,
      creditScore: 750,
      isActive: true,
      mustChangePassword: false,
      approvedAt: new Date(),
    },
  })

  const users = { admin, loansOfficer, treasurer, member }
  console.log('👥 Created users:', users)

  // Create interest rates for different loan types and credit score ranges
  const interestRates = [
    // Personal Loans
    {
      loanType: LoanType.PERSONAL,
      minCreditScore: 750,
      maxCreditScore: 850,
      rate: 6.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.PERSONAL,
      minCreditScore: 700,
      maxCreditScore: 749,
      rate: 8.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.PERSONAL,
      minCreditScore: 650,
      maxCreditScore: 699,
      rate: 12.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.PERSONAL,
      minCreditScore: 580,
      maxCreditScore: 649,
      rate: 18.5,
      effectiveDate: new Date(),
    },

    // Mortgage Loans
    {
      loanType: LoanType.MORTGAGE,
      minCreditScore: 740,
      maxCreditScore: 850,
      rate: 3.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.MORTGAGE,
      minCreditScore: 680,
      maxCreditScore: 739,
      rate: 4.0,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.MORTGAGE,
      minCreditScore: 620,
      maxCreditScore: 679,
      rate: 4.5,
      effectiveDate: new Date(),
    },

    // Auto Loans
    {
      loanType: LoanType.AUTO,
      minCreditScore: 720,
      maxCreditScore: 850,
      rate: 4.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.AUTO,
      minCreditScore: 660,
      maxCreditScore: 719,
      rate: 6.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.AUTO,
      minCreditScore: 580,
      maxCreditScore: 659,
      rate: 9.5,
      effectiveDate: new Date(),
    },

    // Business Loans
    {
      loanType: LoanType.BUSINESS,
      minCreditScore: 700,
      maxCreditScore: 850,
      rate: 7.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.BUSINESS,
      minCreditScore: 650,
      maxCreditScore: 699,
      rate: 10.5,
      effectiveDate: new Date(),
    },

    // Student Loans
    {
      loanType: LoanType.STUDENT,
      minCreditScore: 650,
      maxCreditScore: 850,
      rate: 5.5,
      effectiveDate: new Date(),
    },
    {
      loanType: LoanType.STUDENT,
      minCreditScore: 580,
      maxCreditScore: 649,
      rate: 8.5,
      effectiveDate: new Date(),
    },
  ]

  for (const rateData of interestRates) {
    await prisma.interestRate.create({
      data: rateData,
    })
  }

  console.log('💰 Created interest rates')

  // Create system settings
  const systemSettings = [
    {
      key: 'MAX_LOAN_AMOUNT_PERSONAL',
      value: '50000',
      description: 'Maximum loan amount for personal loans',
    },
    {
      key: 'MAX_LOAN_AMOUNT_MORTGAGE',
      value: '1000000',
      description: 'Maximum loan amount for mortgage loans',
    },
    {
      key: 'MAX_LOAN_AMOUNT_AUTO',
      value: '100000',
      description: 'Maximum loan amount for auto loans',
    },
    {
      key: 'MAX_LOAN_AMOUNT_BUSINESS',
      value: '500000',
      description: 'Maximum loan amount for business loans',
    },
    {
      key: 'MAX_LOAN_AMOUNT_STUDENT',
      value: '200000',
      description: 'Maximum loan amount for student loans',
    },
    {
      key: 'MIN_CREDIT_SCORE',
      value: '580',
      description: 'Minimum credit score required for any loan',
    },
    {
      key: 'MAX_DEBT_TO_INCOME_RATIO',
      value: '0.43',
      description: 'Maximum debt-to-income ratio allowed',
    },
    {
      key: 'LATE_PAYMENT_FEE',
      value: '25',
      description: 'Late payment fee amount',
    },
    {
      key: 'GRACE_PERIOD_DAYS',
      value: '10',
      description: 'Grace period for payments in days',
    },
  ]

  for (const setting of systemSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('⚙️ Created system settings')

  // Create sample notifications
  const sampleNotifications = [
    {
      userId: users.member.id,
      senderId: users.admin.id,
      type: 'APPLICATION_APPROVED',
      title: 'Loan Application Approved',
      message: 'Congratulations! Your personal loan application has been approved. The funds will be disbursed within 2-3 business days.',
      isRead: false,
    },
    {
      userId: users.member.id,
      senderId: users.loansOfficer.id,
      type: 'PAYMENT_DUE',
      title: 'Payment Due Reminder',
      message: 'Your monthly payment of $450.00 is due in 3 days. Please ensure sufficient funds are available.',
      isRead: false,
    },
    {
      userId: users.member.id,
      senderId: users.admin.id,
      type: 'GENERAL',
      title: 'Welcome to Dranoel',
      message: 'Welcome to our loan management platform! Explore your dashboard to manage your loans and payments.',
      isRead: true,
    },
    {
      userId: users.loansOfficer.id,
      senderId: users.admin.id,
      type: 'APPLICATION_SUBMITTED',
      title: 'New Loan Application',
      message: 'A new personal loan application has been submitted and assigned to you for review.',
      isRead: false,
    },
    {
      userId: users.treasurer.id,
      senderId: users.loansOfficer.id,
      type: 'APPLICATION_SUBMITTED',
      title: 'Application Ready for Underwriting',
      message: 'A loan application has been reviewed and is ready for your underwriting assessment.',
      isRead: false,
    },
  ]

  for (const notificationData of sampleNotifications) {
    await prisma.notification.create({
      data: notificationData,
    })
  }

  console.log('🔔 Created sample notifications')

  // Create additional member for testing (as pending user)
  const member2Password = await bcrypt.hash('member2123', bcryptRounds)
  const member2 = await prisma.user.upsert({
    where: { email: 'member2@dranoel.com' },
    update: {},
    create: {
      email: 'member2@dranoel.com',
      password: member2Password,
      firstName: 'Robert',
      lastName: 'Wilson',
      role: null, // No role assigned initially
      status: 'PENDING', // Pending admin approval
      phone: '+256700123456',
      address: '123 Kampala Road, Kampala, Uganda',
      dateOfBirth: new Date('1985-03-20'),
      nationalId: 'CF1234567890',
      employmentStatus: 'Self-employed',
      monthlyIncome: 3500000, // 3.5M UGX
      creditScore: 680,
      isActive: false, // Not active until approved
      mustChangePassword: true, // Must change password on first login
    },
  })

  // Note: Loan applications and related data commented out since users are now pending approval
  // Uncomment after approving users through the admin interface
  console.log('📝 Skipping loan applications - users need admin approval first')

  /*
  // Application 1: Approved Personal Loan
  const loanApp1 = await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LA-2024-001',
      borrowerId: member.id,
      assignedOfficerId: loansOfficer.id,
      loanType: LoanType.PERSONAL,
      requestedAmount: 15000000, // 15M UGX
      approvedAmount: 15000000,
      interestRate: 8.5,
      termMonths: 24,
      purpose: 'Business expansion and equipment purchase',
      status: LoanStatus.APPROVED,
      employmentInfo: {
        employer: 'Uganda Development Bank',
        position: 'Senior Analyst',
        monthlyIncome: 5000000,
        yearsOfService: 5
      },
      financialInfo: {
        monthlyExpenses: 2500000,
        assets: 50000000,
        liabilities: 8000000
      },
      submittedAt: new Date('2024-01-15'),
      reviewStartedAt: new Date('2024-01-16'),
      approvedAt: new Date('2024-01-18'),
      disbursedAt: new Date('2024-01-20'),
      monthlyPayment: 692308.78,
      officerNotes: 'Excellent credit history, stable employment, approved at requested amount.'
    }
  })

  // Application 2: Active Auto Loan
  const loanApp2 = await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LA-2024-002',
      borrowerId: member2.id,
      assignedOfficerId: loansOfficer.id,
      loanType: LoanType.AUTO,
      requestedAmount: 25000000, // 25M UGX
      approvedAmount: 22000000, // 22M UGX
      interestRate: 6.5,
      termMonths: 36,
      purpose: 'Vehicle purchase for business operations',
      status: LoanStatus.APPROVED,
      collateralValue: 30000000,
      downPayment: 8000000,
      employmentInfo: {
        businessName: 'Wilson Transport Services',
        businessType: 'Transportation',
        monthlyIncome: 3500000,
        yearsInBusiness: 8
      },
      financialInfo: {
        monthlyExpenses: 2000000,
        assets: 45000000,
        liabilities: 12000000
      },
      submittedAt: new Date('2024-02-01'),
      reviewStartedAt: new Date('2024-02-02'),
      approvedAt: new Date('2024-02-05'),
      disbursedAt: new Date('2024-02-08'),
      monthlyPayment: 675123.45,
      officerNotes: 'Good business history, sufficient collateral, approved with reduced amount.'
    }
  })

  // Application 3: Under Review
  const loanApp3 = await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LA-2024-003',
      borrowerId: member.id,
      assignedOfficerId: loansOfficer.id,
      loanType: LoanType.BUSINESS,
      requestedAmount: 35000000, // 35M UGX
      interestRate: 10.5,
      termMonths: 48,
      purpose: 'Expand agricultural processing business',
      status: LoanStatus.UNDER_REVIEW,
      collateralValue: 50000000,
      employmentInfo: {
        businessName: 'Jane Agriculture Ltd',
        businessType: 'Agriculture Processing',
        monthlyIncome: 5000000,
        yearsInBusiness: 3
      },
      submittedAt: new Date('2024-09-15'),
      reviewStartedAt: new Date('2024-09-16'),
      officerNotes: 'Under review - additional documentation requested.'
    }
  })

  // Application 4: Recent submission
  const loanApp4 = await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LA-2024-004',
      borrowerId: member2.id,
      loanType: LoanType.PERSONAL,
      requestedAmount: 8000000, // 8M UGX
      interestRate: 12.5,
      termMonths: 18,
      purpose: 'Home renovation and repairs',
      status: LoanStatus.SUBMITTED,
      employmentInfo: {
        businessName: 'Wilson Transport Services',
        businessType: 'Transportation',
        monthlyIncome: 3500000
      },
      submittedAt: new Date('2024-09-20'),
    }
  })

  console.log('📝 Created sample loan applications')

  // Create loan accounts for approved loans
  console.log('🏦 Creating loan accounts...')

  const loanAccount1 = await prisma.loanAccount.create({
    data: {
      accountNumber: 'ACC-2024-001',
      applicationId: loanApp1.id,
      principalAmount: 15000000,
      currentBalance: 12750000, // Some payments made
      interestRate: 8.5,
      termMonths: 24,
      monthlyPayment: 692308.78,
      startDate: new Date('2024-01-20'),
      maturityDate: new Date('2026-01-20'),
      nextPaymentDate: new Date('2024-10-20'),
      status: LoanStatus.ACTIVE,
      totalPaid: 2250000,
      totalInterestPaid: 187500,
      principalPaid: 2062500,
    }
  })

  const loanAccount2 = await prisma.loanAccount.create({
    data: {
      accountNumber: 'ACC-2024-002',
      applicationId: loanApp2.id,
      principalAmount: 22000000,
      currentBalance: 19800000, // Few payments made
      interestRate: 6.5,
      termMonths: 36,
      monthlyPayment: 675123.45,
      startDate: new Date('2024-02-08'),
      maturityDate: new Date('2027-02-08'),
      nextPaymentDate: new Date('2024-10-08'),
      status: LoanStatus.ACTIVE,
      totalPaid: 2200000,
      totalInterestPaid: 143000,
      principalPaid: 2057000,
    }
  })

  console.log('🏦 Created loan accounts')

  // Create payment history
  console.log('💳 Creating payment history...')

  // Payments for Loan Account 1
  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount1.id,
      userId: member.id,
      amount: 692308.78,
      principalAmount: 625000,
      interestAmount: 67308.78,
      paymentMethod: 'MTN_MOBILE_MONEY',
      transactionId: 'TXN-MTN-001-2024',
      status: PaymentStatus.PAID,
      scheduledDate: new Date('2024-02-20'),
      paidDate: new Date('2024-02-20'),
      notes: 'Payment via MTN Mobile Money - Phone: +256701234567'
    }
  })

  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount1.id,
      userId: member.id,
      amount: 692308.78,
      principalAmount: 642857,
      interestAmount: 49451.78,
      paymentMethod: 'BANK_TRANSFER',
      transactionId: 'TXN-BNK-002-2024',
      status: PaymentStatus.PAID,
      scheduledDate: new Date('2024-03-20'),
      paidDate: new Date('2024-03-19'),
      notes: 'Payment via Bank Transfer - Account: 1234567890'
    }
  })

  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount1.id,
      userId: member.id,
      amount: 692308.78,
      principalAmount: 658123,
      interestAmount: 34185.78,
      paymentMethod: 'AIRTEL_MONEY',
      transactionId: 'TXN-AML-003-2024',
      status: PaymentStatus.PAID,
      scheduledDate: new Date('2024-04-20'),
      paidDate: new Date('2024-04-21'),
      notes: 'Payment via Airtel Money - Phone: +256701234567'
    }
  })

  // Recent payment - pending
  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount1.id,
      userId: member.id,
      amount: 692308.78,
      principalAmount: 673456,
      interestAmount: 18852.78,
      paymentMethod: 'VISA_CARD',
      transactionId: 'TXN-VISA-004-2024',
      status: PaymentStatus.PENDING,
      scheduledDate: new Date('2024-09-20'),
      notes: 'Payment via Visa Card ending in 4567'
    }
  })

  // Payments for Loan Account 2
  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount2.id,
      userId: member2.id,
      amount: 675123.45,
      principalAmount: 611678.90,
      interestAmount: 63444.55,
      paymentMethod: 'MTN_MOBILE_MONEY',
      transactionId: 'TXN-MTN-005-2024',
      status: PaymentStatus.PAID,
      scheduledDate: new Date('2024-03-08'),
      paidDate: new Date('2024-03-08'),
      notes: 'Payment via MTN Mobile Money - Phone: +256700123456'
    }
  })

  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount2.id,
      userId: member2.id,
      amount: 675123.45,
      principalAmount: 638789.34,
      interestAmount: 36334.11,
      paymentMethod: 'BANK_TRANSFER',
      transactionId: 'TXN-BNK-006-2024',
      status: PaymentStatus.PAID,
      scheduledDate: new Date('2024-04-08'),
      paidDate: new Date('2024-04-07'),
      notes: 'Payment via Bank Transfer - Account: 9876543210'
    }
  })

  await prisma.payment.create({
    data: {
      loanAccountId: loanAccount2.id,
      userId: member2.id,
      amount: 675123.45,
      principalAmount: 655432.10,
      interestAmount: 19691.35,
      paymentMethod: 'MASTERCARD',
      status: PaymentStatus.LATE,
      scheduledDate: new Date('2024-09-08'),
      notes: 'Payment via Mastercard ending in 8901 - Payment overdue'
    }
  })

  console.log('💳 Created payment history')

  // Create additional notifications related to the loans
  const additionalNotifications = [
    {
      userId: member.id,
      senderId: loansOfficer.id,
      type: NotificationType.LOAN_DISBURSED,
      title: 'Loan Disbursed Successfully',
      message: `Your personal loan of ${new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(15000000)} has been disbursed to your account. Transaction ID: DISB-2024-001`,
      metadata: {
        loanAccountId: loanAccount1.id,
        amount: 15000000,
        transactionId: 'DISB-2024-001'
      },
      isRead: true,
    },
    {
      userId: member2.id,
      senderId: admin.id,
      type: NotificationType.APPLICATION_APPROVED,
      title: 'Auto Loan Approved',
      message: `Congratulations! Your auto loan application has been approved for ${new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(22000000)}. Please review the terms and conditions.`,
      metadata: {
        applicationId: loanApp2.id,
        approvedAmount: 22000000
      },
      isRead: false,
    },
    {
      userId: member.id,
      senderId: loansOfficer.id,
      type: NotificationType.DOCUMENT_REQUIRED,
      title: 'Additional Documents Required',
      message: 'Please upload updated business registration documents for your business loan application (LA-2024-003).',
      metadata: {
        applicationId: loanApp3.id,
        requiredDocuments: ['business_registration', 'tax_returns']
      },
      isRead: false,
    },
    {
      userId: member2.id,
      type: NotificationType.PAYMENT_OVERDUE,
      title: 'Payment Overdue',
      message: `Your payment of ${new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(675123.45)} is overdue. Please make the payment immediately to avoid late fees.`,
      metadata: {
        loanAccountId: loanAccount2.id,
        amount: 675123.45,
        dueDate: '2024-09-08'
      },
      isRead: false,
    },
    {
      userId: member.id,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Payment Received',
      message: `Thank you! We have received your payment of ${new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(692308.78)} via Airtel Money. Transaction ID: TXN-AML-003-2024`,
      metadata: {
        paymentId: 'TXN-AML-003-2024',
        amount: 692308.78,
        method: 'AIRTEL_MONEY'
      },
      isRead: true,
    }
  ]

  for (const notificationData of additionalNotifications) {
    await prisma.notification.create({
      data: notificationData,
    })
  }

  console.log('🔔 Created additional loan-related notifications')
  */

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })