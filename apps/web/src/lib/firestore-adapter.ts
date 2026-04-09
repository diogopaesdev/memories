import type { Firestore, Query, CollectionReference } from "firebase-admin/firestore"

type WhereOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "contains"

interface Where {
  field: string
  value: unknown
  operator?: WhereOperator
}

function applyWhere(ref: CollectionReference | Query, where: Where[]): Query {
  let q: Query = ref as Query
  for (const w of where) {
    const op = w.operator ?? "eq"
    const firestoreOp =
      op === "eq" ? "==" :
      op === "ne" ? "!=" :
      op === "lt" ? "<" :
      op === "lte" ? "<=" :
      op === "gt" ? ">" :
      op === "gte" ? ">=" :
      op === "in" ? "in" :
      "array-contains"
    q = q.where(w.field, firestoreOp, w.value)
  }
  return q
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export function firestoreAdapter(db: Firestore) {
  return {
    id: "firestore",

    async create({ model, data }: { model: string; data: AnyRecord }) {
      const id = data.id ?? db.collection(model).doc().id
      const ref = db.collection(model).doc(id)
      const doc = { ...data, id }
      await ref.set(doc)
      return doc
    },

    async findOne({ model, where }: { model: string; where: Where[] }) {
      const snap = await applyWhere(db.collection(model), where).limit(1).get()
      if (snap.empty) return null
      return snap.docs[0].data()
    },

    async findMany({
      model,
      where,
      limit,
      offset,
      sortBy,
    }: {
      model: string
      where?: Where[]
      limit?: number
      offset?: number
      sortBy?: { field: string; direction: "asc" | "desc" }
    }) {
      let q: Query = db.collection(model) as unknown as Query
      if (where?.length) q = applyWhere(db.collection(model), where)
      if (sortBy) q = q.orderBy(sortBy.field, sortBy.direction)
      if (offset) q = q.offset(offset)
      if (limit) q = q.limit(limit)
      const snap = await q.get()
      return snap.docs.map((d) => d.data())
    },

    async update({ model, where, update }: { model: string; where: Where[]; update: AnyRecord }) {
      const snap = await applyWhere(db.collection(model), where).limit(1).get()
      if (snap.empty) return null
      await snap.docs[0].ref.update(update)
      return { ...snap.docs[0].data(), ...update }
    },

    async updateMany({ model, where, update }: { model: string; where: Where[]; update: AnyRecord }) {
      const snap = await applyWhere(db.collection(model), where).get()
      const batch = db.batch()
      snap.docs.forEach((doc) => batch.update(doc.ref, update))
      await batch.commit()
      return snap.size
    },

    async delete({ model, where }: { model: string; where: Where[] }) {
      const snap = await applyWhere(db.collection(model), where).limit(1).get()
      if (!snap.empty) await snap.docs[0].ref.delete()
    },

    async deleteMany({ model, where }: { model: string; where: Where[] }) {
      const snap = await applyWhere(db.collection(model), where).get()
      const batch = db.batch()
      snap.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
      return snap.size
    },
  }
}
