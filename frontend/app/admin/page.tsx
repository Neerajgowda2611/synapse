import { auth, signOut } from "@/auth"
import { api } from "@/lib/api/client"
import { redirect } from "next/navigation"

interface DataSource {
  id: string
  name: string
  status: string
  last_sync_at?: string
}

interface MeResponse {
  user_id: string
  email: string
  name: string
  user_type: string
  role: string
  institution_id?: string
}

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let me: MeResponse
  let dataSources: DataSource[] = []

  try {
    me = await api.get<MeResponse>("/api/v1/auth/me")
    if (me.user_type !== "institution") redirect("/dashboard")
    dataSources = await api.get<DataSource[]>(`/api/v1/data-sources?institution_id=${me.institution_id}`)
  } catch {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">Profiler</span>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {me!.role.replace("institution_", "").replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{me!.email}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Data Sources</h1>
          <p className="text-sm text-gray-500 mt-1">{dataSources.length} connected source{dataSources.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {dataSources.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No data sources connected yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((ds) => (
                  <tr key={ds.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{ds.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ds.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {ds.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {ds.last_sync_at ? new Date(ds.last_sync_at).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
