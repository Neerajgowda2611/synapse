"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { Alert } from "@/components/admin/alert"
import { ConnectorBadge } from "@/components/admin/connector-badge"
import { CopyField } from "@/components/admin/copy-field"
import { LoadingState } from "@/components/admin/loading-state"
import { SetupSteps } from "@/components/admin/setup-steps"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  CredentialsResponse,
  DataSource,
  discoverSchema,
  generateWebhookCredentials,
  getCredentials,
  getDataSource,
  storeCredentials,
  testConnection,
  webhookIngestURL,
} from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"

type StepId = "credentials" | "verify" | "discover" | "entities" | "data"

export default function DataSourceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { me, loading: authLoading } = useAdminAuth()
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [activeStep, setActiveStep] = useState<StepId>("credentials")
  const [hasCredentials, setHasCredentials] = useState(false)
  const [verified, setVerified] = useState(false)
  const [webhookToken, setWebhookToken] = useState("")
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

  const slug = dataSource?.connector_definition?.slug
  const isWebhook = slug === "webhook"
  const meta = getConnectorMeta(slug)

  useEffect(() => {
    if (authLoading) return

    Promise.all([getDataSource(id), getCredentials(id).catch(() => null)])
      .then(([ds, creds]) => {
        setDataSource(ds)
        if (creds) {
          applyCredentials(creds)
          setHasCredentials(true)
        }
      })
      .finally(() => setLoading(false))
  }, [authLoading, id])

  function applyCredentials(creds: CredentialsResponse) {
    if ("ingest_token" in creds) {
      setWebhookToken(creds.ingest_token)
      return
    }
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

  const setupSteps = useMemo(
    () => [
      {
        id: "credentials" as const,
        label: isWebhook ? "Ingest URL" : "Credentials",
        description: isWebhook
          ? "Generate a secure token and copy your endpoint."
          : "Save database host, user, and password.",
        status: hasCredentials ? ("complete" as const) : ("current" as const),
      },
      {
        id: "verify" as const,
        label: "Verify",
        description: isWebhook ? "Confirm the endpoint is ready." : "Test the database connection.",
        status: verified
          ? ("complete" as const)
          : hasCredentials
            ? ("current" as const)
            : ("upcoming" as const),
      },
      {
        id: "discover" as const,
        label: "Discover",
        description: isWebhook
          ? "Infer schema from received payloads."
          : "Scan tables and columns from the database.",
        status: verified ? ("current" as const) : ("upcoming" as const),
      },
      {
        id: "entities" as const,
        label: "Map entities",
        description: "Assign sources to learner profile domains.",
        status: "upcoming" as const,
      },
      {
        id: "data" as const,
        label: "Collected data",
        description: "Browse raw records received from this connector.",
        status: "upcoming" as const,
      },
    ],
    [hasCredentials, isWebhook, verified]
  )

  async function generateOrSaveCredentials() {
    setError("")
    setMessage("")
    setSaving(true)
    try {
      if (isWebhook) {
        await generateWebhookCredentials(id)
        const creds = await getCredentials(id)
        applyCredentials(creds)
        setHasCredentials(true)
        setVerified(false)
        setMessage("Ingest URL ready — copy it below and send a test payload.")
        setActiveStep("verify")
        return
      }

      await storeCredentials(id, {
        host: form.host,
        port: Number(form.port || 5432),
        database: form.database,
        username: form.username,
        password: form.password,
        sslmode: form.sslmode,
        schema: form.schema,
      })
      setHasCredentials(true)
      setVerified(false)
      setMessage("Credentials saved successfully.")
      setActiveStep("verify")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials")
    } finally {
      setSaving(false)
    }
  }

  async function saveCredentials(e: FormEvent) {
    e.preventDefault()
    await generateOrSaveCredentials()
  }

  async function runTest() {
    setError("")
    setMessage("")
    setTesting(true)
    try {
      const result = await testConnection(id)
      if (result.success) {
        setVerified(true)
        setMessage(isWebhook ? "Webhook endpoint is configured." : "Connection successful.")
        setActiveStep("discover")
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
      setMessage("Schema discovered — review tables and map entities.")
      router.push(`/admin/data-sources/${id}/schema`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover schema")
    } finally {
      setDiscovering(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingState />
  }

  const baseIngestURL = webhookToken ? webhookIngestURL(webhookToken) : ""
  const typedIngestURL = webhookToken ? webhookIngestURL(webhookToken, "attendance") : ""
  const activeMeta = setupSteps.find((step) => step.id === activeStep)

  return (
    <AdminShell
      email={me?.email}
      title={dataSource?.name ?? "Data source"}
      description={
        isWebhook
          ? "Receive JSON events via HTTP and map them into learner profiles."
          : "Connect to PostgreSQL, discover tables, and map them to domains."
      }
      breadcrumbs={[
        { label: "Data sources", href: "/admin" },
        { label: dataSource?.name ?? "Details" },
      ]}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ConnectorBadge slug={slug} name={dataSource?.connector_definition?.name} />
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              dataSource?.status === "active"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {dataSource?.status}
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        <SetupSteps
          steps={setupSteps}
          activeStepId={activeStep}
          onStepClick={(stepId) => setActiveStep(stepId as StepId)}
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{activeMeta?.label}</h2>
              <p className="mt-1 text-sm text-gray-500">{activeMeta?.description}</p>
            </div>
            <span
              className={`hidden rounded-lg border px-2 py-1 text-xs sm:inline ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}
            >
              {meta.typeLabel}
            </span>
          </div>

          <div className="mt-6">
            {activeStep === "credentials" && (
              <>
                {isWebhook ? (
                  <div className="space-y-5">
                    {webhookToken ? (
                      <>
                        <CopyField
                          label="Default ingest URL (entity: unclassified)"
                          value={baseIngestURL}
                        />
                        <CopyField
                          label="Typed ingest URL (example: attendance)"
                          value={typedIngestURL}
                        />
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Example request
                          </p>
                          <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-gray-700">
{`curl -X POST '${typedIngestURL}' \\
  -H 'Content-Type: application/json' \\
  -d '{"student_id":"045","status":"present"}'`}
                          </pre>
                        </div>
                        <p className="text-xs text-amber-700">
                          Regenerating the token invalidates the previous URL. Update any
                          automations that use the old endpoint.
                        </p>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                        <p className="text-sm text-gray-600">
                          Generate credentials to create your unique ingest endpoint.
                        </p>
                      </div>
                    )}
                    <StepActions>
                      <button
                        type="button"
                        onClick={generateOrSaveCredentials}
                        disabled={saving}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {saving
                          ? "Generating..."
                          : webhookToken
                            ? "Regenerate token"
                            : "Generate ingest URL"}
                      </button>
                    </StepActions>
                  </div>
                ) : (
                  <form onSubmit={saveCredentials} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["host", "Host", "text"],
                        ["port", "Port", "number"],
                        ["database", "Database", "text"],
                        ["username", "Username", "text"],
                        ["password", "Password", "password"],
                        ["sslmode", "SSL mode", "text"],
                        ["schema", "Schema", "text"],
                      ].map(([key, label, type]) => (
                        <label key={key} className="block">
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                          <input
                            type={type}
                            value={form[key as keyof typeof form]}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, [key]: e.target.value }))
                            }
                            required={key !== "sslmode" && key !== "schema"}
                            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                          />
                        </label>
                      ))}
                    </div>
                    <StepActions>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save credentials"}
                      </button>
                    </StepActions>
                  </form>
                )}
              </>
            )}

            {activeStep === "verify" && (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">
                  {isWebhook
                    ? "Run a quick check that your ingest token is configured and the endpoint is ready to receive payloads."
                    : "Confirm Profiler can reach your PostgreSQL instance with the saved credentials."}
                </p>
                {!hasCredentials && (
                  <p className="text-sm text-amber-700">
                    Complete the credentials step before testing the connection.
                  </p>
                )}
                <StepActions>
                  <button
                    type="button"
                    onClick={runTest}
                    disabled={testing || !hasCredentials || (isWebhook && !webhookToken)}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {testing
                      ? "Testing..."
                      : isWebhook
                        ? "Test configuration"
                        : "Test connection"}
                  </button>
                </StepActions>
              </div>
            )}

            {activeStep === "discover" && (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">
                  {isWebhook
                    ? "Send at least one payload to your ingest URL, then discover schema to infer fields from received events."
                    : "Scan the connected database and store a schema snapshot of available tables and columns."}
                </p>
                {!hasCredentials && (
                  <p className="text-sm text-amber-700">Save credentials before discovering schema.</p>
                )}
                <StepActions>
                  <button
                    type="button"
                    onClick={runDiscovery}
                    disabled={discovering || !hasCredentials || (isWebhook && !webhookToken)}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {discovering ? "Discovering..." : "Discover schema"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/data-sources/${id}/schema`)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Open schema explorer
                  </button>
                </StepActions>
              </div>
            )}

            {activeStep === "entities" && (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">
                  Map each discovered table or event type to a learner profile domain — identity,
                  attendance, assessments, and more.
                </p>
                <StepActions>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/data-sources/${id}/entities`)}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Map entities
                  </button>
                </StepActions>
              </div>
            )}

            {activeStep === "data" && (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">
                  Browse raw records stored for this data source. Webhook payloads appear here
                  immediately; database sync data will appear once sync jobs are enabled.
                </p>
                <StepActions>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/data-sources/${id}/data`)}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    View collected data
                  </button>
                </StepActions>
              </div>
            )}
          </div>

          {message && (
            <div className="mt-6">
              <Alert variant="success">{message}</Alert>
            </div>
          )}
          {error && (
            <div className="mt-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  )
}

function StepActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-5">{children}</div>
}
