"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Alert } from "@/components/admin/alert"
import { ConnectorIcon } from "@/components/admin/connector-icon"
import { LoadingState } from "@/components/admin/loading-state"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  ConnectorDefinition,
  createDataSource,
  listConnectors,
} from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"

export default function NewDataSourcePage() {
  const router = useRouter()
  const { me, loading: authLoading } = useAdminAuth()
  const [connectors, setConnectors] = useState<ConnectorDefinition[]>([])
  const [name, setName] = useState("")
  const [connectorDefinitionID, setConnectorDefinitionID] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedConnector = connectors.find((c) => c.id === connectorDefinitionID)

  useEffect(() => {
    if (authLoading) return

    listConnectors()
      .then((response) => {
        const items = response.data ?? []
        setConnectors(items)
        setConnectorDefinitionID(items[0]?.id ?? "")
      })
      .finally(() => setLoading(false))
  }, [authLoading])

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

  if (authLoading || loading) {
    return <LoadingState />
  }

  const selectedMeta = getConnectorMeta(selectedConnector?.slug)

  return (
    <>
      <PageHeader
        title="Add data source"
        description="Pick a connector type, name the integration, then configure credentials on the next screen."
        breadcrumbs={[
          { label: "Data sources", href: "/admin" },
          { label: "New" },
        ]}
      />
      <form onSubmit={submit} className="space-y-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            1. Choose connector
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {connectors.map((connector) => {
              const meta = getConnectorMeta(connector.slug)
              const selected = connector.id === connectorDefinitionID

              return (
                <button
                  key={connector.id}
                  type="button"
                  onClick={() => setConnectorDefinitionID(connector.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-lg border p-2 ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}
                    >
                      <ConnectorIcon slug={connector.slug} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{connector.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{meta.typeLabel}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{meta.description}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            2. Name this integration
          </h2>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-gray-700">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
              placeholder={
                selectedConnector?.slug === "webhook"
                  ? "Attendance webhook (n8n)"
                  : "ABC College student database"
              }
            />
            <p className="mt-1.5 text-xs text-gray-500">
              A label your team will recognize — it does not affect the connection itself.
            </p>
          </label>
        </section>

        {selectedConnector && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${selectedMeta.accentBg} ${selectedMeta.accentBorder}`}>
            <p className={`font-medium ${selectedMeta.accent}`}>
              {selectedConnector.slug === "webhook" ? "Next: generate ingest URL" : "Next: add database credentials"}
            </p>
            <p className="mt-1 text-gray-600">
              {selectedConnector.slug === "webhook"
                ? "You will get a URL to POST JSON payloads into Profiler."
                : "You will enter host, database, and credentials to discover tables."}
            </p>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            disabled={saving || !connectorDefinitionID || !name.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create and continue"}
          </button>
        </div>
      </form>
    </>
  )
}
