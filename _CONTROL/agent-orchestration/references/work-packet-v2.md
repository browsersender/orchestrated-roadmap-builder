# Work Packet v2

Work packet v2 is the worker-facing contract produced from one campaign roadmap. It is deliberately self-contained: a worker receives the exact source inputs, owned outputs, prohibited paths, phase gates, evidence policy, target rule, and return contract without coordinator conversation history.

## Contract

`schemas/work-packet-v2.schema.json` is the structural contract. `lib/work-packet.mjs` adds semantic checks that JSON Schema cannot express portably:

- `schemaVersion` is `2`; `campaignId`, `roadmapId`, and `sourceRevision` identify the source.
- `inputs`, `ownedOutputs`, and `briefPath` are absolute paths after resolution against the effective workspace root. Relative roadmap values are accepted only during compilation and are resolved there.
- A local target is retargeted to the effective workspace root. Non-local target roots and portability rules are preserved as declared.
- `phaseGates` contains one entry for every roadmap phase, with both `mustFire` and `mustStaySilent` controls.
- `constraints.forkContext` and `constraints.childWorkersAllowed` are always `false`. These are refusal conditions, not worker suggestions.
- `maximumBriefWords` is at most 1,500 and `maximumReturnWords` is at most 300. Oversized rendered briefs refuse compilation.
- `evidencePolicy`, acceptance checks, and the campaign bar-catalog hash travel with the packet so a worker can distinguish reusable proof from invalidation triggers.

## Identity

`packetHash` is SHA-256 over the semantic packet fields. It excludes `packetHash` itself and the materialized `briefPath`, then uses stable object-key ordering. Reordering object keys does not change identity; changing a contract value, gate, path, constraint, target rule, or evidence trigger does. `validateWorkPacket` rejects a stale hash.

## API

```js
import { compileWorkPacket, validateWorkPacket } from './lib/work-packet.mjs';

const result = compileWorkPacket(campaign, 'ORB-R02', {
  workspaceRoot: 'D:\\CodexWorktrees\\worker',
  outputRoot: 'D:\\CodexWorktrees\\worker\\packets'
});
if (!result.ok) throw new Error(result.errors.join('; '));
validateWorkPacket(result.packet, { briefContents: result.brief });
```

`compileWorkPacket` can return the rendered packet and brief without writing when `outputRoot` is omitted. With `outputRoot`, it writes the brief and JSON packet atomically. The packet compiler does not dispatch workers, inherit history, alter campaign state, or grant authority.

## Evidence Boundary

Passing packet validation proves contract completeness, path resolution, deterministic identity, and brief size. It does not prove that a worker implemented its assignment, that an external target accepted it, or that a product or Repository gate was satisfied.
