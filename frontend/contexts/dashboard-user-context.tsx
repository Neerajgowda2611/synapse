"use client"

import { createContext, useContext } from "react"

const DashboardUserContext = createContext<{ email: string }>({ email: "" })

export function DashboardUserProvider({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  return (
    <DashboardUserContext.Provider value={{ email }}>{children}</DashboardUserContext.Provider>
  )
}

export function useDashboardUser() {
  return useContext(DashboardUserContext)
}
