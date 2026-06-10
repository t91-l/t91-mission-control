# Data Contracts

Mission Control should be productized through adapters. Each adapter must return
both data and trust metadata.

## Common Envelope

```ts
type TrustState = 'live' | 'snapshot' | 'stale' | 'mock' | 'not connected'

interface MissionControlEnvelope<T> {
  source: string
  trustState: TrustState
  refreshedAt: string | null
  staleAfterSeconds: number | null
  data: T
  warnings?: string[]
}
```

## Overview Inputs

The Overview should depend on these logical inputs:

- ecosystem health verdict.
- task summary.
- owner attention queue.
- VPS compact health.
- recent operational signals.

These can initially be derived from the current Builderz app state. As the
product matures, each should move behind a company-specific adapter.

## Company Profile

```ts
interface CompanyProfile {
  slug: string
  name: string
  enabledPanels: string[]
  adapters: {
    tasks?: string
    agents?: string
    monitor?: string
    signals?: string
    cost?: string
  }
}
```

No secrets belong in company profiles.
