import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildWorkPacket } from '../lib/work-packet.mjs';
import {
  DISPATCH_DESCRIPTOR_FIELDS,
  createDispatchDescriptor,
  registerProvider,
  validateDispatchDescriptor
} from '../lib/providers/provider-contract.mjs';
import { codexAgentProvider, createCodexAgentDescriptor } from '../lib/providers/codex-agent.mjs';
import { claudeCliProvider, createClaudeCliDescriptor } from '../lib/providers/claude-cli.mjs';
import { createManualRiffDescriptor, manualRiffProvider } from '../lib/providers/manual-riff.mjs';

const workspaceRoot = path.resolve('D:\\CodexWorktrees\\orb-r06-provider-adapters-20260902');

function packet() {
  const campaign = {
    schemaVersion: 1,
    campaignId: 'provider-adapter-test',
    title: 'Provider adapter test',
    northStar: 'Emit safe provider dispatch descriptors.',
    sourceRevision: '1a901bc4d0627645c9885e33918923e39bed52af',
    workspaceRoot,
    constraints: { forkContext: false, childWorkersAllowed: false, maximumBriefWords: 1500, maximumReturnWords: 300, correctionBudget: 1 },
    roadmaps: []
  };
  const roadmap = {
    id: 'ORB-R06',
    title: 'Provider adapters',
    outcome: 'Emit safe descriptors.',
    taskProfile: { ambiguity: 'low', blastRadius: 'low', crossProduct: false, behaviorChange: true, mechanicalAcceptance: true, authorityRequired: false, filesExpected: 7 },
    inputs: ['lib/work-packet.mjs'],
    ownedOutputs: ['lib/providers/provider-contract.mjs'],
    prohibitedPaths: ['**/*token*'],
    acceptance: { mustFire: 'Unsafe dispatch refuses.', mustStaySilent: 'Safe dispatch emits a descriptor.', checks: ['provider contract', 'safe arguments'] },
    evidencePolicy: { reuse: [], rerunWhen: ['dispatch contract changes'] },
    target: { host: 'local', root: workspaceRoot, portabilityRule: 'Use the declared workspace root.' },
    phases: Array.from({ length: 6 }, (_, index) => ({ id: `ORB-R06-P0${index + 1}`, title: `Phase ${index + 1}`, type: 'AFK', mustFire: 'Refusal fires.', mustStaySilent: 'Safe descriptor emits.' }))
  };
  return buildWorkPacket(campaign, roadmap);
}

const available = { available: true, authorized: true };

function codexInput(overrides = {}) {
  return {
    packet: packet(),
    model: 'gpt-5.6-terra',
    reasoningEffort: 'xhigh',
    modelAvailability: available,
    ...overrides
  };
}

function claudeInput(overrides = {}) {
  return {
    packet: packet(),
    model: 'claude-opus-4-8',
    reasoningEffort: 'xhigh',
    modelAvailability: available,
    ...overrides
  };
}

test('P01 refuses non-conforming providers and fixes one descriptor surface', () => {
  const registry = new Map();
  assert.equal(registerProvider(registry, { providerId: 'broken', createDescriptor: true }).ok, false);
  for (const provider of [codexAgentProvider, claudeCliProvider, manualRiffProvider]) {
    assert.equal(registerProvider(registry, provider).ok, true);
  }
  assert.equal(registerProvider(registry, codexAgentProvider).ok, false);
  assert.deepEqual([...registry.keys()].sort(), ['claude-cli', 'codex-agent', 'manual-riff']);
  assert.deepEqual(DISPATCH_DESCRIPTOR_FIELDS, ['schemaVersion', 'descriptorId', 'providerId', 'status', 'packet', 'dispatch', 'authority', 'limits']);
});

test('P02 Codex emits a no-history tool-ready descriptor and refuses inherited context or unauthorized overrides', () => {
  const result = createCodexAgentDescriptor(codexInput());
  assert.equal(result.ok, true);
  assert.equal(result.descriptor.dispatch.target, 'codex.create_thread');
  assert.equal(result.descriptor.dispatch.context.history, 'none');
  assert.deepEqual(result.descriptor.dispatch.arguments.slice(0, 4), ['--model', 'gpt-5.6-terra', '--reasoning-effort', 'xhigh']);
  assert.equal(createCodexAgentDescriptor(codexInput({ inheritContext: true })).ok, false);
  assert.equal(createCodexAgentDescriptor(codexInput({ modelOverride: { model: 'gpt-5.6-terra', authorized: false } })).ok, false);
  assert.equal(createCodexAgentDescriptor(codexInput({ modelAvailability: { available: false, authorized: true } })).ok, false);
});

test('P03 Claude requires an explicit available Opus model, xhigh effort, a brief, and no fallback session state', () => {
  const result = createClaudeCliDescriptor(claudeInput());
  assert.equal(result.ok, true);
  assert.deepEqual(result.descriptor.dispatch.arguments.slice(0, 6), ['--model', 'claude-opus-4-8', '--effort', 'xhigh', '--no-session-persistence', '--brief-path']);
  assert.equal(createClaudeCliDescriptor(claudeInput({ fallbackModel: 'claude-sonnet' })).ok, false);
  assert.equal(createClaudeCliDescriptor(claudeInput({ sessionPersistence: true })).ok, false);
  assert.equal(createClaudeCliDescriptor(claudeInput({ modelAvailability: { available: true, authorized: false } })).ok, false);
  const missingBrief = packet();
  missingBrief.briefPath = '';
  assert.equal(createClaudeCliDescriptor(claudeInput({ packet: missingBrief })).ok, false);
});

test('P04 Manual Riff emits only pointers and refuses copied artifact bodies or canonical authority claims', () => {
  const result = createManualRiffDescriptor({
    packet: packet(),
    room: 'sola-artifacts',
    artifactPath: path.join(workspaceRoot, 'references', 'provider-adapters.md')
  });
  assert.equal(result.ok, true);
  assert.equal(result.descriptor.dispatch.target, 'riff.publish_pointer');
  assert(result.descriptor.dispatch.arguments.includes('--pointer-only'));
  assert.equal(JSON.stringify(result.descriptor).includes('artifact body contents'), false);
  assert.equal(createManualRiffDescriptor({ packet: packet(), room: 'sola-artifacts', artifactPath: path.join(workspaceRoot, 'references', 'provider-adapters.md'), artifactBody: 'artifact body contents' }).ok, false);
  assert.equal(createManualRiffDescriptor({ packet: packet(), room: 'sola-artifacts', artifactPath: path.join(workspaceRoot, 'references', 'provider-adapters.md'), canonicalAuthority: true }).ok, false);
});

test('P05 rejects secret-shaped fields and shell controls while preserving opaque safe arguments', () => {
  const safe = createDispatchDescriptor({
    providerId: 'future-provider',
    packet: packet(),
    target: 'future.dispatch',
    arguments: ['--opaque', 'safe-value_123', '--brief-path', packet().briefPath]
  });
  assert.equal(safe.ok, true);
  assert.equal(createDispatchDescriptor({ providerId: 'future-provider', packet: packet(), target: 'future.dispatch', arguments: ['--model', 'safe;whoami'] }).ok, false);
  assert.equal(createCodexAgentDescriptor(codexInput({ apiToken: 'sk-not-allowed' })).ok, false);
});

test('P06 every provider preserves packet and campaign identity and detects descriptor tampering', () => {
  const descriptors = [
    createCodexAgentDescriptor(codexInput()).descriptor,
    createClaudeCliDescriptor(claudeInput()).descriptor,
    createManualRiffDescriptor({ packet: packet(), room: 'sola-artifacts', artifactPath: path.join(workspaceRoot, 'references', 'provider-adapters.md') }).descriptor
  ];
  for (const descriptor of descriptors) {
    assert.deepEqual(Object.keys(descriptor), DISPATCH_DESCRIPTOR_FIELDS);
    assert.equal(descriptor.packet.campaignId, 'provider-adapter-test');
    assert.equal(descriptor.packet.packetHash, packet().packetHash);
    assert.equal(validateDispatchDescriptor(descriptor).ok, true);
  }
  const droppedIdentity = structuredClone(descriptors[0]);
  delete droppedIdentity.packet.campaignId;
  assert.equal(validateDispatchDescriptor(droppedIdentity).ok, false);
});

test('dispatch receipt schema names the shared descriptor contract', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../schemas/dispatch-receipt.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.deepEqual(schema.required, DISPATCH_DESCRIPTOR_FIELDS);
});
