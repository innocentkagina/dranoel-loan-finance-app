import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (session?.user) {
      // Create logout audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'LOGOUT',
          entityType: 'USER',
          entityId: session.user.id,
          newValues: { email: session.user.email, role: session.user.role },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging logout:', error)
    return NextResponse.json({ success: true }) // Don't fail logout on audit error
  }
}