#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { compileReady, planCampaign } from '../lib/roadmap-compiler.mjs';
import { validateCampaign } from '../lib/roadmap-graph.mjs';
import {
  acquireLease,
  createExecutionState,
  intakeWorkerResult,
  readExecutionState,
  reclaimExpiredLeases,
  recoverExecutionState,
  recordPhaseEvidence,
  refreshReadyRoadmaps,
  startRoadmap,
  transitionRoadmap,
  validateExecutionState,
  writeExecutionState
} from '../lib/execution-state.mjs';
import { routeModelTask } from '../lib/model-router.mjs';
import { writeDashboard } from './generate-orchestration-dashboard.mjs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  if (value.ok === false) process.exitCode = 1;
}

const [command, campaignFile, stateFile, outputRoot, fifth, sixth] = process.argv.slice(2);

function executeStateMutation(campaign, statePath, requestPath, mutate) {
  const state = readExecutionState(statePath, { campaign });
  const request = readJson(requestPath);
  const result = mutate(state, request, campaign);
  const write = writeExecutionState(statePath, result.state, {
    expectedRevision: request.expectedRevision,
    validationOptions: { campaign }
  });
  return { ok: true, write, receipt: result.receipt ?? null, receipts: result.receipts ?? null, ready: result.ready ?? null, reclaimed: result.reclaimed ?? null };
}

try {
  if (!command || !campaignFile) {
    print({ ok: false, errors: ['usage: validate <campaign> | init <campaign> <state> | plan <campaign> <state> | compile <campaign> <state> <output> | route <request> <ledger> <policy> | lease|start|transition|phase-evidence|refresh-ready <campaign> <state> <request> | intake <campaign> <state> <request> <packet> <result> | recover <campaign> <state> <request> | report <campaign> <state> <output>'] });
  } else {
    if (command === 'route') {
      const request = readJson(campaignFile);
      print(routeModelTask({ ...request, ledger: readJson(stateFile), policy: readJson(outputRoot) }));
    } else {
      const campaign = readJson(campaignFile);
      if (command === 'validate') print(validateCampaign(campaign));
      else if (command === 'validate-state') print(validateExecutionState(readJson(stateFile), { campaign }));
      else if (command === 'init') {
        const statePath = path.resolve(stateFile);
        const state = createExecutionState(campaign, new Date().toISOString());
        print({ ok: true, write: writeExecutionState(statePath, state, { validationOptions: { campaign } }) });
      }
      else if (command === 'plan') print(planCampaign(campaign, readJson(stateFile)));
      else if (command === 'compile') {
      const roadmapIds = process.env.SOLA_ORCHESTRATION_ROADMAP_IDS?.split(',').map((value) => value.trim()).filter(Boolean);
      const workspaceRoot = process.env.SOLA_ORCHESTRATION_WORKSPACE_ROOT;
      print(compileReady(campaign, readJson(stateFile), path.resolve(outputRoot), { roadmapIds, workspaceRoot }));
      } else if (command === 'lease') print(executeStateMutation(campaign, stateFile, outputRoot, (state, request) => acquireLease(state, { ...request, validationOptions: { campaign } })));
      else if (command === 'start') print(executeStateMutation(campaign, stateFile, outputRoot, (state, request) => startRoadmap(state, { ...request, validationOptions: { campaign } })));
      else if (command === 'transition') print(executeStateMutation(campaign, stateFile, outputRoot, (state, request) => transitionRoadmap(state, { ...request, validationOptions: { campaign } })));
      else if (command === 'phase-evidence') print(executeStateMutation(campaign, stateFile, outputRoot, (state, request) => recordPhaseEvidence(state, { ...request, validationOptions: { campaign } })));
      else if (command === 'refresh-ready') print(executeStateMutation(campaign, stateFile, outputRoot, (state, request) => refreshReadyRoadmaps(state, campaign, request)));
      else if (command === 'intake') print(executeStateMutation(campaign, stateFile, outputRoot, (state, request) => intakeWorkerResult(state, { ...request, packet: readJson(fifth), result: readJson(sixth), validationOptions: { campaign } })));
      else if (command === 'recover') {
        const request = readJson(outputRoot);
        const recovery = recoverExecutionState(stateFile, { validationOptions: { campaign } });
        const result = reclaimExpiredLeases(recovery.state, { ...request, expectedRevision: recovery.state.revision, validationOptions: { campaign } });
        let write = null;
        if (result.receipts.length) write = writeExecutionState(stateFile, result.state, { expectedRevision: recovery.state.revision, validationOptions: { campaign } });
        print({ ok: true, recoveredFile: recovery.recovered, reclaimed: result.reclaimed, receipts: result.receipts, write });
      } else if (command === 'report') print(writeDashboard(campaignFile, stateFile, outputRoot));
      else print({ ok: false, errors: [`command:unknown:${command}`] });
    }
  }
} catch (error) {
  print({ ok: false, errors: [error.code ?? error.message], details: error.details ?? null });
}
