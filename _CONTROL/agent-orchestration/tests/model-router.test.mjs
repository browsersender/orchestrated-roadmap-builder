import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildRoutingReceipt, decideReroute, loadCapabilityEvidence, normalizeTaskProfile, routeModelTask, validateRoutingReceipt } from '../lib/model-router.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const orchestrationRoot = path.resolve(here, '..');
const ledger = JSON.parse(fs.readFileSync(path.join(orchestrationRoot, 'capability-ledger.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(orchestrationRoot, 'model-routing-policy.json'), 'utf8'));

const profile = (overrides = {}) => ({
  ambiguity: 'low',
  blastRadius: 'low',
  crossProduct: false,
  behaviorChange: true,
  mechanicalAcceptance: true,
  authorityRequired: false,
  filesExpected: 4,
  ...overrides
});

const targetSupport = (overrides = {}) => ({
  providers: {
    'gpt-5.6-sol': { available: true, authorized: true },
    'gpt-5.6-terra': { available: true, authorized: true },
    'gpt-5.6-luna': { available: true, authorized: true },
    'claude-opus-4-8': { available: true, authorized: true },
    ...overrides
  }
});

test('normalizes known profile values and refuses unknown ones', () => {
  const normalized = normalizeTaskProfile(profile({ ambiguity: ' LOW ', blastRadius: ' MEDIUM ' }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.ambiguity, 'low');
  assert.equal(normalized.value.blastRadius, 'medium');
  assert.equal(normalizeTaskProfile(profile({ ambiguity: 'unbounded' })).ok, false);
  assert.equal(normalizeTaskProfile({ ...profile(), unrecognized: true }).ok, false);
});

test('loads valid capability observations by task shape and rejects malformed evidence', () => {
  const normalized = normalizeTaskProfile(profile());
  const evidence = loadCapabilityEvidence(ledger, normalized.value.taskShape);
  assert.equal(evidence.ok, true);
  assert.deepEqual(evidence.value.taskShape, ['bounded-kernel', 'typed-refusal', 'five-file-scope']);
  assert(evidence.value.aggregates.some((aggregate) => aggregate.model === 'gpt-5.6-luna'));
  const malformed = structuredClone(ledger);
  malformed.observations[0].review.contractFidelity = 9;
  assert.equal(loadCapabilityEvidence(malformed, normalized.value.taskShape).ok, false);
});

test('unavailable or unauthorized providers cannot win an automatic route', () => {
  const unavailable = routeModelTask({
    taskId: 'unavailable', profile: profile(), ledger, policy,
    targetSupport: targetSupport({ 'gpt-5.6-luna': { available: false, authorized: true } })
  });
  assert.equal(unavailable.ok, true);
  assert.notEqual(unavailable.selectedLane, 'LUNA_BOUNDED');
  assert(unavailable.exclusions.some((item) => item.lane === 'LUNA_BOUNDED' && item.reason.startsWith('provider_unavailable')));

  const unauthorized = routeModelTask({
    taskId: 'unauthorized', profile: profile(), ledger, policy,
    targetSupport: targetSupport({ 'gpt-5.6-luna': { available: true, authorized: false } })
  });
  assert.equal(unauthorized.ok, true);
  assert.notEqual(unauthorized.selectedLane, 'LUNA_BOUNDED');
  assert(unauthorized.exclusions.some((item) => item.lane === 'LUNA_BOUNDED' && item.reason.startsWith('provider_unauthorized')));

  const unsupported = routeModelTask({
    taskId: 'unsupported', profile: profile(), ledger, policy,
    targetSupport: targetSupport({
      'gpt-5.6-terra': { available: false, authorized: false },
      'gpt-5.6-luna': { available: false, authorized: false },
      'claude-opus-4-8': { available: false, authorized: false }
    })
  });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.errors[0], /no_available_authorized/);
});

test('resource preferences adjust task-shape ranking without converting telemetry into billing', () => {
  const mediumBounded = profile({ ambiguity: 'medium' });
  const baseline = routeModelTask({ taskId: 'baseline', profile: mediumBounded, ledger, policy, targetSupport: targetSupport() });
  const timeWeighted = routeModelTask({
    taskId: 'time-weighted', profile: mediumBounded, ledger, policy, targetSupport: targetSupport(),
    resourcePreferences: { time: 'high', tokens: 'ignore', equivalentCost: 'ignore' }
  });
  assert.equal(baseline.ok, true);
  assert.equal(timeWeighted.ok, true);
  assert.equal(baseline.selectedLane, 'LUNA_BOUNDED');
  assert.equal(timeWeighted.selectedLane, 'TERRA_PRIMARY');
  const terra = timeWeighted.receipt.rankedLanes.find((lane) => lane.lane === 'TERRA_PRIMARY');
  assert(terra.scoreComponents.resourceTime > 0);
  assert.equal(timeWeighted.receipt.resourceTelemetry.billingStatus, 'not_billing');
  assert.equal(timeWeighted.receipt.resourceTelemetry.acceptanceStatus, 'not_acceptance_evidence');
  assert.match(timeWeighted.receipt.resourceTelemetry.costSemantics, /not observed Anthropic API-key charges/);

  const fullyMeasuredLedger = structuredClone(ledger);
  for (const observation of fullyMeasuredLedger.observations) {
    const metrics = observation.model === 'gpt-5.6-luna'
      ? { inputTokens: 100, outputTokens: 100, reportedEquivalentCostUsd: 1 }
      : observation.model === 'gpt-5.6-terra'
        ? { inputTokens: 500, outputTokens: 500, reportedEquivalentCostUsd: 5 }
        : { inputTokens: 300, outputTokens: 300, reportedEquivalentCostUsd: 3 };
    Object.assign(observation.observed, metrics);
  }
  const telemetryWeighted = routeModelTask({
    taskId: 'telemetry-weighted', profile: profile(), ledger: fullyMeasuredLedger, policy, targetSupport: targetSupport(),
    resourcePreferences: { time: 'ignore', tokens: 'high', equivalentCost: 'high' }
  });
  const luna = telemetryWeighted.receipt.rankedLanes.find((lane) => lane.lane === 'LUNA_BOUNDED');
  assert(luna.scoreComponents.resourceTokens > 0);
  assert(luna.scoreComponents.resourceEquivalentCost > 0);
  assert.equal(telemetryWeighted.receipt.resourceTelemetry.billingStatus, 'not_billing');
});

test('a recoverable first correction stays in lane and exhaustion escalates', () => {
  const recoverable = decideReroute({ currentLane: 'LUNA_BOUNDED', correctionRounds: 0, correctionBudget: 1 });
  const exhausted = decideReroute({ currentLane: 'LUNA_BOUNDED', correctionRounds: 1, correctionBudget: 1 });
  assert.equal(recoverable.ok, true);
  assert.equal(recoverable.value.action, 'stay_in_lane');
  assert.equal(exhausted.value.action, 'escalate');
  assert.equal(exhausted.value.toLane, 'TERRA_PRIMARY');
});

test('protected authority and malformed evidence refuse automatic dispatch', () => {
  const authority = routeModelTask({
    taskId: 'authority', profile: profile({ authorityRequired: true }), ledger, policy, targetSupport: targetSupport()
  });
  assert.equal(authority.ok, false);
  assert.equal(authority.receipt.automaticDispatch, false);
  assert.match(authority.errors[0], /protected_authority/);

  const missingEvidence = routeModelTask({
    taskId: 'missing-evidence', profile: profile({ taskShape: ['not-observed'] }), ledger, policy, targetSupport: targetSupport()
  });
  assert.equal(missingEvidence.ok, false);
  assert.match(missingEvidence.errors[0], /capability_evidence_invalid_or_absent/);
});

test('a coordinator override is explicit and cannot select an ineligible lane', () => {
  const overridden = routeModelTask({
    taskId: 'override', profile: profile(), ledger, policy, targetSupport: targetSupport(),
    coordinatorOverride: { lane: 'TERRA_PRIMARY', rationale: 'Coordinator needs the established source-comprehension lane.' }
  });
  assert.equal(overridden.ok, true);
  assert.equal(overridden.selectedLane, 'TERRA_PRIMARY');
  assert.equal(overridden.automaticDispatch, false);
  assert.equal(overridden.receipt.coordinatorOverride.applied, true);

  const ineligible = routeModelTask({
    taskId: 'ineligible-override', profile: profile(), ledger, policy,
    targetSupport: targetSupport({ 'gpt-5.6-terra': { available: false, authorized: false } }),
    coordinatorOverride: { lane: 'TERRA_PRIMARY', rationale: 'Coordinator requested it.' }
  });
  assert.equal(ineligible.ok, false);
  assert.match(ineligible.errors[0], /coordinator_override_not_eligible/);
});

test('cross-product work stays coordinator-owned unless explicitly scoped to an eligible lane', () => {
  const crossProduct = profile({ crossProduct: true, ambiguity: 'medium', blastRadius: 'medium' });
  const automatic = routeModelTask({ taskId: 'cross-product', profile: crossProduct, ledger, policy, targetSupport: targetSupport() });
  assert.equal(automatic.ok, true);
  assert.equal(automatic.receipt.status, 'escalated');
  assert.equal(automatic.automaticDispatch, false);

  const delegated = routeModelTask({
    taskId: 'cross-product-delegated', profile: crossProduct, ledger, policy, targetSupport: targetSupport(),
    coordinatorOverride: { lane: 'TERRA_PRIMARY', rationale: 'Coordinator decomposed a disjoint provider adapter surface.' }
  });
  assert.equal(delegated.ok, true);
  assert.equal(delegated.selectedLane, 'TERRA_PRIMARY');
  assert.equal(delegated.automaticDispatch, false);
  assert(delegated.receipt.reasons.includes('coordinator_scoped_delegation:automatic_dispatch_remains_false'));
});

test('routing receipts require reasons and policy identity while preserving evidence and limits', () => {
  const result = routeModelTask({ taskId: 'receipt', profile: profile(), ledger, policy, targetSupport: targetSupport() });
  assert.equal(result.ok, true);
  assert.equal(result.receipt.policy.policyId, policy.policyId);
  assert(result.receipt.evidence.observationIds.length > 0);
  assert.equal(validateRoutingReceipt(result.receipt).ok, true);
  const missingReasons = structuredClone(result.receipt);
  missingReasons.reasons = [];
  assert.equal(buildRoutingReceipt(missingReasons).ok, false);
  const missingPolicy = structuredClone(result.receipt);
  missingPolicy.policy = {};
  assert.equal(validateRoutingReceipt(missingPolicy).ok, false);
});
