# Roadmap

## Overview

Goal: answer whether the T91 ecosystem is healthy and whether Tony needs to act.

Status: first productized UI pass in progress. The approved default Overview is
executive triage, with the Task Pipeline kept visible.

Planned sections:

- Ecosystem Health: single top-level state with freshness and causes.
- Tasks: open, overdue, awaiting Tony, running, recently completed.
- VPS Compact: uptime, CPU, memory, disk, gateway, recent errors.
- What Needs Tony: decisions, blockers, approvals, escalations.
- Recent Signals: cron failures, gateway issues, deploys, restarts, alerts.

Keep:

- Task Pipeline, as long as source and freshness are explicit.

Remove or replace:

- Generic Builderz shortcut cards.
- Decorative Fleet Status that is not connected to real T91 agents.

## Tasks

Goal: reflect the operational pending ledger without creating a second source of
truth.

Requirements:

- source and last sync visible.
- clear split between Tony-owned, agent-owned, blocked, overdue, and done.
- no silent mixing of mock tasks and real tasks.

## Monitor VPS

Goal: diagnose infrastructure health after the Overview points to a problem.

Requirements:

- VPS resource health.
- gateway and sync status.
- relevant service failures.
- recent red alerts from dashboard signals.

## Agents / Sessions

Goal: show real operational agents and session health.

Requirements:

- agent name, domain, current status, last heartbeat.
- active sessions and stuck sessions.
- no inherited placeholder workers.

## Logs / Signals

Goal: provide a concise audit trail of relevant operational events.

Requirements:

- severity.
- timestamp.
- source.
- affected system.
- link or pointer to diagnostic detail when available.

## Productization

Goal: make Mission Control reusable for Tony's other companies.

Requirements:

- agent-facing repository instructions in `AGENTS.md`.
- company profile configuration instead of hardcoded company logic.
- data contracts with explicit trust state and freshness.
- deployment docs for private/internal installs.
- adapters for each company's agents, tasks, monitors, and signal sources.
