import { describe, expect, it } from 'vitest'
import {
  formatModelName,
  buildTaskStatParts,
  extractWsHost,
  buildAgentAttention,
  sessionMatchesAgent,
  resolveModelName,
} from '../agent-card-helpers'

describe('formatModelName', () => {
  it('strips provider prefix from model ID', () => {
    expect(formatModelName({ model: { primary: 'anthropic/claude-opus-4-5' } }))
      .toBe('claude-opus-4-5')
  })

  it('returns model name when no prefix', () => {
    expect(formatModelName({ model: { primary: 'gpt-4o' } }))
      .toBe('gpt-4o')
  })

  it('handles deeply nested provider path', () => {
    expect(formatModelName({ model: { primary: 'openai/gpt-4/turbo' } }))
      .toBe('turbo')
  })

  it('returns null for missing config', () => {
    expect(formatModelName(null)).toBeNull()
    expect(formatModelName(undefined)).toBeNull()
    expect(formatModelName({})).toBeNull()
  })

  it('returns null for missing model', () => {
    expect(formatModelName({ model: {} })).toBeNull()
    expect(formatModelName({ model: { primary: '' } })).toBeNull()
  })

  it('returns null for non-string primary', () => {
    expect(formatModelName({ model: { primary: 42 } })).toBeNull()
    expect(formatModelName({ model: { primary: true } })).toBeNull()
  })
})

describe('buildTaskStatParts', () => {
  it('returns null for undefined stats', () => {
    expect(buildTaskStatParts(undefined)).toBeNull()
    expect(buildTaskStatParts(null)).toBeNull()
  })

  it('returns null when all counts are zero', () => {
    expect(buildTaskStatParts({
      total: 0, assigned: 0, in_progress: 0, quality_review: 0, done: 0, completed: 0,
    })).toBeNull()
  })

  it('includes only non-zero counts', () => {
    const result = buildTaskStatParts({
      total: 5, assigned: 3, in_progress: 0, quality_review: 0, done: 2, completed: 0,
    })
    expect(result).toHaveLength(2)
    expect(result![0]).toEqual({ label: 'assigned', count: 3 })
    expect(result![1]).toEqual({ label: 'done', count: 2, color: 'text-emerald-300' })
  })

  it('returns all four parts when all non-zero', () => {
    const result = buildTaskStatParts({
      total: 10, assigned: 3, in_progress: 2, quality_review: 1, done: 4, completed: 0,
    })
    expect(result).toHaveLength(4)
    expect(result!.map(p => p.label)).toEqual(['assigned', 'active', 'review', 'done'])
  })

  it('assigns correct colors to active/review/done', () => {
    const result = buildTaskStatParts({
      total: 6, assigned: 1, in_progress: 2, quality_review: 1, done: 2, completed: 0,
    })!
    expect(result.find(p => p.label === 'assigned')?.color).toBeUndefined()
    expect(result.find(p => p.label === 'active')?.color).toBe('text-amber-300')
    expect(result.find(p => p.label === 'review')?.color).toBe('text-violet-300')
    expect(result.find(p => p.label === 'done')?.color).toBe('text-emerald-300')
  })
})

describe('extractWsHost', () => {
  it('extracts host from ws:// URL', () => {
    expect(extractWsHost('ws://127.0.0.1:18789')).toBe('127.0.0.1:18789')
  })

  it('extracts host from wss:// URL', () => {
    expect(extractWsHost('wss://gateway.example.com')).toBe('gateway.example.com')
  })

  it('extracts host with port from wss:// URL', () => {
    expect(extractWsHost('wss://gateway.example.com:4443')).toBe('gateway.example.com:4443')
  })

  it('returns dash for empty/undefined URL', () => {
    expect(extractWsHost(undefined)).toBe('—')
    expect(extractWsHost('')).toBe('—')
  })

  it('returns dash for malformed URL', () => {
    expect(extractWsHost('not-a-url')).toBe('—')
  })
})

describe('sessionMatchesAgent', () => {
  it('matches by session key', () => {
    expect(sessionMatchesAgent({ key: 'iris-runtime-main' }, { id: 1, name: 'IRIS', session_key: 'iris-runtime' }))
      .toBe(true)
  })

  it('matches by agent name in flags', () => {
    expect(sessionMatchesAgent({ flags: ['agent:ARIA'] }, { id: 2, name: 'ARIA' }))
      .toBe(true)
  })
})

describe('resolveModelName', () => {
  it('prefers configured model', () => {
    expect(resolveModelName({ config: { model: { primary: 'anthropic/claude-opus-4-5' } } }, [{ model: 'openai/gpt-4o' }]))
      .toBe('anthropic/claude-opus-4-5')
  })

  it('falls back to session model', () => {
    expect(resolveModelName({}, [{ model: 'openai/gpt-4o' }])).toBe('openai/gpt-4o')
  })

  it('reports missing model explicitly', () => {
    expect(resolveModelName({}, [])).toBe('not reported')
  })
})

describe('buildAgentAttention', () => {
  it('marks error agents as critical', () => {
    const attention = buildAgentAttention({ status: 'error' })
    expect(attention.level).toBe('critical')
    expect(attention.label).toBe('Error state')
  })

  it('distinguishes implantation pending from runtime failure', () => {
    const attention = buildAgentAttention({
      status: 'offline',
      last_activity: 'runtime registered; heartbeat disabled; controlled implantation pending',
    })
    expect(attention.level).toBe('info')
    expect(attention.label).toBe('Implantation pending')
  })

  it('warns when session load is high', () => {
    const attention = buildAgentAttention({ status: 'idle' }, { openSessions: 18, sessionLimit: 20 })
    expect(attention.level).toBe('warning')
    expect(attention.label).toBe('Session load high')
  })

  it('warns when an idle agent has active tasks', () => {
    const attention = buildAgentAttention({
      status: 'idle',
      last_seen: 1_800,
      taskStats: { in_progress: 2 },
    }, { nowMs: 1_801_000 })
    expect(attention.label).toBe('Task mismatch')
  })
})
