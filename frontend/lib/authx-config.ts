export const isAuthxEnabled =
  process.env.NEXT_PUBLIC_ENABLE_AUTHX === "true"

// NEXT_PUBLIC_* values are inlined at build time, so an image built without env
// vars (CI docker build) would bake this to false. Server routes must also
// honor the runtime-only ENABLE_AUTHX set on the container.
export function isAuthxEnabledServer(): boolean {
  return process.env.ENABLE_AUTHX === "true" || isAuthxEnabled
}
