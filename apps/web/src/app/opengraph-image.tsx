import { ImageResponse } from "next/og"

export const alt = "Memories — Capture project memories by voice"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#f5f4f0",
          flexDirection: "column",
          gap: 28,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="4.5" fill="#f0ede8" />
            <circle cx="26" cy="26" r="11" stroke="#f0ede8" strokeWidth="2" opacity="0.55" />
            <circle cx="26" cy="26" r="18" stroke="#f0ede8" strokeWidth="1.5" opacity="0.22" />
          </svg>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#1a1a1a",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Memories
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#7a7570",
            fontWeight: 400,
            marginTop: -8,
          }}
        >
          Capture project memories by voice
        </div>

        {/* Bottom accent dots */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
          }}
        >
          {[1, 0.5, 0.25].map((o, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#1a1a1a",
                opacity: o,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
