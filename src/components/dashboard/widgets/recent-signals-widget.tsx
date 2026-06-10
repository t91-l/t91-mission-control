'use client'

import type { DashboardData, LogLike } from '../widget-primitives'

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function signalTone(log: LogLike) {
  if (log.level === 'error') return 'bg-red-500'
  if (log.level === 'warn') return 'bg-amber-500'
  return 'bg-blue-500'
}

export function RecentSignalsWidget({ data }: { data: DashboardData }) {
  const { mergedRecentLogs, isSessionsLoading, navigateToPanel } = data
  const signals = mergedRecentLogs.slice(0, 5)

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold">Recent Signals</h3>
        <button
          type="button"
          onClick={() => navigateToPanel('logs')}
          className="text-2xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Logs
        </button>
      </div>

      {signals.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            {isSessionsLoading ? 'Loading signals...' : 'No relevant signals yet'}
          </p>
          <p className="mt-1 text-2xs text-muted-foreground/60">Cron failures, gateway issues, deploys, restarts, and alerts will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {signals.map((signal) => (
            <button
              key={signal.id}
              type="button"
              onClick={() => navigateToPanel('logs')}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-smooth hover:bg-secondary/30"
            >
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${signalTone(signal)}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-foreground/80">
                  {signal.message}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span>{signal.source}</span>
                  <span className="text-muted-foreground/40">-</span>
                  <span>{timeAgo(signal.timestamp)} ago</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
