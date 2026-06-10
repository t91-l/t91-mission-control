'use client'

import type { DashboardData } from '../widget-primitives'

export function WhatNeedsTonyWidget({ data }: { data: DashboardData }) {
  const { reviewCount, backlogCount, runningTasks, errorCount, connection, navigateToPanel } = data

  const items = [
    ...(reviewCount > 0 ? [{
      label: `${reviewCount} task${reviewCount === 1 ? '' : 's'} waiting review`,
      detail: 'Needs owner or quality review.',
      tone: 'warn' as const,
      panel: 'tasks',
    }] : []),
    ...(errorCount > 0 ? [{
      label: `${errorCount} error signal${errorCount === 1 ? '' : 's'}`,
      detail: 'Check logs before trusting the dashboard.',
      tone: 'bad' as const,
      panel: 'logs',
    }] : []),
    ...(!connection.isConnected ? [{
      label: 'Gateway not connected',
      detail: 'Runtime link is not live; data may be partial.',
      tone: 'bad' as const,
      panel: 'monitor',
    }] : []),
    ...(backlogCount > 8 ? [{
      label: `${backlogCount} tasks in backlog`,
      detail: `${runningTasks} running right now.`,
      tone: 'warn' as const,
      panel: 'tasks',
    }] : []),
  ]

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold">What Needs Tony</h3>
        <span className="text-2xs text-muted-foreground font-mono-tight">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-foreground/75">No owner action detected.</p>
          <p className="mt-1 text-2xs text-muted-foreground">Reviews, blockers, approvals, and red signals will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigateToPanel(item.panel)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-smooth hover:bg-secondary/30"
            >
              <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.tone === 'bad' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground/85">{item.label}</span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">{item.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
