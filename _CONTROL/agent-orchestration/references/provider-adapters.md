# Provider Adapters

Provider adapters translate a validated v2 work packet into a dispatch descriptor. They do not execute a provider call, read credentials, inherit coordinator conversation history, promote work, or grant canonical authority.

## Shared Contract

Every descriptor conforms to `schemas/dispatch-receipt.schema.json` and contains the same outer surface:

- `schemaVersion`, `descriptorId`, `providerId`, and `status`
- packet identity: task, campaign, roadmap, source revision, packet hash, and brief path
- dispatch target, argument vector, and an explicit `history: none` context
- a fixed coordinator-required execution boundary and not-granted promotion state
- limits that record descriptor-only and no-credential behavior

`lib/providers/provider-contract.mjs` validates a source work packet, rejects secret-shaped fields and values, rejects shell-control characters in arguments, and validates the resulting descriptor. `registerProvider` accepts only a provider id plus a descriptor factory, preserving a narrow conformance seam for future adapters.

## Current Providers

| Provider | Factory | Refusal boundary | Descriptor target |
| --- | --- | --- | --- |
| Codex agent | `createCodexAgentDescriptor` | Inherited context, unsupported or unavailable model, unauthorized model override | `codex.create_thread` |
| Claude CLI | `createClaudeCliDescriptor` | Missing or non-Opus model, non-xhigh effort, fallback model, session persistence, unavailable model | `claude` |
| Manual Riff | `createManualRiffDescriptor` | Artifact body, canonical-authority claim, invalid room or non-pointer artifact path | `riff.publish_pointer` |

The Codex descriptor carries `--no-history`. The Claude descriptor carries `--no-session-persistence` and no fallback model. The Riff descriptor names an artifact path and brief path with `--pointer-only`; it never carries copied artifact content.

## Coordinator Boundary

The coordinator verifies model availability and authorization before it requests a descriptor, then performs any tool call or external mutation under current authorization. A descriptor is planning data, not dispatch proof, acceptance evidence, promotion authority, or canonical Repository intake.
