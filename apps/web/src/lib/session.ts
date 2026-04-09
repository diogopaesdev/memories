import { getServerSession as nextAuthGetServerSession } from "next-auth"
import { headers } from "next/headers"
import { jwtVerify } from "jose"
import { authOptions } from "./auth"

function getSecret() {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback-secret")
}

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions)
}

export async function requireSession() {
  // 1. Try NextAuth session (browser / web app users)
  const session = await getServerSession()
  if (session?.user) return session

  // 2. Try Bearer JWT (desktop app users)
  const headersList = await headers()
  const auth = headersList.get("Authorization")
  if (auth?.startsWith("Bearer ")) {
    try {
      const token = auth.slice(7)
      const { payload } = await jwtVerify(token, getSecret())
      if (payload.userId && payload.email) {
        return {
          user: {
            id: payload.userId as string,
            name: (payload.name as string) ?? "",
            email: payload.email as string,
            image: (payload.image as string) ?? null,
          },
        }
      }
    } catch { /* token inválido ou expirado */ }
  }

  throw new Error("Unauthorized")
}

/** Assina um JWT de longa duração para o desktop app */
export async function signDesktopToken(user: {
  id: string
  name: string | null
  email: string
  image?: string | null
}): Promise<string> {
  const { SignJWT } = await import("jose")
  return new SignJWT({
    userId: user.id,
    name: user.name ?? "",
    email: user.email,
    image: user.image ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret())
}
