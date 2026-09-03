const AUTO_LANES = ['TERRA_PRIMARY', 'LUNA_BOUNDED', 'TERRA_LUNA_FANOUT', 'CLAUDE_OPUS48_SPECIALIST'];
const LANE_IDS = ['SOL_OWNED', ...AUTO_LANES, 'HUMAN_AUTHORITY'];
const PROFILE_KEYS = ['ambiguity', 'blastRadius', 'crossProduct', 'behaviorChange', 'mechanicalAcceptance', 'authorityRequired', 'filesExpected', 'taskShape'];
const REVIEW_KEYS = ['contractFidelity', 'boundaryDiscipline', 'sourceUnderstanding', 'refusalIntegrity', 'testQuality', 'evidenceHonesty', 'implementationQuality'];
const PRIORITY_WEIGHTS = { ignore: 0, low: 2, medium: 5, high: 10 };
const RETAINED_VERDICTS = new Set(['retain_lane', 'retain_lane_with_portability_rule']);
const OBSERVATION_VERDICTS = new Set([...RETAINED_VERDICTS, 'narrow_lane', 'reroute_to_terra', 'reroute_to_sol', 'reject_result']);

const fail = (errors, extra = {}) => ({ ok: false, errors: [...new Set(errors)], ...extra });
const pass = (extra = {}) => ({ ok: true, errors: [], ...extra });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const rounded = (value) => finiteNumber(value) ? Math.round(value * 1000) / 1000 : null;
const mean = (values) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;

function unexpectedKeys(value, allowed, prefix) {
  return Object.keys(value ?? {}).filter((key) => !allowed.includes(key)).map((key) => `${prefix}:unknown:${key}`);
}

function normalizeEnum(value, allowed, field, errors) {
  if (typeof value !== 'string') {
    errors.push(`${field}:must_be_string`);
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    errors.push(`${field}:unknown_value:${value}`);
    return null;
  }
  return normalized;
}

function deriveTaskShape(profile) {
  return [
    profile.filesExpected <= 5 ? 'bounded-kernel' : 'substantial-cross-file',
    profile.mechanicalAcceptance ? 'typed-refusal' : 'source-interpretation',
    profile.filesExpected <= 5 ? 'five-file-scope' : 'eight-file-scope'
  ];
}

export function normalizeTaskProfile(profile) {
  const errors = [];
  if (!isObject(profile)) return fail(['task_profile:must_be_object']);
  errors.push(...unexpectedKeys(profile, PROFILE_KEYS, 'task_profile'));
  for (const key of PROFILE_KEYS.slice(0, 7)) {
    if (profile[key] === undefined) errors.push(`task_profile:missing:${key}`);
  }

  const ambiguity = normalizeEnum(profile.ambiguity, ['low', 'medium', 'high'], 'task_profile.ambiguity', errors);
  const blastRadius = normalizeEnum(profile.blastRadius, ['low', 'medium', 'high'], 'task_profile.blastRadius', errors);
  for (const key of ['crossProduct', 'behaviorChange', 'mechanicalAcceptance', 'authorityRequired']) {
    if (typeof profile[key] !== 'boolean') errors.push(`task_profile.${key}:must_be_boolean`);
  }
  if (!Number.isInteger(profile.filesExpected) || profile.filesExpected < 1) {
    errors.push('task_profile.filesExpected:must_be_positive_integer');
  }

  let taskShape = [];
  if (profile.taskShape !== undefined) {
    if (!Array.isArray(profile.taskShape) || profile.taskShape.length === 0) {
      errors.push('task_profile.taskShape:must_be_nonempty_array');
    } else if (profile.taskShape.some((tag) => typeof tag !== 'string')) {
      errors.push('task_profile.taskShape:must_be_string_array');
    } else {
      taskShape = profile.taskShape.map((tag) => tag.trim().toLowerCase());
      if (taskShape.some((tag) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag))) {
        errors.push('task_profile.taskShape:invalid_tag');
      }
      if (new Set(taskShape).size !== taskShape.length) errors.push('task_profile.taskShape:duplicates');
    }
  }
  if (errors.length) return fail(errors);

  const value = {
    ambiguity,
    blastRadius,
    crossProduct: profile.crossProduct,
    behaviorChange: profile.behaviorChange,
    mechanicalAcceptance: profile.mechanicalAcceptance,
    authorityRequired: profile.authorityRequired,
    filesExpected: profile.filesExpected,
    taskShape: taskShape.length ? taskShape : deriveTaskShape({ ...profile, ambiguity, blastRadius })
  };
  return pass({ value });
}

export function validateRoutingPolicy(policy) {
  const errors = [];
  if (!isObject(policy)) return fail(['routing_policy:must_be_object']);
  if (policy.schemaVersion !== 1) errors.push('routing_policy.schemaVersion:must_be_1');
  if (typeof policy.policyId !== 'string' || !policy.policyId.trim()) errors.push('routing_policy.policyId:required');
  if (!isObject(policy.lanes)) errors.push('routing_policy.lanes:must_be_object');
  if (isObject(policy.lanes)) {
    for (const lane of LANE_IDS) {
      if (!isObject(policy.lanes[lane])) {
        errors.push(`routing_policy.lanes:missing:${lane}`);
        continue;
      }
      const config = policy.lanes[lane];
      if (lane === 'HUMAN_AUTHORITY') {
        if (config.model !== null) errors.push(`routing_policy.lanes.${lane}.model:must_be_null`);
      } else if (typeof config.model !== 'string' || !config.model.trim()) {
        errors.push(`routing_policy.lanes.${lane}.model:required`);
      }
      if (lane === 'TERRA_LUNA_FANOUT' && (typeof config.fanoutModel !== 'string' || !config.fanoutModel.trim())) {
        errors.push('routing_policy.lanes.TERRA_LUNA_FANOUT.fanoutModel:required');
      }
    }
  }
  return errors.length ? fail(errors) : pass({ value: policy });
}

function validateObservation(observation, index) {
  const prefix = `capability_ledger.observations[${index}]`;
  const errors = [];
  if (!isObject(observation)) return [`${prefix}:must_be_object`];
  for (const key of ['schemaVersion', 'observationId', 'taskId', 'model', 'taskShape', 'observed', 'review', 'verdict']) {
    if (observation[key] === undefined) errors.push(`${prefix}:missing:${key}`);
  }
  if (observation.schemaVersion !== 1) errors.push(`${prefix}.schemaVersion:must_be_1`);
  if (typeof observation.observationId !== 'string' || !observation.observationId.trim()) errors.push(`${prefix}.observationId:required`);
  if (typeof observation.model !== 'string' || !observation.model.trim()) errors.push(`${prefix}.model:required`);
  if (!Array.isArray(observation.taskShape) || observation.taskShape.length === 0 || observation.taskShape.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    errors.push(`${prefix}.taskShape:must_be_nonempty_string_array`);
  }
  if (!isObject(observation.observed)) {
    errors.push(`${prefix}.observed:must_be_object`);
  } else {
    for (const key of ['briefWords', 'returnWords', 'elapsedSeconds', 'changedFiles', 'insertions', 'deletions', 'correctionRounds', 'outOfScopeEdits']) {
      if (!finiteNumber(observation.observed[key]) || observation.observed[key] < 0) errors.push(`${prefix}.observed.${key}:must_be_nonnegative_number`);
    }
    for (const key of ['inputTokens', 'outputTokens', 'reportedEquivalentCostUsd']) {
      if (observation.observed[key] !== undefined && (!finiteNumber(observation.observed[key]) || observation.observed[key] < 0)) {
        errors.push(`${prefix}.observed.${key}:must_be_nonnegative_number`);
      }
    }
  }
  if (!isObject(observation.review)) {
    errors.push(`${prefix}.review:must_be_object`);
  } else {
    for (const key of REVIEW_KEYS) {
      if (!Number.isInteger(observation.review[key]) || observation.review[key] < 0 || observation.review[key] > 4) {
        errors.push(`${prefix}.review.${key}:must_be_integer_0_to_4`);
      }
    }
  }
  if (!OBSERVATION_VERDICTS.has(observation.verdict)) errors.push(`${prefix}.verdict:unknown_value:${observation.verdict}`);
  return errors;
}

export function loadCapabilityEvidence(ledger, taskShape) {
  const errors = [];
  if (!isObject(ledger)) return fail(['capability_ledger:must_be_object']);
  if (ledger.schemaVersion !== 1) errors.push('capability_ledger.schemaVersion:must_be_1');
  if (typeof ledger.ledgerId !== 'string' || !ledger.ledgerId.trim()) errors.push('capability_ledger.ledgerId:required');
  if (typeof ledger.costSemantics !== 'string' || !ledger.costSemantics.trim()) errors.push('capability_ledger.costSemantics:required');
  if (!Array.isArray(ledger.observations) || ledger.observations.length === 0) {
    errors.push('capability_ledger.observations:must_be_nonempty_array');
  } else {
    ledger.observations.forEach((observation, index) => errors.push(...validateObservation(observation, index)));
  }
  if (!Array.isArray(taskShape) || taskShape.length === 0 || taskShape.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    errors.push('task_shape:must_be_nonempty_string_array');
  }
  if (errors.length) return fail(errors);

  const normalizedTaskShape = [...new Set(taskShape.map((tag) => tag.trim().toLowerCase()))];
  const observations = ledger.observations.filter((observation) => normalizedTaskShape.every((tag) => observation.taskShape.map((item) => item.toLowerCase()).includes(tag)));
  if (!observations.length) return fail(['capability_evidence:absent_for_task_shape']);

  const byModel = new Map();
  for (const observation of observations) {
    const items = byModel.get(observation.model) ?? [];
    items.push(observation);
    byModel.set(observation.model, items);
  }
  const aggregates = [...byModel.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([model, items]) => {
    const telemetry = (key) => items.map((item) => item.observed[key]).filter(finiteNumber);
    const reviewScores = items.map((item) => mean(REVIEW_KEYS.map((key) => item.review[key])));
    return {
      model,
      observationIds: items.map((item) => item.observationId).sort(),
      observationCount: items.length,
      rankableObservationCount: items.filter((item) => RETAINED_VERDICTS.has(item.verdict)).length,
      verdicts: [...new Set(items.map((item) => item.verdict))].sort(),
      averageReviewScore: rounded(mean(reviewScores)),
      averageElapsedSeconds: rounded(mean(telemetry('elapsedSeconds'))),
      averageInputTokens: rounded(mean(telemetry('inputTokens'))),
      averageOutputTokens: rounded(mean(telemetry('outputTokens'))),
      averageReportedEquivalentCostUsd: rounded(mean(telemetry('reportedEquivalentCostUsd')))
    };
  });
  return pass({
    value: {
      ledgerId: ledger.ledgerId,
      costSemantics: ledger.costSemantics,
      taskShape: normalizedTaskShape,
      observationIds: observations.map((item) => item.observationId).sort(),
      aggregates
    }
  });
}

function policyModels(policy) {
  return [...new Set(Object.values(policy.lanes).flatMap((lane) => [lane.model, lane.fanoutModel]).filter((model) => typeof model === 'string'))].sort();
}

export function normalizeTargetSupport(targetSupport, policy) {
  const errors = [];
  if (!isObject(targetSupport)) return fail(['target_support:must_be_object']);
  errors.push(...unexpectedKeys(targetSupport, ['providers'], 'target_support'));
  if (!isObject(targetSupport.providers)) errors.push('target_support.providers:must_be_object');
  const policyResult = validateRoutingPolicy(policy);
  if (!policyResult.ok) errors.push(...policyResult.errors);
  if (errors.length) return fail(errors);

  const models = policyModels(policy);
  for (const model of Object.keys(targetSupport.providers)) {
    if (!models.includes(model)) errors.push(`target_support.providers:unknown:${model}`);
  }
  const providers = {};
  for (const model of models) {
    const provider = targetSupport.providers[model];
    if (provider === undefined) {
      providers[model] = { available: false, authorized: false };
      continue;
    }
    if (!isObject(provider)) {
      errors.push(`target_support.providers.${model}:must_be_object`);
      continue;
    }
    errors.push(...unexpectedKeys(provider, ['available', 'authorized'], `target_support.providers.${model}`));
    if (typeof provider.available !== 'boolean') errors.push(`target_support.providers.${model}.available:must_be_boolean`);
    if (typeof provider.authorized !== 'boolean') errors.push(`target_support.providers.${model}.authorized:must_be_boolean`);
    providers[model] = { available: provider.available, authorized: provider.authorized };
  }
  return errors.length ? fail(errors) : pass({ value: { providers } });
}

export function normalizeResourcePreferences(preferences = {}) {
  const errors = [];
  if (!isObject(preferences)) return fail(['resource_preferences:must_be_object']);
  errors.push(...unexpectedKeys(preferences, ['time', 'tokens', 'equivalentCost'], 'resource_preferences'));
  const value = {};
  for (const key of ['time', 'tokens', 'equivalentCost']) {
    value[key] = preferences[key] === undefined ? 'ignore' : normalizeEnum(preferences[key], Object.keys(PRIORITY_WEIGHTS), `resource_preferences.${key}`, errors);
  }
  return errors.length ? fail(errors) : pass({ value });
}

function laneModels(policy, lane) {
  const config = policy.lanes[lane];
  return [config.model, config.fanoutModel].filter((model) => typeof model === 'string');
}

function taskFit(profile, lane) {
  if (lane === 'TERRA_PRIMARY') return 40 + (profile.behaviorChange ? 6 : 0) + (profile.filesExpected > 4 ? 12 : 0) + (profile.ambiguity === 'medium' ? 18 : 0) + (profile.blastRadius === 'medium' ? 10 : 0);
  if (lane === 'LUNA_BOUNDED') return 35 + (profile.mechanicalAcceptance ? 25 : 0) + (profile.ambiguity === 'low' ? 15 : 0) + (profile.filesExpected <= 6 ? 15 : 0) - (profile.behaviorChange ? 4 : 0);
  if (lane === 'TERRA_LUNA_FANOUT') return 20 + (profile.mechanicalAcceptance && !profile.behaviorChange && profile.filesExpected > 6 ? 60 : 0) + (!profile.crossProduct ? 5 : -20);
  if (lane === 'CLAUDE_OPUS48_SPECIALIST') return 18 + (profile.ambiguity === 'medium' ? 10 : 0) + (profile.filesExpected > 4 ? 5 : 0) - (profile.mechanicalAcceptance ? 5 : 0);
  return 0;
}

function laneMetric(aggregates, models, metric) {
  const values = models.map((model) => aggregates.get(model)?.[metric]);
  return values.every(finiteNumber) ? mean(values) : null;
}

function resourceAdjustment(candidates, preference, metric, component) {
  const weight = PRIORITY_WEIGHTS[preference];
  const measured = candidates.filter((candidate) => finiteNumber(candidate.metrics[metric]));
  if (!weight || measured.length < 2) return;
  const values = measured.map((candidate) => candidate.metrics[metric]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return;
  for (const candidate of measured) {
    const adjustment = weight * (maximum - candidate.metrics[metric]) / (maximum - minimum);
    candidate.scoreComponents[component] = rounded(adjustment);
    candidate.score += adjustment;
    candidate.reasons.push(`resource:${component}:${adjustment > 0 ? '+' : ''}${rounded(adjustment)}`);
  }
}

export function rankModelLanes({ profile, evidence, policy, targetSupport, resourcePreferences = {} }) {
  const profileResult = normalizeTaskProfile(profile);
  const policyResult = validateRoutingPolicy(policy);
  const preferenceResult = normalizeResourcePreferences(resourcePreferences);
  const supportResult = normalizeTargetSupport(targetSupport, policy);
  const errors = [...profileResult.errors, ...policyResult.errors, ...preferenceResult.errors, ...supportResult.errors];
  if (!isObject(evidence) || !Array.isArray(evidence.aggregates) || !Array.isArray(evidence.observationIds)) errors.push('capability_evidence:invalid');
  if (errors.length) return fail(errors);

  const aggregateByModel = new Map(evidence.aggregates.map((item) => [item.model, item]));
  const support = supportResult.value;
  const exclusions = [];
  const candidates = [];
  for (const lane of AUTO_LANES) {
    const models = laneModels(policy, lane);
    const unavailable = models.filter((model) => !support.providers[model].available);
    const unauthorized = models.filter((model) => !support.providers[model].authorized);
    if (unavailable.length) {
      exclusions.push({ lane, reason: `provider_unavailable:${unavailable.join(',')}` });
      continue;
    }
    if (unauthorized.length) {
      exclusions.push({ lane, reason: `provider_unauthorized:${unauthorized.join(',')}` });
      continue;
    }
    const missingEvidence = models.filter((model) => !aggregateByModel.get(model)?.rankableObservationCount);
    if (missingEvidence.length) {
      exclusions.push({ lane, reason: `capability_evidence_missing:${missingEvidence.join(',')}` });
      continue;
    }
    const observationIds = models.flatMap((model) => aggregateByModel.get(model).observationIds).sort();
    const scoreComponents = {
      taskFit: taskFit(profileResult.value, lane),
      evidenceReview: rounded(mean(models.map((model) => aggregateByModel.get(model).averageReviewScore)) * 5),
      resourceTime: 0,
      resourceTokens: 0,
      resourceEquivalentCost: 0
    };
    candidates.push({
      lane,
      models,
      score: scoreComponents.taskFit + scoreComponents.evidenceReview,
      scoreComponents,
      metrics: {
        elapsedSeconds: laneMetric(aggregateByModel, models, 'averageElapsedSeconds'),
        tokens: laneMetric(aggregateByModel, models, 'averageInputTokens') === null || laneMetric(aggregateByModel, models, 'averageOutputTokens') === null
          ? null
          : laneMetric(aggregateByModel, models, 'averageInputTokens') + laneMetric(aggregateByModel, models, 'averageOutputTokens'),
        equivalentCost: laneMetric(aggregateByModel, models, 'averageReportedEquivalentCostUsd')
      },
      observationIds,
      reasons: [`support:available_and_authorized`, `task_fit:${scoreComponents.taskFit}`, `task_shape_observations:${observationIds.length}`, 'evidence:task_shape_cohort_not_global_ranking']
    });
  }

  resourceAdjustment(candidates, preferenceResult.value.time, 'elapsedSeconds', 'resourceTime');
  resourceAdjustment(candidates, preferenceResult.value.tokens, 'tokens', 'resourceTokens');
  resourceAdjustment(candidates, preferenceResult.value.equivalentCost, 'equivalentCost', 'resourceEquivalentCost');
  const rankedLanes = candidates.map((candidate) => ({
    lane: candidate.lane,
    models: candidate.models,
    score: rounded(candidate.score),
    scoreComponents: Object.fromEntries(Object.entries(candidate.scoreComponents).map(([key, value]) => [key, rounded(value)])),
    reasons: candidate.reasons,
    observationIds: candidate.observationIds,
    telemetry: candidate.metrics
  })).sort((left, right) => right.score - left.score || left.lane.localeCompare(right.lane));
  return pass({ value: { rankedLanes, exclusions, resourcePreferences: preferenceResult.value } });
}

export function decideReroute({ currentLane, correctionRounds = 0, correctionBudget = 1 }) {
  const errors = [];
  if (!LANE_IDS.includes(currentLane)) errors.push(`reroute.currentLane:unknown_value:${currentLane}`);
  if (!Number.isInteger(correctionRounds) || correctionRounds < 0) errors.push('reroute.correctionRounds:must_be_nonnegative_integer');
  if (!Number.isInteger(correctionBudget) || correctionBudget < 0) errors.push('reroute.correctionBudget:must_be_nonnegative_integer');
  if (errors.length) return fail(errors);
  if (correctionRounds < correctionBudget) {
    return pass({ value: { action: 'stay_in_lane', fromLane: currentLane, toLane: currentLane, correctionRounds, correctionBudget, reason: 'recoverable_correction_within_budget' } });
  }
  const nextLane = currentLane === 'LUNA_BOUNDED' ? 'TERRA_PRIMARY'
    : currentLane === 'TERRA_PRIMARY' || currentLane === 'TERRA_LUNA_FANOUT' || currentLane === 'CLAUDE_OPUS48_SPECIALIST' ? 'SOL_OWNED'
      : currentLane === 'SOL_OWNED' ? 'HUMAN_AUTHORITY'
        : 'HUMAN_AUTHORITY';
  return pass({ value: { action: 'escalate', fromLane: currentLane, toLane: nextLane, correctionRounds, correctionBudget, reason: 'correction_budget_exhausted' } });
}

function normalizeCoordinatorOverride(override) {
  if (override === undefined || override === null) return pass({ value: { requested: false, applied: false, lane: null, rationale: null } });
  if (!isObject(override)) return fail(['coordinator_override:must_be_object']);
  const errors = unexpectedKeys(override, ['lane', 'rationale'], 'coordinator_override');
  if (!LANE_IDS.includes(override.lane)) errors.push(`coordinator_override.lane:unknown_value:${override.lane}`);
  if (typeof override.rationale !== 'string' || !override.rationale.trim()) errors.push('coordinator_override.rationale:required');
  return errors.length ? fail(errors) : pass({ value: { requested: true, applied: false, lane: override.lane, rationale: override.rationale.trim() } });
}

function emptyEvidence() {
  return { ledgerId: null, taskShape: [], observationIds: [], aggregates: [] };
}

function receiptTelemetry(evidence, preferences) {
  return {
    costSemantics: evidence?.costSemantics ?? 'no capability telemetry loaded',
    billingStatus: 'not_billing',
    acceptanceStatus: 'not_acceptance_evidence',
    preferences: preferences ?? { time: 'ignore', tokens: 'ignore', equivalentCost: 'ignore' },
    reportedEquivalentCostUsdByModel: Object.fromEntries((evidence?.aggregates ?? []).map((item) => [item.model, item.averageReportedEquivalentCostUsd]))
  };
}

export function validateRoutingReceipt(receipt) {
  const errors = [];
  if (!isObject(receipt)) return fail(['routing_receipt:must_be_object']);
  if (receipt.schemaVersion !== 1) errors.push('routing_receipt.schemaVersion:must_be_1');
  if (typeof receipt.receiptId !== 'string' || !receipt.receiptId.trim()) errors.push('routing_receipt.receiptId:required');
  if (!['routed', 'refused', 'escalated'].includes(receipt.status)) errors.push('routing_receipt.status:invalid');
  if (!isObject(receipt.policy) || typeof receipt.policy.policyId !== 'string' || !receipt.policy.policyId.trim() || receipt.policy.schemaVersion !== 1) {
    errors.push('routing_receipt.policy:identity_required');
  }
  if (!Array.isArray(receipt.reasons) || receipt.reasons.length === 0 || receipt.reasons.some((reason) => typeof reason !== 'string' || !reason.trim())) {
    errors.push('routing_receipt.reasons:required');
  }
  if (!isObject(receipt.coordinatorOverride) || typeof receipt.coordinatorOverride.requested !== 'boolean' || typeof receipt.coordinatorOverride.applied !== 'boolean') {
    errors.push('routing_receipt.coordinatorOverride:explicit_required');
  }
  if (!isObject(receipt.resourceTelemetry) || receipt.resourceTelemetry.billingStatus !== 'not_billing' || receipt.resourceTelemetry.acceptanceStatus !== 'not_acceptance_evidence') {
    errors.push('routing_receipt.resourceTelemetry:telemetry_boundary_required');
  }
  if (!Array.isArray(receipt.rankedLanes)) errors.push('routing_receipt.rankedLanes:must_be_array');
  if (receipt.status === 'routed') {
    if (!LANE_IDS.includes(receipt.selectedLane)) errors.push('routing_receipt.selectedLane:required_for_routed');
    if (!receipt.rankedLanes?.some((lane) => lane.lane === receipt.selectedLane)) errors.push('routing_receipt.selectedLane:must_be_ranked');
    if (!isObject(receipt.evidence) || !Array.isArray(receipt.evidence.observationIds) || receipt.evidence.observationIds.length === 0) {
      errors.push('routing_receipt.evidence:observations_required_for_routed');
    }
  }
  return errors.length ? fail(errors) : pass();
}

export function buildRoutingReceipt(receipt) {
  const checked = validateRoutingReceipt(receipt);
  return checked.ok ? pass({ receipt }) : checked;
}

function makeReceipt({ taskId, status, policy, profile, automaticDispatch, selectedLane, rankedLanes, reasons, evidence, coordinatorOverride, preferences, correction, limits }) {
  return {
    schemaVersion: 1,
    receiptId: `${taskId}:${policy.policyId}`,
    status,
    policy: { policyId: policy.policyId, schemaVersion: policy.schemaVersion },
    taskProfile: profile,
    automaticDispatch,
    selectedLane,
    rankedLanes,
    reasons,
    evidence: evidence ?? emptyEvidence(),
    coordinatorOverride,
    resourceTelemetry: receiptTelemetry(evidence, preferences),
    correction,
    limits
  };
}

function refusal({ taskId, policy, profile, errors, evidence, coordinatorOverride, preferences, limits }) {
  const receipt = makeReceipt({
    taskId,
    status: 'refused',
    policy,
    profile,
    automaticDispatch: false,
    selectedLane: null,
    rankedLanes: [],
    reasons: errors,
    evidence,
    coordinatorOverride: coordinatorOverride ?? { requested: false, applied: false, lane: null, rationale: null },
    preferences,
    correction: { action: 'not_started', fromLane: null, toLane: null, correctionRounds: 0, correctionBudget: 0, reason: 'automatic_dispatch_refused' },
    limits
  });
  const built = buildRoutingReceipt(receipt);
  return fail(errors, built.ok ? { receipt } : { receiptErrors: built.errors });
}

export function routeModelTask({ taskId, profile, ledger, policy, targetSupport, resourcePreferences = {}, coordinatorOverride, currentLane, correctionRounds = 0, correctionBudget = 1 }) {
  if (typeof taskId !== 'string' || !taskId.trim()) return fail(['taskId:required']);
  const profileResult = normalizeTaskProfile(profile);
  const policyResult = validateRoutingPolicy(policy);
  if (!profileResult.ok || !policyResult.ok) return fail([...profileResult.errors, ...policyResult.errors]);
  const normalizedProfile = profileResult.value;
  const baseLimits = [
    'capability observations are task-shape evidence, not a universal model ranking',
    'provider support is dispatch-time and no credential material enters this receipt',
    'reported equivalent-cost telemetry is not billing or acceptance evidence'
  ];
  const overrideResult = normalizeCoordinatorOverride(coordinatorOverride);
  if (!overrideResult.ok) return refusal({ taskId, policy, profile: normalizedProfile, errors: overrideResult.errors, limits: baseLimits });

  if (normalizedProfile.authorityRequired) {
    return refusal({
      taskId,
      policy,
      profile: normalizedProfile,
      errors: ['automatic_dispatch_refused:protected_authority_required'],
      coordinatorOverride: overrideResult.value,
      preferences: { time: 'ignore', tokens: 'ignore', equivalentCost: 'ignore' },
      limits: [...baseLimits, 'protected authority requires a human decision']
    });
  }
  const evidenceResult = loadCapabilityEvidence(ledger, normalizedProfile.taskShape);
  if (!evidenceResult.ok) return refusal({
    taskId,
    policy,
    profile: normalizedProfile,
    errors: ['automatic_dispatch_refused:capability_evidence_invalid_or_absent', ...evidenceResult.errors],
    coordinatorOverride: overrideResult.value,
    preferences: { time: 'ignore', tokens: 'ignore', equivalentCost: 'ignore' },
    limits: [...baseLimits, 'automatic routing requires valid matching capability observations']
  });
  const preferenceResult = normalizeResourcePreferences(resourcePreferences);
  if (!preferenceResult.ok) return refusal({
    taskId,
    policy,
    profile: normalizedProfile,
    errors: preferenceResult.errors,
    evidence: evidenceResult.value,
    coordinatorOverride: overrideResult.value,
    limits: baseLimits
  });
  const rankResult = rankModelLanes({ profile: normalizedProfile, evidence: evidenceResult.value, policy, targetSupport, resourcePreferences: preferenceResult.value });
  if (!rankResult.ok) return refusal({
    taskId,
    policy,
    profile: normalizedProfile,
    errors: rankResult.errors,
    evidence: evidenceResult.value,
    coordinatorOverride: overrideResult.value,
    preferences: preferenceResult.value,
    limits: baseLimits
  });
  if (!rankResult.value.rankedLanes.length) return refusal({
    taskId,
    policy,
    profile: normalizedProfile,
    errors: ['automatic_dispatch_refused:no_available_authorized_evidence_supported_lane', ...rankResult.value.exclusions.map((item) => `${item.lane}:${item.reason}`)],
    evidence: evidenceResult.value,
    coordinatorOverride: overrideResult.value,
    preferences: preferenceResult.value,
    limits: [...baseLimits, 'unavailable or unauthorized providers cannot win a route']
  });

  const coordinatorOwnedRisk = normalizedProfile.ambiguity === 'high' || normalizedProfile.blastRadius === 'high' || normalizedProfile.crossProduct;
  if (coordinatorOwnedRisk && !overrideResult.value.requested) {
    const correction = { action: 'escalate', fromLane: null, toLane: 'SOL_OWNED', correctionRounds: 0, correctionBudget, reason: 'coordinator_owned_risk' };
    const receipt = makeReceipt({
      taskId,
      status: 'escalated',
      policy,
      profile: normalizedProfile,
      automaticDispatch: false,
      selectedLane: null,
      rankedLanes: rankResult.value.rankedLanes,
      reasons: ['automatic_dispatch_deferred:coordinator_owned_risk'],
      evidence: evidenceResult.value,
      coordinatorOverride: overrideResult.value,
      preferences: preferenceResult.value,
      correction,
      limits: [...baseLimits, 'architecture and integration risk remain coordinator-owned until explicitly decomposed and delegated']
    });
    const built = buildRoutingReceipt(receipt);
    return built.ok ? pass({ receipt, automaticDispatch: false, escalation: correction, exclusions: rankResult.value.exclusions }) : fail(built.errors);
  }

  let selectedLane = rankResult.value.rankedLanes[0].lane;
  const appliedOverride = { ...overrideResult.value };
  if (appliedOverride.requested) {
    if (!rankResult.value.rankedLanes.some((lane) => lane.lane === appliedOverride.lane)) {
      return refusal({
        taskId,
        policy,
        profile: normalizedProfile,
        errors: [`automatic_dispatch_refused:coordinator_override_not_eligible:${appliedOverride.lane}`],
        evidence: evidenceResult.value,
        coordinatorOverride: appliedOverride,
        preferences: preferenceResult.value,
        limits: [...baseLimits, 'a coordinator override cannot select an unavailable, unauthorized, or evidence-unsupported lane']
      });
    }
    selectedLane = appliedOverride.lane;
    appliedOverride.applied = true;
  }
  const rerouteResult = decideReroute({ currentLane: currentLane ?? selectedLane, correctionRounds, correctionBudget });
  if (!rerouteResult.ok) return refusal({
    taskId,
    policy,
    profile: normalizedProfile,
    errors: rerouteResult.errors,
    evidence: evidenceResult.value,
    coordinatorOverride: appliedOverride,
    preferences: preferenceResult.value,
    limits: baseLimits
  });
  const correction = rerouteResult.value;
  const escalated = correction.action === 'escalate';
  const receipt = makeReceipt({
    taskId,
    status: escalated ? 'escalated' : 'routed',
    policy,
    profile: normalizedProfile,
    automaticDispatch: !appliedOverride.applied && !escalated,
    selectedLane: escalated ? null : selectedLane,
    rankedLanes: rankResult.value.rankedLanes,
    reasons: [
      ...(escalated ? [`reroute:${correction.fromLane}_to_${correction.toLane}`] : [`selected_lane:${selectedLane}`]),
      ...(appliedOverride.applied ? [`coordinator_override:${appliedOverride.rationale}`] : ['selection:ranked_task_shape_evidence']),
      ...(coordinatorOwnedRisk && appliedOverride.applied ? ['coordinator_scoped_delegation:automatic_dispatch_remains_false'] : []),
      `policy:${policy.policyId}`
    ],
    evidence: evidenceResult.value,
    coordinatorOverride: appliedOverride,
    preferences: preferenceResult.value,
    correction,
    limits: baseLimits
  });
  const built = buildRoutingReceipt(receipt);
  return built.ok ? pass({ receipt, automaticDispatch: receipt.automaticDispatch, selectedLane: receipt.selectedLane, exclusions: rankResult.value.exclusions }) : fail(built.errors);
}
