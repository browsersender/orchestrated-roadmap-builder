import { createDispatchDescriptor, validateAdapterInput } from './provider-contract.mjs';

export const CODEX_AGENT_PROVIDER_ID = 'codex-agent';
export const CODEX_AGENT_MODELS = Object.freeze(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']);
export const CODEX_REASONING_EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);

function fail(errors) {
  return { ok: false, errors: [...new Set(errors)] };
}

function availableAndAuthorized(value, field, errors) {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${field}:required`);
    return;
  }
  if (value.available !== true) errors.push(`${field}.available:required_true`);
  if (value.authorized !== true) errors.push(`${field}.authorized:required_true`);
  for (const key of Object.keys(value)) {
    if (!['available', 'authorized'].includes(key)) errors.push(`${field}:unknown:${key}`);
  }
}

export function createCodexAgentDescriptor(input) {
  const inputResult = validateAdapterInput(input, {
    providerId: CODEX_AGENT_PROVIDER_ID,
    allowedKeys: ['packet', 'model', 'reasoningEffort', 'modelAvailability', 'inheritContext', 'modelOverride'],
    requiredKeys: ['packet', 'model', 'reasoningEffort', 'modelAvailability']
  });
  if (!inputResult.ok) return inputResult;
  const errors = [];
  if (!CODEX_AGENT_MODELS.includes(input.model)) errors.push('codex_agent.model:unsupported');
  if (!CODEX_REASONING_EFFORTS.includes(input.reasoningEffort)) errors.push('codex_agent.reasoning_effort:unsupported');
  if (input.inheritContext !== undefined && input.inheritContext !== false) errors.push('codex_agent.inherited_context:forbidden');
  availableAndAuthorized(input.modelAvailability, 'codex_agent.model_availability', errors);
  if (input.modelOverride !== undefined) {
    if (input.modelOverride === null || typeof input.modelOverride !== 'object' || Array.isArray(input.modelOverride)) {
      errors.push('codex_agent.model_override:must_be_object');
    } else {
      if (input.modelOverride.authorized !== true) errors.push('codex_agent.model_override:unauthorized');
      if (input.modelOverride.model !== input.model) errors.push('codex_agent.model_override:model_mismatch');
      for (const key of Object.keys(input.modelOverride)) {
        if (!['model', 'authorized'].includes(key)) errors.push(`codex_agent.model_override:unknown:${key}`);
      }
    }
  }
  if (errors.length) return fail(errors);
  return createDispatchDescriptor({
    providerId: CODEX_AGENT_PROVIDER_ID,
    packet: input.packet,
    target: 'codex.create_thread',
    arguments: [
      '--model', input.model,
      '--reasoning-effort', input.reasoningEffort,
      '--no-history',
      '--brief-path', input.packet.briefPath
    ]
  });
}

export const codexAgentProvider = Object.freeze({
  providerId: CODEX_AGENT_PROVIDER_ID,
  createDescriptor: createCodexAgentDescriptor
});
