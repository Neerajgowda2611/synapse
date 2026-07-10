export function authErrorMessage(code: string | null): string | null {
  switch (code) {
    case "user_not_provisioned":
      return "Your account is not linked to Profiler yet. Ask an administrator to add your email to the users table."
    case "authx_sub_mismatch":
      return "This Xcelerator account is linked to a different Profiler user. Contact your administrator."
    case "authx_failed":
      return "Sign in failed. Please try again."
    case "auth_failed":
      return "Authentication failed. Please try again."
    default:
      return null
  }
}
