import { createDispatchDescriptor, validateAdapterInput } from './provider-contract.mjs';

export const CLAUDE_CLI_PROVIDER_ID = 'claude-cli';
export const CLAUDE_OPUS_MODEL = 'claude-opus-4-8';

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
  if (input.model !== CLAUDE_OPUS_MODEL) errors.push('claude_cli.model:must_be_explicit_opus_4_8');
  if (input.reasoningEffort !== 'xhigh') errors.push('claude_cli.reasoning_effort:must_be_xhigh');
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
