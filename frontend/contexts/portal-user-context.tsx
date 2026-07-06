"use client"

import { createContext, ReactNode, useContext } from "react"

export interface PortalUser {
  userId: string
  name: string
  email: string
}

const PortalUserContext = createContext<PortalUser | null>(null)

export function PortalUserProvider({
  user,
  children,
}: {
  user: PortalUser
  children: ReactNode
}) {
  return <PortalUserContext.Provider value={user}>{children}</PortalUserContext.Provider>
}

export function usePortalUser(): PortalUser {
  const user = useContext(PortalUserContext)
  if (!user) {
    throw new Error("usePortalUser must be used within PortalUserProvider")
  }
  return user
}
