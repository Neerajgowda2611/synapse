"use client"

import { useState } from "react"

type CopyFieldProps = {
  label: string
  value: string
  mono?: boolean
}

export function CopyField({ label, value, mono = true }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="mt-1.5 flex gap-2">
        <input
          readOnly
          value={value}
          className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 ${
            mono ? "font-mono" : ""
          }`}
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}
