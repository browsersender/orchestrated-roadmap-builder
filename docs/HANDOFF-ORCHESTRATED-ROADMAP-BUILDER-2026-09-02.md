# Handoff: Orchestrated Roadmap Builder

**Date:** 2026-09-02  
**Purpose:** Give Codex CLI and Claude CLI the same substantial roadmap assignments through a repeatable, provider-neutral orchestration process.  
**Status:** Built, installed for both tools, tested, committed, and available from VS Code's integrated PowerShell terminal.

## Start Here

The active skill is named:

```text
orchestrated-roadmap-builder
```

Codex installation:

```text
C:\Users\jennb\.codex\skills\orchestrated-roadmap-builder
```

Claude installation:

```text
C:\Users\jennb\.claude\skills\orchestrated-roadmap-builder
```

Complete VS Code and CLI guide:

```text
C:\Users\jennb\.codex\skills\orchestrated-roadmap-builder\references\vscode-cli.md
```

Shared launcher:

```text
C:\Users\jennb\.codex\skills\orchestrated-roadmap-builder\scripts\Invoke-OrchestratedWorker.ps1
```

Restart an existing Codex or Claude CLI session before invoking the skill so its skill index reloads.

## What Was Built

This extends the existing Product Warehouse orchestration system. It does not create a competing orchestrator.

The system now provides:

- validated campaign manifests and dependency-aware roadmap compilation;
- one complete roadmap-sized packet per worker rather than tiny phase prompts;
- exact isolated worktree and owned-output boundaries;
- no inherited coordinator conversation and no child workers;
- measured model routing across Luna, Terra, Sol, and Claude Opus 4.8;
- the same packet identity and structured result contract for Codex and Claude;
- a dry-run preflight that does not contact a model;
- guarded CLI execution from VS Code PowerShell;
- run metadata, exact prompt capture, transcript capture, and structured final output;
- coordinator-controlled review, integration, verification, dashboard refresh, and Riff publication.

## Canonical Source

Repository/worktree:

```text
D:\CodexWorktrees\product-warehouse-agent-orchestration-20260902
```

Branch:

```text
codex/agent-orchestration-20260902
```

Skill source:

```text
D:\CodexWorktrees\product-warehouse-agent-orchestration-20260902\_CONTROL\agent-orchestration\skills\orchestrated-roadmap-builder
```

Orchestration source root:

```text
D:\CodexWorktrees\product-warehouse-agent-orchestration-20260902\_CONTROL\agent-orchestration
```

Relevant commits:

```text
14bf13561e4c70d0a9db4b54cf4bac4a1d48f3af  feat(orchestration): add portable CLI skill runner
e6ecad9b201b70949a338f87ea2aac5f840634e8  fix(orchestration): support Windows PowerShell installs
2b91585df70053623c676be57021eb2ebfb33e02  fix(orchestration): keep skill backups out of discovery
```

## Operating Model

1. The coordinator reads the authoritative roadmap, structured tracker, source revision, owner boundaries, and reusable evidence.
2. The coordinator compiles dependency-ready, collision-safe roadmaps into complete v2 work packets.
3. Each packet is retargeted to one exact isolated worktree.
4. The router selects a model from task shape and measured capability.
5. A no-history worker executes the whole roadmap packet and commits bounded changes.
6. The worker returns a structured result but cannot verify, accept, promote, or canonize itself.
7. The coordinator checks changed-path scope, reruns only invalidated proof, and integrates accepted commits.
8. The coordinator updates structured state and dashboards and publishes durable artifact pointers to Riff.

## Model Routing

- **Luna:** frozen, low-ambiguity, mechanically checkable kernels, fixtures, transforms, schema work, and bounded repetitive production.
- **Terra:** substantial implementation, cross-file reasoning, portability, and bounded owner adapters.
- **Sol:** architecture, ambiguity, high blast radius, cross-product integration, conflict resolution, and final review.
- **Claude Opus 4.8 xhigh:** independent architecture challenge, difficult source synthesis, high-value review, or ambiguity-heavy bounded implementation.
- **Human owner:** protected acceptance, promotion, destructive owner decisions, and representative-user judgment.

No universal winner is assumed. Routing uses comparable observations for the task shape. Provider time, tokens, and reported equivalent cost are telemetry, not billing proof or acceptance authority.

## Compile A Worker Packet

Open VS Code and select **Terminal > New Terminal**. Use PowerShell:

```powershell
Set-Location 'D:\CodexWorktrees\product-warehouse-agent-orchestration-20260902'

$campaign = 'D:\absolute\campaign\campaign.json'
$state = 'D:\absolute\campaign\execution-state.json'
$packetOut = 'D:\absolute\campaign\generated\R07'
$workerRoot = 'D:\CodexWorktrees\isolated-r07-worktree'

node '.\_CONTROL\agent-orchestration\scripts\roadmap-orchestrator.mjs' validate $campaign
node '.\_CONTROL\agent-orchestration\scripts\roadmap-orchestrator.mjs' plan $campaign $state

$env:SOLA_ORCHESTRATION_WORKSPACE_ROOT = $workerRoot
$env:SOLA_ORCHESTRATION_ROADMAP_IDS = 'R07'
node '.\_CONTROL\agent-orchestration\scripts\roadmap-orchestrator.mjs' compile $campaign $state $packetOut
```

Give a worker the generated `*-PACKET.json`. Do not dispatch from the prose roadmap alone.

## Dry Run

Dry-run is the default. It validates packet identity, constraints, brief, worktree, Git root, CLI availability, model, and launch arguments without contacting Codex or Claude.

```powershell
$runner = 'C:\Users\jennb\.codex\skills\orchestrated-roadmap-builder\scripts\Invoke-OrchestratedWorker.ps1'
$packet = 'D:\absolute\campaign\generated\R07\R07-PACKET.json'

& $runner -Provider codex -PacketPath $packet
& $runner -Provider claude -PacketPath $packet
```

A successful result reports `ready: true` and the exact campaign, roadmap, task, packet hash, model, worktree, and output location.

## Execute With Codex

Terra example:

```powershell
& $runner `
  -Provider codex `
  -PacketPath $packet `
  -Model 'gpt-5.6-terra' `
  -Effort xhigh `
  -CodexSandbox workspace-write `
  -Execute
```

Use `gpt-5.6-luna` only for appropriately frozen mechanical work. Use `gpt-5.6-sol` for architecture or integration work retained by the coordinator.

The launcher uses `codex exec -`, the packet's exact worktree through `-C`, an ephemeral session, and the shared JSON result schema.

## Execute With Claude

```powershell
& $runner `
  -Provider claude `
  -PacketPath $packet `
  -Model 'claude-opus-4-8' `
  -Effort xhigh `
  -ClaudePermissionMode acceptEdits `
  -Execute
```

The launcher uses `claude -p`, `--no-session-persistence`, the packet worktree as the process directory, and the same structured result schema used by Codex.

It does not set a fallback model. It does not add `--max-budget-usd`. Claude CLI authentication and reported equivalent-cost telemetry do not by themselves prove an API-key charge.

## Interactive Prompt

Use this when a Codex or Claude session is acting as coordinator rather than as a bounded worker:

```text
Use orchestrated-roadmap-builder. Treat campaign.json and execution-state.json as structured truth. Compile the next dependency-ready collision-safe wave into isolated no-history packets, route each packet by task shape, dispatch only owned outputs, then review and integrate results. Preserve the full roadmap ambition. Reuse current evidence and do not invent validation work, approval requirements, or external gates. Continue all safe independent work when one lane has a genuine external dependency.
```

## Worker Run Outputs

Each executed run writes:

- `launch.json`: provider, model, packet identity, worktree, arguments, and preflight facts;
- `prompt.md`: the exact provider-neutral execution prompt;
- `transcript.jsonl` for Codex or `transcript.json` for Claude;
- `last-message.json`: the structured worker return.

Run folders are written beside the compiled packet under `worker-runs`. Windows-invalid characters from task IDs are sanitized only in directory names; canonical task identity remains unchanged in receipts.

## Hard Boundaries

- Workers receive complete roadmap-sized outcomes, not tiny prompts that shrink the campaign.
- Phase gates define behavior and controls; they do not justify stopping after each ordinary phase.
- Existing relevant proof is reused. Equivalent audits and tests are not repeated without a changed source, contract, gate, environment, stale proof, or suspected regression.
- A dirty worktree is reported but is not automatically treated as a blanket blocker.
- Missing credentials, unavailable required physical machines, destructive owner decisions, and required human acceptance may be genuine external gates.
- Planning artifacts never count as implementation evidence.
- A worker result enters review and cannot mark itself verified.
- Riff is coordination and discovery, never canonical custody or acceptance authority.
- Protected Repository intake and human acceptance remain outside worker authority.

## Launcher Refusals

The launcher refuses before model execution when:

- the packet is not schema v2 or lacks required identity and constraints;
- inherited context or child workers are allowed;
- the brief, target worktree, or Git root is missing;
- an explicit workspace differs from `packet.target.root`;
- the requested provider CLI or result schema is unavailable;
- the model or effort is unsupported by that provider adapter.

## Installation And Backup Behavior

The same committed skill is installed into Codex and Claude. Installer backups are kept outside skill discovery so they cannot appear as duplicate active skills:

```text
C:\Users\jennb\.codex\skill-install-state\orchestrated-roadmap-builder
C:\Users\jennb\.claude\skill-install-state\orchestrated-roadmap-builder
```

## Verification

- Full orchestration suite: **65/65 passing**.
- Persistent launcher tests cover both Codex and Claude dry runs from one packet.
- Packet/worktree mismatch refusal is tested.
- Windows PowerShell 5 installation is tested.
- Source skill passed `quick_validate.py`.
- Both active installations were read back with the same source commit.
- Both installed launchers produced successful dry-run descriptors.
- Source worktree was clean after the final commit.

## Riff

Committed skill source pointer:

```text
Artifact A-88275bf95b57
#sola-artifacts root message 17574
Owner room: #isa-orchestration-apps
```

Riff coordinates discovery only. The committed source and installed skill directories remain the actual artifacts.

## Recommended Next Use

Take a current large roadmap campaign, compile one collision-safe wave, and dispatch a mixed batch:

- one Luna mechanical packet;
- one Terra implementation packet;
- one Claude Opus 4.8 specialist packet;
- Sol retains integration and final review.

Compare contract fidelity, changed-path discipline, correction count, useful output, elapsed time, and evidence honesty. Add observations to the capability ledger by task shape. Do not turn a single benchmark into a universal model ranking.
