"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import {
  ConnectorDefinition,
  MeResponse,
  createDataSource,
  getMe,
  listConnectors,
} from "@/lib/api/data-sources"

export default function NewDataSourcePage() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [connectors, setConnectors] = useState<ConnectorDefinition[]>([])
  const [name, setName] = useState("")
  const [connectorDefinitionID, setConnectorDefinitionID] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    Promise.all([getMe(), listConnectors()])
      .then(([meData, connectorData]) => {
        if (meData.user_type !== "institution") {
          router.replace("/dashboard")
          return
        }
        setMe(meData)
        setConnectors(connectorData.data ?? [])
        setConnectorDefinitionID(connectorData.data?.[0]?.id ?? "")
      })
      .catch(() => {
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!me?.institution_id) {
      setError("Institution context is missing")
      return
    }

    setSaving(true)
    try {
      const dataSource = await createDataSource({
        institution_id: me.institution_id,
        connector_definition_id: connectorDefinitionID,
        name,
      })
      router.push(`/admin/data-sources/${dataSource.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create data source")
    } finally {
      setSaving(false)
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900"
        >
          Back to data sources
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900">Create data source</h1>
          <p className="mt-1 text-sm text-gray-500">
            Register the external system before adding credentials.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="ABC College PostgreSQL"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Connector</span>
              <select
                value={connectorDefinitionID}
                onChange={(e) => setConnectorDefinitionID(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {connectors.map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
              </select>
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              disabled={saving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create data source"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
