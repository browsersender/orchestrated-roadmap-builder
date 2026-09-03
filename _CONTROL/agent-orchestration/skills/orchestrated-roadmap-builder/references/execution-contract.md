# Execution Contract

## Canonical Inputs

- `campaign.json`: architecture, dependency graph, ownership, task profiles, gates, and evidence policy.
- `execution-state.json`: current lifecycle truth and evidence pointers.
- `ROADMAP-SET.md`: human-readable intent and retained emergence directions.
- Source revision: the frozen base from which worker branches start.

## Compiler Commands

Run from the Product Warehouse orchestration source root:

```powershell
node _CONTROL/agent-orchestration/scripts/roadmap-orchestrator.mjs validate <campaign.json>
node _CONTROL/agent-orchestration/scripts/roadmap-orchestrator.mjs plan <campaign.json> <execution-state.json>
$env:SOLA_ORCHESTRATION_WORKSPACE_ROOT = '<isolated-worktree>'
$env:SOLA_ORCHESTRATION_ROADMAP_IDS = 'ORB-R02'
node _CONTROL/agent-orchestration/scripts/roadmap-orchestrator.mjs compile <campaign.json> <execution-state.json> <packet-output>
```

Selective compilation refuses an unknown roadmap or one outside the current collision-safe wave. The original campaign hash remains stable while exact worker paths are retargeted.

## Worker Boundary

A worker packet must retain:

- campaign, roadmap, packet, source, policy, and bar-catalog identities;
- exact inputs and absolute owned outputs;
- prohibited paths and target portability rule;
- every roadmap phase and both sides of every phase gate;
- protocol fixtures, normalization, algorithms, counters, and evidence ceilings when the task depends on them;
- no-history and no-child-worker requirements;
- evidence reuse and rerun triggers;
- a return capped at 300 words.

The worker commits only its bounded branch. It reports status, commit, changed paths, checks, blockers, sparks, and integration notes. It cannot mark its roadmap verified.

The portable worker launcher consumes the compiled v2 packet and its brief. It does not compile roadmaps, create worktrees, lease work, integrate commits, or update campaign state. Those remain coordinator actions. This separation lets Codex CLI and Claude CLI execute the same frozen assignment without either provider silently changing scope.

## Lifecycle

```text
not_started -> ready -> leased -> running -> review -> integrating -> verified
                                |          |
                                +-> failed +-> ready after one bounded correction
leased/running -> expired -> ready with recovery receipt
```

Illegal transitions, double leases, mismatched workers, stale source identities, broken event chains, and out-of-scope writes must refuse without mutating current state.

Capacity checks apply to the packet's target volume only when the assignment declares a concrete byte requirement. There is no arbitrary machine-wide or `C:`-drive free-space floor.

## Routing

- Luna: frozen, bounded, mechanically checkable kernels, fixtures, transforms, and schema work.
- Terra: substantial implementation, cross-file understanding, portability, and bounded owner adapters.
- Sol: architecture, ambiguity, high blast radius, integration, final review, and exception handling.
- Claude CLI or future providers: explicit provider/model descriptors with the same packet identity and authority boundary.
- Human: protected acceptance, promotion, destructive owner decisions, and representative-user judgment.

Use capability observations from comparable task shapes. Time, token count, and provider-reported equivalent cost are routing telemetry, not billing proof or acceptance authority.

Do not add `--max-budget-usd` to Claude launches unless Jenn explicitly requests an API budget for that run. Claude CLI authentication and provider-reported equivalent-cost telemetry do not by themselves prove an API-key charge.

## Evidence and Closeout

Reuse evidence only when source identity, relevant behavior, gate text, environment, and evidence class remain compatible. An unrelated file change does not force a rerun; a changed contract or implementation does.

Before closeout:

1. Integrate every accepted worker commit.
2. Prove changed modules and their combined behavior.
3. Confirm no ready or safely executable roadmap remains.
4. Regenerate `roadmap-status.json` and `index.html` from the structured campaign and execution state.
5. Confirm counts, commit, source paths, manifest identity, validator identity, gate-catalog hash, evidence maturity, and authority label.
6. Commit artifacts, read them back, and publish compact pointers to Riff.
