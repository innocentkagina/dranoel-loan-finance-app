import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { UserStatus } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials")
          return null
        }

        try {
          console.log("=== LOGIN ATTEMPT ===")
          console.log("Attempting login for:", credentials.email.toLowerCase())

          // Optimize database query by selecting only needed fields
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase()
            },
            select: {
              id: true,
              email: true,
              password: true,
              firstName: true,
              lastName: true,
              role: true,
              status: true,
              isActive: true,
              mustChangePassword: true
            }
          })

          if (!user) {
            console.log("❌ User not found")
            return null
          }

          console.log("✅ User found:", user.email)
          console.log("User isActive:", user.isActive)
          console.log("User status:", user.status)
          console.log("User role:", user.role)

          if (!user.isActive) {
            console.log("❌ User is not active")
            return null
          }

          if (user.status !== UserStatus.ACTIVE) {
            console.log("❌ User status is not active:", user.status)
            return null
          }

          if (!user.role) {
            console.log("❌ User has no role assigned")
            return null
          }

          console.log("User found, checking password")

          // Use bcrypt compare - this is intentionally slow for security
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log("Password invalid")
            return null
          }

          console.log("Login successful for:", user.email)

          // Update last login and create audit log asynchronously to not block the response
          Promise.all([
            prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() }
            }),
            prisma.auditLog.create({
              data: {
                userId: user.id,
                action: 'LOGIN',
                entityType: 'USER',
                entityId: user.id,
                newValues: { email: user.email, role: user.role },
                ipAddress: 'unknown', // We'll handle IP address in API routes
                userAgent: 'unknown'
              }
            })
          ]).catch(err => console.error("Failed to update last login or create audit log:", err))

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            mustChangePassword: user.mustChangePassword,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("🔑 JWT callback - user data:", user)
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.mustChangePassword = user.mustChangePassword
        console.log("🔑 JWT callback - token created:", { role: token.role, mustChangePassword: token.mustChangePassword })
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        console.log("📋 Session callback - token:", { sub: token.sub, role: token.role, mustChangePassword: token.mustChangePassword })
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
        console.log("📋 Session callback - session created:", session.user)
      }
      return session
    },
    async redirect({ url, baseUrl, token }) {
      console.log("🔄 Redirect callback:", { url, baseUrl, token: token ? { role: token.role, mustChangePassword: token.mustChangePassword } : null })

      // Handle password change requirement first
      if (token?.mustChangePassword) {
        console.log("🔄 Redirecting to password change")
        return `${baseUrl}/auth/change-password`
      }

      // Handle role-based redirects after successful authentication
      if (token?.role) {
        console.log("🔄 Role-based redirect for:", token.role)
        switch (token.role) {
          case 'MEMBER':
            return `${baseUrl}/dashboard`
          case 'LOANS_OFFICER':
            return `${baseUrl}/officer/dashboard`
          case 'TREASURER':
            return `${baseUrl}/treasurer/dashboard`
          case 'ADMINISTRATOR':
            return `${baseUrl}/administrator`
          default:
            return `${baseUrl}/dashboard`
        }
      }

      // Default redirect for non-authenticated users
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      } else if (new URL(url).origin === baseUrl) {
        return url
      }
      return baseUrl
    }
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
  secret: process.env.NEXTAUTH_SECRET,
}