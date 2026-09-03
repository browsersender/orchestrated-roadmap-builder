import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { semanticHash } from './roadmap-graph.mjs';

export const EXECUTION_STATE_SCHEMA_VERSION = 2;

export const ROADMAP_STATUSES = Object.freeze([
  'not_started',
  'ready',
  'leased',
  'running',
  'review',
  'integrating',
  'verified',
  'blocked',
  'failed'
]);

const TRANSITIONS = Object.freeze({
  not_started: new Set(['ready']),
  ready: new Set(['leased']),
  leased: new Set(['running', 'ready']),
  running: new Set(['review', 'blocked', 'failed', 'ready']),
  review: new Set(['integrating', 'ready', 'blocked', 'failed']),
  integrating: new Set(['verified', 'blocked', 'failed']),
  verified: new Set(),
  blocked: new Set(['ready']),
  failed: new Set(['ready'])
});

const RESULT_STATUSES = new Set(['complete', 'blocked', 'failed']);
const CHECK_RESULTS = new Set(['pass', 'fail', 'not_run']);
const PHASE_STATUSES = new Set(['not_started', 'running', 'review', 'verified', 'blocked', 'failed']);

export class ExecutionStateError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'ExecutionStateError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, details) {
  throw new ExecutionStateError(code, details);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function clone(value) {
  return structuredClone(value);
}

function toIso(value, code) {
  if (!nonEmptyString(value)) fail(`${code}:required`);
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) fail(`${code}:invalid`, { value });
  return new Date(timestamp).toISOString();
}

function nowTimestamp(value) {
  return toIso(value, 'clock');
}

function positiveInteger(value, code) {
  if (!Number.isInteger(value) || value < 1) fail(`${code}:positive_integer_required`, { value });
  return value;
}

function checksum(value) {
  return semanticHash(value);
}

function cleanEvent(event) {
  const { eventHash, ...withoutHash } = event;
  return withoutHash;
}

function eventHash(event) {
  return checksum(cleanEvent(event));
}

function stateSnapshot(state) {
  const { events, eventHead, ...snapshot } = state;
  return snapshot;
}

export function executionStateHash(state) {
  return checksum(stateSnapshot(state));
}

function stateFileBackupPath(stateFile) {
  const parsed = path.parse(stateFile);
  return path.join(parsed.dir, `${parsed.name}.previous${parsed.ext || '.json'}`);
}

function normalizePath(value) {
  return path.resolve(String(value)).replaceAll('\\', '/').toLowerCase();
}

function validateLease(lease, prefix, errors) {
  if (lease === null) return;
  if (!isPlainObject(lease)) {
    errors.push(`${prefix}:must_be_null_or_object`);
    return;
  }
  for (const key of ['leaseId', 'workerId', 'acquiredAt', 'expiresAt']) {
    if (!nonEmptyString(lease[key])) errors.push(`${prefix}.${key}:required`);
  }
  if (nonEmptyString(lease.acquiredAt) && nonEmptyString(lease.expiresAt)) {
    const acquired = Date.parse(lease.acquiredAt);
    const expires = Date.parse(lease.expiresAt);
    if (Number.isNaN(acquired) || Number.isNaN(expires)) errors.push(`${prefix}:timestamps_invalid`);
    else if (expires <= acquired) errors.push(`${prefix}:expiry_must_follow_acquisition`);
  }
}

function validateEvent(event, index, previousEventHash, errors) {
  const prefix = `events[${index}]`;
  if (!isPlainObject(event)) {
    errors.push(`${prefix}:must_be_object`);
    return;
  }
  for (const key of ['eventId', 'sequence', 'recordedAt', 'type', 'roadmapId', 'actorId', 'fromStatus', 'toStatus', 'previousEventHash', 'previousStateHash', 'nextStateHash', 'payload', 'eventHash']) {
    if (event[key] === undefined || event[key] === null || event[key] === '') errors.push(`${prefix}.${key}:required`);
  }
  if (!Number.isInteger(event.sequence) || event.sequence !== index + 1) errors.push(`${prefix}.sequence:invalid`);
  if (!nonEmptyString(event.recordedAt) || Number.isNaN(Date.parse(event.recordedAt))) errors.push(`${prefix}.recordedAt:invalid`);
  if (!nonEmptyString(event.actorId)) errors.push(`${prefix}.actorId:invalid`);
  if (!ROADMAP_STATUSES.includes(event.fromStatus)) errors.push(`${prefix}.fromStatus:invalid`);
  if (!ROADMAP_STATUSES.includes(event.toStatus)) errors.push(`${prefix}.toStatus:invalid`);
  if (event.previousEventHash !== previousEventHash) errors.push(`${prefix}.previousEventHash:mismatch`);
  if (!isPlainObject(event.payload)) errors.push(`${prefix}.payload:must_be_object`);
  if (nonEmptyString(event.eventHash) && event.eventHash !== eventHash(event)) errors.push(`${prefix}.eventHash:mismatch`);
}

export function validateExecutionState(state, options = {}) {
  const errors = [];
  if (!isPlainObject(state)) return { ok: false, errors: ['state:must_be_object'] };
  for (const key of ['schemaVersion', 'campaignId', 'campaignHash', 'sourceRevision', 'createdAt', 'updatedAt', 'revision', 'roadmaps', 'events', 'eventHead']) {
    if (state[key] === undefined || state[key] === null) errors.push(`state.${key}:required`);
  }
  if (state.schemaVersion !== EXECUTION_STATE_SCHEMA_VERSION) errors.push('state.schemaVersion:must_be_2');
  for (const key of ['campaignId', 'campaignHash', 'sourceRevision', 'createdAt', 'updatedAt', 'eventHead']) {
    if (!nonEmptyString(state[key]) && !(key === 'eventHead' && state[key] === 'GENESIS')) errors.push(`state.${key}:invalid`);
  }
  for (const key of ['createdAt', 'updatedAt']) {
    if (!nonEmptyString(state[key]) || Number.isNaN(Date.parse(state[key]))) errors.push(`state.${key}:timestamp_invalid`);
  }
  if (!Number.isInteger(state.revision) || state.revision < 0) errors.push('state.revision:nonnegative_integer_required');
  if (!isPlainObject(state.roadmaps)) errors.push('state.roadmaps:must_be_object');
  if (!Array.isArray(state.events)) errors.push('state.events:must_be_array');

  const campaignRoadmaps = options.campaign ? new Set(options.campaign.roadmaps.map((roadmap) => roadmap.id)) : null;
  for (const [roadmapId, roadmap] of Object.entries(state.roadmaps ?? {})) {
    const prefix = `roadmaps.${roadmapId}`;
    if (campaignRoadmaps && !campaignRoadmaps.has(roadmapId)) errors.push(`${prefix}:unknown_campaign_roadmap`);
    if (!isPlainObject(roadmap)) {
      errors.push(`${prefix}:must_be_object`);
      continue;
    }
    if (!ROADMAP_STATUSES.includes(roadmap.status)) errors.push(`${prefix}.status:invalid`);
    validateLease(roadmap.lease, `${prefix}.lease`, errors);
    if (roadmap.status === 'leased' || roadmap.status === 'running') {
      if (!roadmap.lease) errors.push(`${prefix}.lease:required_while_${roadmap.status}`);
    } else if (roadmap.lease !== null) {
      errors.push(`${prefix}.lease:must_be_null_while_${roadmap.status}`);
    }
    if (!Number.isInteger(roadmap.corrections) || roadmap.corrections < 0) errors.push(`${prefix}.corrections:nonnegative_integer_required`);
    if (!isPlainObject(roadmap.phases)) errors.push(`${prefix}.phases:must_be_object`);
    for (const [phaseId, phase] of Object.entries(roadmap.phases ?? {})) {
      const phasePrefix = `${prefix}.phases.${phaseId}`;
      if (!isPlainObject(phase)) {
        errors.push(`${phasePrefix}:must_be_object`);
        continue;
      }
      if (!PHASE_STATUSES.has(phase.status)) errors.push(`${phasePrefix}.status:invalid`);
      if (!Array.isArray(phase.evidence)) errors.push(`${phasePrefix}.evidence:must_be_array`);
      if (phase.status === 'verified' && phase.evidence?.length === 0) errors.push(`${phasePrefix}.evidence:required_when_verified`);
    }
    if (options.campaign) {
      const campaignRoadmap = options.campaign.roadmaps.find((item) => item.id === roadmapId);
      const expectedPhases = new Set(campaignRoadmap?.phases?.map((phase) => phase.id) ?? []);
      for (const phaseId of expectedPhases) if (!roadmap.phases?.[phaseId]) errors.push(`${prefix}.phases.${phaseId}:missing`);
      for (const phaseId of Object.keys(roadmap.phases ?? {})) if (!expectedPhases.has(phaseId)) errors.push(`${prefix}.phases.${phaseId}:unknown`);
    }
  }

  let previousEventHash = 'GENESIS';
  for (const [index, event] of (state.events ?? []).entries()) {
    validateEvent(event, index, previousEventHash, errors);
    previousEventHash = event?.eventHash ?? previousEventHash;
  }
  if (state.eventHead !== previousEventHash) errors.push('state.eventHead:mismatch');
  if (state.revision !== (state.events ?? []).length) errors.push('state.revision:event_count_mismatch');
  if (state.events?.length && state.events.at(-1).nextStateHash !== executionStateHash(state)) errors.push('state.snapshot:event_tail_mismatch');
  if (options.campaign) {
    if (state.campaignId !== options.campaign.campaignId) errors.push('state.campaignId:campaign_mismatch');
    if (state.campaignHash !== checksum(options.campaign)) errors.push('state.campaignHash:campaign_mismatch');
    if (state.sourceRevision !== options.campaign.sourceRevision) errors.push('state.sourceRevision:campaign_mismatch');
  }
  return { ok: errors.length === 0, errors };
}

function assertValidState(state, options) {
  const result = validateExecutionState(state, options);
  if (!result.ok) fail('state:invalid', { errors: result.errors });
}

function assertExpectedRevision(state, expectedRevision) {
  if (!Number.isInteger(expectedRevision)) fail('state:expected_revision_required');
  if (state.revision !== expectedRevision) fail('state:stale_revision', { expectedRevision, actualRevision: state.revision });
}

function assertRoadmap(state, roadmapId) {
  if (!nonEmptyString(roadmapId)) fail('roadmap:id_required');
  const roadmap = state.roadmaps[roadmapId];
  if (!roadmap) fail('roadmap:unknown', { roadmapId });
  return roadmap;
}

function assertLease(roadmap, workerId, leaseId, now) {
  if (!roadmap.lease) fail('lease:missing');
  if (roadmap.lease.workerId !== workerId) fail('lease:worker_mismatch');
  if (roadmap.lease.leaseId !== leaseId) fail('lease:id_mismatch');
  if (Date.parse(roadmap.lease.expiresAt) <= Date.parse(now)) fail('lease:expired');
}

function assertTransition(fromStatus, toStatus) {
  if (!ROADMAP_STATUSES.includes(toStatus)) fail('transition:unknown_target', { toStatus });
  if (!TRANSITIONS[fromStatus]?.has(toStatus)) fail('transition:illegal', { fromStatus, toStatus });
}

function appendEvent(nextState, input) {
  const event = {
    eventId: crypto.randomUUID(),
    sequence: nextState.events.length + 1,
    recordedAt: input.recordedAt,
    type: input.type,
    roadmapId: input.roadmapId,
    actorId: input.actorId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    previousEventHash: nextState.eventHead,
    previousStateHash: input.previousStateHash,
    nextStateHash: '',
    payload: input.payload ?? {}
  };
  nextState.events.push(event);
  nextState.revision = event.sequence;
  nextState.updatedAt = input.recordedAt;
  event.nextStateHash = executionStateHash(nextState);
  event.eventHash = eventHash(event);
  nextState.eventHead = event.eventHash;
  return event;
}

function mutateRoadmap(state, input, change) {
  assertValidState(state, input.validationOptions);
  assertExpectedRevision(state, input.expectedRevision);
  const previousStateHash = executionStateHash(state);
  const nextState = clone(state);
  const roadmap = assertRoadmap(nextState, input.roadmapId);
  const before = clone(roadmap);
  change(roadmap, nextState);
  const event = appendEvent(nextState, {
    ...input,
    previousStateHash,
    fromStatus: before.status,
    toStatus: roadmap.status,
    payload: { ...input.payload, previousLease: before.lease, nextLease: roadmap.lease }
  });
  assertValidState(nextState, input.validationOptions);
  return { state: nextState, receipt: event };
}

export function createExecutionState(campaign, now) {
  if (!isPlainObject(campaign) || !Array.isArray(campaign.roadmaps)) fail('campaign:invalid');
  const timestamp = nowTimestamp(now);
  const state = {
    schemaVersion: EXECUTION_STATE_SCHEMA_VERSION,
    campaignId: campaign.campaignId,
    campaignHash: checksum(campaign),
    sourceRevision: campaign.sourceRevision,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    roadmaps: Object.fromEntries(campaign.roadmaps.map((roadmap) => [roadmap.id, {
      status: roadmap.dependsOn.length === 0 ? 'ready' : 'not_started',
      lease: null,
      corrections: 0,
      phases: Object.fromEntries(roadmap.phases.map((phase) => [phase.id, { status: 'not_started', evidence: [] }]))
    }])),
    events: [],
    eventHead: 'GENESIS'
  };
  assertValidState(state, { campaign });
  return state;
}

export function transitionRoadmap(state, input) {
  const timestamp = nowTimestamp(input?.now);
  if (!nonEmptyString(input?.actorId)) fail('transition:actor_required');
  return mutateRoadmap(state, {
    ...input,
    recordedAt: timestamp,
    type: input.type ?? 'transition',
    payload: { reason: input.reason ?? null, metadata: input.metadata ?? {} }
  }, (roadmap) => {
    assertTransition(roadmap.status, input.toStatus);
    if (input.toStatus === 'leased' || input.toStatus === 'running') fail('transition:lease_managed_status');
    if (roadmap.status === 'leased' || roadmap.status === 'running') fail('transition:lease_managed_status');
    if (input.toStatus === 'verified') {
      const incomplete = Object.entries(roadmap.phases).filter(([, phase]) => phase.status !== 'verified' || phase.evidence.length === 0).map(([phaseId]) => phaseId);
      if (incomplete.length) fail('transition:phase_evidence_incomplete', { phaseIds: incomplete });
    }
    roadmap.status = input.toStatus;
    if (input.toStatus !== 'leased' && input.toStatus !== 'running') roadmap.lease = null;
  });
}

function validatePhaseEvidence(evidence) {
  if (!isPlainObject(evidence)) fail('phase_evidence:must_be_object');
  for (const key of ['type', 'ref', 'checks']) if (evidence[key] === undefined) fail(`phase_evidence.${key}:required`);
  if (!nonEmptyString(evidence.type)) fail('phase_evidence.type:invalid');
  if (!nonEmptyString(evidence.ref)) fail('phase_evidence.ref:invalid');
  if (!Array.isArray(evidence.checks) || evidence.checks.length === 0 || evidence.checks.some((item) => !nonEmptyString(item))) fail('phase_evidence.checks:invalid');
}

export function recordPhaseEvidence(state, input) {
  const timestamp = nowTimestamp(input?.now);
  if (!nonEmptyString(input?.actorId)) fail('phase_evidence:actor_required');
  if (!nonEmptyString(input?.phaseId)) fail('phase_evidence:phase_required');
  validatePhaseEvidence(input?.evidence);
  return mutateRoadmap(state, {
    ...input,
    recordedAt: timestamp,
    type: 'phase_evidence_recorded',
    payload: { phaseId: input.phaseId, evidenceHash: checksum(input.evidence) }
  }, (roadmap) => {
    if (!['review', 'integrating'].includes(roadmap.status)) fail('phase_evidence:roadmap_not_in_review', { status: roadmap.status });
    const phase = roadmap.phases[input.phaseId];
    if (!phase) fail('phase_evidence:unknown_phase', { phaseId: input.phaseId });
    if (phase.evidence.some((item) => checksum(item) === checksum(input.evidence))) fail('phase_evidence:duplicate', { phaseId: input.phaseId });
    phase.status = 'verified';
    phase.evidence.push(clone(input.evidence));
  });
}

export function refreshReadyRoadmaps(state, campaign, input) {
  if (!nonEmptyString(input?.actorId)) fail('readiness:actor_required');
  let nextState = state;
  const receipts = [];
  for (const roadmap of campaign.roadmaps) {
    if (nextState.roadmaps[roadmap.id]?.status !== 'not_started') continue;
    if (!roadmap.dependsOn.every((dependency) => nextState.roadmaps[dependency]?.status === 'verified')) continue;
    const transition = transitionRoadmap(nextState, {
      roadmapId: roadmap.id,
      toStatus: 'ready',
      actorId: input.actorId,
      now: input.now,
      expectedRevision: nextState.revision,
      reason: 'dependencies_verified',
      validationOptions: { campaign }
    });
    nextState = transition.state;
    receipts.push(transition.receipt);
  }
  return { state: nextState, receipts, ready: receipts.map((receipt) => receipt.roadmapId) };
}

export function importLegacyExecutionState(legacyState, campaign, now) {
  if (!isPlainObject(legacyState) || legacyState.schemaVersion !== 1) fail('legacy_state:must_be_v1');
  if (legacyState.campaignId !== campaign.campaignId) fail('legacy_state:campaign_mismatch');
  if (legacyState.campaignHash !== checksum(campaign)) fail('legacy_state:campaign_hash_mismatch');
  const timestamp = nowTimestamp(now);
  const state = createExecutionState(campaign, legacyState.createdAt ?? timestamp);
  const legacyHash = checksum(legacyState);
  for (const roadmap of campaign.roadmaps) {
    const legacyRoadmap = legacyState.roadmaps?.[roadmap.id];
    if (!legacyRoadmap) fail('legacy_state:roadmap_missing', { roadmapId: roadmap.id });
    if (!ROADMAP_STATUSES.includes(legacyRoadmap.status)) fail('legacy_state:status_invalid', { roadmapId: roadmap.id, status: legacyRoadmap.status });
    const previousStateHash = executionStateHash(state);
    const target = state.roadmaps[roadmap.id];
    const fromStatus = target.status;
    target.status = legacyRoadmap.status;
    target.lease = null;
    target.corrections = legacyRoadmap.corrections ?? 0;
    for (const phase of roadmap.phases) {
      const legacyPhase = legacyRoadmap.phases?.[phase.id];
      if (!legacyPhase) fail('legacy_state:phase_missing', { phaseId: phase.id });
      target.phases[phase.id] = clone(legacyPhase);
    }
    if (fromStatus !== target.status || checksum(target.phases) !== checksum(Object.fromEntries(roadmap.phases.map((phase) => [phase.id, { status: 'not_started', evidence: [] }])))) {
      appendEvent(state, {
        previousStateHash,
        recordedAt: timestamp,
        type: 'legacy_state_imported',
        roadmapId: roadmap.id,
        actorId: 'bootstrap-migration',
        fromStatus,
        toStatus: target.status,
        payload: { legacyStateHash: legacyHash, evidenceBoundary: 'retrospective_bootstrap_import' }
      });
    }
  }
  assertValidState(state, { campaign });
  return state;
}

export function acquireLease(state, input) {
  const timestamp = nowTimestamp(input?.now);
  if (!nonEmptyString(input?.workerId)) fail('lease:worker_required');
  if (!nonEmptyString(input?.leaseId)) fail('lease:id_required');
  const ttlMs = positiveInteger(input?.ttlMs, 'lease:ttl_ms');
  return mutateRoadmap(state, {
    ...input,
    actorId: input.workerId,
    recordedAt: timestamp,
    type: 'lease_acquired',
    payload: { ttlMs }
  }, (roadmap, nextState) => {
    if (roadmap.status !== 'ready') fail('lease:roadmap_not_ready', { status: roadmap.status });
    if (roadmap.lease) fail('lease:already_held');
    for (const [otherRoadmapId, other] of Object.entries(nextState.roadmaps)) {
      if (otherRoadmapId !== input.roadmapId && other.lease?.workerId === input.workerId) fail('lease:worker_already_leased', { otherRoadmapId });
    }
    roadmap.status = 'leased';
    roadmap.lease = {
      leaseId: input.leaseId,
      workerId: input.workerId,
      acquiredAt: timestamp,
      expiresAt: new Date(Date.parse(timestamp) + ttlMs).toISOString()
    };
  });
}

export function startRoadmap(state, input) {
  const timestamp = nowTimestamp(input?.now);
  if (!nonEmptyString(input?.workerId) || !nonEmptyString(input?.leaseId)) fail('run:lease_identity_required');
  return mutateRoadmap(state, {
    ...input,
    actorId: input.workerId,
    recordedAt: timestamp,
    type: 'run_started',
    payload: {}
  }, (roadmap) => {
    if (roadmap.status !== 'leased') fail('run:roadmap_not_leased', { status: roadmap.status });
    assertLease(roadmap, input.workerId, input.leaseId, timestamp);
    roadmap.status = 'running';
  });
}

export function renewLease(state, input) {
  const timestamp = nowTimestamp(input?.now);
  const ttlMs = positiveInteger(input?.ttlMs, 'lease:ttl_ms');
  if (!nonEmptyString(input?.workerId) || !nonEmptyString(input?.leaseId)) fail('lease:identity_required');
  return mutateRoadmap(state, {
    ...input,
    actorId: input.workerId,
    recordedAt: timestamp,
    type: 'lease_renewed',
    payload: { ttlMs }
  }, (roadmap) => {
    if (!['leased', 'running'].includes(roadmap.status)) fail('lease:not_renewable', { status: roadmap.status });
    assertLease(roadmap, input.workerId, input.leaseId, timestamp);
    roadmap.lease.expiresAt = new Date(Date.parse(timestamp) + ttlMs).toISOString();
  });
}

function validateCheck(check, index, errors) {
  if (!isPlainObject(check)) {
    errors.push(`checks[${index}]:must_be_object`);
    return;
  }
  if (!nonEmptyString(check.command)) errors.push(`checks[${index}].command:required`);
  if (!CHECK_RESULTS.has(check.result)) errors.push(`checks[${index}].result:invalid`);
}

export function validateWorkerResult(result) {
  const errors = [];
  if (!isPlainObject(result)) return { ok: false, errors: ['result:must_be_object'] };
  for (const key of ['schemaVersion', 'campaignId', 'taskId', 'roadmapId', 'packetHash', 'sourceRevision', 'workerId', 'status', 'changedPaths', 'checks', 'blockers', 'sparks', 'integrationNote', 'resultedAt']) {
    if (result[key] === undefined || result[key] === null) errors.push(`result.${key}:required`);
  }
  if (result.commit === undefined) errors.push('result.commit:required');
  if (result.schemaVersion !== 2) errors.push('result.schemaVersion:must_be_2');
  for (const key of ['campaignId', 'taskId', 'roadmapId', 'packetHash', 'sourceRevision', 'workerId', 'integrationNote', 'resultedAt']) {
    if (!nonEmptyString(result[key])) errors.push(`result.${key}:invalid`);
  }
  if (!nonEmptyString(result.resultedAt) || Number.isNaN(Date.parse(result.resultedAt))) errors.push('result.resultedAt:timestamp_invalid');
  if (!RESULT_STATUSES.has(result.status)) errors.push('result.status:invalid');
  if (!Array.isArray(result.changedPaths) || result.changedPaths.some((item) => !nonEmptyString(item))) errors.push('result.changedPaths:invalid');
  if (new Set(result.changedPaths ?? []).size !== (result.changedPaths ?? []).length) errors.push('result.changedPaths:duplicates');
  if (!Array.isArray(result.checks)) errors.push('result.checks:must_be_array');
  else result.checks.forEach((check, index) => validateCheck(check, index, errors));
  for (const key of ['blockers', 'sparks']) {
    if (!Array.isArray(result[key]) || result[key].some((item) => !nonEmptyString(item))) errors.push(`result.${key}:invalid`);
  }
  if (result.commit !== null && !nonEmptyString(result.commit)) errors.push('result.commit:invalid');
  return { ok: errors.length === 0, errors };
}

function assertResultMatchesPacket(state, result, packet) {
  const resultValidation = validateWorkerResult(result);
  if (!resultValidation.ok) fail('result:invalid', { errors: resultValidation.errors });
  if (!isPlainObject(packet)) fail('packet:invalid');
  if (result.campaignId !== state.campaignId || result.campaignId !== packet.campaignId) fail('result:campaign_mismatch');
  // The packet's taskId is the identity the worker was told to echo verbatim; the bare roadmapId is
  // also accepted because earlier workers returned that form.
  const taskIdentities = new Set([packet.taskId, packet.roadmapId].filter(nonEmptyString));
  if (!taskIdentities.has(result.taskId) || result.roadmapId !== packet.roadmapId) fail('result:task_mismatch');
  if (result.packetHash !== packet.packetHash) fail('result:packet_mismatch');
  if (result.sourceRevision !== state.sourceRevision || result.sourceRevision !== packet.sourceRevision) fail('result:source_mismatch');
  // Ownership is a path prefix, matching the campaign collision check: a declared directory owns
  // every file beneath it.
  const ownedPaths = (packet.ownedOutputs ?? []).map(normalizePath);
  for (const changedPath of result.changedPaths) {
    const changed = normalizePath(changedPath);
    if (!ownedPaths.some((owned) => changed === owned || changed.startsWith(`${owned}/`))) fail('result:path_mismatch', { changedPath });
  }
}

export function intakeWorkerResult(state, input) {
  const timestamp = nowTimestamp(input?.now);
  if (!input?.result) fail('result:required');
  assertResultMatchesPacket(state, input.result, input.packet);
  return mutateRoadmap(state, {
    ...input,
    roadmapId: input.result.roadmapId,
    actorId: input.result.workerId,
    recordedAt: timestamp,
    type: 'worker_result_intaked',
    payload: {
      resultHash: checksum(input.result),
      resultStatus: input.result.status,
      changedPaths: input.result.changedPaths,
      commit: input.result.commit
    }
  }, (roadmap) => {
    if (roadmap.status !== 'running') fail('result:roadmap_not_running', { status: roadmap.status });
    assertLease(roadmap, input.result.workerId, input.leaseId, timestamp);
    roadmap.status = input.result.status === 'complete' ? 'review' : input.result.status;
    roadmap.lease = null;
  });
}

export function reclaimExpiredLeases(state, input) {
  const timestamp = nowTimestamp(input?.now);
  if (!nonEmptyString(input?.actorId)) fail('recovery:actor_required');
  assertValidState(state, input.validationOptions);
  assertExpectedRevision(state, input.expectedRevision);
  let nextState = clone(state);
  const receipts = [];
  for (const roadmapId of Object.keys(nextState.roadmaps).sort()) {
    const roadmap = nextState.roadmaps[roadmapId];
    if (!roadmap.lease || Date.parse(roadmap.lease.expiresAt) > Date.parse(timestamp)) continue;
    const previousStateHash = executionStateHash(nextState);
    const oldLease = clone(roadmap.lease);
    const fromStatus = roadmap.status;
    roadmap.status = 'ready';
    roadmap.lease = null;
    const receipt = appendEvent(nextState, {
      previousStateHash,
      recordedAt: timestamp,
      type: 'lease_reclaimed',
      roadmapId,
      actorId: input.actorId,
      fromStatus,
      toStatus: 'ready',
      payload: { expiredLease: oldLease }
    });
    receipts.push(receipt);
  }
  assertValidState(nextState, input.validationOptions);
  return { state: nextState, receipts, reclaimed: receipts.map((receipt) => receipt.roadmapId) };
}

function writeDurableJson(file, contents) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let handle;
  try {
    handle = fs.openSync(temporary, 'w');
    fs.writeFileSync(handle, contents, 'utf8');
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temporary, file);
  } catch (error) {
    if (handle !== undefined) fs.closeSync(handle);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw error;
  }
}

export function readExecutionState(stateFile, options = {}) {
  const state = JSON.parse(fs.readFileSync(path.resolve(stateFile), 'utf8'));
  assertValidState(state, options);
  return state;
}

export function writeExecutionState(stateFile, nextState, input = {}) {
  const file = path.resolve(stateFile);
  const exists = fs.existsSync(file);
  let current = null;
  if (exists) {
    current = readExecutionState(file, input.validationOptions);
    assertExpectedRevision(current, input.expectedRevision);
  } else if (input.expectedRevision !== null && input.expectedRevision !== undefined) {
    fail('state:missing_for_expected_revision', { expectedRevision: input.expectedRevision });
  }
  assertValidState(nextState, input.validationOptions);
  if (current) {
    if (nextState.revision <= current.revision) fail('state:revision_not_advanced');
    const appended = nextState.events.slice(current.events.length);
    if (appended.length === 0 || nextState.events.slice(0, current.events.length).some((event, index) => event.eventHash !== current.events[index].eventHash)) fail('state:event_history_mismatch');
    if (appended[0].previousEventHash !== current.eventHead) fail('state:event_predecessor_mismatch');
    if (appended[0].previousStateHash !== executionStateHash(current)) fail('state:snapshot_predecessor_mismatch');
    writeDurableJson(stateFileBackupPath(file), `${JSON.stringify(current, null, 2)}\n`);
  }
  writeDurableJson(file, `${JSON.stringify(nextState, null, 2)}\n`);
  return { stateFile: file, backupFile: exists ? stateFileBackupPath(file) : null, revision: nextState.revision, eventHead: nextState.eventHead };
}

export function recoverExecutionState(stateFile, options = {}) {
  const file = path.resolve(stateFile);
  try {
    return { state: readExecutionState(file, options.validationOptions), recovered: false, stateFile: file };
  } catch (currentError) {
    const backupFile = stateFileBackupPath(file);
    if (!fs.existsSync(backupFile)) fail('recovery:no_valid_backup', { stateFile: file, cause: currentError.code ?? currentError.message });
    let backup;
    try {
      backup = readExecutionState(backupFile, options.validationOptions);
    } catch (backupError) {
      fail('recovery:no_valid_backup', { stateFile: file, cause: backupError.code ?? backupError.message });
    }
    writeDurableJson(file, `${JSON.stringify(backup, null, 2)}\n`);
    return { state: backup, recovered: true, stateFile: file, backupFile };
  }
}
