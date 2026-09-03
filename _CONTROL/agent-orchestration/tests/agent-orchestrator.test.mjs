import test from 'node:test';
import assert from 'node:assert/strict';
import { auditResultScope, inspectTargetCapacity, routeTask, validateObservation, validatePacket, validateResult } from '../scripts/agent-orchestrator.mjs';

const profile = (overrides = {}) => ({ ambiguity: 'low', blastRadius: 'low', crossProduct: false, behaviorChange: true, mechanicalAcceptance: true, authorityRequired: false, filesExpected: 4, ...overrides });

test('routes frozen low-risk work to Luna', () => {
  assert.equal(routeTask(profile(), 20).lane, 'LUNA_BOUNDED');
});

test('routes substantial implementation to Terra', () => {
  assert.equal(routeTask(profile({ filesExpected: 8, blastRadius: 'medium' }), 20).lane, 'TERRA_PRIMARY');
});

test('keeps architecture with Sol and authority with humans', () => {
  assert.equal(routeTask(profile({ ambiguity: 'high' }), 20).lane, 'SOL_OWNED');
  assert.equal(routeTask(profile({ authorityRequired: true }), 20).lane, 'HUMAN_AUTHORITY');
});

test('does not impose an unrelated fixed C drive storage floor on routing', () => {
  const result = routeTask(profile());
  assert.equal(result.ok, true);
  assert.equal(result.lane, 'LUNA_BOUNDED');
});

test('checks target-volume capacity only against a declared assignment requirement', () => {
  const available = inspectTargetCapacity(process.cwd());
  assert.equal(available.ok, true);
  assert.equal(available.capacityChecked, false);
  const refused = inspectTargetCapacity(process.cwd(), available.availableBytes + 1);
  assert.equal(refused.ok, false);
  assert.match(refused.errors[0], /below_declared_requirement/);
});

test('packet enforces no-history bounded workers', () => {
  const packet = { schemaVersion: 1, taskId: 'x', objective: 'x', briefPath: import.meta.filename, taskProfile: profile(), inputs: ['D:\\in'], ownedOutputs: ['source/out.js'], prohibitedPaths: ['*'], constraints: { forkContext: false, childWorkersAllowed: false, maximumBriefWords: 1500, maximumReturnWords: 300 }, acceptanceChecks: ['a', 'b'], returnContract: 'json' };
  assert.equal(validatePacket(packet).ok, true);
  packet.constraints.childWorkersAllowed = true;
  assert.equal(validatePacket(packet).ok, false);
});

test('result scope audit catches worker drift', () => {
  const packet = { taskId: 'x', ownedOutputs: ['source/out.js'] };
  const clean = { taskId: 'x', status: 'complete', changedPaths: ['source\\out.js'] };
  assert.equal(auditResultScope(packet, clean).ok, true);
  clean.changedPaths.push('known-gaps.md');
  assert.equal(auditResultScope(packet, clean).ok, false);
});

test('result and observation validators reject inflated contracts', () => {
  const result = { schemaVersion: 1, taskId: 'x', status: 'complete', model: 'gpt-5.6-luna', changedPaths: [], checks: [], blockers: [], integrationNote: 'ok' };
  assert.equal(validateResult(result).ok, true);
  const observation = { schemaVersion: 1, observationId: 'o', taskId: 'x', model: 'gpt-5.6-luna', taskShape: ['bounded'], observed: {}, review: { contractFidelity: 5 }, verdict: 'retain_lane' };
  assert.equal(validateObservation(observation).ok, false);
});

test('accepts Claude Opus 4.8 as a reviewed specialist result', () => {
  const result = { schemaVersion: 1, taskId: 'opus-specialist', status: 'complete', model: 'claude-opus-4-8', changedPaths: [], checks: [], blockers: [], integrationNote: 'review required' };
  assert.equal(validateResult(result).ok, true);
});
