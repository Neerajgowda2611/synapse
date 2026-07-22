"use client"

import { createContext, useContext } from "react"

const DashboardUserContext = createContext<{ email: string; name: string }>({
  email: "",
  name: "",
})

export function DashboardUserProvider({
  email,
  name = "",
  children,
}: {
  email: string
  name?: string
  children: React.ReactNode
}) {
  return (
    <DashboardUserContext.Provider value={{ email, name }}>{children}</DashboardUserContext.Provider>
  )
}

export function useDashboardUser() {
  return useContext(DashboardUserContext)
}
