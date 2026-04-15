"use client"

import Link from "next/link"
import { Download } from "lucide-react"
import { useState } from "react"

export function DownloadAppLink() {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href="/download"
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "9px 16px", borderRadius: 12, textDecoration: "none",
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: hovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)",
        fontSize: 12, fontWeight: 500,
        backdropFilter: "blur(12px)",
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Download size={13} />
      Adicione memórias pelo app
    </Link>
  )
}
