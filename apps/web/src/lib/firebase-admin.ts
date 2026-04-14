import { initializeApp, getApps, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { cert } from "firebase-admin/app"

let _app: App | null = null

function getApp(): App {
  if (_app) return _app
  if (getApps().length > 0) {
    _app = getApps()[0]
    return _app
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing Firebase credentials: ${[
        !projectId && "FIREBASE_PROJECT_ID",
        !clientEmail && "FIREBASE_CLIENT_EMAIL",
        !privateKey && "FIREBASE_PRIVATE_KEY",
      ]
        .filter(Boolean)
        .join(", ")}`
    )
  }

  _app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  return _app
}

export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_t, prop) {
    return (getFirestore(getApp()) as never)[prop as never]
  },
})

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_t, prop) {
    return (getAuth(getApp()) as never)[prop as never]
  },
})
