import { UserRole } from "@prisma/client"
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      firstName: string
      lastName: string
      mustChangePassword: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    firstName: string
    lastName: string
    mustChangePassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    firstName: string
    lastName: string
    mustChangePassword: boolean
  }
}