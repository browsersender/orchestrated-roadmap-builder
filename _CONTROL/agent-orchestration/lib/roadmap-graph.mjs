import crypto from 'node:crypto';
import path from 'node:path';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function semanticHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function present(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeOwnedPath(value) {
  let normalized = String(value).replaceAll('\\', '/').replace(/^\.\//, '').toLowerCase();
  normalized = normalized.replace(/\/\*\*.*$/, '').replace(/\/\*.*$/, '').replace(/\*.*$/, '');
  return normalized.replace(/\/$/, '');
}

function pathsOverlap(left, right) {
  const a = normalizeOwnedPath(left);
  const b = normalizeOwnedPath(right);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function flattenPhases(campaign) {
  return campaign.roadmaps.flatMap((roadmap) => roadmap.phases.map((phase) => ({ ...phase, roadmapId: roadmap.id })));
}

export function createBarCatalog(campaign) {
  const bars = flattenPhases(campaign).map((phase) => ({
    phaseId: phase.id,
    roadmapId: phase.roadmapId,
    mustFire: phase.mustFire,
    mustStaySilent: phase.mustStaySilent
  }));
  return {
    schemaVersion: 1,
    campaignId: campaign.campaignId,
    sourceRevision: campaign.sourceRevision,
    bars,
    semanticHash: semanticHash(bars)
  };
}

export function validateCampaign(campaign) {
  const errors = [];
  for (const key of ['schemaVersion', 'campaignId', 'title', 'northStar', 'sourceRevision', 'workspaceRoot', 'constraints', 'roadmaps']) {
    if (campaign?.[key] === undefined) errors.push(`missing:${key}`);
  }
  if (campaign?.schemaVersion !== 1) errors.push('schemaVersion:must_be_1');
  if (!path.isAbsolute(campaign?.workspaceRoot ?? '')) errors.push('workspaceRoot:must_be_absolute');
  if (!Array.isArray(campaign?.roadmaps) || campaign.roadmaps.length === 0) errors.push('roadmaps:must_be_nonempty_array');

  const roadmapIds = new Set();
  const phaseIds = new Set();
  for (const roadmap of campaign?.roadmaps ?? []) {
    if (!present(roadmap.id)) errors.push('roadmap.id:required');
    if (roadmapIds.has(roadmap.id)) errors.push(`roadmap.id:duplicate:${roadmap.id}`);
    roadmapIds.add(roadmap.id);
    for (const key of ['title', 'outcome', 'executionMode', 'taskProfile', 'acceptance', 'evidencePolicy', 'target']) {
      if (roadmap[key] === undefined || roadmap[key] === null) errors.push(`${roadmap.id}.${key}:required`);
    }
    for (const key of ['dependsOn', 'inputs', 'ownedOutputs', 'prohibitedPaths', 'phases']) {
      if (!Array.isArray(roadmap[key]) || (key !== 'dependsOn' && roadmap[key].length === 0)) errors.push(`${roadmap.id}.${key}:must_be_nonempty_array`);
    }
    if (!present(roadmap.acceptance?.mustFire)) errors.push(`${roadmap.id}.acceptance.mustFire:required`);
    if (!present(roadmap.acceptance?.mustStaySilent)) errors.push(`${roadmap.id}.acceptance.mustStaySilent:required`);
    if (!Array.isArray(roadmap.acceptance?.checks) || roadmap.acceptance.checks.length < 2) errors.push(`${roadmap.id}.acceptance.checks:minimum_2`);
    if (new Set(roadmap.ownedOutputs ?? []).size !== (roadmap.ownedOutputs ?? []).length) errors.push(`${roadmap.id}.ownedOutputs:duplicates`);
    for (const phase of roadmap.phases ?? []) {
      if (!present(phase.id)) errors.push(`${roadmap.id}.phase.id:required`);
      if (phaseIds.has(phase.id)) errors.push(`phase.id:duplicate:${phase.id}`);
      phaseIds.add(phase.id);
      if (!present(phase.mustFire)) errors.push(`${phase.id}.mustFire:required`);
      if (!present(phase.mustStaySilent)) errors.push(`${phase.id}.mustStaySilent:required`);
      if (!['AFK', 'HITL'].includes(phase.type)) errors.push(`${phase.id}.type:invalid`);
    }
  }

  for (const roadmap of campaign?.roadmaps ?? []) {
    for (const dependency of roadmap.dependsOn ?? []) {
      if (!roadmapIds.has(dependency)) errors.push(`${roadmap.id}.dependsOn:missing:${dependency}`);
      if (dependency === roadmap.id) errors.push(`${roadmap.id}.dependsOn:self`);
    }
  }

  if (errors.length === 0) {
    try {
      topologicalOrder(campaign);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { ok: errors.length === 0, errors, counts: { roadmaps: roadmapIds.size, phases: phaseIds.size } };
}

export function topologicalOrder(campaign) {
  const byId = new Map(campaign.roadmaps.map((roadmap) => [roadmap.id, roadmap]));
  const remaining = new Map(campaign.roadmaps.map((roadmap) => [roadmap.id, new Set(roadmap.dependsOn)]));
  const order = [];
  while (remaining.size > 0) {
    const ready = [...remaining.entries()].filter(([, dependencies]) => dependencies.size === 0).map(([id]) => id).sort();
    if (ready.length === 0) throw new Error(`dependency:cycle:${[...remaining.keys()].sort().join(',')}`);
    for (const id of ready) {
      order.push(byId.get(id));
      remaining.delete(id);
      for (const dependencies of remaining.values()) dependencies.delete(id);
    }
  }
  return order;
}

export function findOwnershipCollisions(roadmaps) {
  const collisions = [];
  for (let left = 0; left < roadmaps.length; left += 1) {
    for (let right = left + 1; right < roadmaps.length; right += 1) {
      const matches = [];
      for (const a of roadmaps[left].ownedOutputs) {
        for (const b of roadmaps[right].ownedOutputs) {
          if (pathsOverlap(a, b)) matches.push({ left: a, right: b });
        }
      }
      if (matches.length) collisions.push({ roadmaps: [roadmaps[left].id, roadmaps[right].id], paths: matches });
    }
  }
  return collisions;
}

export function roadmapStatus(state, roadmapId) {
  return state?.roadmaps?.[roadmapId]?.status ?? 'not_started';
}

export function readyRoadmaps(campaign, state) {
  return campaign.roadmaps.filter((roadmap) => {
    const status = roadmapStatus(state, roadmap.id);
    if (!['not_started', 'ready'].includes(status)) return false;
    return roadmap.dependsOn.every((id) => roadmapStatus(state, id) === 'verified');
  });
}

export function collisionSafeWave(roadmaps) {
  const wave = [];
  const deferred = [];
  for (const roadmap of [...roadmaps].sort((a, b) => a.id.localeCompare(b.id))) {
    if (findOwnershipCollisions([...wave, roadmap]).length === 0) wave.push(roadmap);
    else deferred.push(roadmap);
  }
  return { wave, deferred, collisions: findOwnershipCollisions(roadmaps) };
}
