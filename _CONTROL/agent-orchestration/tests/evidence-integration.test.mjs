import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditWorkerScope,
  classifyEvidence,
  proofIdentity,
  sealVerificationReceipt,
  validateEvidenceReceipt
} from '../lib/evidence-engine.mjs';
import { decideCorrection, evaluateIntegration } from '../lib/integration-gate.mjs';

const sourceRevision = 'source-revision-123';
const target = { host: 'local', environmentId: 'orb-r05-test', runtime: 'node-24' };
const gate = { id: 'ORB-R05-P01', mustFire: 'stale proof refuses', mustStaySilent: 'current proof reuses' };

function proof(overrides = {}) {
  return {
    sourceRevision,
    commit: 'commit-123',
    gateIdentity: gate,
    target,
    evidenceClass: 'focused-test',
    ...overrides
  };
}

function worker(workerId, commit) {
  return {
    workerId,
    status: 'complete',
    commit,
    changedPaths: [`lib/${workerId}.mjs`],
    checks: [{ command: `node --test ${workerId}`, result: 'pass' }],
    blockers: []
  };
}

function gateEvidence(id) {
  return {
    phaseId: id,
    status: 'verified',
    evidence: [{ type: 'focused-test', ref: `${id}-receipt`, checks: [{ command: `node --test ${id}`, result: 'pass' }] }]
  };
}

test('P01 refuses stale or unrelated proof and reuses current matching proof', () => {
  const current = proof();
  const reused = classifyEvidence({ proof: current, current });
  assert.equal(reused.decision, 'reuse');
  assert.equal(reused.reusable, true);
  assert.equal(reused.reasonCodes.length, 0);

  const stale = classifyEvidence({ proof: current, current: proof({ sourceRevision: 'different-source' }) });
  assert.equal(stale.decision, 'rerun');
  assert(stale.reasonCodes.includes('source_revision_changed'));

  const unrelated = classifyEvidence({ proof: current, current, changedPaths: ['docs/unrelated.md'], relevantPaths: ['lib/evidence-engine.mjs'] });
  assert.equal(unrelated.decision, 'reuse');
  assert.equal(proofIdentity(current), proofIdentity({ ...current, target: { ...target, root: 'D:\\other-checkout' } }));
});

test('P02 invalidation triggers rerun for changed gates or relevant source only', () => {
  const current = proof({ relevantPaths: ['lib/evidence-engine.mjs'] });
  const gateChanged = classifyEvidence({ proof: current, current: proof({ gate: { ...gate, mustFire: 'changed bar' } }) });
  assert.equal(gateChanged.decision, 'rerun');
  assert(gateChanged.reasonCodes.includes('gate_changed'));

  const relevantChanged = classifyEvidence({
    proof: current,
    current,
    changedPaths: ['lib/evidence-engine.mjs'],
    relevantPaths: ['lib/evidence-engine.mjs']
  });
  assert.equal(relevantChanged.decision, 'rerun');
  assert(relevantChanged.reasonCodes.includes('relevant_path_changed'));

  const irrelevantChanged = classifyEvidence({ proof: current, current, changedPaths: ['README.md'], relevantPaths: current.relevantPaths });
  assert.equal(irrelevantChanged.decision, 'reuse');

  const failed = classifyEvidence({ proof: proof({ status: 'failed' }), current });
  assert.equal(failed.decision, 'rerun');
  assert(failed.reasonCodes.includes('proof_not_green'));
});

test('P03 exact owned writes pass while undeclared writes refuse intake', () => {
  const packet = { ownedOutputs: ['D:\\orb\\lib\\owned.mjs'], target: { root: 'D:\\orb' } };
  const clean = auditWorkerScope(packet, { status: 'complete', changedPaths: ['D:\\orb\\lib\\owned.mjs'] });
  assert.equal(clean.ok, true);
  assert.equal(clean.decision, 'pass');

  const drift = auditWorkerScope(packet, { status: 'complete', changedPaths: ['D:\\orb\\lib\\owned.mjs', 'D:\\orb\\README.md'] });
  assert.equal(drift.ok, false);
  assert(drift.reasonCodes.includes('undeclared_write'));
});

test('P04 pairwise green workers cannot bypass explicit composition proof', () => {
  const workers = [worker('worker-a', 'commit-a'), worker('worker-b', 'commit-b')];
  const missing = evaluateIntegration({
    campaignId: 'campaign', roadmapId: 'ORB-R05', sourceRevision, target, workerResults: workers
  });
  assert.equal(missing.ok, false);
  assert(missing.errors.includes('integration:composition_proof_required'));

  const unbound = evaluateIntegration({
    campaignId: 'campaign', roadmapId: 'ORB-R05', sourceRevision, target, workerResults: workers,
    compositionProof: { ok: true, ref: 'composition-commit', checks: [{ command: 'node --test', result: 'pass' }] }
  });
  assert.equal(unbound.ok, false);
  assert(unbound.errors.includes('integration:workers_not_bound'));

  const integrated = evaluateIntegration({
    campaignId: 'campaign', roadmapId: 'ORB-R05', sourceRevision, target, workerResults: workers,
    compositionProof: {
      ok: true,
      ref: 'composition-commit',
      workerIds: ['worker-a', 'worker-b'],
      checks: [{ command: 'node --test tests/evidence-integration.test.mjs', result: 'pass' }]
    }
  });
  assert.equal(integrated.ok, true);
  assert.equal(validateEvidenceReceipt(integrated.receipt).ok, true);
});

test('P05 keeps one bounded repair recoverable and reroutes repeated conceptual failure', () => {
  const repair = decideCorrection({ currentLane: 'LUNA_BOUNDED', correctionRounds: 0, correctionBudget: 1 });
  assert.equal(repair.action, 'bounded_repair');
  assert.equal(repair.reroute, false);
  const reroute = decideCorrection({ currentLane: 'LUNA_BOUNDED', correctionRounds: 1, correctionBudget: 1 });
  assert.equal(reroute.action, 'reroute');
  assert.equal(reroute.toLane, 'TERRA_PRIMARY');
});

test('P06 refuses incomplete verification and seals complete source-linked composition evidence', () => {
  const incomplete = sealVerificationReceipt({ campaignId: 'campaign', roadmapId: 'ORB-R05' });
  assert.equal(incomplete.ok, false);
  assert(incomplete.reasonCodes.includes('missing_source'));
  assert(incomplete.reasonCodes.includes('missing_gates'));
  assert(incomplete.reasonCodes.includes('missing_tests'));
  assert(incomplete.reasonCodes.includes('missing_integration'));

  const gates = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06'].map((id) => gateEvidence(`ORB-R05-${id}`));
  const sealed = sealVerificationReceipt({
    campaignId: 'campaign',
    roadmapId: 'ORB-R05',
    sourceRevision,
    commit: 'integration-commit',
    gateCatalogHash: 'bar-catalog-hash',
    expectedGateIds: gates.map((item) => item.phaseId),
    gates,
    tests: [{ command: 'node --test _CONTROL/agent-orchestration/tests/evidence-integration.test.mjs', result: 'pass' }],
    integration: {
      ok: true,
      ref: 'composition-commit',
      checks: [{ command: 'node --test _CONTROL/agent-orchestration/tests/evidence-integration.test.mjs', result: 'pass' }],
      workerIds: ['worker-a', 'worker-b']
    },
    target,
    recordedAt: '2026-09-02T20:00:00.000Z'
  });
  assert.equal(sealed.ok, true);
  assert.equal(sealed.decision, 'verified');
  assert.equal(validateEvidenceReceipt(sealed.receipt).ok, true);
  assert.equal(sealed.receipt.target.root, undefined);
  assert.match(sealed.receipt.receiptId, /^verification-/);

  const builderOnly = sealVerificationReceipt({
    sourceRevision, evidenceClass: 'builder-only', gates, tests: [{ command: 'test', result: 'pass' }],
    integration: { ok: true, ref: 'composition', checks: [{ command: 'test', result: 'pass' }], workerIds: ['worker-a'] }, target
  });
  assert.equal(builderOnly.ok, false);
  assert(builderOnly.reasonCodes.includes('builder_only_evidence'));

  const scopeDrift = sealVerificationReceipt({
    sourceRevision, gates, tests: [{ command: 'test', result: 'pass' }],
    integration: { ok: true, ref: 'composition', checks: [{ command: 'test', result: 'pass' }], workerIds: ['worker-a'] },
    scopeAudit: { ok: false }, target
  });
  assert.equal(scopeDrift.ok, false);
  assert(scopeDrift.reasonCodes.includes('scope_drift'));
});
