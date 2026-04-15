"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, X, Clock, Layers } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const W = 1200
const H = 700
const CX = W / 2
const CY = H / 2

function sr(n: number) {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

function round(v: number, dec = 3) {
  const f = 10 ** dec
  return Math.round(v * f) / f
}

const STARS = Array.from({ length: 70 }, (_, i) => ({
  id:  i,
  cx:  round(sr(i * 5 + 1) * W),
  cy:  round(sr(i * 5 + 2) * H),
  r:   round(sr(i * 5 + 3) * 1.0 + 0.3),
  op:  round(sr(i * 5 + 4) * 0.14 + 0.03),
  dur: round(sr(i * 5 + 0) * 3 + 2.5),
}))

const COLOR_MAP: Record<string, string> = {
  blue: "#3b82f6", green: "#22c55e", violet: "#8b5cf6",
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b",
  teal: "#14b8a6", pink: "#ec4899", slate: "#64748b",
}

export interface ConstellationMemory {
  ts:    number
  title: string
  ago:   string
  href:  string
}

export interface ConstellationProject {
  id:          string
  name:        string
  description?: string | null
  color?:       string | null
  reportCount:  number
  href:         string
  ago:          string
  createdAt:    number
  memories:     ConstellationMemory[]
}

function getPositions(projects: { createdAt: number }[]): { x: number; y: number }[] {
  if (projects.length === 0) return []
  const dates  = projects.map(p => p.createdAt)
  const minTs  = Math.min(...dates)
  const maxTs  = Math.max(...dates)
  const range  = maxTs - minTs || 1
  const R_NEAR = 160
  const R_FAR  = 440
  return projects.map((p, i) => {
    const angle   = (i / projects.length) * Math.PI * 2 - Math.PI / 2
    const recency = (p.createdAt - minTs) / range
    const r       = R_FAR - recency * (R_FAR - R_NEAR)
    return { x: round(CX + Math.cos(angle) * r), y: round(CY + Math.sin(angle) * r) }
  })
}

interface TooltipState { node: ConstellationProject; x: number; y: number }

type PanelContent =
  | { kind: "project"; project: ConstellationProject }
  | { kind: "memory";  memory: ConstellationMemory; project: ConstellationProject }

const PANEL_W = 300

export function ConstellationView({ projects, teamName }: { projects: ConstellationProject[]; teamName?: string }) {
  const [tooltip, setTooltip]       = useState<TooltipState | null>(null)
  const [panel, setPanel]           = useState<PanelContent | null>(null)
  const [hoveredId, setHoveredId]   = useState<string | null>(null)
  const [hoveredMem, setHoveredMem] = useState<{ projectId: string; dotIndex: number; x: number; y: number } | null>(null)

  const positions = getPositions(projects)

  function closePanel() { setPanel(null) }

  if (projects.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <motion.svg
            width="64" height="64" viewBox="0 0 40 40"
            style={{ display: "block", margin: "0 auto 20px" }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx="20" cy="20" r="3.5" fill="white" />
            <circle cx="20" cy="20" r="8.5" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" />
            <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="1" fill="none" opacity="0.15" />
          </motion.svg>
          <p style={{ fontSize: 13, color: "#2e2e2b" }}>Nenhum projeto ainda</p>
          <p style={{ fontSize: 11, color: "#222", marginTop: 4 }}>
            Crie um projeto ou registre uma memória pelo app
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        width="100%" height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0 }}
        onClick={closePanel}
      >
        {/* Star field */}
        {STARS.map((s) => (
          <motion.circle
            key={`star-${s.id}`}
            cx={s.cx} cy={s.cy} r={s.r} fill="white"
            animate={{ opacity: [s.op, s.op * 3.5, s.op] }}
            transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: sr(s.id) * 2 }}
          />
        ))}

        {/* Connecting lines */}
        {positions.map((pos, i) => {
          const p = projects[i]
          if (!p) return null
          const color   = COLOR_MAP[p.color ?? "slate"] ?? "#64748b"
          const hovered = hoveredId === p.id
          return (
            <motion.line
              key={`line-${p.id}`}
              x1={CX} y1={CY} x2={pos.x} y2={pos.y}
              stroke={hovered ? color : "rgba(255,255,255,0.055)"}
              strokeWidth={hovered ? 1.5 : 0.7}
              strokeDasharray={hovered ? "none" : "4 12"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.7 }}
              style={{ transition: "stroke 0.3s, stroke-width 0.25s" }}
            />
          )
        })}

        {/* Sonar rings */}
        {[0, 1, 2, 3].map((i) => (
          <motion.circle key={`sonar-${i}`} cx={CX} cy={CY} r={80}
            fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1}
            animate={{ r: [80, 320], opacity: [0.10, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeOut", delay: i * 1.4 }}
          />
        ))}

        {/* Center orb */}
        <motion.circle cx={CX} cy={CY} fill="rgba(255,255,255,0.012)"
          animate={{ r: [110, 140, 110], opacity: [0.012, 0.025, 0.012] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        {[90, 70, 52].map((r, i) => (
          <motion.circle key={`oring-${i}`} cx={CX} cy={CY} r={r}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5"
            animate={{ opacity: [0.05, 0.13, 0.05] }}
            transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
        <motion.circle cx={CX} cy={CY}
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5}
          animate={{ r: [38, 43, 38] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle cx={CX} cy={CY} fill="rgba(255,255,255,0.04)"
          animate={{ r: [28, 32, 28] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.circle cx={CX} cy={CY} fill="white"
          animate={{ r: [10, 12, 10], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Team name */}
        {teamName && (
          <>
            <text x={CX} y={CY + 58} textAnchor="middle"
              fill="rgba(255,255,255,0.55)" fontSize={13} fontWeight={600} letterSpacing={1}
              style={{ userSelect: "none", fontFamily: "inherit" }}>
              {teamName}
            </text>
            <text x={CX} y={CY + 73} textAnchor="middle"
              fill="rgba(255,255,255,0.18)" fontSize={8} letterSpacing={2.5}
              style={{ userSelect: "none", fontFamily: "inherit" }}>
              WORKSPACE
            </text>
          </>
        )}

        {/* Project nodes */}
        {positions.map((pos, i) => {
          const p = projects[i]
          if (!p) return null
          const color    = COLOR_MAP[p.color ?? "slate"] ?? "#64748b"
          const hovered  = hoveredId === p.id
          const baseR    = 8 + Math.min(p.reportCount * 0.5, 6)
          const dotCount = Math.min(p.memories.length > 0 ? p.memories.length : p.reportCount, 10)

          const MEM_R_NEAR = baseR + 16
          const MEM_R_FAR  = baseR + 52
          const memDots = Array.from({ length: dotCount }).map((_, di) => {
            const angle   = (di / dotCount) * Math.PI * 2 - Math.PI / 2
            const recency = dotCount > 1 ? 1 - di / (dotCount - 1) : 1
            const r       = MEM_R_FAR - recency * (MEM_R_FAR - MEM_R_NEAR)
            return {
              x: round(pos.x + Math.cos(angle) * r),
              y: round(pos.y + Math.sin(angle) * r),
              mem: p.memories[di] ?? null,
            }
          })

          const fy  = (sr(i * 11 + 1) - 0.5) * 12
          const fx  = (sr(i * 11 + 2) - 0.5) * 7
          const dur = sr(i * 11 + 3) * 3 + 3.5
          const del = sr(i * 11 + 4) * 2
          const memHovered = hoveredMem?.projectId === p.id ? hoveredMem.dotIndex : null

          return (
            <motion.g
              key={`node-${p.id}`}
              animate={{ y: [0, fy, 0, -fy * 0.6, 0], x: [0, fx, 0, -fx * 0.6, 0] }}
              transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: del }}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => { setHoveredId(p.id); setTooltip({ node: p, x: pos.x, y: pos.y }) }}
              onMouseLeave={() => { setHoveredId(null); setTooltip(null) }}
              onClick={(e) => { e.stopPropagation(); setPanel({ kind: "project", project: p }) }}
            >
              {/* Memory dots */}
              {dotCount > 0 && (
                <>
                  {memHovered !== null && (
                    <motion.line
                      x1={memDots[memHovered].x} y1={memDots[memHovered].y}
                      x2={pos.x} y2={pos.y}
                      stroke={color} strokeWidth={1.5}
                      initial={{ opacity: 0 }} animate={{ opacity: 0.75 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  {memDots.map(({ x: mx, y: my, mem }, di) => {
                    const pulseDur   = sr(i * 17 + di * 3) * 1.5 + 2
                    const pulseDelay = sr(i * 17 + di * 3 + 1) * 2
                    const isMemHov   = memHovered === di
                    return (
                      <motion.circle
                        key={`mem-${di}`}
                        cx={mx} cy={my} fill={color}
                        opacity={isMemHov ? 1 : hovered ? 0.9 : 0.55}
                        animate={{ r: isMemHov ? [5, 7, 5] : [3.5, 5.5, 3.5] }}
                        transition={{ duration: pulseDur, repeat: Infinity, ease: "easeInOut", delay: pulseDelay }}
                        style={{ cursor: mem ? "pointer" : "default", transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => {
                          e.stopPropagation()
                          setHoveredMem({ projectId: p.id, dotIndex: di, x: mx, y: my })
                          setHoveredId(p.id)
                          setTooltip(null)
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation()
                          setHoveredMem(null)
                          setHoveredId(null)
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (mem) setPanel({ kind: "memory", memory: mem, project: p })
                        }}
                      />
                    )
                  })}
                </>
              )}

              {/* Glow halo */}
              <circle cx={pos.x} cy={pos.y} r={hovered ? baseR + 16 : 0}
                fill={color} opacity={0.1} style={{ transition: "r 0.2s ease" }} />
              {/* Pulse ring */}
              <circle cx={pos.x} cy={pos.y} r={hovered ? baseR + 9 : 0}
                fill="none" stroke={color} strokeWidth="1" opacity={0.45}
                style={{ transition: "r 0.18s ease" }} />
              {/* Node body */}
              <circle cx={pos.x} cy={pos.y} r={hovered ? baseR + 2.5 : baseR}
                fill={color} opacity={hovered ? 1 : 0.72}
                style={{ transition: "r 0.15s ease, opacity 0.15s ease" }} />
              <circle cx={pos.x} cy={pos.y} r={2} fill="rgba(255,255,255,0.85)" />
            </motion.g>
          )
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && !panel && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.13 }}
            style={{
              position: "absolute",
              left: `${(tooltip.x / W) * 100}%`,
              top: `${(tooltip.y / H) * 100}%`,
              transform: tooltip.x > W * 0.62
                ? "translate(calc(-100% - 18px), -50%)"
                : "translate(18px, -50%)",
              pointerEvents: "none", zIndex: 20,
            }}
          >
            <div style={{
              background: "#0f0f0e", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12, padding: "10px 14px", minWidth: 180,
              boxShadow: "0 8px 40px rgba(0,0,0,0.75)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: COLOR_MAP[tooltip.node.color ?? "slate"] ?? "#64748b", flexShrink: 0,
                }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "#f0ede8" }}>{tooltip.node.name}</p>
              </div>
              <p style={{ fontSize: 10, color: "#444" }}>
                {tooltip.node.reportCount} {tooltip.node.reportCount === 1 ? "memória" : "memórias"} · {tooltip.node.ago}
              </p>
              {tooltip.node.description && (
                <p style={{ fontSize: 10, color: "#303030", marginTop: 5, lineHeight: 1.5 }}>
                  {tooltip.node.description.slice(0, 80)}{tooltip.node.description.length > 80 ? "…" : ""}
                </p>
              )}
              <p style={{ fontSize: 9, color: "#282825", marginTop: 5 }}>Clique para abrir</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left panel */}
      <AnimatePresence>
        {panel && (
          <motion.div
            key="left-panel"
            initial={{ x: -(PANEL_W + 40), opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -(PANEL_W + 40), opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            style={{
              position: "fixed",
              left: 24, top: "50%",
              transform: "translateY(-50%)",
              zIndex: 60,
              width: PANEL_W,
              background: "#0e0e0d",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {panel.kind === "project" ? (
              <ProjectPanel project={panel.project} onClose={closePanel} />
            ) : (
              <MemoryPanel memory={panel.memory} project={panel.project} onClose={closePanel} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Project panel ── */
function ProjectPanel({ project: p, onClose }: { project: ConstellationProject; onClose: () => void }) {
  const color = COLOR_MAP[p.color ?? "slate"] ?? "#64748b"
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, marginBottom: 10 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0ede8", margin: 0, lineHeight: 1.2 }}>{p.name}</h2>
          {p.description && (
            <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginTop: 6 }}>{p.description}</p>
          )}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#333", padding: 4, flexShrink: 0, marginLeft: 8 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#888")}
          onMouseLeave={e => (e.currentTarget.style.color = "#333")}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 10, background: "#131312", border: "1px solid #1e1e1c" }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#f0ede8", lineHeight: 1 }}>{p.reportCount}</p>
          <p style={{ fontSize: 8, color: "#3a3a37", marginTop: 4, letterSpacing: "0.08em" }}>MEMÓRIAS</p>
        </div>
        <div style={{ flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 10, background: "#131312", border: "1px solid #1e1e1c" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#555", lineHeight: 1.3 }}>{p.ago}</p>
          <p style={{ fontSize: 8, color: "#3a3a37", marginTop: 4, letterSpacing: "0.08em" }}>ÚLTIMA ATIVIDADE</p>
        </div>
      </div>

      {/* Recent memories list */}
      {p.memories.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 9, color: "#333", letterSpacing: "0.1em", marginBottom: 8 }}>MEMÓRIAS RECENTES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {p.memories.slice(0, 4).map((m) => (
              <Link key={m.href} href={m.href} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                borderRadius: 8, textDecoration: "none", background: "#131312",
                border: "1px solid #1e1e1c", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1a1a18")}
                onMouseLeave={e => (e.currentTarget.style.background = "#131312")}
              >
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "#bbb", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</p>
                <p style={{ fontSize: 9, color: "#333", flexShrink: 0 }}>{m.ago}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href={p.href} onClick={onClose} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px", borderRadius: 10, textDecoration: "none",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
        color: "#f0ede8", fontSize: 13, fontWeight: 600, transition: "background 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.11)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      >
        <ExternalLink size={13} /> Abrir projeto
      </Link>
    </div>
  )
}

/* ── Memory panel ── */
function MemoryPanel({ memory: m, project: p, onClose }: { memory: ConstellationMemory; project: ConstellationProject; onClose: () => void }) {
  const color = COLOR_MAP[p.color ?? "slate"] ?? "#64748b"
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Project breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <p style={{ fontSize: 10, color: "#444", fontWeight: 500 }}>{p.name}</p>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0ede8", margin: 0, lineHeight: 1.3 }}>{m.title}</h2>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#333", padding: 4, flexShrink: 0, marginLeft: 8 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#888")}
          onMouseLeave={e => (e.currentTarget.style.color = "#333")}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#131312", border: "1px solid #1e1e1c" }}>
          <Clock size={12} color="#333" />
          <p style={{ fontSize: 11, color: "#555" }}>{m.ago}</p>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#131312", border: "1px solid #1e1e1c" }}>
          <Layers size={12} color="#333" />
          <p style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
        </div>
      </div>

      <Link href={m.href} onClick={onClose} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px", borderRadius: 10, textDecoration: "none",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
        color: "#f0ede8", fontSize: 13, fontWeight: 600, transition: "background 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.11)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      >
        <ExternalLink size={13} /> Abrir memória
      </Link>
    </div>
  )
}
