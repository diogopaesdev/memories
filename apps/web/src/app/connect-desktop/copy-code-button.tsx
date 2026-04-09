"use client"
import { useState } from "react"

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="w-full py-2.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm font-medium text-gray-300 hover:text-white transition-colors"
    >
      {copied ? "✓ Copiado!" : "Copiar código"}
    </button>
  )
}
