# AGENTS.md - T91 Mission Control

This repository is a product codebase for Mission Control, a private operational
dashboard for agent-based companies.

## Product Intent

Mission Control helps an owner or operator answer:

- Is the ecosystem healthy right now?
- What needs owner attention?
- Which agents, tasks, crons, gateways, services, or VPS signals are degraded?
- Where should the operator click first to investigate?

The product should work first for T91, then become reusable for other companies
owned by Tony.

## Operating Model

- The UI is an intelligence and audit layer first.
- Default mode is read-only.
- Do not add external, destructive, financial, or third-party-impacting actions
  without an explicit approval flow.
- Do not make the UI a second source of truth for tasks, agent state, approvals,
  credentials, or memory.
- Prefer adapters that read from primary systems and display source freshness.

## Data Trust Labels

Every operational metric must expose one of these states:

- `live`: expected source connected and refreshed inside the accepted window.
- `snapshot`: data is recent enough for context but not live observability.
- `stale`: source exists, but freshness is outside the accepted window.
- `mock`: placeholder used while building UI.
- `not connected`: UI exists, but the source is not wired yet.

If a card cannot prove freshness, do not make it look authoritative.

## Multi-Company Configuration

Future companies should be configured through explicit company profiles rather
than hardcoded UI rewrites.

Recommended future shape:

```text
config/companies/
  t91.json
  evo.json
  apostou.json
```

Each profile should define:

- company name and slug.
- dashboard URL and deployment target.
- enabled panels.
- data adapters and trust windows.
- agent registry source.
- task ledger source.
- monitor/VPS source.
- alert routing rules.

Secrets never live in these files. Use environment variables, secret managers,
or 1Password references.

## Overview Rules

The Overview is executive triage, not a full diagnostic page.

Default Overview sections:

- Ecosystem Health.
- Task Pipeline.
- VPS Compact.
- What Needs Tony.
- Recent Signals.

Keep the Task Pipeline visible if source/freshness are clear. Remove or demote
generic Builderz widgets that are not connected to real company operations.

## Agent Workflow

Before editing:

- read this file.
- read `README.md`.
- read `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` for current direction.
- inspect existing code before introducing new abstractions.

Before shipping:

- run the smallest relevant typecheck/lint/test available.
- keep secrets out of commits.
- commit changes with a clear message.
- report what changed, what was validated, and what remains mocked/snapshot.

## Deployment Guardrails

- Do not deploy to production unless explicitly asked.
- Do not change production secrets or auth without approval.
- Keep production changes traceable to commits.
- Make rollback obvious when a production change is made.
