import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import {
  parseFormData,
  uploadFile,
  isValidFileType,
  isValidFileSize,
  RECEIPT_ALLOWED_TYPES,
  MAX_RECEIPT_SIZE_MB
} from '@/lib/upload'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Get payments for user's loan accounts
    const payments = await prisma.payment.findMany({
      where: {
        loanAccount: {
          application: {
            borrowerId: session.user.id
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    })

    const totalCount = await prisma.payment.count({
      where: {
        loanAccount: {
          application: {
            borrowerId: session.user.id
          }
        }
      }
    })

    return NextResponse.json({
      payments,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    })

  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data (including files)
    const { formData, files } = await parseFormData(request)
    const {
      loanAccountId,
      amount,
      paymentMethod,
      phoneNumber,
      cardDetails,
      bankAccount
    } = formData

    // Handle receipt file if provided
    let receiptData: any = {}
    if (files.receipt) {
      const receiptFile = files.receipt

      // Validate file type and size
      if (!isValidFileType(receiptFile, RECEIPT_ALLOWED_TYPES)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only images (JPG, PNG, GIF) and PDF files are allowed.' },
          { status: 400 }
        )
      }

      if (!isValidFileSize(receiptFile, MAX_RECEIPT_SIZE_MB)) {
        return NextResponse.json(
          { error: `File size too large. Maximum size is ${MAX_RECEIPT_SIZE_MB}MB.` },
          { status: 400 }
        )
      }

      try {
        const uploadedFile = await uploadFile(receiptFile, 'receipts/payments')
        receiptData = {
          receiptFileName: uploadedFile.fileName,
          receiptFileUrl: uploadedFile.fileUrl,
          receiptFileSize: uploadedFile.fileSize,
          receiptMimeType: uploadedFile.mimeType
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload receipt file' },
          { status: 500 }
        )
      }
    }

    if (!loanAccountId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify that the loan account belongs to the user
    const loanAccount = await prisma.loanAccount.findFirst({
      where: {
        id: loanAccountId,
        application: {
          borrowerId: session.user.id
        }
      }
    })

    if (!loanAccount) {
      return NextResponse.json(
        { error: 'Loan account not found' },
        { status: 404 }
      )
    }

    // Calculate principal and interest portions (simplified)
    const monthlyPayment = loanAccount.monthlyPayment
    const currentBalance = loanAccount.currentBalance
    const interestRate = loanAccount.interestRate / 100 / 12
    const interestAmount = currentBalance * interestRate
    const principalAmount = Math.max(0, amount - interestAmount)

    // Create payment record
    const paymentData: any = {
      loanAccountId,
      userId: session.user.id,
      amount: parseFloat(amount),
      principalAmount: Math.round(principalAmount * 100) / 100,
      interestAmount: Math.round(interestAmount * 100) / 100,
      paymentMethod,
      status: 'PENDING',
      scheduledDate: new Date(),
      ...receiptData
    }

    // Add method-specific details to notes
    let notes = `Payment via ${paymentMethod.replace('_', ' ')}`
    if (phoneNumber) {
      notes += ` - Phone: +256${phoneNumber}`
    } else if (bankAccount) {
      notes += ` - Account: ${bankAccount}`
    } else if (cardDetails) {
      notes += ` - Card ending in ${cardDetails.cardNumber.slice(-4)}`
    }
    paymentData.notes = notes

    // Generate transaction ID
    paymentData.transactionId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`

    const payment = await prisma.payment.create({
      data: paymentData
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Submitted',
        message: `Your payment of ${parseFloat(amount).toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })} has been submitted and is being processed. Transaction ID: ${paymentData.transactionId}`,
        metadata: {
          paymentId: payment.id,
          amount: parseFloat(amount),
          paymentMethod,
          transactionId: paymentData.transactionId
        }
      }
    })

    // Get user info for staff notifications
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true }
    })

    // Notify treasurers and loan officers about the payment
    const staffUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'TREASURER' },
          { role: 'LOANS_OFFICER' }
        ],
        isActive: true,
        status: 'ACTIVE'
      },
      select: { id: true }
    })

    // Create notifications for all staff members
    const staffNotifications = staffUsers.map(staff => ({
      userId: staff.id,
      type: 'PAYMENT_RECEIVED' as const,
      title: 'New Payment Received',
      message: `${user?.firstName} ${user?.lastName} has submitted a payment of ${parseFloat(amount).toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })} via ${paymentMethod.replace('_', ' ')}. Transaction ID: ${paymentData.transactionId}`,
      metadata: {
        paymentId: payment.id,
        memberId: session.user.id,
        memberName: `${user?.firstName} ${user?.lastName}`,
        memberEmail: user?.email,
        amount: parseFloat(amount),
        paymentMethod,
        transactionId: paymentData.transactionId,
        loanAccountId
      }
    }))

    if (staffNotifications.length > 0) {
      await prisma.notification.createMany({
        data: staffNotifications
      })
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        status: payment.status
      }
    })

  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}