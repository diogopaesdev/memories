import { betterAuth } from "better-auth"
import { firebaseAdapter } from "better-auth/adapters/firebase"
import { db } from "./firebase-admin"

export const auth = betterAuth({
  database: firebaseAdapter(db),
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update if older than 1 day
  },
})

export type Session = typeof auth.$Infer.Session
