import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://memories.app"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Memories",
    template: "%s · Memories",
  },
  description:
    "Capture project memories by voice. Organized, searchable, and shared with your team. Record what you did — let AI structure it.",
  keywords: [
    "voice notes",
    "project memories",
    "voice recording",
    "AI transcription",
    "team collaboration",
    "project management",
    "memórias de projeto",
    "gravação por voz",
  ],
  authors: [{ name: "Memories" }],
  creator: "Memories",
  applicationName: "Memories",
  category: "productivity",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    alternateLocale: ["en_US"],
    url: APP_URL,
    siteName: "Memories",
    title: "Memories — Capture project memories by voice",
    description:
      "Record what you did, let AI organize it. Shared with your team instantly.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Memories — Capture project memories by voice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Memories",
    description:
      "Capture project memories by voice. Organized and shared with your team.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Prevent dark-mode flash before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('mem-theme')||'system';const d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch{}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
