import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { createInitialState } from '../lib/roadmap-compiler.mjs';
import { createExecutionState } from '../lib/execution-state.mjs';
import { deriveRoadmapStatus, renderDashboard, writeDashboard } from '../scripts/generate-orchestration-dashboard.mjs';

function phase(id) {
  return { id, title: id, type: 'AFK', mustFire: `${id} fails`, mustStaySilent: `${id} passes` };
}

function fixtureCampaign(root) {
  return {
    schemaVersion: 1,
    campaignId: 'self-host-fixture',
    title: 'Self-host Fixture',
    northStar: 'Prove truthful rendering',
    sourceRevision: '1234567',
    workspaceRoot: root,
    constraints: { forkContext: false, childWorkersAllowed: false, maximumBriefWords: 1500, maximumReturnWords: 300, correctionBudget: 1 },
    roadmaps: [{
      id: 'FIX-R00', title: 'Fixture', outcome: 'Render state', dependsOn: [], executionMode: 'coordinator',
      taskProfile: { ambiguity: 'low', blastRadius: 'low', crossProduct: false, behaviorChange: false, mechanicalAcceptance: true, authorityRequired: false, filesExpected: 1 },
      inputs: ['campaign.json'], ownedOutputs: ['index.html'], prohibitedPaths: ['products/**'],
      acceptance: { mustFire: 'bad state refuses', mustStaySilent: 'valid state renders', checks: ['counts', 'identity'] },
      evidencePolicy: { reuse: [], rerunWhen: ['state changes'] },
      target: { host: 'local', root, portabilityRule: 'portable' },
      phases: [phase('FIX-R00-P01'), phase('FIX-R00-P02'), phase('FIX-R00-P03')]
    }]
  };
}

test('derives exact roadmap and phase counts from structured state', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-dashboard-'));
  const campaign = fixtureCampaign(root);
  const state = createInitialState(campaign, '2026-09-02T00:00:00.000Z');
  state.roadmaps['FIX-R00'].status = 'verified';
  state.roadmaps['FIX-R00'].phases['FIX-R00-P01'] = { status: 'verified', evidence: [{ ref: 'abc' }] };
  const status = deriveRoadmapStatus(campaign, state, { snapshotAt: '2026-09-02T01:00:00.000Z', gitCommit: 'abc1234' });
  assert.deepEqual(status.phaseCounts, { verified: 1, not_started: 2 });
  assert.deepEqual(status.roadmapCounts, { verified: 1 });
  assert.equal(status.evidenceMaturity.verifiedEvidenceRecords, 1);
  assert.match(renderDashboard(status), /1\/3/);
  assert.match(renderDashboard(status), /planning files alone never do/i);
});

test('refuses state from a different campaign identity', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-dashboard-refuse-'));
  const campaign = fixtureCampaign(root);
  const state = createInitialState(campaign, '2026-09-02T00:00:00.000Z');
  state.campaignHash = 'wrong';
  assert.throws(() => deriveRoadmapStatus(campaign, state), /state:campaign_hash_mismatch/);
});

test('writes standalone status and dashboard artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-dashboard-write-'));
  const campaign = fixtureCampaign(root);
  const state = createInitialState(campaign, '2026-09-02T00:00:00.000Z');
  const campaignPath = path.join(root, 'campaign.json');
  const statePath = path.join(root, 'execution-state.json');
  fs.writeFileSync(campaignPath, JSON.stringify(campaign));
  fs.writeFileSync(statePath, JSON.stringify(state));
  const result = writeDashboard(campaignPath, statePath, root, { gitCommit: 'abc1234' });
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(result.statusPath), true);
  assert.equal(fs.existsSync(result.dashboardPath), true);
  assert.match(fs.readFileSync(result.dashboardPath, 'utf8'), /This dashboard reports evidence/);
});

test('CLI validates v2 state, reports it, and refuses unknown commands', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-cli-'));
  const campaign = fixtureCampaign(root);
  const state = createExecutionState(campaign, '2026-09-02T00:00:00.000Z');
  const campaignPath = path.join(root, 'campaign.json');
  const statePath = path.join(root, 'execution-state.json');
  fs.writeFileSync(campaignPath, JSON.stringify(campaign));
  fs.writeFileSync(statePath, JSON.stringify(state));
  const cli = path.resolve(new URL('../scripts/roadmap-orchestrator.mjs', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
  const validated = spawnSync(process.execPath, [cli, 'validate-state', campaignPath, statePath], { encoding: 'utf8' });
  assert.equal(validated.status, 0);
  assert.equal(JSON.parse(validated.stdout).ok, true);
  const reported = spawnSync(process.execPath, [cli, 'report', campaignPath, statePath, root], { encoding: 'utf8' });
  assert.equal(reported.status, 0);
  assert.equal(JSON.parse(reported.stdout).ok, true);
  const refused = spawnSync(process.execPath, [cli, 'unknown', campaignPath], { encoding: 'utf8' });
  assert.equal(refused.status, 1);
  assert.match(refused.stdout, /command:unknown:unknown/);
});

test('CLI init creates lifecycle-ready v2 state that can immediately lease work', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-cli-init-'));
  const campaign = fixtureCampaign(root);
  const campaignPath = path.join(root, 'campaign.json');
  const statePath = path.join(root, 'execution-state.json');
  const leasePath = path.join(root, 'lease.json');
  fs.writeFileSync(campaignPath, JSON.stringify(campaign));
  const cli = path.resolve(new URL('../scripts/roadmap-orchestrator.mjs', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
  const initialized = spawnSync(process.execPath, [cli, 'init', campaignPath, statePath], { encoding: 'utf8' });
  assert.equal(initialized.status, 0);
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.revision, 0);
  assert.equal(state.roadmaps['FIX-R00'].status, 'ready');
  fs.writeFileSync(leasePath, JSON.stringify({ roadmapId: 'FIX-R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: '2026-09-02T00:00:01.000Z', expectedRevision: 0 }));
  const leased = spawnSync(process.execPath, [cli, 'lease', campaignPath, statePath, leasePath], { encoding: 'utf8' });
  assert.equal(leased.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).roadmaps['FIX-R00'].status, 'leased');
});

test('CLI leases work and recovers an expired lease with a receipt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-cli-recover-'));
  const campaign = fixtureCampaign(root);
  const state = createExecutionState(campaign, '2026-09-02T00:00:00.000Z');
  const campaignPath = path.join(root, 'campaign.json');
  const statePath = path.join(root, 'execution-state.json');
  const leasePath = path.join(root, 'lease.json');
  const recoverPath = path.join(root, 'recover.json');
  fs.writeFileSync(campaignPath, JSON.stringify(campaign));
  fs.writeFileSync(statePath, JSON.stringify(state));
  fs.writeFileSync(leasePath, JSON.stringify({ roadmapId: 'FIX-R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 1, now: '2026-09-02T00:00:01.000Z', expectedRevision: 0 }));
  fs.writeFileSync(recoverPath, JSON.stringify({ actorId: 'coordinator', now: '2026-09-02T00:00:02.000Z' }));
  const cli = path.resolve(new URL('../scripts/roadmap-orchestrator.mjs', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
  const leased = spawnSync(process.execPath, [cli, 'lease', campaignPath, statePath, leasePath], { encoding: 'utf8' });
  assert.equal(leased.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).roadmaps['FIX-R00'].status, 'leased');
  const recovered = spawnSync(process.execPath, [cli, 'recover', campaignPath, statePath, recoverPath], { encoding: 'utf8' });
  assert.equal(recovered.status, 0);
  assert.deepEqual(JSON.parse(recovered.stdout).reclaimed, ['FIX-R00']);
  assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).roadmaps['FIX-R00'].status, 'ready');
});

test('CLI restores a corrupt current state from its prior recoverable copy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-cli-corrupt-'));
  const campaign = fixtureCampaign(root);
  const state = createExecutionState(campaign, '2026-09-02T00:00:00.000Z');
  const campaignPath = path.join(root, 'campaign.json');
  const statePath = path.join(root, 'execution-state.json');
  const leasePath = path.join(root, 'lease.json');
  const recoverPath = path.join(root, 'recover.json');
  fs.writeFileSync(campaignPath, JSON.stringify(campaign));
  fs.writeFileSync(statePath, JSON.stringify(state));
  fs.writeFileSync(leasePath, JSON.stringify({ roadmapId: 'FIX-R00', workerId: 'worker-a', leaseId: 'lease-a', ttlMs: 60000, now: '2026-09-02T00:00:01.000Z', expectedRevision: 0 }));
  fs.writeFileSync(recoverPath, JSON.stringify({ actorId: 'coordinator', now: '2026-09-02T00:00:02.000Z' }));
  const cli = path.resolve(new URL('../scripts/roadmap-orchestrator.mjs', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
  assert.equal(spawnSync(process.execPath, [cli, 'lease', campaignPath, statePath, leasePath], { encoding: 'utf8' }).status, 0);
  fs.writeFileSync(statePath, '{ interrupted write');
  const recovered = spawnSync(process.execPath, [cli, 'recover', campaignPath, statePath, recoverPath], { encoding: 'utf8' });
  assert.equal(recovered.status, 0);
  assert.equal(JSON.parse(recovered.stdout).recoveredFile, true);
  assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).revision, 0);
});
