# VS Code and CLI Operations

## What This Entry Point Does

`Invoke-OrchestratedWorker.ps1` gives Codex CLI and Claude CLI the same compiled roadmap packet, brief, exact worktree, no-history boundary, and structured return schema. It performs a local preflight first and writes launch metadata outside the worker worktree. It does not grant acceptance, promotion, or Repository intake authority.

Open the target repository or worktree in VS Code, then use **Terminal > New Terminal**. All examples below are PowerShell commands.

## One-Time Installation

Install the same source skill for Codex and Claude:

```powershell
Set-Location 'D:\CodexWorktrees\product-warehouse-agent-orchestration-20260902'

powershell -NoProfile -ExecutionPolicy Bypass -File '.\_CONTROL\agent-orchestration\scripts\install-orchestrated-roadmap-skill.ps1' `
  -DestinationRoot 'C:\Users\jennb\.codex\skills'

powershell -NoProfile -ExecutionPolicy Bypass -File '.\_CONTROL\agent-orchestration\scripts\install-orchestrated-roadmap-skill.ps1' `
  -DestinationRoot 'C:\Users\jennb\.claude\skills'
```

Restart the relevant CLI session after installation so its skill index reloads. The active skill path is `orchestrated-roadmap-builder` for both tools.

## Compile A Roadmap Packet

Run from the orchestration source root. Compilation is a coordinator action and should happen only after dependencies, ownership, and collision safety are established.

```powershell
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

Use the generated `*-PACKET.json`, not the prose roadmap alone.

## Dry Run First

This validates the packet, brief, worktree, Git root, installed CLI, model, and launch arguments without contacting a model:

```powershell
$runner = 'C:\Users\jennb\.codex\skills\orchestrated-roadmap-builder\scripts\Invoke-OrchestratedWorker.ps1'
$packet = 'D:\absolute\campaign\generated\R07\R07-PACKET.json'

& $runner -Provider codex -PacketPath $packet
& $runner -Provider claude -PacketPath $packet
```

The default is dry-run. A successful result includes `ready: true`, the packet identity, model, worktree, output directory, and exact argument vector.

## Execute With Codex CLI

Choose the model by task shape, not by habit. Luna is for frozen mechanical work, Terra for substantial bounded implementation, and Sol for architecture, ambiguity, integration, or high blast radius.

```powershell
& $runner `
  -Provider codex `
  -PacketPath $packet `
  -Model 'gpt-5.6-terra' `
  -Effort xhigh `
  -CodexSandbox workspace-write `
  -Execute
```

The underlying invocation uses `codex exec -`, the packet's exact worktree through `-C`, an ephemeral session, and the shared JSON result schema. To use Sol or Luna, change only `-Model` after routing says that lane fits.

## Execute With Claude CLI

```powershell
& $runner `
  -Provider claude `
  -PacketPath $packet `
  -Model 'claude-opus-4-8' `
  -Effort xhigh `
  -ClaudePermissionMode acceptEdits `
  -Execute
```

The underlying invocation uses `claude -p`, `--no-session-persistence`, the exact packet worktree as the process directory, and the shared JSON result schema. It does not set a fallback model or `--max-budget-usd`.

## Interactive Skill Use

For an interactive Codex or Claude session, invoke the skill by name and provide the canonical campaign paths:

```text
Use orchestrated-roadmap-builder. Treat campaign.json and execution-state.json as structured truth. Compile the next dependency-ready collision-safe wave into isolated no-history packets, route each packet by task shape, dispatch only owned outputs, then review and integrate results. Reuse current evidence and do not invent validation work or external gates.
```

Interactive sessions are useful for coordinator judgment. The PowerShell launcher is preferred for repeatable worker execution because it freezes the packet, worktree, model, session boundary, and return shape.

## Return And Intake

Each run writes:

- `launch.json`: packet, provider, model, arguments, and preflight facts.
- `prompt.md`: the exact provider-neutral execution prompt.
- `transcript.jsonl` for Codex or `transcript.json` for Claude.
- `last-message.json`: the structured worker return when the provider succeeds.

The coordinator then audits changed paths, current source identity, and only the checks invalidated by the worker's changes. A worker result enters review; it never verifies itself. Lease, transition, intake, dashboard refresh, commit integration, and Riff publication remain the coordinator's responsibility.

## Refusal Cases

The launcher refuses before model execution when:

- the packet is not schema v2 or lacks its identity and constraints;
- inherited context or child workers are allowed;
- the brief, target worktree, or Git root is missing;
- an explicit `-WorkspacePath` differs from `packet.target.root`;
- the selected CLI or result schema is unavailable;
- the selected model or effort is not supported by the provider adapter.

It reports a dirty worktree but does not invent a blanket dirty-tree gate. Owner rules and the packet decide whether those existing changes are compatible.
