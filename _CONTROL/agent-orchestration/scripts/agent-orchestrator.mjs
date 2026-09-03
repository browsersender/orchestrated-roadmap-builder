import fs from 'node:fs';
import path from 'node:path';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const words = (value) => String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
const fail = (messages) => ({ ok: false, errors: messages });
const pass = (extra = {}) => ({ ok: true, errors: [], ...extra });

function required(object, keys) {
  return keys.filter((key) => object?.[key] === undefined).map((key) => `missing:${key}`);
}

export function validatePacket(packet) {
  const errors = required(packet, ['schemaVersion', 'taskId', 'objective', 'briefPath', 'taskProfile', 'inputs', 'ownedOutputs', 'prohibitedPaths', 'constraints', 'acceptanceChecks', 'returnContract']);
  if (packet.schemaVersion !== 1) errors.push('schemaVersion:must_be_1');
  for (const key of ['inputs', 'ownedOutputs', 'prohibitedPaths']) {
    if (!Array.isArray(packet[key]) || packet[key].length === 0) errors.push(`${key}:must_be_nonempty_array`);
  }
  if (!Array.isArray(packet.acceptanceChecks) || packet.acceptanceChecks.length < 2) errors.push('acceptanceChecks:minimum_2');
  const constraints = packet.constraints ?? {};
  if (constraints.forkContext !== false) errors.push('constraints.forkContext:must_be_false');
  if (constraints.childWorkersAllowed !== false) errors.push('constraints.childWorkersAllowed:must_be_false');
  if (constraints.maximumBriefWords > 1500) errors.push('constraints.maximumBriefWords:maximum_1500');
  if (constraints.maximumReturnWords > 300) errors.push('constraints.maximumReturnWords:maximum_300');
  let briefWords = 0;
  if (packet.briefPath) {
    if (!path.isAbsolute(packet.briefPath)) errors.push('briefPath:must_be_absolute');
    else if (!fs.existsSync(packet.briefPath)) errors.push('briefPath:not_found');
    else {
      briefWords = words(fs.readFileSync(packet.briefPath, 'utf8'));
      if (briefWords > 1500) errors.push('briefPath:exceeds_1500_words');
    }
  }
  if (new Set(packet.ownedOutputs ?? []).size !== (packet.ownedOutputs ?? []).length) errors.push('ownedOutputs:duplicates');
  const profileErrors = required(packet.taskProfile, ['ambiguity', 'blastRadius', 'crossProduct', 'behaviorChange', 'mechanicalAcceptance', 'authorityRequired', 'filesExpected']);
  errors.push(...profileErrors.map((e) => `taskProfile.${e}`));
  return errors.length ? fail(errors) : pass({ briefWords });
}

export function validateResult(result) {
  const errors = required(result, ['schemaVersion', 'taskId', 'status', 'model', 'changedPaths', 'checks', 'blockers', 'integrationNote']);
  if (result.schemaVersion !== 1) errors.push('schemaVersion:must_be_1');
  if (!['complete', 'blocked', 'failed'].includes(result.status)) errors.push('status:invalid');
  if (!['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'claude-opus-4-8'].includes(result.model)) errors.push('model:invalid');
  if (!Array.isArray(result.changedPaths)) errors.push('changedPaths:must_be_array');
  if (!Array.isArray(result.checks)) errors.push('checks:must_be_array');
  if (!Array.isArray(result.blockers)) errors.push('blockers:must_be_array');
  if (words(result.returnText) > 300) errors.push('returnText:exceeds_300_words');
  return errors.length ? fail(errors) : pass({ returnWords: words(result.returnText) });
}

export function routeTask(profile) {
  if (profile.authorityRequired) return pass({ lane: 'HUMAN_AUTHORITY', reasons: ['protected_authority_required'] });
  if (profile.ambiguity === 'high' || profile.crossProduct || profile.blastRadius === 'high') {
    return pass({ lane: 'SOL_OWNED', reasons: ['architecture_or_integration_risk'] });
  }
  if (profile.behaviorChange && (profile.filesExpected > 4 || profile.ambiguity === 'medium' || profile.blastRadius === 'medium')) {
    return pass({ lane: 'TERRA_PRIMARY', reasons: ['substantial_technical_ownership'] });
  }
  if (!profile.behaviorChange && profile.filesExpected > 6 && profile.mechanicalAcceptance) {
    return pass({ lane: 'TERRA_LUNA_FANOUT', reasons: ['disjoint_bounded_fanout'] });
  }
  if (profile.mechanicalAcceptance && profile.ambiguity === 'low' && profile.blastRadius === 'low' && profile.filesExpected <= 6) {
    return pass({ lane: 'LUNA_BOUNDED', reasons: ['frozen_contract_and_mechanical_acceptance'] });
  }
  return pass({ lane: 'TERRA_PRIMARY', reasons: ['default_bounded_technical_lane'] });
}

export function auditResultScope(packet, result) {
  const errors = [];
  if (packet.taskId !== result.taskId) errors.push('taskId:mismatch');
  const normalize = (value) => String(value).replaceAll('\\', '/').replace(/^\.\//, '').toLowerCase();
  const owned = new Set((packet.ownedOutputs ?? []).map(normalize));
  const outside = (result.changedPaths ?? []).filter((item) => !owned.has(normalize(item)));
  if (outside.length) errors.push(...outside.map((item) => `changedPath:outside_owned_scope:${item}`));
  if (result.status === 'complete' && (result.changedPaths ?? []).length === 0) errors.push('complete:requires_changed_paths');
  return errors.length ? fail(errors) : pass({ changedPathsChecked: (result.changedPaths ?? []).length });
}

export function inspectTargetCapacity(targetRoot, requiredWorkspaceBytes = null) {
  const root = path.resolve(targetRoot ?? process.cwd());
  const stats = fs.statfsSync(root);
  const availableBytes = Number(stats.bavail * stats.bsize);
  if (requiredWorkspaceBytes !== null && (!Number.isFinite(requiredWorkspaceBytes) || requiredWorkspaceBytes < 0)) {
    return fail(['requiredWorkspaceBytes:must_be_nonnegative_number']);
  }
  if (requiredWorkspaceBytes !== null && availableBytes < requiredWorkspaceBytes) {
    return fail([`worker_dispatch_refused:target_volume_capacity_${availableBytes}_below_declared_requirement_${requiredWorkspaceBytes}`], { root, availableBytes, requiredWorkspaceBytes });
  }
  return pass({ root, availableBytes, requiredWorkspaceBytes, capacityChecked: requiredWorkspaceBytes !== null });
}

export function validateObservation(observation) {
  const errors = required(observation, ['schemaVersion', 'observationId', 'taskId', 'model', 'taskShape', 'observed', 'review', 'verdict']);
  if (observation.schemaVersion !== 1) errors.push('schemaVersion:must_be_1');
  const reviewKeys = ['contractFidelity', 'boundaryDiscipline', 'sourceUnderstanding', 'refusalIntegrity', 'testQuality', 'evidenceHonesty', 'implementationQuality'];
  for (const key of reviewKeys) {
    const value = observation.review?.[key];
    if (!Number.isInteger(value) || value < 0 || value > 4) errors.push(`review.${key}:must_be_integer_0_to_4`);
  }
  return errors.length ? fail(errors) : pass();
}

export function recordObservation(observation, ledgerPath) {
  const checked = validateObservation(observation);
  if (!checked.ok) return checked;
  const ledger = readJson(ledgerPath);
  if (ledger.observations.some((item) => item.observationId === observation.observationId)) {
    return fail(['observationId:duplicate']);
  }
  ledger.observations.push(observation);
  ledger.updatedAt = new Date().toISOString();
  fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  return pass({ count: ledger.observations.length });
}

function print(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))) {
  const [command, first, second] = process.argv.slice(2);
  try {
    if (command === 'validate-packet') print(validatePacket(readJson(first)));
    else if (command === 'validate-result') print(validateResult(readJson(first)));
    else if (command === 'route') {
      const task = readJson(first);
      print(routeTask(task.taskProfile ?? task));
    } else if (command === 'preflight') {
      const required = second === undefined ? null : Number(second);
      print(inspectTargetCapacity(first ?? process.cwd(), required));
    }
    else if (command === 'audit-result') print(auditResultScope(readJson(first), readJson(second)));
    else if (command === 'record-observation') print(recordObservation(readJson(first), second));
    else print(fail(['usage: preflight|route|validate-packet|validate-result|audit-result|record-observation']));
  } catch (error) {
    print(fail([error.message]));
  }
}
