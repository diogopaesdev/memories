export interface Team {
  id: string
  name: string
  ownerId: string
  memberIds: string[]
  pendingInvites: string[]
  isPersonal: boolean
  createdAt: Date
}
