'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useSmartPoll } from '@/lib/use-smart-poll'
import { createClientLogger } from '@/lib/client-logger'
import { AgentAvatar } from '@/components/ui/agent-avatar'
import {
  OverviewTab,
  TasksTab,
  ActivityTab,
  FilesTab,
  ToolsTab,
  ChannelsTab,
  CronTab,
} from './agent-detail-tabs'
import {
  formatModelName,
  buildTaskStatParts,
  buildAgentAttention,
  sessionMatchesAgent,
  type AgentSessionLike,
} from '@/lib/agent-card-helpers'
import { apiFetch, ApiError } from '@/lib/api-client'
import { useMissionControl, type Agent } from '@/store'

const log = createClientLogger('AgentSquadPhase3')

interface WorkItem {
  type: string
  count: number
  items: any[]
}

interface HeartbeatResponse {
  status: 'HEARTBEAT_OK' | 'WORK_ITEMS_FOUND'
  agent: string
  checked_at: number
  work_items?: WorkItem[]
  total_items?: number
  message?: string
}

const statusColors: Record<string, string> = {
  offline: 'bg-gray-500',
  idle: 'bg-green-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
}

const statusBadgeStyles: Record<string, string> = {
  offline: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  idle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  busy: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

const statusIcons: Record<string, string> = {
  offline: '-',
  idle: 'o',
  busy: '~',
  error: '!',
}

const defaultCardStyle = {
  edge: 'from-slate-400/60 to-slate-600/30',
  glow: 'from-slate-500/10 via-transparent to-transparent',
  dot: 'bg-slate-400',
}

const statusCardStyles: Record<string, { edge: string; glow: string; dot: string }> = {
  offline: defaultCardStyle,
  idle: {
    edge: 'from-emerald-300/80 to-emerald-600/30',
    glow: 'from-emerald-400/15 via-transparent to-transparent',
    dot: 'bg-emerald-300',
  },
  busy: {
    edge: 'from-amber-300/80 to-amber-600/30',
    glow: 'from-amber-400/15 via-transparent to-transparent',
    dot: 'bg-amber-300',
  },
  error: {
    edge: 'from-rose-300/80 to-rose-600/30',
    glow: 'from-rose-400/15 via-transparent to-transparent',
    dot: 'bg-rose-300',
  },
}

export function AgentSquadPanelPhase3() {
  const t = useTranslations('agentSquadPhase3')
  const { agents, setAgents } = useMissionControl()
  const [loading, setLoading] = useState(agents.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [sessions, setSessions] = useState<AgentSessionLike[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      setError(null)
      if (agents.length === 0) setLoading(true)

      // raw:true preserves the original Response branching (apiFetch only throws on
      // 401/403/404/5xx; a 400 with {error} must still surface as before).
      // redirectOnUnauthenticated:false keeps this site's /login?next= redirect.
      let response: Response
      try {
        response = await apiFetch<Response>('/api/agents', {
          raw: true,
          redirectOnUnauthenticated: false,
        })
      } catch (apiErr) {
        if (apiErr instanceof ApiError) {
          if (apiErr.code === 'UNAUTHENTICATED') {
            window.location.assign('/login?next=%2Fagents')
            return
          }
          if (apiErr.code === 'FORBIDDEN') {
            throw new Error('Access denied')
          }
          const payload = apiErr.payload
          const payloadError =
            payload && typeof payload === 'object' && 'error' in payload
              ? (payload as { error?: string }).error
              : undefined
          throw new Error(payloadError || apiErr.message || 'Failed to fetch agents')
        }
        throw apiErr
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fetch agents')
      }

      const data = await response.json()
      setAgents(data.agents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [agents.length, setAgents])

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true)
      const data = await apiFetch<{ sessions?: AgentSessionLike[] }>('/api/sessions', {
        redirectOnUnauthenticated: false,
      })
      setSessions(Array.isArray(data?.sessions) ? data.sessions : [])
    } catch {
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  // Smart polling with visibility pause
  useSmartPoll(fetchAgents, 30000, { enabled: true, pauseWhenSseConnected: true })
  useSmartPoll(fetchSessions, 30000, { enabled: true, pauseWhenSseConnected: true })

  // Format last seen time
  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    
    const now = Date.now()
    const diffMs = now - (timestamp * 1000)
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Check if agent had recent heartbeat (within 30 minutes)
  const hasRecentHeartbeat = (agent: Agent) => {
    if (!agent.last_seen) return false
    const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - (30 * 60)
    return agent.last_seen > thirtyMinutesAgo
  }

  // Get status distribution for summary
  const statusCounts = agents.reduce((acc, agent) => {
    acc[agent.status] = (acc[agent.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const activeHeartbeatCount = agents.filter(hasRecentHeartbeat).length
  const dataFreshness = error ? 'stale' : activeHeartbeatCount > 0 ? 'live' : 'snapshot'
  const sessionLimit = 20
  const agentsByAttention = [...agents].sort((a, b) => {
    const aMatches = sessions.filter((session) => sessionMatchesAgent(session, a))
    const bMatches = sessions.filter((session) => sessionMatchesAgent(session, b))
    const aAttention = buildAgentAttention(a, {
      openSessions: aMatches.filter((session) => session.active).length,
      recentSessions: aMatches.length,
      sessionLimit,
      sessionsLoading: loadingSessions,
    })
    const bAttention = buildAgentAttention(b, {
      openSessions: bMatches.filter((session) => session.active).length,
      recentSessions: bMatches.length,
      sessionLimit,
      sessionsLoading: loadingSessions,
    })
    return bAttention.score - aAttention.score || String(a.name).localeCompare(String(b.name))
  })

  if (loading && agents.length === 0) {
    return <Loader variant="panel" label="Loading agents" />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center gap-4 p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <h2 className="text-xl font-bold text-foreground">Fleet</h2>
          
          {/* Status Summary */}
          <div className="flex gap-2 text-sm shrink-0">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1" title={status}>
                <div className={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>

          {/* Active Heartbeats Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full ${dataFreshness === 'live' ? 'bg-cyan-400 animate-pulse' : dataFreshness === 'stale' ? 'bg-rose-400' : 'bg-slate-400'}`}></div>
            <span className="text-sm text-muted-foreground">
              {dataFreshness} · {activeHeartbeatCount} active heartbeats
            </span>
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={fetchAgents}
            variant="secondary"
            size="sm"
          >
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 m-4 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button
            onClick={() => setError(null)}
            variant="ghost"
            size="icon-sm"
            className="text-red-400/60 hover:text-red-400 ml-2"
          >
            ×
          </Button>
        </div>
      )}

      {/* Agent Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
            </div>
            <p className="text-sm font-medium">{t('noAgents')}</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs text-center">
              {t('noAgentsHint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsByAttention.map(agent => {
              const modelName = formatModelName(agent.config)
              const taskStatsLine = buildTaskStatParts(agent.taskStats)
              const matchedSessions = sessions.filter((session) => sessionMatchesAgent(session, agent))
              const openSessions = matchedSessions.filter((session) => session.active)
              const recentSessions = matchedSessions.filter((session) => {
                const lastActivity = Number(session.lastActivity || 0)
                return lastActivity > 0 && lastActivity >= Date.now() - 24 * 60 * 60 * 1000
              })
              const attention = buildAgentAttention(agent, {
                openSessions: openSessions.length,
                recentSessions: recentSessions.length,
                sessionLimit,
                sessionsLoading: loadingSessions,
              })
              const attentionStyles =
                attention.level === 'critical' ? 'border-rose-500/35 bg-rose-500/10 text-rose-200' :
                attention.level === 'warning' ? 'border-amber-500/35 bg-amber-500/10 text-amber-200' :
                attention.level === 'info' ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200' :
                'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'

              return (
                <div
                  key={agent.id}
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border hover:shadow-lg cursor-pointer"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${(statusCardStyles[agent.status] || defaultCardStyle).edge}`} />
                  {agent.hidden ? <div className="absolute top-2 right-2 text-2xs text-slate-500">hidden</div> : null}

                  {/* Header: avatar + name + status */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AgentAvatar name={agent.name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                          {(agent as any).source && (agent as any).source !== 'manual' && (
                            <span className={`text-2xs px-1.5 py-0.5 rounded-full border ${
                              (agent as any).source === 'local'
                                ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                                : (agent as any).source === 'gateway'
                                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                  : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                            }`}>
                              {(agent as any).source}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {agent.role}{modelName && <> · <span className="font-mono text-muted-foreground/80">{modelName}</span></>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasRecentHeartbeat(agent) && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Recent heartbeat" />
                      )}
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeStyles[agent.status]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${(statusCardStyles[agent.status] || defaultCardStyle).dot}`} />
                        {agent.status}
                      </span>
                    </div>
                  </div>

                  {/* Task stats — inline */}
                  {taskStatsLine && (
                    <div className="text-xs text-muted-foreground mb-2 pl-0.5">
                      {taskStatsLine.map((part, i) => (
                        <span key={part.label}>
                          {i > 0 && <span className="mx-1 text-muted-foreground/40">·</span>}
                          <span className={part.color || 'text-foreground/80'}>{part.count}</span>
                          {' '}{part.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={`mb-2 rounded-md border px-2.5 py-2 text-xs ${attentionStyles}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{attention.label}</span>
                      <span className="shrink-0 text-[11px] opacity-80">
                        {loadingSessions ? 'sessions loading' : `${openSessions.length} open`}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-80 truncate" title={`${attention.reason} · ${attention.action}`}>
                      {attention.reason}
                    </div>
                  </div>

                  {/* Footer: last seen + inspect */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <span className="text-[11px] text-muted-foreground/70">
                      {formatLastSeen(agent.last_seen)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAgent(agent)
                        }}
                        size="xs"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-cyan-300 hover:bg-cyan-500/15 hover:text-cyan-200"
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModalPhase3
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onUpdate={fetchAgents}
        />
      )}
    </div>
  )
}

// Enhanced Agent Detail Modal with Tabs
function AgentDetailModalPhase3({
  agent,
  onClose,
  onUpdate
}: {
  agent: Agent
  onClose: () => void
  onUpdate: () => void
}) {
  const [agentState, setAgentState] = useState<Agent & { config?: any; working_memory?: string }>(agent as Agent & { config?: any; working_memory?: string })
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'activity' | 'files' | 'tools' | 'channels' | 'cron'>('overview')
  const [formData, setFormData] = useState({
    role: agent.role,
    session_key: agent.session_key || '',
    soul_content: agent.soul_content || '',
    working_memory: agent.working_memory || '',
    model: (() => { const p = (agent as any).config?.model?.primary; return (typeof p === 'string' ? p : p?.primary) || '' })(),
  })
  const [heartbeatData, setHeartbeatData] = useState<HeartbeatResponse | null>(null)
  const [loadingHeartbeat, setLoadingHeartbeat] = useState(false)

  useEffect(() => {
    setAgentState(agent as Agent & { config?: any; working_memory?: string })
    setFormData({
      role: agent.role,
      session_key: agent.session_key || '',
      soul_content: agent.soul_content || '',
      working_memory: (agent as any).working_memory || '',
      model: (() => { const p = (agent as any).config?.model?.primary; return (typeof p === 'string' ? p : p?.primary) || '' })(),
    })
  }, [agent])

  useEffect(() => {
    const loadCanonicalAgentData = async () => {
      // This loader degrades gracefully: each response is checked with .ok and only
      // applied on success; partial failures are silently tolerated. apiFetch throws
      // on 401/403/404/5xx, which would reject Promise.all and break that partial-
      // success contract — so each request uses raw:true and swallows the ApiError,
      // yielding null (treated as "not ok"). redirectOnUnauthenticated:false preserves
      // the original no-redirect behavior on auth failure.
      const rawGet = (path: string): Promise<Response | null> =>
        apiFetch<Response>(path, { raw: true, redirectOnUnauthenticated: false }).catch(() => null)
      try {
        const [agentRes] = await Promise.all([
          rawGet(`/api/agents/${agent.id}`),
        ])

        if (agentRes?.ok) {
          const payload = await agentRes.json()
          if (payload?.agent) {
            const freshAgent = payload.agent as Agent & { config?: any; working_memory?: string }
            setAgentState((prev) => ({ ...prev, ...freshAgent }))
            setFormData((prev) => ({
              ...prev,
              role: freshAgent.role || prev.role,
              session_key: freshAgent.session_key || '',
              model: (freshAgent as any).config?.model?.primary || prev.model,
            }))
          }
        }
      } catch (error) {
        log.error('Failed to load canonical agent data:', error)
      }
    }

    loadCanonicalAgentData()
  }, [agent.id])

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    const diffMs = Date.now() - (timestamp * 1000)
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Perform heartbeat check
  const performHeartbeat = async () => {
    setLoadingHeartbeat(true)
    try {
      // Graceful: only applied when response.ok. raw:true keeps the .ok check;
      // redirectOnUnauthenticated:false preserves the original no-redirect behavior.
      const response = await apiFetch<Response>(`/api/agents/${agent.name}/heartbeat`, {
        raw: true,
        redirectOnUnauthenticated: false,
      })
      if (response.ok) {
        const data = await response.json()
        setHeartbeatData(data)
      }
    } catch (error) {
      log.error('Failed to perform heartbeat:', error)
    } finally {
      setLoadingHeartbeat(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'O' },
    { id: 'activity', label: 'Activity', icon: 'A' },
    { id: 'tasks', label: 'Tasks', icon: 'T' },
    { id: 'files', label: 'Files', icon: 'F' },
    { id: 'tools', label: 'Tools', icon: 'W' },
    { id: 'channels', label: 'Channels', icon: 'H' },
    { id: 'cron', label: 'Cron', icon: 'R' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/80 rounded-lg shadow-2xl shadow-black/40 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 pt-5 pb-0 border-b border-border">
          <div className="flex justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <AgentAvatar name={agent.name} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground leading-tight truncate">{agentState.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeStyles[agentState.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors[agentState.status]}`} />
                    {agentState.status}
                  </span>
                  {agentState.session_key && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                      Session
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground">{agentState.role}</span>
                  <span className="text-xs text-muted-foreground/60">·</span>
                  <span className="text-xs text-muted-foreground/60">seen {formatLastSeen(agentState.last_seen)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                onClick={onClose}
                aria-label="Close agent details"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-0 overflow-x-auto -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewTab
              agent={agentState}
              editing={false}
              formData={formData}
              setFormData={setFormData}
              heartbeatData={heartbeatData}
              loadingHeartbeat={loadingHeartbeat}
              onPerformHeartbeat={performHeartbeat}
            />
          )}
          
          {activeTab === 'tasks' && (
            <TasksTab agent={agentState} />
          )}

          {activeTab === 'files' && (
            <FilesTab agent={agentState} />
          )}

          {activeTab === 'tools' && (
            <ToolsTab agent={agentState} />
          )}

          {activeTab === 'channels' && (
            <ChannelsTab agent={agentState} />
          )}

          {activeTab === 'cron' && (
            <CronTab agent={agentState} />
          )}

          {activeTab === 'activity' && (
            <ActivityTab agent={agentState} />
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentSquadPanelPhase3
