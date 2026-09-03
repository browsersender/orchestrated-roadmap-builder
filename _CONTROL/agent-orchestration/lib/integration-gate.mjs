import { createEvidenceReceipt, stableTarget } from './evidence-engine.mjs';

const present = (value) => typeof value === 'string' && value.trim().length > 0;
const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function checkPasses(check) {
  return plainObject(check) && present(check.command) && check.result === 'pass';
}

function workerId(worker) {
  return worker?.workerId ?? worker?.id ?? worker?.taskId;
}

function workerIsGreen(worker) {
  return worker?.status === 'complete'
    && Array.isArray(worker.checks)
    && worker.checks.length > 0
    && worker.checks.every(checkPasses)
    && Array.isArray(worker.blockers)
    && worker.blockers.length === 0;
}

export function validateCompositionProof(proof) {
  const errors = [];
  if (!plainObject(proof)) errors.push('integration:composition_proof_required');
  else {
    if (!(proof.ok === true || proof.status === 'pass' || proof.status === 'verified')) errors.push('integration:composition_failed');
    if (!present(proof.ref ?? proof.evidenceRef ?? proof.commit)) errors.push('integration:composition_ref_required');
    if (!Array.isArray(proof.checks) || proof.checks.length === 0 || proof.checks.some((check) => !checkPasses(check))) errors.push('integration:composition_checks_required');
  }
  return { ok: errors.length === 0, errors };
}

export function evaluateIntegration(input = {}) {
  const workers = input.workerResults ?? input.results ?? [];
  const errors = [];
  if (!Array.isArray(workers) || workers.length === 0) errors.push('integration:worker_results_required');
  const greenWorkers = Array.isArray(workers) ? workers.filter(workerIsGreen) : [];
  const nonGreen = Array.isArray(workers) ? workers.filter((worker) => !workerIsGreen(worker)) : [];
  if (nonGreen.length) errors.push(`integration:worker_not_green:${nonGreen.map((worker) => workerId(worker) ?? 'unknown').join(',')}`);
  if (greenWorkers.some((worker) => !present(workerId(worker)))) errors.push('integration:worker_id_required');
  const composition = input.compositionProof ?? input.composition;
  const compositionChecked = validateCompositionProof(composition);
  errors.push(...compositionChecked.errors.filter((error) => !errors.includes(error)));
  if (compositionChecked.ok) {
    const declaredWorkers = composition.workerIds ?? composition.workers;
    if (!Array.isArray(declaredWorkers) || declaredWorkers.length === 0) {
      errors.push('integration:workers_not_bound');
    } else {
      const expected = greenWorkers.map(workerId);
      const declared = new Set(declaredWorkers);
      const missing = expected.filter((id) => !declared.has(id));
      if (missing.length) errors.push(`integration:workers_not_bound:${missing.join(',')}`);
    }
  }
  if (input.sourceRevision && composition?.sourceRevision && input.sourceRevision !== composition.sourceRevision) errors.push('integration:source_revision_mismatch');
  if (input.packetHash && composition?.packetHash && input.packetHash !== composition.packetHash) errors.push('integration:packet_hash_mismatch');
  if (errors.length) {
    return {
      ok: false,
      decision: 'refuse',
      reason: errors.join(' '),
      errors,
      workerIds: greenWorkers.map(workerId).filter(Boolean),
      composition: null
    };
  }
  const workerIds = greenWorkers.map(workerId).filter(Boolean);
  if (!present(input.sourceRevision)) errors.push('integration:source_revision_required');
  if (!present(input.campaignId)) errors.push('integration:campaign_id_required');
  if (!present(input.roadmapId)) errors.push('integration:roadmap_id_required');
  if (!plainObject(input.target) || !present(input.target.host)) errors.push('integration:target_required');
  if (errors.length) {
    return { ok: false, decision: 'refuse', reason: errors.join(' '), errors, workerIds, composition: null };
  }
  const receipt = createEvidenceReceipt({
    kind: 'integration',
    decision: 'pass',
    campaignId: input.campaignId,
    roadmapId: input.roadmapId,
    sourceRevision: input.sourceRevision,
    packetHash: input.packetHash,
    gateIdentity: input.gateIdentity ?? { hash: input.gateCatalogHash ?? 'composition' },
    evidenceClass: 'composition-check',
    target: stableTarget(input.target),
    evidence: {
      workerIds,
      workerCommits: greenWorkers.map((worker) => worker.commit ?? null),
      composition: {
        ref: composition.ref ?? composition.evidenceRef ?? composition.commit,
        checks: composition.checks.map((check) => ({ command: check.command, result: check.result }))
      }
    },
    reasons: ['All worker results are green and a separate combined-behavior check passed.'],
    recordedAt: input.recordedAt,
    authority: input.authority ?? 'integrator'
  });
  return {
    ok: true,
    decision: 'pass',
    reason: 'Composition evidence proves the worker results operate together.',
    errors: [],
    workerIds,
    ref: composition.ref ?? composition.evidenceRef ?? composition.commit,
    checks: composition.checks,
    composition: { ...composition, workerIds: composition.workerIds ?? workerIds },
    receipt
  };
}

export const proveIntegration = evaluateIntegration;
export const requireIntegrationProof = evaluateIntegration;

export function decideCorrection(input = {}) {
  const correctionRounds = input.correctionRounds ?? input.rounds ?? 0;
  const correctionBudget = input.correctionBudget ?? 0;
  if (!Number.isInteger(correctionRounds) || correctionRounds < 0) return { ok: false, errors: ['correctionRounds:nonnegative_integer_required'] };
  if (!Number.isInteger(correctionBudget) || correctionBudget < 0) return { ok: false, errors: ['correctionBudget:nonnegative_integer_required'] };
  if (input.failureType && input.failureType !== 'conceptual') {
    return { ok: true, action: 'repair_in_lane', reroute: false, remaining: Math.max(0, correctionBudget - correctionRounds), reason: 'Failure is not conceptual; retain the bounded lane.' };
  }
  if (correctionRounds < correctionBudget) {
    return {
      ok: true,
      action: 'bounded_repair',
      reroute: false,
      remaining: correctionBudget - correctionRounds - 1,
      reason: 'One bounded conceptual repair remains within budget.'
    };
  }
  const toLane = input.toLane ?? (input.currentLane === 'TERRA_PRIMARY' ? 'SOL_OWNED' : 'TERRA_PRIMARY');
  return {
    ok: true,
    action: 'reroute',
    reroute: true,
    toLane,
    remaining: 0,
    reason: 'Conceptual correction budget is exhausted; reroute for fresh ownership.'
  };
}

export const assessCorrectionBudget = decideCorrection;
