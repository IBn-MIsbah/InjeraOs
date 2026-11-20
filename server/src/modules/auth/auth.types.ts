export type AuthenticatedUser = {
  userId: string
  businessId: string
  membershipId?: string | undefined
  sessionId?: string | undefined
  role?: string | undefined
  permissions: string[]
}

export type AccessTokenPayload = AuthenticatedUser
