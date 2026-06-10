'use client'

import { formatUptime, type DashboardData } from '../widget-primitives'

type HealthTone = 'good' | 'warn' | 'bad'

function toneClasses(tone: HealthTone) {
  if (tone === 'good') return 'border-green-500/25 bg-green-500/10 text-green-300'
  if (tone === 'warn') return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  return 'border-red-500/25 bg-red-500/10 text-red-300'
}

function statusLabel(tone: HealthTone) {
  if (tone === 'good') return 'Healthy'
  if (tone === 'warn') return 'Attention'
  return 'Critical'
}

export function EcosystemHealthWidget({ data }: { data: DashboardData }) {
  const {
    connection,
    errorCount,
    recentErrorLogs,
    runningTasks,
    reviewCount,
    backlogCount,
    onlineAgents,
    dbStats,
    agents,
    memPct,
    diskPct,
    systemStats,
    isSystemLoading,
    navigateToPanel,
  } = data

  const agentTotal = dbStats?.agents.total ?? agents.length
  const hasBadSystem = !isSystemLoading && ((memPct ?? 0) >= 90 || (Number.isFinite(diskPct) && diskPct >= 92))
  const hasGatewayIssue = !connection.isConnected
  const hasErrors = errorCount > 0 || recentErrorLogs > 0
  const hasTaskPressure = reviewCount > 0 || backlogCount > 8

  const tone: HealthTone = hasGatewayIssue || hasBadSystem
    ? 'bad'
    : hasErrors || hasTaskPressure
      ? 'warn'
      : 'good'

  const uptime = systemStats?.uptime != null ? formatUptime(systemStats.uptime) : 'unknown'
  const freshness = isSystemLoading ? 'loading' : 'snapshot'

  const causes = [
    {
      label: 'Gateway',
      value: connection.isConnected ? `OK${connection.latency != null ? ` - ${connection.latency}ms` : ''}` : 'not connected',
      tone: connection.isConnected ? 'good' as const : 'bad' as const,
      panel: 'monitor',
    },
    {
      label: 'VPS T91',
      value: isSystemLoading
        ? 'loading'
        : `uptime ${uptime}${memPct != null ? ` - RAM ${memPct}%` : ''}${Number.isFinite(diskPct) ? ` - disk ${diskPct}%` : ''}`,
      tone: hasBadSystem ? 'bad' as const : isSystemLoading ? 'warn' as const : 'good' as const,
      panel: 'monitor',
    },
    {
      label: 'Tasks',
      value: `${runningTasks} running - ${reviewCount} review - ${backlogCount} backlog`,
      tone: hasTaskPressure ? 'warn' as const : 'good' as const,
      panel: 'tasks',
    },
    {
      label: 'Agents',
      value: agentTotal > 0 ? `${onlineAgents}/${agentTotal} online` : 'not connected',
      tone: agentTotal > 0 && onlineAgents > 0 ? 'good' as const : 'warn' as const,
      panel: 'agents',
    },
    {
      label: 'Signals',
      value: hasErrors ? `${Math.max(errorCount, recentErrorLogs)} error signal${Math.max(errorCount, recentErrorLogs) === 1 ? '' : 's'}` : 'no red signals',
      tone: hasErrors ? 'warn' as const : 'good' as const,
      panel: 'logs',
    },
  ]

  return (
    <section className={`rounded-xl border px-4 py-4 ${toneClasses(tone)}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-medium uppercase text-current/70">Ecosystem Health</span>
            <span className="rounded-md border border-current/20 px-1.5 py-0.5 text-2xs font-mono-tight text-current/70">
              {freshness}
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-normal text-foreground">{statusLabel(tone)}</div>
          <p className="max-w-2xl text-xs leading-relaxed text-foreground/70">
            T91 Mission Control is using current app signals plus operational snapshots.
            Any source that is not fully wired must stay visible as snapshot, stale, mock, or not connected.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5 lg:min-w-[620px]">
          {causes.map((cause) => (
            <button
              key={cause.label}
              type="button"
              onClick={() => navigateToPanel(cause.panel)}
              className="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-left transition-smooth hover:border-primary/40 hover:bg-card"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs uppercase text-muted-foreground">{cause.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  cause.tone === 'good' ? 'bg-green-500' : cause.tone === 'warn' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="mt-1 truncate text-xs font-medium text-foreground/85">{cause.value}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
