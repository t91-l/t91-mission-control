# Architecture

## Direction

The Mission Control should be a read-only operational intelligence layer.

Target flow:

```text
IRIS / agents / crons / VPS signals
  -> data adapter / sync layer
  -> Mission Control data store
  -> ops.t91.com.br UI
```

The UI should not become the primary source of truth for tasks, approvals,
credentials, or agent state.

## Data Trust

Every visible metric needs a clear data state:

- `live`: connected to the expected source and recently refreshed.
- `snapshot`: current enough for context, but not live observability.
- `stale`: source exists, but freshness is outside the accepted window.
- `mock`: placeholder used during UI construction.
- `not connected`: UI exists, but source is not wired yet.

## Production Guardrails

- No secrets in git.
- No destructive operations from the UI without explicit approval flow.
- No external messages or financial actions from the UI by default.
- Deploys should be versioned and reversible.
- Production changes should be traceable to commits.

## Open Questions

- Final data store for Mission Control snapshots.
- Deployment flow for `ops.t91.com.br`.
- Contract between IRIS pending ledger and Tasks page.
- Contract between VPS monitor exports and Overview health cards.
