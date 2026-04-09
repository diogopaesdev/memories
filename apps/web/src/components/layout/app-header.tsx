"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { Check, ChevronDown, LogOut, Plus, UserPlus, Mic } from "lucide-react"
import type { Team } from "@projectsreport/shared"

interface AppHeaderProps {
  user: { name: string; email: string; image?: string | null }
  teams: Team[]
}

export function AppHeader({ user, teams }: AppHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTeamId = searchParams.get("team") ?? teams[0]?.id ?? ""
  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? teams[0]

  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()

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
      <header className="sticky top-0 z-40 border-b" style={{ background: "#f5f4f0", borderColor: "#e8e6e0" }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1a1a1a" }}>
              <Mic className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>ProjectsReport</span>
          </div>

          {/* Team switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5 outline-none" style={{ color: "#1a1a1a" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: currentTeam?.isPersonal ? "#6366f1" : "#0ea5e9" }}>
                  {currentTeam?.name?.[0]?.toUpperCase() ?? "P"}
                </div>
                <span>{currentTeam?.name ?? "Pessoal"}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Times</DropdownMenuLabel>
              {teams.map((team) => (
                <DropdownMenuItem key={team.id} onClick={() => switchTeam(team.id)} className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: team.isPersonal ? "#6366f1" : "#0ea5e9" }}>
                    {team.name[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{team.name}</span>
                  {team.id === currentTeamId && <Check className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {currentTeam && (
                <DropdownMenuItem onClick={() => setInviteOpen(true)} className="cursor-pointer gap-2">
                  <UserPlus className="w-3.5 h-3.5" /> Convidar para {currentTeam.name}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer gap-2">
                <Plus className="w-3.5 h-3.5" /> Novo time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none group">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="text-[10px] font-semibold" style={{ background: "#e8e6e0", color: "#1a1a1a" }}>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal py-2">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-destructive cursor-pointer focus:text-destructive gap-2">
                <LogOut className="w-4 h-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Dialog: criar time */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo time</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome do time</Label>
            <Input placeholder="Ex: Marketing, Engenharia..." value={teamName} onChange={(e) => setTeamName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTeam} disabled={loading || !teamName.trim()}>{loading ? "Criando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: convidar */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Convidar para {currentTeam?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="colega@empresa.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>{loading ? "Enviando..." : "Convidar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
