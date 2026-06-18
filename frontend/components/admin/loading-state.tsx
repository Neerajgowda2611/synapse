export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        {label}
      </div>
    </div>
  )
}
