import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildWorkPacket,
  compileWorkPacket,
  countWords,
  renderWorkerBrief,
  validateWorkPacket,
  workPacketHash
} from '../lib/work-packet.mjs';

const workspaceRoot = path.resolve('D:\\CodexWorktrees\\orb-r02-work-packet-20260902');

function roadmap(id = 'ORB-R02', overrides = {}) {
  return {
    id,
    title: 'Roadmap-sized packet compiler',
    outcome: 'Compile a complete no-history worker packet.',
    dependsOn: [],
    executionMode: 'worker',
    taskProfile: { ambiguity: 'medium', blastRadius: 'low', crossProduct: false, behaviorChange: true, mechanicalAcceptance: true, authorityRequired: false, filesExpected: 5 },
    inputs: ['source/input.json'],
    ownedOutputs: ['source/output.mjs', 'tests/output.test.mjs'],
    prohibitedPaths: ['products/**'],
    acceptance: { mustFire: 'Invalid packets refuse.', mustStaySilent: 'Valid packets pass.', checks: ['schema validation', 'hash validation'] },
    evidencePolicy: { reuse: ['current packet tests'], rerunWhen: ['schema or template changes'] },
    target: { host: 'local', root: workspaceRoot, portabilityRule: 'Resolve relative paths against the declared workspace root.' },
    phases: Array.from({ length: 6 }, (_, index) => ({ id: `${id}-P0${index + 1}`, title: `Phase ${index + 1}`, type: 'AFK', mustFire: `Phase ${index + 1} failure fires.`, mustStaySilent: `Phase ${index + 1} control stays silent.` })),
    ...overrides
  };
}

function campaign(roadmapValue = roadmap()) {
  return {
    schemaVersion: 1,
    campaignId: 'orchestrated-roadmap-builder-20260902',
    title: 'Test campaign',
    northStar: 'Compile safe worker packets.',
    sourceRevision: '1a901bc4d0627645c9885e33918923e39bed52af',
    workspaceRoot,
    constraints: { forkContext: false, childWorkersAllowed: false, maximumBriefWords: 1500, maximumReturnWords: 300, correctionBudget: 1 },
    roadmaps: [roadmapValue]
  };
}

test('P01 refuses incomplete packet contracts', () => {
  const result = validateWorkPacket({ schemaVersion: 2 });
  assert.equal(result.ok, false);
  assert(result.errors.includes('taskId:required'));
  assert(result.errors.includes('phaseGates:must_be_nonempty_array'));
  assert.equal(validateWorkPacket({ schemaVersion: 2, phaseGates: {} }).ok, false);
});

test('P02 renders all six phases under the brief limit and refuses oversized briefs', () => {
  const value = campaign();
  const brief = renderWorkerBrief(value, value.roadmaps[0]);
  assert.equal(countWords(brief) <= 1500, true);
  for (const phase of value.roadmaps[0].phases) {
    assert.match(brief, new RegExp(phase.id));
    assert.match(brief, new RegExp(`MUST FIRE: ${phase.mustFire}`));
    assert.match(brief, new RegExp(`MUST STAY SILENT: ${phase.mustStaySilent}`));
  }
  const oversized = campaign(roadmap('ORB-R02', { outcome: `${'word '.repeat(1600)}` }));
  const refused = compileWorkPacket(oversized, oversized.roadmaps[0]);
  assert.equal(refused.ok, false);
  assert(refused.errors.some((error) => error.includes('brief:exceeds_1500_words')));
});

test('P03 refuses inherited context and child-worker permission', () => {
  const packet = buildWorkPacket(campaign(), roadmap());
  packet.history = 'coordinator conversation';
  assert.equal(validateWorkPacket(packet).ok, false);
  delete packet.history;
  packet.constraints.forkContext = true;
  assert.equal(validateWorkPacket(packet).ok, false);
  packet.constraints.forkContext = false;
  packet.constraints.childWorkersAllowed = true;
  assert.equal(validateWorkPacket(packet).ok, false);
});

test('v2 schema names every packet contract field and fixes the version', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../schemas/work-packet-v2.schema.json', import.meta.url), 'utf8'));
  const packet = buildWorkPacket(campaign(), roadmap());
  assert.equal(schema.properties.schemaVersion.const, 2);
  assert.deepEqual([...schema.required].sort(), Object.keys(packet).sort());
});

test('P04 binds source revision, exact paths, and target portability', () => {
  const value = campaign();
  const packet = buildWorkPacket(value, value.roadmaps[0], { workspaceRoot: 'D:\\CodexWorktrees\\orb-r02-worker' });
  assert.equal(packet.sourceRevision, value.sourceRevision);
  assert.equal(packet.target.root, 'D:\\CodexWorktrees\\orb-r02-worker');
  assert.equal(packet.inputs[0], 'D:\\CodexWorktrees\\orb-r02-worker\\source\\input.json');
  assert.equal(packet.ownedOutputs[0], 'D:\\CodexWorktrees\\orb-r02-worker\\source\\output.mjs');
  assert.equal(validateWorkPacket(packet).ok, true);
  assert.equal(compileWorkPacket(value, value.roadmaps[0], { workspaceRoot: 'relative-root' }).ok, false);
  const missingRevision = campaign();
  missingRevision.sourceRevision = '';
  assert.equal(compileWorkPacket(missingRevision, missingRevision.roadmaps[0]).ok, false);
  const missingRule = campaign();
  missingRule.roadmaps[0].target.portabilityRule = '';
  assert.equal(compileWorkPacket(missingRule, missingRule.roadmaps[0]).ok, false);
});

test('preserves optional measured task-shape tags for routing', () => {
  const value = campaign(roadmap('ORB-R02', {
    taskProfile: { ...roadmap().taskProfile, taskShape: ['roadmap-compiler', 'typed-refusal', 'five-file-scope'] }
  }));
  const packet = buildWorkPacket(value, value.roadmaps[0]);
  assert.deepEqual(packet.taskProfile.taskShape, ['roadmap-compiler', 'typed-refusal', 'five-file-scope']);
  assert.equal(validateWorkPacket(packet).ok, true);
});

test('P05 retains normalization inputs, fixtures, gates, acceptance, and evidence triggers when present', () => {
  const value = campaign(roadmap('ORB-R02', {
    acceptance: { mustFire: 'bad', mustStaySilent: 'good', checks: ['normalization fixture passes', 'evidence trigger survives'] },
    evidencePolicy: { reuse: ['fixture receipt'], rerunWhen: ['normalization changes'] }
  }));
  const packet = buildWorkPacket(value, value.roadmaps[0]);
  assert.equal(packet.phaseGates.length, 6);
  assert.deepEqual(packet.evidencePolicy, value.roadmaps[0].evidencePolicy);
  assert.deepEqual(packet.acceptanceChecks, value.roadmaps[0].acceptance.checks);
  assert.equal(validateWorkPacket(packet).ok, true);
});

test('P06 makes semantic changes hash-visible while equivalent key order stays stable', () => {
  const value = campaign();
  const first = buildWorkPacket(value, value.roadmaps[0]);
  const reordered = JSON.parse(JSON.stringify(first));
  const equivalent = Object.fromEntries(Object.entries(reordered).reverse());
  assert.equal(workPacketHash(first), workPacketHash(equivalent));
  equivalent.returnContract = 'changed return contract';
  assert.notEqual(workPacketHash(first), workPacketHash(equivalent));
  assert.equal(validateWorkPacket(first).ok, true);
  assert.equal(validateWorkPacket(equivalent).ok, false);
});

test('compiles and reads back the packet and brief atomically', () => {
  const value = campaign();
  const outputRoot = fs.mkdtempSync(path.join(workspaceRoot, '.work-packet-test-'));
  try {
    const result = compileWorkPacket(value, 'ORB-R02', { outputRoot });
    assert.equal(result.ok, true);
    assert.equal(fs.existsSync(result.packetPath), true);
    assert.equal(fs.existsSync(result.briefPath), true);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, 'utf8'));
    assert.equal(validateWorkPacket(packet, { briefContents: fs.readFileSync(result.briefPath, 'utf8') }).ok, true);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});
