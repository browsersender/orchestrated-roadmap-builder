import { createDispatchDescriptor, validateAdapterInput } from './provider-contract.mjs';

export const CLAUDE_CLI_PROVIDER_ID = 'claude-cli';
export const CLAUDE_OPUS_MODEL = 'claude-opus-4-8';

// Model IDs are accepted here; whether the CLI actually resolves one is discovered at dispatch time
// through modelAvailability and is never assumed. Specialist tiers stay at xhigh so their evidence
// remains comparable with the existing Opus 4.8 observations.
export const CLAUDE_MODELS = Object.freeze({
  'claude-opus-4-8': Object.freeze({ tier: 'specialist', efforts: ['xhigh'] }),
  'claude-opus-5': Object.freeze({ tier: 'specialist', efforts: ['xhigh'] }),
  'claude-sonnet-5': Object.freeze({ tier: 'primary', efforts: ['high', 'xhigh'] }),
  'claude-haiku-4-5-20251001': Object.freeze({ tier: 'bounded', efforts: ['high', 'xhigh'] })
});
export const CLAUDE_MODEL_IDS = Object.freeze(Object.keys(CLAUDE_MODELS));

function fail(errors) {
  return { ok: false, errors: [...new Set(errors)] };
}

function availableAndAuthorized(value, errors) {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('claude_cli.model_availability:required');
    return;
  }
  if (value.available !== true) errors.push('claude_cli.model_availability.available:required_true');
  if (value.authorized !== true) errors.push('claude_cli.model_availability.authorized:required_true');
  for (const key of Object.keys(value)) {
    if (!['available', 'authorized'].includes(key)) errors.push(`claude_cli.model_availability:unknown:${key}`);
  }
}

export function createClaudeCliDescriptor(input) {
  const inputResult = validateAdapterInput(input, {
    providerId: CLAUDE_CLI_PROVIDER_ID,
    allowedKeys: ['packet', 'model', 'reasoningEffort', 'modelAvailability', 'fallbackModel', 'sessionPersistence'],
    requiredKeys: ['packet', 'model', 'reasoningEffort', 'modelAvailability']
  });
  if (!inputResult.ok) return inputResult;
  const errors = [];
  const spec = CLAUDE_MODELS[input.model];
  if (!spec) errors.push(`claude_cli.model:unsupported:${input.model}`);
  else if (!spec.efforts.includes(input.reasoningEffort)) {
    errors.push(`claude_cli.reasoning_effort:unsupported_for_model:${input.model}:${input.reasoningEffort}`);
  }
  if (input.fallbackModel !== undefined && input.fallbackModel !== null) errors.push('claude_cli.fallback_model:forbidden');
  if (input.sessionPersistence !== undefined && input.sessionPersistence !== false) errors.push('claude_cli.session_persistence:forbidden');
  availableAndAuthorized(input.modelAvailability, errors);
  if (errors.length) return fail(errors);
  return createDispatchDescriptor({
    providerId: CLAUDE_CLI_PROVIDER_ID,
    packet: input.packet,
    target: 'claude',
    arguments: [
      '--model', input.model,
      '--effort', input.reasoningEffort,
      '--no-session-persistence',
      '--brief-path', input.packet.briefPath
    ]
  });
}

export const claudeCliProvider = Object.freeze({
  providerId: CLAUDE_CLI_PROVIDER_ID,
  createDescriptor: createClaudeCliDescriptor
});
