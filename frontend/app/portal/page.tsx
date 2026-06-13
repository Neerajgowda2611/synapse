import { auth, signOut } from "@/auth"
import { api } from "@/lib/api/client"
import { redirect } from "next/navigation"

interface MeResponse {
  user_id: string
  email: string
  name: string
  user_type: string
  role: string
  learner_id?: string
  institution_id?: string
}

export default async function PortalPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let me: MeResponse

  try {
    me = await api.get<MeResponse>("/api/v1/auth/me")
    if (me.user_type !== "learner") redirect("/dashboard")
  } catch {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">Profiler</span>
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Learner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{me!.name || me!.email}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Welcome, {me!.name || me!.email}
          </h1>
          <p className="text-sm text-gray-500">
            Your learner profile is being built. Check back soon.
          </p>
        </div>
      </main>
    </div>
  )
}
