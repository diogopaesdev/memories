import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { Team } from "@projectsreport/shared"

function toTeam(doc: FirebaseFirestore.DocumentSnapshot): Team {
  const d = doc.data()!
  return {
    id: doc.id,
    name: d.name,
    ownerId: d.ownerId,
    memberIds: d.memberIds ?? [],
    pendingInvites: d.pendingInvites ?? [],
    isPersonal: d.isPersonal ?? false,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  }
}

/** Garante que o usuário tem um time Pessoal. Retorna o teamId. */
export async function ensurePersonalTeam(userId: string): Promise<string> {
  const userRef = db.collection("users").doc(userId)
  const userDoc = await userRef.get()

  if (userDoc.exists) {
    const defaultTeamId = userDoc.data()?.defaultTeamId
    if (defaultTeamId) return defaultTeamId as string
  }

  // Criar time pessoal
  const now = new Date()
  const teamRef = await db.collection("teams").add({
    name: "Pessoal",
    ownerId: userId,
    memberIds: [userId],
    pendingInvites: [],
    isPersonal: true,
    createdAt: now,
  })

  await userRef.set(
    { defaultTeamId: teamRef.id, teamIds: [teamRef.id] },
    { merge: true }
  )

  return teamRef.id
}

/** Retorna todos os times do usuário (garante pessoal criado). */
export async function getUserTeams(userId: string): Promise<Team[]> {
  const personalTeamId = await ensurePersonalTeam(userId)
  const userDoc = await db.collection("users").doc(userId).get()
  const teamIds: string[] = userDoc.data()?.teamIds ?? [personalTeamId]

  if (teamIds.length === 0) return []

  const refs = teamIds.map((id) => db.collection("teams").doc(id))
  const docs = await db.getAll(...refs)
  return docs.filter((d) => d.exists).map(toTeam)
}

/** Cria um novo time e adiciona o criador como membro. */
export async function createTeam(userId: string, name: string): Promise<Team> {
  const now = new Date()
  const ref = await db.collection("teams").add({
    name,
    ownerId: userId,
    memberIds: [userId],
    pendingInvites: [],
    isPersonal: false,
    createdAt: now,
  })

  await db
    .collection("users")
    .doc(userId)
    .set(
      { teamIds: FieldValue.arrayUnion(ref.id) },
      { merge: true }
    )

  const doc = await ref.get()
  return toTeam(doc)
}

/** Convida alguém por email para um time. */
export async function inviteToTeam(teamId: string, email: string): Promise<void> {
  await db
    .collection("teams")
    .doc(teamId)
    .update({ pendingInvites: FieldValue.arrayUnion(email.toLowerCase()) })
}

/** Aceita convites pendentes ao fazer login (chama com email do usuário). */
export async function acceptPendingInvites(userId: string, email: string): Promise<void> {
  const snap = await db
    .collection("teams")
    .where("pendingInvites", "array-contains", email.toLowerCase())
    .get()

  if (snap.empty) return

  const batch = db.batch()
  const acceptedIds: string[] = []

  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      pendingInvites: FieldValue.arrayRemove(email.toLowerCase()),
      memberIds: FieldValue.arrayUnion(userId),
    })
    acceptedIds.push(doc.id)
  }

  if (acceptedIds.length > 0) {
    batch.set(
      db.collection("users").doc(userId),
      { teamIds: FieldValue.arrayUnion(...acceptedIds) },
      { merge: true }
    )
  }

  await batch.commit()
}
