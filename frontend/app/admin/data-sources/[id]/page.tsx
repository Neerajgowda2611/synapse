"use client"

import { FormEvent, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import {
  DataSource,
  discoverSchema,
  getCredentials,
  getDataSource,
  getMe,
  storeCredentials,
  testConnection,
} from "@/lib/api/data-sources"

export default function DataSourceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [form, setForm] = useState({
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    sslmode: "disable",
    schema: "public",
  })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [discovering, setDiscovering] = useState(false)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    Promise.all([
      getMe(),
      getDataSource(id),
      getCredentials(id).catch(() => null), // null if no credentials stored yet
    ])
      .then(([meData, ds, creds]) => {
        if (meData.user_type !== "institution") {
          router.replace("/dashboard")
          return
        }
        setDataSource(ds)
        if (creds) {
          setForm({
            host: creds.host ?? "",
            port: String(creds.port ?? 5432),
            database: creds.database ?? "",
            username: creds.username ?? "",
            password: creds.password ?? "",
            sslmode: creds.sslmode || "disable",
            schema: creds.schema || "public",
          })
        }
      })
      .catch(() => {
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [id, router])

  async function saveCredentials(e: FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    setSaving(true)
    try {
      await storeCredentials(id, {
        host: form.host,
        port: Number(form.port || 5432),
        database: form.database,
        username: form.username,
        password: form.password,
        sslmode: form.sslmode,
        schema: form.schema,
      })
      setMessage("Credentials saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials")
    } finally {
      setSaving(false)
    }
  }

  async function runTest() {
    setError("")
    setMessage("")
    setTesting(true)
    try {
      const result = await testConnection(id)
      if (result.success) {
        setMessage("Connection successful")
      } else {
        setError(result.error ?? "Connection failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setTesting(false)
    }
  }

  async function runDiscovery() {
    setError("")
    setMessage("")
    setDiscovering(true)
    try {
      await discoverSchema(id)
      setMessage("Schema discovered and stored")
      router.push(`/admin/data-sources/${id}/schema`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover schema")
    } finally {
      setDiscovering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900"
        >
          Back to data sources
        </button>

        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">{dataSource?.connector_definition?.name}</p>
          <h1 className="text-xl font-semibold text-gray-900">{dataSource?.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Add credentials, test, then discover schema.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900">Connection credentials</h2>
          <form onSubmit={saveCredentials} className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ["host", "Host"],
              ["port", "Port"],
              ["database", "Database"],
              ["username", "Username"],
              ["password", "Password"],
              ["sslmode", "SSL mode"],
              ["schema", "Schema"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <input
                  type={key === "password" ? "password" : key === "port" ? "number" : "text"}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                  required={key !== "sslmode" && key !== "schema"}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            ))}

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <button
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save credentials"}
              </button>
              <button
                type="button"
                onClick={runTest}
                disabled={testing}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {testing ? "Testing..." : "Test connection"}
              </button>
              <button
                type="button"
                onClick={runDiscovery}
                disabled={discovering}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {discovering ? "Discovering..." : "Discover schema"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/admin/data-sources/${id}/entities`)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Select entities
              </button>
            </div>
          </form>

          {message && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </main>
  )
}
