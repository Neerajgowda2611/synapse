import { auth } from "@/auth"
import { api } from "@/lib/api/client"
import { redirect } from "next/navigation"

interface MeResponse {
  user_id: string
  email: string
  name: string
  user_type: "platform" | "institution" | "learner"
  role: string
  institution_id?: string
  learner_id?: string
}

// This server component calls GET /api/v1/auth/me and routes the user
// to the correct dashboard based on their user_type.
export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let me: MeResponse | null = null

  try {
    me = await api.get<MeResponse>("/api/v1/auth/me")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401) {
      redirect("/login")
    }
    // user_not_provisioned or other error
    redirect("/login?error=user_not_provisioned")
  }

  if (!me) redirect("/login")

  switch (me.user_type) {
    case "platform":
      redirect("/platform")
    case "institution":
      redirect("/admin")
    case "learner":
      redirect("/portal")
    default:
      redirect("/login")
  }
}
