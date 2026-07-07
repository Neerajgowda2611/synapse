import { NextRequest, NextResponse } from "next/server"

import { isAuthxEnabled } from "@/lib/authx-config"

export async function POST(request: NextRequest) {
  if (!isAuthxEnabled) {
    return NextResponse.json({ error: "AuthX is not enabled" }, { status: 400 })
  }

  const authIdpUrl = process.env.AUTH_IDP_URL
  const clientId = process.env.AUTHX_CLIENT_ID
  const clientSecret = process.env.AUTHX_CLIENT_SECRET

  if (!authIdpUrl || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "AuthX server configuration is missing" },
      { status: 500 }
    )
  }

  let body: { code?: string; codeVerifier?: string }
  try {
    body = (await request.json()) as { code?: string; codeVerifier?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { code, codeVerifier } = body
  if (!code || !codeVerifier) {
    return NextResponse.json(
      { error: "Missing code or codeVerifier" },
      { status: 400 }
    )
  }

  try {
    const discoveryRes = await fetch(
      `${authIdpUrl.replace(/\/$/, "")}/api/auth/.well-known/openid-configuration`
    )
    if (!discoveryRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch OIDC discovery" },
        { status: 502 }
      )
    }
    const discovery = (await discoveryRes.json()) as { token_endpoint: string }

    const redirectUri = `${request.nextUrl.origin}/auth/callback`

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
      }),
    })

    const data = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string
      id_token?: string
      refresh_token?: string
      expires_in?: number
      token_type?: string
      error?: string
      error_description?: string
    }

    if (!tokenRes.ok || !data.id_token) {
      return NextResponse.json(
        {
          error:
            data.error_description ||
            data.error ||
            "AuthX token exchange did not return an id_token",
        },
        { status: tokenRes.status || 500 }
      )
    }

    return NextResponse.json({
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    })
  } catch (error) {
    console.error("AuthX token exchange error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
