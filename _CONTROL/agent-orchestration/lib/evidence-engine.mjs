import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { semanticHash } from './roadmap-graph.mjs';

export const EVIDENCE_RECEIPT_SCHEMA_VERSION = 1;
export const EVIDENCE_DECISIONS = Object.freeze(['reuse', 'rerun', 'pass', 'refuse', 'verified']);
export const EVIDENCE_KINDS = Object.freeze(['reuse_decision', 'invalidation_decision', 'scope_audit', 'integration', 'verification']);

const RECEIPT_FIELDS = new Set([
  'schemaVersion', 'receiptId', 'kind', 'decision', 'campaignId', 'roadmapId', 'sourceRevision',
  'packetHash', 'gateIdentity', 'evidenceClass', 'target', 'evidence', 'reasons', 'recordedAt', 'authority'
]);
const REQUIRED_RECEIPT_FIELDS = new Set([...RECEIPT_FIELDS].filter((field) => field !== 'packetHash'));
const TARGET_FIELDS = ['host', 'environmentId', 'runtime', 'platform', 'dependencyLockHash'];
const PASS_STATUSES = new Set(['pass', 'complete', 'verified', 'integrated']);

const present = (value) => typeof value === 'string' && value.trim().length > 0;
const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => structuredClone(value);

function reason(code, message) {
  return { code, message };
}

function firstPresent(...values) {
  return values.find((value) => present(value));
}

function normalizeTarget(target = {}) {
  if (typeof target === 'string') return { host: target };
  if (!plainObject(target)) return {};
  return Object.fromEntries(TARGET_FIELDS
    .filter((key) => present(target[key]))
    .map((key) => [key, String(target[key]).trim()]));
}

export function stableTarget(target) {
  return normalizeTarget(target);
}

export function targetIdentity(target) {
  const stable = stableTarget(target);
  return Object.keys(stable).length ? semanticHash(stable) : null;
}

function normalizeGate(gate) {
  if (typeof gate === 'string') return { id: gate.trim() };
  if (!plainObject(gate)) return {};
  const normalized = {};
  for (const key of ['id', 'gateId', 'phaseId', 'mustFire', 'mustStaySilent', 'catalogHash', 'hash']) {
    if (present(gate[key])) normalized[key] = String(gate[key]).trim();
  }
  if (!normalized.id) normalized.id = firstPresent(normalized.gateId, normalized.phaseId);
  return normalized;
}

export function gateIdentity(gate) {
  const normalized = normalizeGate(gate);
  if (normalized.hash || normalized.catalogHash) return normalized.hash ?? normalized.catalogHash;
  if (!Object.keys(normalized).length) return null;
  return semanticHash(normalized);
}

function portableGateIdentity(gate) {
  const identity = gateIdentity(gate);
  if (!identity) return {};
  const normalized = normalizeGate(gate);
  const portable = {};
  if (normalized.id) portable.id = normalized.id;
  if (normalized.phaseId) portable.phaseId = normalized.phaseId;
  if (normalized.catalogHash) portable.catalogHash = normalized.catalogHash;
  if (!normalized.catalogHash || normalized.mustFire || normalized.mustStaySilent) portable.hash = identity;
  return portable;
}

function normalizeContentEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (typeof entry === 'string') return { label: entry, contentHash: null };
    if (!plainObject(entry)) return { label: '', contentHash: null };
    return {
      label: firstPresent(entry.label, entry.name, entry.path, entry.id) ?? '',
      contentHash: firstPresent(entry.contentHash, entry.hash, entry.sha256) ?? null
    };
  }).sort((left, right) => left.label.localeCompare(right.label));
}

function contentIdentity(record = {}) {
  const direct = firstPresent(record.relevantContentHash, record.contentHash, record.contentHashSha256);
  if (direct) return direct;
  const entries = normalizeContentEntries(record.relevantInputs ?? record.inputs);
  if (!entries.length || entries.some((entry) => !entry.contentHash)) return null;
  return semanticHash(entries.map(({ label, contentHash }) => ({ label, contentHash })));
}

export function hashContent(value) {
  return crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : String(value), 'utf8').digest('hex');
}

export function fingerprintFile(file) {
  const contents = fs.readFileSync(path.resolve(file));
  return { contentHash: hashContent(contents), byteLength: contents.length };
}

export function proofIdentity(record = {}) {
  return semanticHash({
    sourceRevision: firstPresent(record.sourceRevision, record.source?.sourceRevision) ?? null,
    commit: firstPresent(record.commit, record.source?.commit) ?? null,
    contentHash: contentIdentity(record),
    gate: gateIdentity(record.gateIdentity ?? record.gate ?? record.gateId),
    target: stableTarget(record.target),
    evidenceClass: firstPresent(record.evidenceClass, record.class, record.type) ?? null
  });
}

function canonicalPath(value, workspaceRoot) {
  if (!present(value)) return null;
  const candidate = path.isAbsolute(value) ? value : path.resolve(workspaceRoot ?? process.cwd(), value);
  return path.normalize(candidate).replaceAll('\\', '/').toLowerCase();
}

function pathMatches(pattern, value, workspaceRoot) {
  const normalizedPattern = String(pattern).replaceAll('\\', '/').toLowerCase();
  const normalizedValue = canonicalPath(value, workspaceRoot);
  if (!normalizedValue) return false;
  if (!normalizedPattern.includes('*')) return canonicalPath(normalizedPattern, workspaceRoot) === normalizedValue;
  const absolutePattern = path.isAbsolute(normalizedPattern)
    ? normalizedPattern
    : path.resolve(workspaceRoot ?? process.cwd(), normalizedPattern).replaceAll('\\', '/').toLowerCase();
  const regex = new RegExp(`^${absolutePattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return regex.test(normalizedValue);
}

function relevantPathChanged(changedPaths, relevantPaths, workspaceRoot) {
  return changedPaths.filter((changedPath) => relevantPaths.some((relevantPath) => pathMatches(relevantPath, changedPath, workspaceRoot)));
}

function addReason(reasons, code, message) {
  if (!reasons.some((item) => item.code === code)) reasons.push(reason(code, message));
}

export function invalidationTriggers(input = {}) {
  const proof = input.proof ?? input.evidence ?? {};
  const current = input.current ?? input.expected ?? {};
  const reasons = [];
  const proofSource = firstPresent(proof.sourceRevision, proof.source?.sourceRevision);
  const currentSource = firstPresent(current.sourceRevision, current.source?.sourceRevision, input.currentSourceRevision);
  if (['failed', 'blocked', 'refuse', 'rerun'].includes(proof.status ?? proof.decision)) addReason(reasons, 'proof_not_green', 'Failed or rerun proof cannot be reused.');
  if (['builder-only', 'builder_only'].includes(proof.evidenceClass ?? proof.class)) addReason(reasons, 'builder_only_evidence', 'Builder-only proof cannot be reused as verification evidence.');
  if (!proofSource) addReason(reasons, 'missing_source_revision', 'Proof has no source revision identity.');
  if (currentSource && proofSource && proofSource !== currentSource) addReason(reasons, 'source_revision_changed', 'Source revision changed since the proof was recorded.');
  if (input.sourceRevisionChanged === true || input.relevantSourceChanged === true) addReason(reasons, 'relevant_source_changed', 'Relevant source changed and invalidated the proof.');

  const proofGate = gateIdentity(proof.gateIdentity ?? proof.gate ?? proof.gateId);
  const currentGate = gateIdentity(current.gate ?? current.gateIdentity ?? current.gateId ?? input.gate);
  if (!proofGate) addReason(reasons, 'missing_gate_identity', 'Proof has no gate identity.');
  if (currentGate && proofGate && proofGate !== currentGate) addReason(reasons, 'gate_changed', 'The acceptance gate changed since the proof was recorded.');
  if (input.gatesChanged === true || input.acceptanceGatesChanged === true) addReason(reasons, 'gate_changed', 'Acceptance gate text or identity changed.');

  const proofContent = contentIdentity(proof);
  const currentContent = contentIdentity(current);
  if (currentContent && proofContent && currentContent !== proofContent) addReason(reasons, 'relevant_content_changed', 'Relevant source content identity changed.');
  if (input.relevantContentChanged === true) addReason(reasons, 'relevant_content_changed', 'Relevant content changed and requires a fresh check.');
  const changedPaths = input.changedPaths ?? current.changedPaths ?? [];
  const relevantPaths = input.relevantPaths ?? current.relevantPaths ?? proof.relevantPaths ?? [];
  const changedRelevantPaths = relevantPathChanged(changedPaths, relevantPaths, input.workspaceRoot ?? current.workspaceRoot ?? proof.workspaceRoot);
  if (changedRelevantPaths.length) addReason(reasons, 'relevant_path_changed', `Relevant paths changed: ${changedRelevantPaths.join(', ')}.`);

  const proofTarget = targetIdentity(proof.target);
  const currentTarget = targetIdentity(current.target ?? input.target);
  if (!proofTarget) addReason(reasons, 'missing_target_identity', 'Proof has no stable target identity.');
  if (currentTarget && proofTarget && currentTarget !== proofTarget) addReason(reasons, 'target_changed', 'The target environment identity changed.');
  if (input.targetEnvironmentChanged === true || input.environmentChanged === true) addReason(reasons, 'target_changed', 'The target environment changed.');

  const proofClass = firstPresent(proof.evidenceClass, proof.class, proof.type);
  const currentClass = firstPresent(current.evidenceClass, current.class, current.type);
  if (!proofClass) addReason(reasons, 'missing_evidence_class', 'Proof has no evidence class.');
  if (currentClass && proofClass && currentClass !== proofClass) addReason(reasons, 'evidence_class_changed', 'The evidence class is incompatible with the current gate.');
  if (input.suspectedRegression === true) addReason(reasons, 'suspected_regression', 'A suspected regression requires a rerun.');
  return { invalidated: reasons.length > 0, reasons, reasonCodes: reasons.map((item) => item.code) };
}

export function classifyEvidence(input = {}) {
  const proof = input.proof ?? input.evidence;
  const result = invalidationTriggers({ ...input, proof: proof ?? {} });
  if (!proof) result.reasons.unshift(reason('missing_proof', 'No prior proof was supplied for reuse.'));
  const uniqueReasons = result.reasons.filter((item, index, values) => values.findIndex((candidate) => candidate.code === item.code) === index);
  const reusable = uniqueReasons.length === 0;
  return {
    ok: true,
    reusable,
    decision: reusable ? 'reuse' : 'rerun',
    reason: reusable
      ? 'Current source-linked proof matches the gate, relevant content, target, and evidence class.'
      : uniqueReasons.map((item) => item.message).join(' '),
    reasons: uniqueReasons,
    reasonCodes: uniqueReasons.map((item) => item.code)
  };
}

export const decideEvidenceReuse = classifyEvidence;
export const shouldRerun = (input) => classifyEvidence(input).decision === 'rerun';

export function auditWorkerScope(packet, resultOrChangedPaths = [], options = {}) {
  const result = Array.isArray(resultOrChangedPaths) ? null : resultOrChangedPaths;
  const changedPaths = Array.isArray(resultOrChangedPaths) ? resultOrChangedPaths : (result?.changedPaths ?? []);
  const workspaceRoot = options.workspaceRoot ?? packet?.target?.root ?? process.cwd();
  const ownedOutputs = Array.isArray(packet?.ownedOutputs) ? packet.ownedOutputs : [];
  const normalizedOwned = new Set(ownedOutputs.map((item) => canonicalPath(item, workspaceRoot)).filter(Boolean));
  const outsideOwned = changedPaths.filter((item) => !normalizedOwned.has(canonicalPath(item, workspaceRoot)));
  const reasons = [];
  if (outsideOwned.length) addReason(reasons, 'undeclared_write', `Changed paths are outside owned outputs: ${outsideOwned.join(', ')}.`);
  if (result?.status === 'complete' && changedPaths.length === 0) addReason(reasons, 'complete_without_changes', 'A complete result must name at least one changed owned output.');
  return {
    ok: reasons.length === 0,
    decision: reasons.length === 0 ? 'pass' : 'refuse',
    reason: reasons.length === 0 ? 'Every declared changed path is an exact owned output.' : reasons.map((item) => item.message).join(' '),
    reasons,
    reasonCodes: reasons.map((item) => item.code),
    changedPathsChecked: changedPaths.length,
    outsideOwned,
    ownedOutputs: [...normalizedOwned]
  };
}

export const auditResultScope = auditWorkerScope;

function validChecks(checks) {
  return Array.isArray(checks) && checks.length > 0 && checks.every((check) => {
    if (typeof check === 'string') return present(check);
    return plainObject(check) && present(check.command) && check.result === 'pass';
  });
}

function receiptId(core) {
  return `${core.kind}-${semanticHash(core).slice(0, 24)}`;
}

export function validateEvidenceReceipt(receipt) {
  const errors = [];
  if (!plainObject(receipt)) return { ok: false, errors: ['receipt:must_be_object'] };
  for (const key of REQUIRED_RECEIPT_FIELDS) if (receipt[key] === undefined) errors.push(`receipt.${key}:required`);
  for (const key of Object.keys(receipt)) if (!RECEIPT_FIELDS.has(key)) errors.push(`receipt.${key}:unknown`);
  if (receipt.schemaVersion !== EVIDENCE_RECEIPT_SCHEMA_VERSION) errors.push('receipt.schemaVersion:must_be_1');
  for (const key of ['receiptId', 'campaignId', 'roadmapId', 'sourceRevision', 'evidenceClass', 'recordedAt', 'authority']) {
    if (!present(receipt[key])) errors.push(`receipt.${key}:invalid`);
  }
  if (!EVIDENCE_KINDS.includes(receipt.kind)) errors.push('receipt.kind:invalid');
  if (!EVIDENCE_DECISIONS.includes(receipt.decision)) errors.push('receipt.decision:invalid');
  if (!present(receipt.packetHash) && receipt.packetHash !== undefined) errors.push('receipt.packetHash:invalid');
  if (!plainObject(receipt.gateIdentity) || !Object.values(receipt.gateIdentity).some(present)) errors.push('receipt.gateIdentity:invalid');
  if (!plainObject(receipt.target) || !present(receipt.target.host)) errors.push('receipt.target:stable_host_required');
  if (!plainObject(receipt.evidence)) errors.push('receipt.evidence:must_be_object');
  if (!Array.isArray(receipt.reasons) || receipt.reasons.length === 0 || receipt.reasons.some((item) => !present(item))) errors.push('receipt.reasons:nonempty_strings_required');
  if (!present(receipt.recordedAt) || Number.isNaN(Date.parse(receipt.recordedAt))) errors.push('receipt.recordedAt:timestamp_invalid');
  return { ok: errors.length === 0, errors };
}

export function createEvidenceReceipt(input = {}) {
  const sourceRevision = firstPresent(input.sourceRevision, input.source?.sourceRevision);
  const gates = input.gates ?? input.phaseEvidence ?? [];
  const core = {
    schemaVersion: EVIDENCE_RECEIPT_SCHEMA_VERSION,
    kind: input.kind ?? 'verification',
    decision: input.decision ?? 'pass',
    campaignId: input.campaignId,
    roadmapId: input.roadmapId,
    sourceRevision,
    ...(present(input.packetHash) ? { packetHash: input.packetHash } : {}),
    gateIdentity: portableGateIdentity(input.gateIdentity ?? { hash: input.gateCatalogHash ?? input.barCatalogHash ?? semanticHash(gates) }),
    evidenceClass: input.evidenceClass ?? 'focused-check',
    target: stableTarget(input.target),
    evidence: clone(input.evidence ?? {}),
    reasons: Array.isArray(input.reasons) && input.reasons.length ? [...input.reasons] : ['Evidence decision recorded.'],
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    authority: input.authority ?? 'integrator'
  };
  const receipt = { receiptId: input.receiptId ?? receiptId(core), ...core };
  const checked = validateEvidenceReceipt(receipt);
  if (!checked.ok) throw new TypeError(`evidence_receipt:invalid:${checked.errors.join(',')}`);
  return receipt;
}

function gateEvidenceComplete(gate) {
  if (!plainObject(gate)) return false;
  if (gate.status === 'failed' || gate.status === 'blocked' || gate.ok === false) return false;
  const statusPasses = gate.ok === true || PASS_STATUSES.has(gate.status);
  const evidence = Array.isArray(gate.evidence) ? gate.evidence : [];
  const checks = gate.checks ?? evidence.flatMap((item) => item?.checks ?? []);
  const referencedEvidence = evidence.some((item) => present(item?.ref ?? item?.evidenceRef ?? item?.commit) && validChecks(item?.checks));
  return statusPasses && (validChecks(checks) || referencedEvidence);
}

function portableGateEvidence(gate) {
  const evidence = Array.isArray(gate.evidence) ? gate.evidence : [];
  const checks = gate.checks ?? evidence.flatMap((item) => item?.checks ?? []);
  const firstEvidence = evidence.find((item) => plainObject(item)) ?? {};
  return {
    id: firstPresent(gate.phaseId, gate.gateId, gate.id),
    status: gate.status ?? (gate.ok === true ? 'verified' : 'unknown'),
    ref: firstPresent(gate.ref, gate.evidenceRef, gate.commit, firstEvidence.ref, firstEvidence.evidenceRef, firstEvidence.commit) ?? null,
    evidenceHash: semanticHash(evidence.length ? evidence : checks),
    checks: checks.map((check) => typeof check === 'string' ? { command: check, result: 'pass' } : { command: check.command, result: check.result })
  };
}

function portableTestEvidence(tests) {
  return tests.map((test) => typeof test === 'string'
    ? { command: test, result: 'pass' }
    : { command: test.command, result: test.result });
}

export function sealVerificationReceipt(input = {}) {
  const reasons = [];
  const sourceRevision = firstPresent(input.sourceRevision, input.source?.sourceRevision);
  if (!sourceRevision) addReason(reasons, 'missing_source', 'Source revision is required to seal verification.');
  if (input.builderOnly === true || ['builder-only', 'builder_only'].includes(input.evidenceClass)) {
    addReason(reasons, 'builder_only_evidence', 'Builder-only evidence cannot verify a roadmap.');
  }
  if (input.stale === true || input.mismatched === true || input.scopeDrift === true) {
    if (input.stale === true) addReason(reasons, 'stale_evidence', 'Stale evidence cannot verify a roadmap.');
    if (input.mismatched === true) addReason(reasons, 'mismatched_evidence', 'Mismatched evidence cannot verify a roadmap.');
    if (input.scopeDrift === true) addReason(reasons, 'scope_drift', 'Scope-drifting evidence cannot verify a roadmap.');
  }
  const gates = input.gates ?? input.phaseEvidence ?? [];
  if (!Array.isArray(gates) || gates.length === 0) addReason(reasons, 'missing_gates', 'At least one verified gate evidence record is required.');
  else if (gates.some((gate) => !gateEvidenceComplete(gate))) addReason(reasons, 'incomplete_gates', 'Every gate must have passing evidence.');
  const expectedGateIds = input.expectedGateIds ?? input.phaseGates?.map((gate) => gate.phaseId ?? gate.id) ?? [];
  if (expectedGateIds.length) {
    const actualGateIds = new Set(gates.map((gate) => gate?.phaseId ?? gate?.gateId ?? gate?.id));
    const missing = expectedGateIds.filter((id) => !actualGateIds.has(id));
    if (missing.length) addReason(reasons, 'missing_gates', `Expected gate evidence is missing: ${missing.join(', ')}.`);
  }
  const tests = input.tests ?? input.checks ?? [];
  if (!validChecks(tests)) addReason(reasons, 'missing_tests', 'At least one passing test check is required to seal verification.');
  const integration = input.integration;
  if (!plainObject(integration) || integration.ok !== true || integration.decision === 'refuse') addReason(reasons, 'missing_integration', 'Passing composition evidence is required to seal verification.');
  if (input.sourceRevision && input.currentSourceRevision && input.sourceRevision !== input.currentSourceRevision) addReason(reasons, 'source_revision_changed', 'The sealed source revision does not match the current source revision.');
  if (input.gateIdentity && input.currentGateIdentity && gateIdentity(input.gateIdentity) !== gateIdentity(input.currentGateIdentity)) {
    addReason(reasons, 'gate_changed', 'The sealed gate identity does not match the current gate.');
  }
  if (input.scopeAudit?.ok === false) addReason(reasons, 'scope_drift', 'The worker scope audit detected undeclared writes.');
  if (plainObject(integration) && (!present(integration.ref) || !Array.isArray(integration.checks) || integration.checks.length === 0 || !Array.isArray(integration.workerIds) || integration.workerIds.length === 0)) {
    addReason(reasons, 'incomplete_integration', 'Composition evidence must bind workers to a passing referenced check.');
  }
  if (reasons.length) {
    return {
      ok: false,
      decision: 'refuse',
      reason: reasons.map((item) => item.message).join(' '),
      reasons,
      reasonCodes: reasons.map((item) => item.code)
    };
  }
  const evidence = {
    source: {
      revision: sourceRevision,
      commit: firstPresent(input.commit, input.source?.commit) ?? null,
      contentHash: firstPresent(input.contentHash, input.source?.contentHash) ?? null
    },
    gates: gates.map(portableGateEvidence),
    tests: portableTestEvidence(tests),
    integration: {
      ref: firstPresent(integration.ref, integration.evidenceRef, integration.commit) ?? null,
      workerIds: [...(integration.workerIds ?? [])],
      checks: portableTestEvidence(integration.checks ?? [])
    }
  };
  const receipt = createEvidenceReceipt({
    ...input,
    kind: 'verification',
    decision: 'verified',
    sourceRevision,
    evidenceClass: input.evidenceClass ?? 'source-linked-verification',
    gateIdentity: portableGateIdentity(input.gateIdentity ?? { hash: input.gateCatalogHash ?? input.barCatalogHash ?? semanticHash(gates) }),
    evidence,
    reasons: ['Source-linked gate evidence, passing tests, and composition proof are complete.'],
    authority: input.authority ?? 'integrator'
  });
  return { ok: true, decision: 'verified', reason: 'Complete source, gate, test, and composition evidence sealed.', reasons: [], reasonCodes: [], receipt };
}

export const sealEvidence = sealVerificationReceipt;
