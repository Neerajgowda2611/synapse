"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className={cn(mono && "font-mono text-xs")} />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}
