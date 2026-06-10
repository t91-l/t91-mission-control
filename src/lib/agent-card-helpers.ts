/**
 * Helpers for agent card display — extracted for testability.
 */

/** Strip provider prefix from model ID: "anthropic/claude-opus-4-5" → "claude-opus-4-5" */
export function formatModelName(config: any): string | null {
  const raw = config?.model?.primary
  const primary = typeof raw === 'string' ? raw : raw?.primary
  if (!primary || typeof primary !== 'string') return null
  const parts = primary.split('/')
  return parts[parts.length - 1]
}

export interface TaskStats {
  total: number
  assigned: number
  in_progress: number
  quality_review: number
  done: number
  completed: number
}

export interface AgentLike {
  id?: string | number
  name?: string
  role?: string
  session_key?: string
  status?: 'offline' | 'idle' | 'busy' | 'error' | string
  last_seen?: number
  last_activity?: string
  taskStats?: Partial<TaskStats> | null
}

export interface AgentSessionLike {
  id?: string
  key?: string
  agent?: string
  kind?: string
  model?: string
  tokens?: string
  channel?: string
  flags?: string[]
  active?: boolean
  startTime?: number
  lastActivity?: number
  source?: string
  totalTokens?: number
  userMessages?: number
  assistantMessages?: number
  toolUses?: number
  workingDir?: string | null
}

export interface AgentAttention {
  level: 'critical' | 'warning' | 'info' | 'ok'
  label: string
  reason: string
  impact: string
  action: string
  score: number
}

export interface TaskStatPart {
  label: string
  count: number
  color?: string
}

/** Build inline task stat parts from agent taskStats, omitting zero counts. */
export function buildTaskStatParts(stats: TaskStats | undefined | null): TaskStatPart[] | null {
  if (!stats) return null
  const parts: TaskStatPart[] = []
  if (stats.assigned) parts.push({ label: 'assigned', count: stats.assigned })
  if (stats.in_progress) parts.push({ label: 'active', count: stats.in_progress, color: 'text-amber-300' })
  if (stats.quality_review) parts.push({ label: 'review', count: stats.quality_review, color: 'text-violet-300' })
  if (stats.done) parts.push({ label: 'done', count: stats.done, color: 'text-emerald-300' })
  return parts.length > 0 ? parts : null
}

/** Extract WebSocket host from connection URL for tooltip display. */
export function extractWsHost(url: string | undefined): string {
  if (!url) return '—'
  try {
    return new URL(url.replace(/^ws/, 'http')).host
  } catch {
    return '—'
  }
}

function normalizeAgentValue(value?: string | number | null) {
  return String(value || '').trim().toLowerCase()
}

export function sessionMatchesAgent(session: AgentSessionLike, agent: AgentLike) {
  const agentName = normalizeAgentValue(agent.name)
  const agentId = normalizeAgentValue(agent.id)
  const sessionKey = normalizeAgentValue(agent.session_key)
  const candidates = [
    session.agent,
    session.key,
    session.id,
    session.workingDir,
    ...(session.flags || []),
  ].map(normalizeAgentValue)

  if (sessionKey && candidates.some((candidate) => candidate === sessionKey || candidate.includes(sessionKey))) return true
  if (agentName && candidates.some((candidate) => candidate === agentName || candidate.includes(agentName))) return true
  if (agentId && candidates.some((candidate) => candidate === agentId || candidate.includes(`agent:${agentId}`))) return true
  return false
}

export function resolveModelName(agent: AgentLike & { config?: any; model?: any }, sessions: AgentSessionLike[] = []) {
  const toStr = (x: unknown): string => {
    if (typeof x === 'string') return x
    if (x && typeof x === 'object' && typeof (x as any).primary === 'string') return (x as any).primary
    return ''
  }
  const configured = toStr((agent as any).config?.model?.primary) || toStr((agent as any).model)
  const sessionModel = sessions.find((session) => session.model)?.model || ''
  return configured || sessionModel || 'not reported'
}

export function formatAgentLastSeen(timestamp?: number, nowMs = Date.now()) {
  if (!timestamp) return 'never'
  const diffMs = nowMs - (timestamp * 1000)
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function buildAgentAttention(
  agent: AgentLike,
  options: {
    openSessions?: number
    recentSessions?: number
    sessionLimit?: number
    sessionsLoading?: boolean
    nowMs?: number
  } = {}
): AgentAttention {
  const openSessions = options.openSessions ?? 0
  const sessionLimit = options.sessionLimit ?? 20
  const nowMs = options.nowMs ?? Date.now()
  const lastSeenAgeMs = agent.last_seen ? nowMs - (agent.last_seen * 1000) : undefined
  const lastActivity = String(agent.last_activity || '').toLowerCase()
  const activeTasks = Number(agent.taskStats?.in_progress || 0)
  const assignedTasks = Number(agent.taskStats?.assigned || 0)
  const isImplantationPending =
    /implantation pending|controlled implantation|heartbeat disabled|runtime registered/i.test(agent.last_activity || '')

  if (agent.status === 'error') {
    return {
      level: 'critical',
      label: 'Error state',
      reason: 'agent reports error',
      impact: 'work may be blocked or stale',
      action: 'inspect activity and recent failures',
      score: 100,
    }
  }

  if (openSessions >= sessionLimit) {
    return {
      level: 'critical',
      label: 'Session limit reached',
      reason: `${openSessions} open / limit ${sessionLimit}`,
      impact: 'agent can slow down or stop accepting work',
      action: 'close stale sessions before adding work',
      score: 95,
    }
  }

  if (openSessions >= Math.floor(sessionLimit * 0.8)) {
    return {
      level: 'warning',
      label: 'Session load high',
      reason: `${openSessions} open / limit ${sessionLimit}`,
      impact: 'agent is approaching the slowdown zone',
      action: 'review open sessions',
      score: 80,
    }
  }

  if (agent.status === 'offline' && isImplantationPending) {
    return {
      level: 'info',
      label: 'Implantation pending',
      reason: 'heartbeat disabled until runtime is enabled',
      impact: 'offline is expected; autonomous work is not active',
      action: 'enable runtime when this agent should operate',
      score: 45,
    }
  }

  if (agent.status === 'offline') {
    return {
      level: 'warning',
      label: 'Runtime offline',
      reason: agent.last_seen ? `heartbeat ${formatAgentLastSeen(agent.last_seen, nowMs)}` : 'no heartbeat',
      impact: 'agent may not respond or run automations',
      action: 'check runtime, channel connection and credentials',
      score: 75,
    }
  }

  if (lastSeenAgeMs && lastSeenAgeMs > 30 * 60_000) {
    return {
      level: 'warning',
      label: 'Heartbeat stale',
      reason: `heartbeat ${formatAgentLastSeen(agent.last_seen, nowMs)}`,
      impact: 'status may not reflect current runtime',
      action: 'verify runtime heartbeat',
      score: 70,
    }
  }

  if (agent.status === 'idle' && (activeTasks > 0 || assignedTasks > 0)) {
    return {
      level: 'warning',
      label: 'Task mismatch',
      reason: `${activeTasks || assignedTasks} task${(activeTasks || assignedTasks) === 1 ? '' : 's'} while idle`,
      impact: 'pending work may not be moving',
      action: 'inspect tasks and activity',
      score: 65,
    }
  }

  if (agent.status === 'busy') {
    return {
      level: 'info',
      label: 'Busy',
      reason: openSessions > 0 ? `${openSessions} open session${openSessions === 1 ? '' : 's'}` : 'runtime reports busy',
      impact: 'agent is currently working',
      action: 'monitor if it stays busy too long',
      score: 35,
    }
  }

  if (lastActivity.includes('error') || lastActivity.includes('failed')) {
    return {
      level: 'warning',
      label: 'Recent failure',
      reason: 'last activity mentions a failure',
      impact: 'latest work may need review',
      action: 'open Activity for details',
      score: 60,
    }
  }

  return {
    level: 'ok',
    label: 'No action needed',
    reason: agent.last_seen ? `heartbeat ${formatAgentLastSeen(agent.last_seen, nowMs)}` : 'no active signal required',
    impact: 'agent does not need attention now',
    action: 'continue monitoring',
    score: 0,
  }
}
