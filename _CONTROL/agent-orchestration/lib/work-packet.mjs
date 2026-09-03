import fs from 'node:fs';
import path from 'node:path';
import { createBarCatalog, semanticHash } from './roadmap-graph.mjs';

export const WORK_PACKET_SCHEMA_VERSION = 2;
export const MAX_BRIEF_WORDS = 1500;
export const MAX_RETURN_WORDS = 300;

const requiredPacketFields = [
  'schemaVersion',
  'taskId',
  'campaignId',
  'roadmapId',
  'sourceRevision',
  'objective',
  'briefPath',
  'taskProfile',
  'inputs',
  'ownedOutputs',
  'prohibitedPaths',
  'constraints',
  'acceptanceChecks',
  'phaseGates',
  'evidencePolicy',
  'target',
  'barCatalogHash',
  'returnContract',
  'packetHash'
];

const packetFields = new Set(requiredPacketFields);
const taskProfileFields = new Set(['ambiguity', 'blastRadius', 'crossProduct', 'behaviorChange', 'mechanicalAcceptance', 'authorityRequired', 'filesExpected', 'taskShape']);
const constraintFields = new Set(['forkContext', 'childWorkersAllowed', 'maximumBriefWords', 'maximumReturnWords', 'correctionBudget']);
const phaseGateFields = new Set(['phaseId', 'mustFire', 'mustStaySilent']);
const evidenceFields = new Set(['reuse', 'rerunWhen']);
const targetFields = new Set(['host', 'root', 'portabilityRule']);

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const words = (value) => String(value ?? '').trim().split(/\s+/).filter(Boolean).length;

export function countWords(value) {
  return words(value);
}

export function resolveWorkspacePath(workspaceRoot, value) {
  if (!path.isAbsolute(workspaceRoot)) throw new Error('workspaceRoot:must_be_absolute');
  if (!nonEmpty(value)) throw new Error('path:must_be_nonempty');
  return path.normalize(path.isAbsolute(value) ? value : path.resolve(workspaceRoot, value));
}

function effectiveWorkspaceRoot(campaign, options) {
  const root = options.workspaceRoot ?? campaign.workspaceRoot;
  if (!path.isAbsolute(root)) throw new Error('workspaceRoot:must_be_absolute');
  return path.normalize(root);
}

function effectiveTarget(roadmap, workspaceRoot) {
  if (roadmap.target.host === 'local') return { ...roadmap.target, root: workspaceRoot };
  return { ...roadmap.target };
}

function normalizedSemanticPacket(packet) {
  const { packetHash: ignoredPacketHash, briefPath: ignoredBriefPath, ...semantic } = packet;
  return semantic;
}

export function workPacketHash(packet) {
  return semanticHash(normalizedSemanticPacket(packet));
}

function atomicWrite(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, contents, 'utf8');
  fs.renameSync(temporary, file);
}

function validationError(errors, prefix, condition, message) {
  if (!condition) errors.push(`${prefix}:${message}`);
}

function validateTaskProfile(profile, errors) {
  const required = ['ambiguity', 'blastRadius', 'crossProduct', 'behaviorChange', 'mechanicalAcceptance', 'authorityRequired', 'filesExpected'];
  for (const key of required) validationError(errors, `taskProfile.${key}`, profile?.[key] !== undefined, 'required');
  if (profile?.ambiguity !== undefined) validationError(errors, 'taskProfile.ambiguity', ['low', 'medium', 'high'].includes(profile.ambiguity), 'invalid');
  if (profile?.blastRadius !== undefined) validationError(errors, 'taskProfile.blastRadius', ['low', 'medium', 'high'].includes(profile.blastRadius), 'invalid');
  for (const key of ['crossProduct', 'behaviorChange', 'mechanicalAcceptance', 'authorityRequired']) {
    if (profile?.[key] !== undefined) validationError(errors, `taskProfile.${key}`, typeof profile[key] === 'boolean', 'must_be_boolean');
  }
  if (profile?.filesExpected !== undefined) validationError(errors, 'taskProfile.filesExpected', Number.isInteger(profile.filesExpected) && profile.filesExpected >= 1, 'must_be_positive_integer');
  if (profile?.taskShape !== undefined) validateStringArray(profile.taskShape, 'taskProfile.taskShape', errors);
}

function validateStringArray(value, field, errors, minimum = 1) {
  validationError(errors, field, Array.isArray(value) && value.length >= minimum, `must_have_${minimum}_items`);
  for (const item of Array.isArray(value) ? value : []) validationError(errors, field, nonEmpty(item), 'items_must_be_nonempty_strings');
}

function validateKnownKeys(value, allowed, field, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${field}.${key}:unknown`);
  }
}

function validatePacketShape(packet) {
  const errors = [];
  for (const field of requiredPacketFields) validationError(errors, field, packet?.[field] !== undefined, 'required');
  validateKnownKeys(packet, packetFields, 'packet', errors);
  validationError(errors, 'schemaVersion', packet?.schemaVersion === WORK_PACKET_SCHEMA_VERSION, 'must_be_2');
  for (const field of ['taskId', 'campaignId', 'roadmapId', 'sourceRevision', 'objective', 'briefPath', 'returnContract']) {
    if (packet?.[field] !== undefined) validationError(errors, field, nonEmpty(packet[field]), 'must_be_nonempty');
  }
  if (packet?.sourceRevision !== undefined) validationError(errors, 'sourceRevision', String(packet.sourceRevision).length >= 7, 'must_be_revision');
  if (packet?.roadmapId !== undefined) validationError(errors, 'roadmapId', /^[A-Z0-9-]+$/.test(packet.roadmapId), 'invalid');
  validateKnownKeys(packet?.taskProfile, taskProfileFields, 'taskProfile', errors);
  validateTaskProfile(packet?.taskProfile, errors);
  validateStringArray(packet?.inputs, 'inputs', errors);
  validateStringArray(packet?.ownedOutputs, 'ownedOutputs', errors);
  validateStringArray(packet?.prohibitedPaths, 'prohibitedPaths', errors);
  validateStringArray(packet?.acceptanceChecks, 'acceptanceChecks', errors, 2);

  const constraints = packet?.constraints;
  validateKnownKeys(constraints, constraintFields, 'constraints', errors);
  for (const field of ['forkContext', 'childWorkersAllowed', 'maximumBriefWords', 'maximumReturnWords', 'correctionBudget']) {
    validationError(errors, `constraints.${field}`, constraints?.[field] !== undefined, 'required');
  }
  validationError(errors, 'constraints.forkContext', constraints?.forkContext === false, 'must_be_false');
  validationError(errors, 'constraints.childWorkersAllowed', constraints?.childWorkersAllowed === false, 'must_be_false');
  validationError(errors, 'constraints.maximumBriefWords', Number.isInteger(constraints?.maximumBriefWords) && constraints.maximumBriefWords > 0 && constraints.maximumBriefWords <= MAX_BRIEF_WORDS, 'must_be_1_to_1500');
  validationError(errors, 'constraints.maximumReturnWords', Number.isInteger(constraints?.maximumReturnWords) && constraints.maximumReturnWords > 0 && constraints.maximumReturnWords <= MAX_RETURN_WORDS, 'must_be_1_to_300');
  validationError(errors, 'constraints.correctionBudget', Number.isInteger(constraints?.correctionBudget) && constraints.correctionBudget >= 0 && constraints.correctionBudget <= 2, 'must_be_0_to_2');

  validationError(errors, 'phaseGates', Array.isArray(packet?.phaseGates) && packet.phaseGates.length > 0, 'must_be_nonempty_array');
  const phaseIds = new Set();
  for (const gate of Array.isArray(packet?.phaseGates) ? packet.phaseGates : []) {
    validateKnownKeys(gate, phaseGateFields, 'phaseGates', errors);
    validationError(errors, 'phaseGates.phaseId', nonEmpty(gate?.phaseId), 'required');
    validationError(errors, 'phaseGates.mustFire', nonEmpty(gate?.mustFire), 'required');
    validationError(errors, 'phaseGates.mustStaySilent', nonEmpty(gate?.mustStaySilent), 'required');
    if (phaseIds.has(gate?.phaseId)) errors.push(`phaseGates.phaseId:duplicate:${gate?.phaseId}`);
    phaseIds.add(gate?.phaseId);
  }

  const evidence = packet?.evidencePolicy;
  validateKnownKeys(evidence, evidenceFields, 'evidencePolicy', errors);
  validationError(errors, 'evidencePolicy.reuse', Array.isArray(evidence?.reuse), 'must_be_array');
  validationError(errors, 'evidencePolicy.rerunWhen', Array.isArray(evidence?.rerunWhen) && evidence.rerunWhen.length > 0, 'must_be_nonempty_array');
  const reuse = Array.isArray(evidence?.reuse) ? evidence.reuse : [];
  const rerunWhen = Array.isArray(evidence?.rerunWhen) ? evidence.rerunWhen : [];
  for (const item of [...reuse, ...rerunWhen]) validationError(errors, 'evidencePolicy', nonEmpty(item), 'items_must_be_nonempty_strings');

  const target = packet?.target;
  validateKnownKeys(target, targetFields, 'target', errors);
  validationError(errors, 'target.host', nonEmpty(target?.host), 'required');
  validationError(errors, 'target.root', nonEmpty(target?.root), 'required');
  validationError(errors, 'target.portabilityRule', nonEmpty(target?.portabilityRule), 'required');
  if (target?.root !== undefined) validationError(errors, 'target.root', typeof target.root === 'string' && path.isAbsolute(target.root), 'must_be_absolute');

  for (const field of ['barCatalogHash', 'packetHash']) {
    if (packet?.[field] !== undefined) validationError(errors, field, typeof packet[field] === 'string' && /^[a-f0-9]{64}$/.test(packet[field]), 'must_be_sha256');
  }
  for (const field of ['inputs', 'ownedOutputs']) {
    for (const item of Array.isArray(packet?.[field]) ? packet[field] : []) validationError(errors, `${field}.path`, typeof item === 'string' && path.isAbsolute(item), 'must_be_absolute');
  }
  validationError(errors, 'briefPath', typeof packet?.briefPath === 'string' && path.isAbsolute(packet.briefPath), 'must_be_absolute');
  if (Array.isArray(packet?.ownedOutputs) && new Set(packet.ownedOutputs).size !== packet.ownedOutputs.length) errors.push('ownedOutputs:duplicates');
  return errors;
}

export function validateWorkPacket(packet, options = {}) {
  const errors = validatePacketShape(packet);
  const brief = options?.briefContents;
  let briefWords = 0;
  if (brief !== undefined) briefWords = words(brief);
  else if (packet?.briefPath && path.isAbsolute(packet.briefPath) && fs.existsSync(packet.briefPath)) briefWords = words(fs.readFileSync(packet.briefPath, 'utf8'));
  if (briefWords > (packet?.constraints?.maximumBriefWords ?? MAX_BRIEF_WORDS)) errors.push(`brief:exceeds_${packet?.constraints?.maximumBriefWords ?? MAX_BRIEF_WORDS}_words`);
  if (packet?.packetHash && /^[a-f0-9]{64}$/.test(packet.packetHash) && packet.packetHash !== workPacketHash(packet)) errors.push('packetHash:mismatch');
  return errors.length ? { ok: false, errors, briefWords } : { ok: true, errors: [], briefWords, packetHash: workPacketHash(packet) };
}

function validateCompileInputs(campaign, roadmap, options) {
  const errors = [];
  validationError(errors, 'campaign.campaignId', nonEmpty(campaign?.campaignId), 'required');
  validationError(errors, 'campaign.sourceRevision', nonEmpty(campaign?.sourceRevision) && campaign.sourceRevision.length >= 7, 'required');
  validationError(errors, 'campaign.workspaceRoot', typeof campaign?.workspaceRoot === 'string' && path.isAbsolute(campaign.workspaceRoot), 'must_be_absolute');
  if (options?.workspaceRoot !== undefined) validationError(errors, 'options.workspaceRoot', typeof options.workspaceRoot === 'string' && path.isAbsolute(options.workspaceRoot), 'must_be_absolute');
  validationError(errors, 'campaign.roadmaps', Array.isArray(campaign?.roadmaps) && campaign.roadmaps.length > 0, 'must_be_nonempty_array');
  validationError(errors, 'campaign.constraints', campaign?.constraints !== undefined, 'required');
  const constraints = campaign?.constraints ?? {};
  validationError(errors, 'campaign.constraints.forkContext', constraints.forkContext === false, 'must_be_false');
  validationError(errors, 'campaign.constraints.childWorkersAllowed', constraints.childWorkersAllowed === false, 'must_be_false');
  validationError(errors, 'campaign.constraints.maximumBriefWords', Number.isInteger(constraints.maximumBriefWords) && constraints.maximumBriefWords > 0 && constraints.maximumBriefWords <= MAX_BRIEF_WORDS, 'must_be_1_to_1500');
  validationError(errors, 'campaign.constraints.maximumReturnWords', Number.isInteger(constraints.maximumReturnWords) && constraints.maximumReturnWords > 0 && constraints.maximumReturnWords <= MAX_RETURN_WORDS, 'must_be_1_to_300');
  validationError(errors, 'campaign.constraints.correctionBudget', Number.isInteger(constraints.correctionBudget) && constraints.correctionBudget >= 0 && constraints.correctionBudget <= 2, 'must_be_0_to_2');
  validationError(errors, 'roadmap', roadmap !== undefined && roadmap !== null, 'required');
  for (const field of ['id', 'title', 'outcome', 'taskProfile', 'inputs', 'ownedOutputs', 'prohibitedPaths', 'acceptance', 'evidencePolicy', 'target', 'phases']) {
    validationError(errors, `roadmap.${field}`, roadmap?.[field] !== undefined, 'required');
  }
  validationError(errors, 'roadmap.id', nonEmpty(roadmap?.id), 'required');
  validationError(errors, 'roadmap.title', nonEmpty(roadmap?.title), 'required');
  validationError(errors, 'roadmap.outcome', nonEmpty(roadmap?.outcome), 'required');
  validateTaskProfile(roadmap?.taskProfile, errors);
  for (const field of ['inputs', 'ownedOutputs', 'prohibitedPaths']) validateStringArray(roadmap?.[field], `roadmap.${field}`, errors);
  validationError(errors, 'roadmap.acceptance.mustFire', nonEmpty(roadmap?.acceptance?.mustFire), 'required');
  validationError(errors, 'roadmap.acceptance.mustStaySilent', nonEmpty(roadmap?.acceptance?.mustStaySilent), 'required');
  validateStringArray(roadmap?.acceptance?.checks, 'roadmap.acceptance.checks', errors, 2);
  validationError(errors, 'roadmap.evidencePolicy.reuse', Array.isArray(roadmap?.evidencePolicy?.reuse), 'must_be_array');
  validateStringArray(roadmap?.evidencePolicy?.rerunWhen, 'roadmap.evidencePolicy.rerunWhen', errors);
  validationError(errors, 'roadmap.target.host', nonEmpty(roadmap?.target?.host), 'required');
  validationError(errors, 'roadmap.target.root', nonEmpty(roadmap?.target?.root), 'required');
  validationError(errors, 'roadmap.target.portabilityRule', nonEmpty(roadmap?.target?.portabilityRule), 'required');
  validationError(errors, 'roadmap.phases', Array.isArray(roadmap?.phases) && roadmap.phases.length > 0, 'must_be_nonempty_array');
  for (const phase of Array.isArray(roadmap?.phases) ? roadmap.phases : []) {
    validationError(errors, `phase:${phase?.id}.id`, nonEmpty(phase?.id), 'required');
    validationError(errors, `phase:${phase?.id}.title`, nonEmpty(phase?.title), 'required');
    validationError(errors, `phase:${phase?.id}.type`, ['AFK', 'HITL'].includes(phase?.type), 'invalid');
    validationError(errors, `phase:${phase?.id}.mustFire`, nonEmpty(phase?.mustFire), 'required');
    validationError(errors, `phase:${phase?.id}.mustStaySilent`, nonEmpty(phase?.mustStaySilent), 'required');
  }
  return errors;
}

function normalizeOptions(options) {
  return typeof options === 'string' ? { outputRoot: options } : (options ?? {});
}

export function renderWorkerBrief(campaign, roadmap, options = {}) {
  const normalized = normalizeOptions(options);
  const workspaceRoot = effectiveWorkspaceRoot(campaign, normalized);
  const barCatalogHash = normalized.barCatalogHash ?? createBarCatalog(campaign).semanticHash;
  const target = effectiveTarget(roadmap, workspaceRoot);
  const lines = [
    `# Work Package ${roadmap.id}: ${roadmap.title}`,
    '',
    '## Objective',
    roadmap.outcome,
    '',
    '## Frozen Context',
    `- Campaign: ${campaign.campaignId}`,
    `- Source revision: ${campaign.sourceRevision}`,
    `- Workspace: ${workspaceRoot}`,
    `- Bar catalog: ${barCatalogHash}`,
    `- Target: ${target.host} at ${target.root}`,
    `- Portability: ${target.portabilityRule}`,
    '',
    '## Exact Inputs',
    ...roadmap.inputs.map((item) => `- ${resolveWorkspacePath(workspaceRoot, item)}`),
    '',
    '## Owned Outputs',
    ...roadmap.ownedOutputs.map((item) => `- ${resolveWorkspacePath(workspaceRoot, item)}`),
    '',
    '## Prohibited Paths',
    ...roadmap.prohibitedPaths.map((item) => `- ${item}`),
    '',
    '## Phases',
    ...roadmap.phases.flatMap((phase) => [
      `### ${phase.id}: ${phase.title} (${phase.type})`,
      `- MUST FIRE: ${phase.mustFire}`,
      `- MUST STAY SILENT: ${phase.mustStaySilent}`
    ]),
    '',
    '## Roadmap Acceptance',
    `- MUST FIRE: ${roadmap.acceptance.mustFire}`,
    `- MUST STAY SILENT: ${roadmap.acceptance.mustStaySilent}`,
    ...roadmap.acceptance.checks.map((item) => `- Check: ${item}`),
    '',
    '## Evidence Policy',
    ...roadmap.evidencePolicy.reuse.map((item) => `- Reuse: ${item}`),
    ...roadmap.evidencePolicy.rerunWhen.map((item) => `- Rerun only when: ${item}`),
    '',
    '## Hard Rules',
    '- Start with the supplied source and current branch. Do not re-audit unrelated completed work.',
    '- Do not inherit coordinator history. Do not create child workers.',
    '- Edit only owned outputs. Preserve owner and authority boundaries.',
    '- Reuse current relevant proof. Run only checks needed for changed behavior and remaining gates.',
    '- Commit the bounded result. Return at most 300 words with status, commit, changed paths, checks, blockers, sparks, and integration note.'
  ];
  return `${lines.join('\n')}\n`;
}

export const buildBrief = renderWorkerBrief;

export function buildWorkPacket(campaign, roadmap, options = {}) {
  const normalized = normalizeOptions(options);
  const workspaceRoot = effectiveWorkspaceRoot(campaign, normalized);
  const target = effectiveTarget(roadmap, workspaceRoot);
  const barCatalogHash = normalized.barCatalogHash ?? createBarCatalog(campaign).semanticHash;
  const briefPathValue = normalized.briefPath ?? path.join(normalized.outputRoot ?? workspaceRoot, `${roadmap.id}-BRIEF.md`);
  const briefPath = resolveWorkspacePath(workspaceRoot, briefPathValue);
  const semantic = {
    schemaVersion: WORK_PACKET_SCHEMA_VERSION,
    taskId: normalized.taskId ?? `${campaign.campaignId}:${roadmap.id}`,
    campaignId: campaign.campaignId,
    roadmapId: roadmap.id,
    sourceRevision: campaign.sourceRevision,
    objective: roadmap.outcome,
    taskProfile: { ...roadmap.taskProfile },
    inputs: roadmap.inputs.map((item) => resolveWorkspacePath(workspaceRoot, item)),
    ownedOutputs: roadmap.ownedOutputs.map((item) => resolveWorkspacePath(workspaceRoot, item)),
    prohibitedPaths: [...roadmap.prohibitedPaths],
    constraints: { ...campaign.constraints },
    acceptanceChecks: [...roadmap.acceptance.checks],
    phaseGates: roadmap.phases.map((phase) => ({ phaseId: phase.id, mustFire: phase.mustFire, mustStaySilent: phase.mustStaySilent })),
    evidencePolicy: { reuse: [...roadmap.evidencePolicy.reuse], rerunWhen: [...roadmap.evidencePolicy.rerunWhen] },
    target,
    barCatalogHash,
    returnContract: 'status, commit, changed paths, checks, blockers, sparks, and integration note; maximum 300 words'
  };
  return { ...semantic, briefPath, packetHash: workPacketHash({ ...semantic, briefPath }) };
}

export const createWorkPacket = buildWorkPacket;
export const buildPacket = buildWorkPacket;

export function compileWorkPacket(campaign, roadmapOrId, options = {}) {
  const normalized = normalizeOptions(options);
  const roadmap = typeof roadmapOrId === 'string'
    ? (Array.isArray(campaign?.roadmaps) ? campaign.roadmaps.find((item) => item.id === roadmapOrId) : undefined)
    : roadmapOrId;
  const inputErrors = validateCompileInputs(campaign, roadmap, normalized);
  if (inputErrors.length) return { ok: false, errors: inputErrors };
  const workspaceRoot = effectiveWorkspaceRoot(campaign, normalized);
  const brief = renderWorkerBrief(campaign, roadmap, normalized);
  const packet = buildWorkPacket(campaign, roadmap, normalized);
  const checked = validateWorkPacket(packet, { briefContents: brief });
  if (!checked.ok) return checked;
  if (normalized.outputRoot) {
    const packetRoot = resolveWorkspacePath(workspaceRoot, normalized.outputRoot);
    const packetPath = resolveWorkspacePath(workspaceRoot, normalized.packetPath ?? path.join(packetRoot, `${roadmap.id}-PACKET.json`));
    atomicWrite(packet.briefPath, brief);
    atomicWrite(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
    return { ok: true, packet, brief, briefWords: checked.briefWords, packetPath, briefPath: packet.briefPath, packetHash: packet.packetHash };
  }
  return { ok: true, packet, brief, briefWords: checked.briefWords, briefPath: packet.briefPath, packetHash: packet.packetHash };
}

export const compileRoadmapPacket = compileWorkPacket;
