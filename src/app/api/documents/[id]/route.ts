import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        application: {
          select: {
            applicationNumber: true,
            loanType: true,
            borrowerId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check access permissions
    if (
      session.user.role === 'MEMBER' &&
      document.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...updateData } = body

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        application: {
          select: {
            borrowerId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    let updatedDocument

    if (action === 'verify') {
      // Verify document (staff only)
      if (!['LOAN_OFFICER', 'UNDERWRITER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedDocument = await prisma.document.update({
        where: { id: params.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: session.user.id,
        },
      })
    } else if (action === 'reject') {
      // Reject document verification (staff only)
      if (!['LOAN_OFFICER', 'UNDERWRITER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedDocument = await prisma.document.update({
        where: { id: params.id },
        data: {
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
        },
      })
    } else {
      // General update
      if (
        session.user.role === 'MEMBER' &&
        document.userId !== session.user.id
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedDocument = await prisma.document.update({
        where: { id: params.id },
        data: updateData,
      })
    }

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        application: {
          select: {
            borrowerId: true,
            status: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check permissions
    if (
      session.user.role === 'MEMBER' &&
      document.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deletion of verified documents unless admin
    if (document.isVerified && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete verified documents' },
        { status: 400 }
      )
    }

    // TODO: Delete actual file from storage
    // This would involve deleting from AWS S3, Google Cloud Storage, etc.

    await prisma.document.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Download document
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        application: {
          select: {
            borrowerId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check access permissions
    if (
      session.user.role === 'MEMBER' &&
      document.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // TODO: Implement actual file download logic
    // This would involve retrieving from AWS S3, Google Cloud Storage, etc.
    // and returning the file content with appropriate headers

    return NextResponse.json({
      downloadUrl: document.fileUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
    })
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}