import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { compileReady, createBarCatalog, createInitialState, planCampaign } from '../lib/roadmap-compiler.mjs';
import { collisionSafeWave, semanticHash, topologicalOrder, validateCampaign } from '../lib/roadmap-graph.mjs';

function roadmap(id, dependsOn = [], ownedOutputs = [`out/${id}.js`]) {
  return {
    id,
    title: id,
    outcome: `Build ${id}`,
    dependsOn,
    executionMode: 'worker',
    taskProfile: { ambiguity: 'low', blastRadius: 'low', crossProduct: false, behaviorChange: true, mechanicalAcceptance: true, authorityRequired: false, filesExpected: 1 },
    inputs: ['input.json'],
    ownedOutputs,
    prohibitedPaths: ['products/**'],
    acceptance: { mustFire: 'bad input refuses', mustStaySilent: 'good input passes', checks: ['focused test', 'scope audit'] },
    evidencePolicy: { reuse: [], rerunWhen: ['source changes'] },
    target: { host: 'local', root: 'D:\\tmp', portabilityRule: 'no absolute product dependency' },
    phases: Array.from({ length: 3 }, (_, index) => ({ id: `${id}-P0${index + 1}`, title: `Phase ${index + 1}`, type: 'AFK', mustFire: `failure ${index + 1}`, mustStaySilent: `control ${index + 1}` }))
  };
}

function campaign(roadmaps) {
  return { schemaVersion: 1, campaignId: 'test', title: 'Test', northStar: 'Test orchestration', sourceRevision: '1234567', workspaceRoot: path.resolve('D:\\tmp'), constraints: { forkContext: false, childWorkersAllowed: false, maximumBriefWords: 1500, maximumReturnWords: 300, correctionBudget: 1 }, roadmaps };
}

test('validates and counts a complete campaign', () => {
  const result = validateCampaign(campaign([roadmap('R00'), roadmap('R01', ['R00'])]));
  assert.equal(result.ok, true);
  assert.deepEqual(result.counts, { roadmaps: 2, phases: 6 });
});

test('refuses missing phase gates and dependencies', () => {
  const value = campaign([roadmap('R00'), roadmap('R01', ['MISSING'])]);
  value.roadmaps[0].phases[0].mustFire = '';
  const result = validateCampaign(value);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('mustFire')));
  assert(result.errors.some((error) => error.includes('dependsOn:missing')));
});

test('refuses dependency cycles', () => {
  const value = campaign([roadmap('R00', ['R01']), roadmap('R01', ['R00'])]);
  const result = validateCampaign(value);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('dependency:cycle')));
});

test('sorts DAG and calculates dependency-ready roadmaps', () => {
  const value = campaign([roadmap('R02', ['R01']), roadmap('R00'), roadmap('R01', ['R00'])]);
  assert.deepEqual(topologicalOrder(value).map((item) => item.id), ['R00', 'R01', 'R02']);
  const state = createInitialState(value, '2026-09-02T00:00:00.000Z');
  state.roadmaps.R00.status = 'verified';
  const plan = planCampaign(value, state);
  assert.deepEqual(plan.wave, ['R01']);
});

test('separates colliding ownership from one parallel wave', () => {
  const result = collisionSafeWave([roadmap('R00', [], ['lib/**']), roadmap('R01', [], ['lib/a.js']), roadmap('R02', [], ['test/a.js'])]);
  assert.deepEqual(result.wave.map((item) => item.id), ['R00', 'R02']);
  assert.deepEqual(result.deferred.map((item) => item.id), ['R01']);
  assert.equal(result.collisions.length, 1);
});

test('bar catalog and semantic hashes are deterministic', () => {
  const value = campaign([roadmap('R00')]);
  assert.equal(createBarCatalog(value).semanticHash, createBarCatalog(value).semanticHash);
  assert.equal(semanticHash({ b: 2, a: 1 }), semanticHash({ a: 1, b: 2 }));
});

test('compiles one roadmap-sized packet retaining every phase', () => {
  const value = campaign([roadmap('R00')]);
  const state = createInitialState(value, '2026-09-02T00:00:00.000Z');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-compile-'));
  const first = compileReady(value, state, root);
  const second = compileReady(value, state, root);
  assert.equal(first.ok, true);
  assert.equal(first.records.length, 1);
  assert.equal(first.compileHash, second.compileHash);
  const packet = JSON.parse(fs.readFileSync(first.records[0].packetPath, 'utf8'));
  assert.equal(packet.phaseGates.length, 3);
  assert.equal(packet.constraints.forkContext, false);
  assert.match(fs.readFileSync(first.records[0].briefPath, 'utf8'), /MUST STAY SILENT/);
});

test('retargets a selected packet to an isolated worker without changing campaign identity', () => {
  const value = campaign([roadmap('R00'), roadmap('R01')]);
  const state = createInitialState(value, '2026-09-02T00:00:00.000Z');
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-retarget-'));
  const workerRoot = path.resolve('D:\\workers\\R01');
  const result = compileReady(value, state, outputRoot, { roadmapIds: ['R01'], workspaceRoot: workerRoot });
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].roadmapId, 'R01');
  assert.equal(result.campaignHash, semanticHash(value));
  const packet = JSON.parse(fs.readFileSync(result.records[0].packetPath, 'utf8'));
  assert.equal(packet.target.root, workerRoot);
  assert.equal(packet.ownedOutputs[0], path.resolve(workerRoot, 'out/R01.js'));
  assert.match(fs.readFileSync(result.records[0].briefPath, 'utf8'), new RegExp(workerRoot.replaceAll('\\', '\\\\')));
});

test('refuses unavailable or unknown selective compilation', () => {
  const value = campaign([roadmap('R00'), roadmap('R01', ['R00'])]);
  const state = createInitialState(value, '2026-09-02T00:00:00.000Z');
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-refuse-'));
  assert.deepEqual(compileReady(value, state, outputRoot, { roadmapIds: ['NOPE'] }).errors, ['roadmap:unknown:NOPE']);
  assert.deepEqual(compileReady(value, state, outputRoot, { roadmapIds: ['R01'] }).errors, ['roadmap:not_in_current_wave:R01']);
});
