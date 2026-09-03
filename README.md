# Orchestrated Roadmap Builder

A portable Sola orchestration control layer for compiling substantial roadmap campaigns into isolated, no-history worker packets and executing those packets through Codex CLI or Claude CLI without transferring acceptance or promotion authority to the worker.

This repository contains the orchestration engine, schemas, provider adapters, routing policy, portable skill, PowerShell installer, tests, and a complete operational handoff. Internal Product Warehouse campaign histories and unrelated products are intentionally excluded.

## Start Here

- [Complete handoff](docs/HANDOFF-ORCHESTRATED-ROADMAP-BUILDER-2026-09-02.md)
- [Skill instructions](_CONTROL/agent-orchestration/skills/orchestrated-roadmap-builder/SKILL.md)
- [VS Code and CLI guide](_CONTROL/agent-orchestration/skills/orchestrated-roadmap-builder/references/vscode-cli.md)
- [Model routing policy](_CONTROL/agent-orchestration/MODEL-ROUTING-POLICY.md)
- [Project Observatory build campaign](_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/ROADMAP-SET.md)

## Install

From a PowerShell terminal in the cloned repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File '.\_CONTROL\agent-orchestration\scripts\install-orchestrated-roadmap-skill.ps1' `
  -DestinationRoot "$HOME\.codex\skills"

powershell -NoProfile -ExecutionPolicy Bypass -File '.\_CONTROL\agent-orchestration\scripts\install-orchestrated-roadmap-skill.ps1' `
  -DestinationRoot "$HOME\.claude\skills"
```

Restart existing Codex or Claude CLI sessions after installation.

## Dry Run A Compiled Packet

```powershell
$runner = "$HOME\.codex\skills\orchestrated-roadmap-builder\scripts\Invoke-OrchestratedWorker.ps1"
$packet = 'D:\absolute\campaign\generated\R07\R07-PACKET.json'

& $runner -Provider codex -PacketPath $packet
& $runner -Provider claude -PacketPath $packet
```

Dry run is the default. Add `-Execute` only after the packet, target worktree, ownership, and routing are correct.

## Test

```powershell
node --test '.\_CONTROL\agent-orchestration\tests\*.test.mjs'
```

The worker result enters coordinator review. It cannot verify, accept, promote, or canonize itself.
