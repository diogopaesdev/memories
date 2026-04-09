"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderKanban, Download, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/memories", label: "Memórias", icon: FolderKanban },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shrink-0">
          <Mic className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-slate-800 text-sm tracking-tight leading-none">
          Projects<span className="text-blue-500">Report</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-blue-500" : "text-slate-400")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — download desktop */}
      <div className="p-3 border-t">
        <Link
          href="/download"
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
        >
          <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0 group-hover:border-blue-200 transition-colors">
            <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 leading-none">App desktop</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Captura por voz</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
