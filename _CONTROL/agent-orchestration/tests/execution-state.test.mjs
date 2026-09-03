import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ExecutionStateError,
  acquireLease,
  createExecutionState,
  importLegacyExecutionState,
  intakeWorkerResult,
  readExecutionState,
  reclaimExpiredLeases,
  recoverExecutionState,
  recordPhaseEvidence,
  refreshReadyRoadmaps,
  startRoadmap,
  transitionRoadmap,
  validateExecutionState,
  validateWorkerResult,
  writeExecutionState
} from '../lib/execution-state.mjs';
import { semanticHash } from '../lib/roadmap-graph.mjs';

const T0 = '2026-09-02T00:00:00.000Z';
const T1 = '2026-09-02T00:00:01.000Z';
const T2 = '2026-09-02T00:00:02.000Z';
const T3 = '2026-09-02T00:00:03.000Z';

function roadmap(id, dependsOn = []) {
  return {
    id,
    dependsOn,
    phases: [{ id: `${id}-P01` }]
  };
}

function campaign() {
  return {
    campaignId: 'execution-state-test',
    sourceRevision: 'source-123',
    roadmaps: [roadmap('R00'), roadmap('R01')]
  };
}

function packet(root, roadmapId = 'R00') {
  return {
    campaignId: 'execution-state-test',
    roadmapId,
    sourceRevision: 'source-123',
    packetHash: `packet-${roadmapId}`,
    ownedOutputs: [path.join(root, `${roadmapId}.mjs`)]
  };
}

function completeResult(root, overrides = {}) {
  const value = packet(root);
  return {
    schemaVersion: 2,
    campaignId: value.campaignId,
    taskId: value.roadmapId,
    roadmapId: value.roadmapId,
    packetHash: value.packetHash,
    sourceRevision: value.sourceRevision,
    workerId: 'worker-a',
    status: 'complete',
    changedPaths: value.ownedOutputs,
    checks: [{ command: 'node --test', result: 'pass' }],
    blockers: [],
    sparks: [],
    integrationNote: 'Ready for coordinator review.',
    resultedAt: T2,
    commit: 'abc123',
    ...overrides
  };
}

function errorCode(callback, code) {
  assert.throws(callback, (error) => error instanceof ExecutionStateError && error.code === code);
}

test('refuses illegal lifecycle transitions and preserves the original state', () => {
  const state = createExecutionState(campaign(), T0);
  const before = structuredClone(state);
  errorCode(() => transitionRoadmap(state, {
    roadmapId: 'R00',
    toStatus: 'verified',
    actorId: 'coordinator',
    now: T1,
    expectedRevision: 0
  }), 'transition:illegal');
  assert.deepEqual(state, before);

  const leased = acquireLease(state, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: T1, expectedRevision: 0
  }).state;
  errorCode(() => transitionRoadmap(leased, {
    roadmapId: 'R00', toStatus: 'ready', actorId: 'coordinator', now: T2, expectedRevision: leased.revision
  }), 'transition:lease_managed_status');
});

test('grants exactly one matching lease and starts a valid run', () => {
  const initial = createExecutionState(campaign(), T0);
  const leased = acquireLease(initial, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: T1, expectedRevision: 0
  }).state;
  assert.equal(leased.roadmaps.R00.status, 'leased');
  assert.equal(leased.roadmaps.R00.lease.workerId, 'worker-a');

  errorCode(() => acquireLease(leased, {
    roadmapId: 'R00', workerId: 'worker-b', leaseId: 'lease-b', ttlMs: 60000, now: T2, expectedRevision: leased.revision
  }), 'lease:roadmap_not_ready');
  errorCode(() => acquireLease(leased, {
    roadmapId: 'R01', workerId: 'worker-a', leaseId: 'lease-b', ttlMs: 60000, now: T2, expectedRevision: leased.revision
  }), 'lease:worker_already_leased');
  errorCode(() => startRoadmap(leased, {
    roadmapId: 'R00', workerId: 'worker-b', leaseId: 'lease-a', now: T2, expectedRevision: leased.revision
  }), 'lease:worker_mismatch');

  const running = startRoadmap(leased, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', now: T2, expectedRevision: leased.revision
  });
  assert.equal(running.state.roadmaps.R00.status, 'running');
  assert.equal(validateExecutionState(running.state).ok, true);
});

test('refuses mismatched worker results and advances only matching results to review', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-result-'));
  let state = createExecutionState(campaign(), T0);
  state = acquireLease(state, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: T1, expectedRevision: state.revision
  }).state;
  state = startRoadmap(state, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', now: T2, expectedRevision: state.revision
  }).state;
  const result = completeResult(root);
  const current = structuredClone(state);
  errorCode(() => intakeWorkerResult(state, {
    result: { ...result, sourceRevision: 'stale-source' }, packet: packet(root), leaseId: 'lease-a', now: T3, expectedRevision: state.revision
  }), 'result:source_mismatch');
  errorCode(() => intakeWorkerResult(state, {
    result: { ...result, taskId: 'R01', roadmapId: 'R01' }, packet: packet(root), leaseId: 'lease-a', now: T3, expectedRevision: state.revision
  }), 'result:task_mismatch');
  errorCode(() => intakeWorkerResult(state, {
    result: { ...result, changedPaths: [path.join(root, 'unowned.mjs')] }, packet: packet(root), leaseId: 'lease-a', now: T3, expectedRevision: state.revision
  }), 'result:path_mismatch');
  errorCode(() => intakeWorkerResult(state, {
    result: { ...result, workerId: 'worker-b' }, packet: packet(root), leaseId: 'lease-a', now: T3, expectedRevision: state.revision
  }), 'lease:worker_mismatch');
  assert.deepEqual(state, current);

  const accepted = intakeWorkerResult(state, {
    result, packet: packet(root), leaseId: 'lease-a', now: T3, expectedRevision: state.revision
  }).state;
  assert.equal(accepted.roadmaps.R00.status, 'review');
  assert.equal(accepted.roadmaps.R00.lease, null);
  const integrating = transitionRoadmap(accepted, {
    roadmapId: 'R00', toStatus: 'integrating', actorId: 'coordinator', now: '2026-09-02T00:00:04.000Z', expectedRevision: accepted.revision
  }).state;
  errorCode(() => transitionRoadmap(integrating, {
    roadmapId: 'R00', toStatus: 'verified', actorId: 'coordinator', now: '2026-09-02T00:00:05.000Z', expectedRevision: integrating.revision
  }), 'transition:phase_evidence_incomplete');
  const evidenced = recordPhaseEvidence(integrating, {
    roadmapId: 'R00', phaseId: 'R00-P01', actorId: 'coordinator', now: '2026-09-02T00:00:05.000Z', expectedRevision: integrating.revision,
    evidence: { type: 'commit', ref: 'abc123', checks: ['node --test'] }
  }).state;
  const verified = transitionRoadmap(evidenced, {
    roadmapId: 'R00', toStatus: 'verified', actorId: 'coordinator', now: '2026-09-02T00:00:06.000Z', expectedRevision: evidenced.revision
  }).state;
  assert.equal(verified.roadmaps.R00.status, 'verified');
});

test('imports explicit v1 bootstrap truth and refreshes dependency readiness', () => {
  const value = campaign();
  value.roadmaps[1].dependsOn = ['R00'];
  const v1 = {
    schemaVersion: 1,
    campaignId: value.campaignId,
    campaignHash: semanticHash(value),
    createdAt: T0,
    updatedAt: T1,
    revision: 1,
    roadmaps: {
      R00: { status: 'verified', lease: null, corrections: 0, phases: { 'R00-P01': { status: 'verified', evidence: [{ type: 'commit', ref: 'abc', checks: ['test'] }] } } },
      R01: { status: 'not_started', lease: null, corrections: 0, phases: { 'R01-P01': { status: 'not_started', evidence: [] } } }
    }
  };
  const migrated = importLegacyExecutionState(v1, value, T2);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.roadmaps.R00.status, 'verified');
  assert.equal(migrated.events[0].type, 'legacy_state_imported');
  const refreshed = refreshReadyRoadmaps(migrated, value, { actorId: 'coordinator', now: T3 });
  assert.deepEqual(refreshed.ready, ['R01']);
  assert.equal(refreshed.state.roadmaps.R01.status, 'ready');
  assert.equal(validateExecutionState(refreshed.state, { campaign: value }).ok, true);
});

test('reclaims only expired leases with a causal receipt', () => {
  let state = createExecutionState(campaign(), T0);
  state = acquireLease(state, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 10000, now: T1, expectedRevision: state.revision
  }).state;
  const live = reclaimExpiredLeases(state, {
    actorId: 'recovery', now: '2026-09-02T00:00:05.000Z', expectedRevision: state.revision
  });
  assert.deepEqual(live.reclaimed, []);
  assert.deepEqual(live.state, state);

  const recovered = reclaimExpiredLeases(state, {
    actorId: 'recovery', now: '2026-09-02T00:00:11.000Z', expectedRevision: state.revision
  });
  assert.deepEqual(recovered.reclaimed, ['R00']);
  assert.equal(recovered.state.roadmaps.R00.status, 'ready');
  assert.equal(recovered.receipts[0].type, 'lease_reclaimed');
  assert.equal(recovered.receipts[0].previousEventHash, state.eventHead);
  assert.equal(validateExecutionState(recovered.state).ok, true);
});

test('rejects stale persistence, preserves a prior copy, and recovers a corrupt current file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-atomic-'));
  const file = path.join(root, 'execution-state.json');
  const initial = createExecutionState(campaign(), T0);
  writeExecutionState(file, initial, { expectedRevision: null });
  const first = acquireLease(initial, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: T1, expectedRevision: initial.revision
  }).state;
  const stale = acquireLease(initial, {
    roadmapId: 'R00', workerId: 'worker-b', leaseId: 'lease-b', ttlMs: 60000, now: T2, expectedRevision: initial.revision
  }).state;
  const renameSync = fs.renameSync;
  try {
    fs.renameSync = (source, destination) => {
      if (path.resolve(destination) === path.resolve(file)) throw new Error('simulated interrupted replace');
      return renameSync(source, destination);
    };
    assert.throws(() => writeExecutionState(file, first, { expectedRevision: 0 }), /simulated interrupted replace/);
  } finally {
    fs.renameSync = renameSync;
  }
  assert.equal(readExecutionState(file).revision, 0);
  const write = writeExecutionState(file, first, { expectedRevision: 0 });
  assert.equal(write.revision, 1);
  assert.equal(readExecutionState(`${file.replace(/\.json$/, '.previous.json')}`).revision, 0);
  errorCode(() => writeExecutionState(file, stale, { expectedRevision: 0 }), 'state:stale_revision');
  assert.equal(readExecutionState(file).eventHead, first.eventHead);

  fs.writeFileSync(file, '{ partial write');
  const recovery = recoverExecutionState(file);
  assert.equal(recovery.recovered, true);
  assert.equal(recovery.state.revision, 0);
  assert.equal(readExecutionState(file).revision, 0);
});

test('detects a broken event chain and rejects malformed v2 worker results', () => {
  let state = createExecutionState(campaign(), T0);
  state = acquireLease(state, {
    roadmapId: 'R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: T1, expectedRevision: state.revision
  }).state;
  const tampered = structuredClone(state);
  tampered.events[0].previousEventHash = 'not-genesis';
  assert.equal(validateExecutionState(tampered).ok, false);
  assert.equal(validateWorkerResult({ schemaVersion: 2 }).ok, false);
  assert.equal(validateWorkerResult(completeResult(os.tmpdir(), { commit: null })).ok, true);
});
