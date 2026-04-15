"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown, Download, LogOut, Plus, UserPlus } from "lucide-react"
import type { Team } from "@projectsreport/shared"

interface AppHeaderProps {
  user: { name: string; email: string; image?: string | null }
  teams: Team[]
}

export function AppHeader({ user, teams }: AppHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentTeamId = searchParams.get("team") ?? teams[0]?.id ?? ""
  const currentTeam = teams.find((tm) => tm.id === currentTeamId) ?? teams[0]

  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  function switchTeam(teamId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("team", teamId)
    router.push(`/memories?${params.toString()}`)
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success("Time criado!")
      setCreateOpen(false)
      setTeamName("")
      router.refresh()
    } catch {
      toast.error("Erro ao criar time.")
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !currentTeam) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success("Convite enviado!")
      setInviteOpen(false)
      setInviteEmail("")
    } catch {
      toast.error("Erro ao enviar convite.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

          {/* Left — Logo + Team switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="9" fill="var(--mem-ink)" />
                <circle cx="20" cy="20" r="3.5" fill="var(--mem-bg)" />
                <circle cx="20" cy="20" r="8.5" stroke="var(--mem-bg)" strokeWidth="1.5" opacity="0.55" />
                <circle cx="20" cy="20" r="14" stroke="var(--mem-bg)" strokeWidth="1" opacity="0.22" />
              </svg>
              <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--mem-ink)" }}>
                Memories
              </span>
            </div>

            <div className="w-px h-4 opacity-20" style={{ background: "var(--mem-ink)" }} />

          {/* Team switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium outline-none transition-colors hover:bg-[var(--mem-surface)]"
                style={{ color: "var(--mem-ink-2)" }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: currentTeam?.isPersonal ? "#7c6af0" : "#0ea5e9" }}
                >
                  {currentTeam?.name?.[0]?.toUpperCase() ?? "P"}
                </div>
                <span className="max-w-[120px] truncate">{currentTeam?.name ?? "Pessoal"}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Times
              </DropdownMenuLabel>
              {teams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => switchTeam(team.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: team.isPersonal ? "#7c6af0" : "#0ea5e9" }}
                  >
                    {team.name[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{team.name}</span>
                  {team.id === currentTeamId && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {currentTeam && (
                <DropdownMenuItem onClick={() => setInviteOpen(true)} className="cursor-pointer gap-2">
                  <UserPlus className="w-3.5 h-3.5" />
                  Convidar para {currentTeam.name}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer gap-2">
                <Plus className="w-3.5 h-3.5" />
                Novo time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>{/* end Left */}

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Download */}
            <a
              href="/download"
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--mem-surface)]"
              style={{ color: "var(--mem-ink-2)", border: "1px solid var(--mem-border)" }}
            >
              <Download className="w-3.5 h-3.5" />
              Baixar app
            </a>

            {/* User */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center outline-none">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback
                    className="text-[10px] font-semibold"
                    style={{ background: "var(--mem-surface)", color: "var(--mem-ink)" }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal py-2">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/download" className="flex items-center gap-2 cursor-pointer">
                    <Download className="w-4 h-4" /> Baixar app desktop
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive cursor-pointer focus:text-destructive gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </header>

      {/* Dialog: criar time */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo time</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome do time</Label>
            <Input
              placeholder="Ex: Marketing, Produto..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTeam} disabled={loading || !teamName.trim()}>
              {loading ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: convidar */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Convidar para {currentTeam?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="usuario@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>
              {loading ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
