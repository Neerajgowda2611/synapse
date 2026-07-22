"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Alert } from "@/components/admin/alert"
import { CopyField } from "@/components/admin/copy-field"
import { DataSourceWorkspace } from "@/components/admin/data-sources/data-source-workspace"
import { LoadingState } from "@/components/admin/loading-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import type { SetupStepId } from "@/lib/admin/setup-steps"
import {
  CredentialsResponse,
  discoverSchema,
  generateWebhookCredentials,
  getCredentials,
  getDataSource,
  storeCredentials,
  testConnection,
  webhookIngestURL,
} from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"

export default function DataSourceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { loading: authLoading } = useAdminAuth()
  const [slug, setSlug] = useState<string | undefined>()
  const [activeStep, setActiveStep] = useState<SetupStepId>("credentials")
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
  const [consentAccepted, setConsentAccepted] = useState(false)

  const isWebhook = slug === "webhook"
  const meta = getConnectorMeta(slug)

  useEffect(() => {
    if (authLoading) return

    Promise.all([getDataSource(id), getCredentials(id).catch(() => null)])
      .then(([ds, creds]) => {
        setSlug(ds.connector_definition?.slug)
        if (ds.raw_storage_consent_at) {
          setConsentAccepted(true)
        }
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

  async function generateOrSaveCredentials() {
    setError("")
    setMessage("")
    setSaving(true)
    try {
      if (isWebhook) {
        await generateWebhookCredentials(id, consentAccepted)
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
        raw_storage_consent: consentAccepted,
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
      if (isWebhook) {
        setMessage("Schema discovered — review tables and map entities.")
        router.push(`/admin/data-sources/${id}/schema`)
      } else {
        setMessage(
          "Schema saved. Raw import started for all discovered tables — check Data tab for progress."
        )
        setActiveStep("data")
        router.push(`/admin/data-sources/${id}/data`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover schema")
    } finally {
      setDiscovering(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingState label="Loading setup..." />
  }

  const ingestURL = webhookToken ? webhookIngestURL(webhookToken) : ""

  const stepCopy: Record<SetupStepId, { title: string; description: string }> = {
    credentials: {
      title: isWebhook ? "Ingest URL" : "Credentials",
      description: isWebhook
        ? "Generate a secure token and copy your endpoint."
        : "Save database host, user, and password.",
    },
    verify: {
      title: "Verify",
      description: isWebhook
        ? "Run a quick check that your ingest token is configured."
        : "Confirm Profiler can reach your PostgreSQL instance.",
    },
    discover: {
      title: "Discover",
      description: isWebhook
        ? "Send at least one payload, then discover schema."
        : "Scan tables and columns from the database.",
    },
    entities: {
      title: "Map entities",
      description: "Assign sources to learner profile domains.",
    },
    data: {
      title: "Collected data",
      description: isWebhook
        ? "Browse observations received from this webhook."
        : "Browse raw records synced from this connector.",
    },
  }

  return (
    <DataSourceWorkspace
      dataSourceId={id}
      title="Setup"
      description={
        isWebhook
          ? "Receive JSON events via HTTP and map them into learner profiles."
          : "Connect to PostgreSQL, discover tables, and map them to domains."
      }
      breadcrumbLabel="Setup"
      activeSetupStep={activeStep}
      onSetupStepClick={(stepId) => {
        if (stepId === "entities") {
          router.push(`/admin/data-sources/${id}/entities`)
          return
        }
        if (stepId === "data") {
          router.push(`/admin/data-sources/${id}/data`)
          return
        }
        setActiveStep(stepId)
      }}
    >
      <Card>
        <CardHeader className="border-b border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{stepCopy[activeStep].title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{stepCopy[activeStep].description}</p>
            </div>
            <span
              className={`hidden rounded-lg border px-2 py-1 text-xs sm:inline ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}
            >
              {meta.typeLabel}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {activeStep === "credentials" && (
            <>
              {isWebhook ? (
                <div className="space-y-5">
                  {webhookToken ? (
                    <>
                      <CopyField label="Ingest URL" value={ingestURL} />
                      <Card className="bg-muted/30">
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Example request
                          </p>
                          <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
{`curl -X POST '${ingestURL}' \\
  -H 'Content-Type: application/json' \\
  -d '{"source_id":"evt-001","payload":{"student_id":"S-22"}}'`}
                          </pre>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        Generate credentials to create your unique ingest endpoint.
                      </CardContent>
                    </Card>
                  )}
                  <RawStorageConsent
                    checked={consentAccepted}
                    onChange={setConsentAccepted}
                    disabled={Boolean(consentAccepted && webhookToken)}
                  />
                  <StepActions>
                    <Button
                      type="button"
                      onClick={generateOrSaveCredentials}
                      disabled={saving || !consentAccepted}
                    >
                      {saving
                        ? "Generating…"
                        : webhookToken
                          ? "Regenerate token"
                          : "Generate ingest URL"}
                    </Button>
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
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        <Input
                          id={key}
                          type={type}
                          value={form[key as keyof typeof form]}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, [key]: e.target.value }))
                          }
                          required={key !== "sslmode" && key !== "schema"}
                        />
                      </div>
                    ))}
                  </div>
                  <RawStorageConsent
                    checked={consentAccepted}
                    onChange={setConsentAccepted}
                    disabled={Boolean(consentAccepted && hasCredentials)}
                  />
                  <StepActions>
                    <Button type="submit" disabled={saving || !consentAccepted}>
                      {saving ? "Saving…" : "Save credentials"}
                    </Button>
                  </StepActions>
                </form>
              )}
            </>
          )}

          {activeStep === "verify" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {isWebhook
                  ? "Run a quick check that your ingest token is configured and the endpoint is ready."
                  : "Confirm Profiler can reach your PostgreSQL instance with the saved credentials."}
              </p>
              {!hasCredentials ? (
                <Alert variant="info">Complete the credentials step before testing the connection.</Alert>
              ) : null}
              <StepActions>
                <Button
                  type="button"
                  onClick={runTest}
                  disabled={testing || !hasCredentials || (isWebhook && !webhookToken)}
                >
                  {testing
                    ? "Testing…"
                    : isWebhook
                      ? "Test configuration"
                      : "Test connection"}
                </Button>
              </StepActions>
            </div>
          )}

          {activeStep === "discover" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {isWebhook
                  ? "Send at least one payload to your ingest URL, then discover schema to infer fields."
                  : "Scan the connected database and store a schema snapshot. Discovered tables import automatically."}
              </p>
              <StepActions>
                <Button
                  type="button"
                  onClick={runDiscovery}
                  disabled={discovering || !hasCredentials || (isWebhook && !webhookToken)}
                >
                  {discovering ? "Discovering…" : "Discover schema"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/admin/data-sources/${id}/schema`)}
                >
                  Open schema explorer
                </Button>
              </StepActions>
            </div>
          )}

          {activeStep === "entities" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Map each discovered table or event type to a learner profile domain.
              </p>
              <StepActions>
                <Button onClick={() => router.push(`/admin/data-sources/${id}/entities`)}>
                  Map entities
                </Button>
              </StepActions>
            </div>
          )}

          {activeStep === "data" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Browse imported records or webhook observations for this connector.
              </p>
              <StepActions>
                <Button onClick={() => router.push(`/admin/data-sources/${id}/data`)}>
                  View collected data
                </Button>
                {!isWebhook ? (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/data-sources/${id}/health`)}
                  >
                    View sync health
                  </Button>
                ) : null}
              </StepActions>
            </div>
          )}

          {message ? <Alert variant="success">{message}</Alert> : null}
          {error ? <Alert variant="error">{error}</Alert> : null}
        </CardContent>
      </Card>
    </DataSourceWorkspace>
  )
}

function StepActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 border-t border-border/60 pt-5">{children}</div>
}

function RawStorageConsent({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-3 p-4 text-sm">
        <p>
          Profiler stores a complete copy of incoming source data as JSON for processing, audit, and
          future transformation into learner profiles.
        </p>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 rounded border-input"
          />
          <span>
            I understand and consent to raw data storage in Profiler&apos;s database.
            {disabled ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                Consent recorded for this data source.
              </span>
            ) : null}
          </span>
        </label>
      </CardContent>
    </Card>
  )
}
