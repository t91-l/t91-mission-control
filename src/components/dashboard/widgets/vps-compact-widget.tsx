'use client'

import { formatUptime, type DashboardData } from '../widget-primitives'

export function VpsCompactWidget({ data }: { data: DashboardData }) {
  const { systemStats, memPct, diskPct, connection, errorCount, isSystemLoading, navigateToPanel } = data

  const cpuPct = systemStats?.cpu?.usage != null ? Math.round(systemStats.cpu.usage) : null
  const uptime = systemStats?.uptime != null ? formatUptime(systemStats.uptime) : null
  const snapshotLabel = isSystemLoading ? 'loading' : 'snapshot'
  const isAttention = !connection.isConnected || errorCount > 0 || (memPct ?? 0) > 80 || (Number.isFinite(diskPct) && diskPct > 85)

  const metrics = [
    { label: 'CPU', value: cpuPct != null ? `${cpuPct}%` : 'n/a' },
    { label: 'RAM', value: memPct != null ? `${memPct}%` : 'n/a' },
    { label: 'Disk', value: Number.isFinite(diskPct) ? `${diskPct}%` : 'n/a' },
    { label: 'Uptime', value: uptime ?? 'n/a' },
  ]

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold">VPS T91</h3>
          <p className="mt-0.5 text-2xs text-muted-foreground">Compact monitor view</p>
        </div>
        <span className={`rounded-md border px-1.5 py-0.5 text-2xs font-mono-tight ${
          isAttention ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-green-500/30 bg-green-500/10 text-green-300'
        }`}>
          {snapshotLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigateToPanel('monitor')}
        className="w-full px-4 py-3 text-left hover:bg-secondary/20 transition-smooth rounded-b-lg"
      >
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border/50 bg-secondary/20 px-2.5 py-2">
              <div className="text-2xs uppercase text-muted-foreground">{metric.label}</div>
              <div className="mt-0.5 text-sm font-semibold font-mono-tight text-foreground/85">{metric.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connection.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            Gateway {connection.isConnected ? 'OK' : 'not connected'}
          </span>
          <span>Recent errors: {errorCount}</span>
        </div>
      </button>
    </div>
  )
}
