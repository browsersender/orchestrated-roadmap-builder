# Execution Lifecycle v2

`execution-state.mjs` owns the portable v2 execution ledger. It accepts an explicit timestamp on every mutating call; it neither starts workers nor assumes any provider.

## State Model

Each roadmap is one of `not_started`, `ready`, `leased`, `running`, `review`, `integrating`, `verified`, `blocked`, or `failed`. Legal transitions are intentionally narrow:

| From | To |
| --- | --- |
| `not_started` | `ready` |
| `ready` | `leased` via `acquireLease` |
| `leased` | `running` via `startRoadmap`; `ready` after recovery |
| `running` | `review`, `blocked`, `failed`, `ready` after recovery |
| `review` | `integrating`, `ready`, `blocked`, `failed` |
| `integrating` | `verified`, `blocked`, `failed` |
| `blocked`, `failed` | `ready` |

`transitionRoadmap` rejects lease-managed targets. `acquireLease`, `startRoadmap`, and `renewLease` bind a lease to exactly one worker and lease ID. A worker may hold only one active lease in a state document.

## Worker Result Intake

Use the v2 result template. `intakeWorkerResult` requires the matching campaign ID, roadmap/task ID, frozen source revision, packet hash, active lease worker, lease ID, and changed paths within the packet's owned outputs. A complete result moves `running` to `review` and clears the worker lease. Blocked and failed results enter their matching terminal state. A result never grants integration or verification.

## Receipts and Atomic Persistence

Every mutation appends an event with predecessor event hash plus previous and next state-snapshot hashes. `validateExecutionState` recomputes those hashes and fails closed on a broken chain.

Persist a returned candidate with `writeExecutionState(stateFile, nextState, { expectedRevision })`. It compares the on-disk revision, preserves the old valid JSON at `execution-state.previous.json` for an `execution-state.json` file, fsyncs a same-directory temporary file, and renames that file into place. An old worker candidate is rejected by its stale expected revision and cannot replace newer truth.

`recoverExecutionState` reads current truth first. Only when current state is unreadable or invalid does it atomically restore the validated previous copy. `reclaimExpiredLeases` takes an explicit clock and records one `lease_reclaimed` receipt per expired lease; unexpired leases remain untouched.

## Minimal Sequence

```js
let state = createExecutionState(campaign, '2026-09-02T00:00:00.000Z');
writeExecutionState('execution-state.json', state, { expectedRevision: null });
let change = acquireLease(state, { roadmapId: 'ORB-R04', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: '2026-09-02T00:00:01.000Z', expectedRevision: state.revision });
state = change.state;
change = startRoadmap(state, { roadmapId: 'ORB-R04', workerId: 'worker-a', leaseId: 'lease-a', now: '2026-09-02T00:00:02.000Z', expectedRevision: state.revision });
state = change.state;
writeExecutionState('execution-state.json', state, { expectedRevision: 0 });
```
