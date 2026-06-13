import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  const { callbackUrl, error } = await searchParams

  if (session) {
    redirect(callbackUrl ?? "/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Profiler</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to your account
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error === "OAuthSignin" || error === "OAuthCallback"
                ? "Sign-in failed. Please try again."
                : "Authentication error. Please contact your administrator."}
            </div>
          )}

          <form
            action={async () => {
              "use server"
              await signIn("zitadel", {
                redirectTo: callbackUrl ?? "/dashboard",
              })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Continue with Zitadel
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
