import fs from 'node:fs';
import path from 'node:path';
import { collisionSafeWave, createBarCatalog, readyRoadmaps, semanticHash, topologicalOrder, validateCampaign } from './roadmap-graph.mjs';
import { buildWorkPacket, compileWorkPacket, renderWorkerBrief } from './work-packet.mjs';

export { createBarCatalog } from './roadmap-graph.mjs';
export { buildWorkPacket as buildPacket, renderWorkerBrief as buildBrief } from './work-packet.mjs';

function atomicWrite(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, file);
}

function resolveInput(root, value) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(root, value);
}

export function createInitialState(campaign, now = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    campaignId: campaign.campaignId,
    campaignHash: semanticHash(campaign),
    createdAt: now,
    updatedAt: now,
    revision: 0,
    roadmaps: Object.fromEntries(campaign.roadmaps.map((roadmap) => [roadmap.id, {
      status: roadmap.dependsOn.length === 0 ? 'ready' : 'not_started',
      lease: null,
      corrections: 0,
      phases: Object.fromEntries(roadmap.phases.map((phase) => [phase.id, { status: 'not_started', evidence: [] }]))
    }]))
  };
}

export function planCampaign(campaign, state) {
  const validation = validateCampaign(campaign);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const ready = readyRoadmaps(campaign, state);
  const safe = collisionSafeWave(ready);
  return {
    ok: true,
    campaignId: campaign.campaignId,
    campaignHash: semanticHash(campaign),
    order: topologicalOrder(campaign).map((roadmap) => roadmap.id),
    ready: ready.map((roadmap) => roadmap.id),
    wave: safe.wave.map((roadmap) => roadmap.id),
    deferredForCollision: safe.deferred.map((roadmap) => roadmap.id),
    collisions: safe.collisions
  };
}

export function compileReady(campaign, state, outputRoot, options = {}) {
  const plan = planCampaign(campaign, state);
  if (!plan.ok) return plan;
  const requested = options.roadmapIds?.length ? new Set(options.roadmapIds) : null;
  const unknownRequested = requested
    ? [...requested].filter((roadmapId) => !campaign.roadmaps.some((roadmap) => roadmap.id === roadmapId))
    : [];
  if (unknownRequested.length) return { ok: false, errors: unknownRequested.map((roadmapId) => `roadmap:unknown:${roadmapId}`) };
  const selectedWave = requested ? plan.wave.filter((roadmapId) => requested.has(roadmapId)) : plan.wave;
  const unavailableRequested = requested ? [...requested].filter((roadmapId) => !selectedWave.includes(roadmapId)) : [];
  if (unavailableRequested.length) return { ok: false, errors: unavailableRequested.map((roadmapId) => `roadmap:not_in_current_wave:${roadmapId}`) };
  const effectiveRoot = options.workspaceRoot ? path.resolve(options.workspaceRoot) : campaign.workspaceRoot;
  const effectiveCampaign = { ...campaign, workspaceRoot: effectiveRoot };
  const byId = new Map(campaign.roadmaps.map((roadmap) => [roadmap.id, roadmap]));
  const barCatalog = createBarCatalog(campaign);
  const records = [];
  atomicWrite(path.join(outputRoot, 'bar-catalog.json'), `${JSON.stringify(barCatalog, null, 2)}\n`);
  for (const roadmapId of selectedWave) {
    const sourceRoadmap = byId.get(roadmapId);
    const roadmap = {
      ...sourceRoadmap,
      target: sourceRoadmap.target.host === 'local'
        ? { ...sourceRoadmap.target, root: effectiveRoot }
        : sourceRoadmap.target
    };
    const briefPath = path.resolve(outputRoot, `${roadmap.id}-BRIEF.md`);
    const packetPath = path.resolve(outputRoot, `${roadmap.id}-PACKET.json`);
    const compiled = compileWorkPacket(effectiveCampaign, roadmap, {
      workspaceRoot: effectiveRoot,
      outputRoot,
      briefPath,
      packetPath,
      barCatalogHash: barCatalog.semanticHash
    });
    if (!compiled.ok) return { ok: false, errors: compiled.errors.map((error) => `${roadmap.id}:${error}`) };
    records.push({ roadmapId, briefPath, packetPath, packetHash: compiled.packetHash, briefWords: compiled.briefWords });
  }
  const receipt = {
    schemaVersion: 1,
    campaignId: campaign.campaignId,
    campaignHash: semanticHash(campaign),
    workspaceRoot: effectiveRoot,
    barCatalogHash: barCatalog.semanticHash,
    plan: { ...plan, wave: selectedWave },
    records
  };
  receipt.compileHash = semanticHash(receipt);
  atomicWrite(path.join(outputRoot, 'compile-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  return { ok: true, ...receipt };
}

export function writeInitialState(campaign, statePath) {
  const validation = validateCampaign(campaign);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  if (fs.existsSync(statePath)) return { ok: false, errors: ['state:already_exists'] };
  const state = createInitialState(campaign);
  atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return { ok: true, statePath, campaignHash: state.campaignHash };
}
