import path from 'node:path';
import { validateWorkPacket } from '../work-packet.mjs';

export const DISPATCH_SCHEMA_VERSION = 1;
export const DISPATCH_DESCRIPTOR_FIELDS = Object.freeze([
  'schemaVersion',
  'descriptorId',
  'providerId',
  'status',
  'packet',
  'dispatch',
  'authority',
  'limits'
]);

const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const SECRET_FIELD_PATTERN = /(?:api[-_]?key|secret|token|password|credential|authorization|private[-_]?key|access[-_]?key)/i;
const SECRET_VALUE_PATTERN = /(?:^|[\s"'])(?:sk-[a-z0-9_-]{8,}|ghp_[a-z0-9]{8,}|akia[0-9a-z]{12,}|bearer\s+[a-z0-9._-]{8,})/i;
const SHELL_CONTROL_PATTERN = /[;&|`$<>\r\n\u0000]/;
const PACKET_IDENTITY_FIELDS = Object.freeze([
  'taskId',
  'campaignId',
  'roadmapId',
  'sourceRevision',
  'packetHash',
  'briefPath'
]);

const fail = (errors, extra = {}) => ({ ok: false, errors: [...new Set(errors)], ...extra });
const pass = (extra = {}) => ({ ok: true, errors: [], ...extra });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

function unexpectedKeys(value, allowed, prefix) {
  return Object.keys(value ?? {}).filter((key) => !allowed.includes(key)).map((key) => `${prefix}:unknown:${key}`);
}

export function findSecretMaterial(value, prefix = 'value') {
  const findings = [];
  const visit = (current, currentPath) => {
    if (typeof current === 'string') {
      if (SECRET_VALUE_PATTERN.test(current)) findings.push(`${currentPath}:secret_shaped_value`);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    if (!isObject(current)) return;
    for (const [key, item] of Object.entries(current)) {
      const childPath = `${currentPath}.${key}`;
      if (SECRET_FIELD_PATTERN.test(key)) findings.push(`${childPath}:secret_shaped_field`);
      visit(item, childPath);
    }
  };
  visit(value, prefix);
  return findings;
}

export function validateSafeArguments(argumentsValue, field = 'dispatch.arguments') {
  const errors = [];
  if (!Array.isArray(argumentsValue) || argumentsValue.length === 0) return fail([`${field}:must_be_nonempty_array`]);
  argumentsValue.forEach((argument, index) => {
    const argumentField = `${field}[${index}]`;
    if (!nonEmpty(argument)) {
      errors.push(`${argumentField}:must_be_nonempty_string`);
      return;
    }
    if (SHELL_CONTROL_PATTERN.test(argument)) errors.push(`${argumentField}:shell_control_forbidden`);
    if (SECRET_VALUE_PATTERN.test(argument)) errors.push(`${argumentField}:secret_shaped_value`);
  });
  return errors.length ? fail(errors) : pass();
}

export function validateAdapterInput(input, { providerId, allowedKeys, requiredKeys }) {
  const errors = [];
  if (!isObject(input)) return fail(['dispatch_request:must_be_object']);
  errors.push(...unexpectedKeys(input, allowedKeys, 'dispatch_request'));
  for (const key of requiredKeys) {
    if (input[key] === undefined) errors.push(`dispatch_request.${key}:required`);
  }
  errors.push(...findSecretMaterial(input, 'dispatch_request'));
  if (input.packet !== undefined) {
    const packetResult = validateWorkPacket(input.packet);
    if (!packetResult.ok) errors.push(...packetResult.errors.map((error) => `dispatch_request.packet:${error}`));
  }
  if (!PROVIDER_ID_PATTERN.test(providerId)) errors.push('provider_id:invalid');
  return errors.length ? fail(errors) : pass({ value: input });
}

function packetIdentity(packet) {
  return Object.fromEntries(PACKET_IDENTITY_FIELDS.map((key) => [key, packet[key]]));
}

function validateDescriptorPacket(packet, errors) {
  if (!isObject(packet)) {
    errors.push('dispatch_descriptor.packet:must_be_object');
    return;
  }
  errors.push(...unexpectedKeys(packet, PACKET_IDENTITY_FIELDS, 'dispatch_descriptor.packet'));
  for (const key of PACKET_IDENTITY_FIELDS) {
    if (!nonEmpty(packet[key])) errors.push(`dispatch_descriptor.packet.${key}:required`);
  }
  if (packet.packetHash !== undefined && !/^[a-f0-9]{64}$/.test(packet.packetHash)) {
    errors.push('dispatch_descriptor.packet.packetHash:must_be_sha256');
  }
  if (packet.briefPath !== undefined && !path.isAbsolute(packet.briefPath)) {
    errors.push('dispatch_descriptor.packet.briefPath:must_be_absolute');
  }
}

function validateDescriptorDispatch(dispatch, errors) {
  const fields = ['target', 'arguments', 'context'];
  if (!isObject(dispatch)) {
    errors.push('dispatch_descriptor.dispatch:must_be_object');
    return;
  }
  errors.push(...unexpectedKeys(dispatch, fields, 'dispatch_descriptor.dispatch'));
  if (!nonEmpty(dispatch.target)) errors.push('dispatch_descriptor.dispatch.target:required');
  else if (SHELL_CONTROL_PATTERN.test(dispatch.target)) errors.push('dispatch_descriptor.dispatch.target:shell_control_forbidden');
  const argumentResult = validateSafeArguments(dispatch.arguments, 'dispatch_descriptor.dispatch.arguments');
  errors.push(...argumentResult.errors);
  if (!isObject(dispatch.context)) {
    errors.push('dispatch_descriptor.dispatch.context:must_be_object');
    return;
  }
  errors.push(...unexpectedKeys(dispatch.context, ['history', 'briefPath'], 'dispatch_descriptor.dispatch.context'));
  if (dispatch.context.history !== 'none') errors.push('dispatch_descriptor.dispatch.context.history:must_be_none');
  if (!nonEmpty(dispatch.context.briefPath) || !path.isAbsolute(dispatch.context.briefPath)) {
    errors.push('dispatch_descriptor.dispatch.context.briefPath:must_be_absolute');
  }
}

export function validateDispatchDescriptor(descriptor) {
  const errors = [];
  if (!isObject(descriptor)) return fail(['dispatch_descriptor:must_be_object']);
  errors.push(...unexpectedKeys(descriptor, DISPATCH_DESCRIPTOR_FIELDS, 'dispatch_descriptor'));
  for (const key of DISPATCH_DESCRIPTOR_FIELDS) {
    if (descriptor[key] === undefined) errors.push(`dispatch_descriptor.${key}:required`);
  }
  if (descriptor.schemaVersion !== DISPATCH_SCHEMA_VERSION) errors.push('dispatch_descriptor.schemaVersion:must_be_1');
  if (!nonEmpty(descriptor.descriptorId)) errors.push('dispatch_descriptor.descriptorId:required');
  if (!nonEmpty(descriptor.providerId) || !PROVIDER_ID_PATTERN.test(descriptor.providerId)) errors.push('dispatch_descriptor.providerId:invalid');
  if (descriptor.status !== 'ready') errors.push('dispatch_descriptor.status:must_be_ready');
  validateDescriptorPacket(descriptor.packet, errors);
  validateDescriptorDispatch(descriptor.dispatch, errors);
  if (descriptor.dispatch?.context?.briefPath !== descriptor.packet?.briefPath) {
    errors.push('dispatch_descriptor.dispatch.context.briefPath:must_match_packet');
  }
  if (!isObject(descriptor.authority)) {
    errors.push('dispatch_descriptor.authority:boundary_required');
  } else {
    errors.push(...unexpectedKeys(descriptor.authority, ['execution', 'promotion'], 'dispatch_descriptor.authority'));
    if (descriptor.authority.execution !== 'coordinator_required' || descriptor.authority.promotion !== 'not_granted') {
      errors.push('dispatch_descriptor.authority:boundary_required');
    }
  }
  if (!Array.isArray(descriptor.limits) || descriptor.limits.length === 0 || descriptor.limits.some((item) => !nonEmpty(item))) {
    errors.push('dispatch_descriptor.limits:must_be_nonempty_string_array');
  }
  errors.push(...findSecretMaterial(descriptor, 'dispatch_descriptor'));
  return errors.length ? fail(errors) : pass({ value: descriptor });
}

export function createDispatchDescriptor({ providerId, packet, target, arguments: argumentsValue }) {
  const errors = [];
  const packetResult = validateWorkPacket(packet);
  if (!packetResult.ok) errors.push(...packetResult.errors.map((error) => `packet:${error}`));
  if (!nonEmpty(providerId) || !PROVIDER_ID_PATTERN.test(providerId)) errors.push('provider_id:invalid');
  if (!nonEmpty(target) || SHELL_CONTROL_PATTERN.test(target)) errors.push('dispatch_target:invalid');
  const argumentResult = validateSafeArguments(argumentsValue);
  errors.push(...argumentResult.errors);
  errors.push(...findSecretMaterial({ providerId, packet, target, arguments: argumentsValue }, 'dispatch_request'));
  if (errors.length) return fail(errors);
  const descriptor = {
    schemaVersion: DISPATCH_SCHEMA_VERSION,
    descriptorId: `${providerId}:${packet.packetHash}`,
    providerId,
    status: 'ready',
    packet: packetIdentity(packet),
    dispatch: {
      target,
      arguments: [...argumentsValue],
      context: { history: 'none', briefPath: packet.briefPath }
    },
    authority: { execution: 'coordinator_required', promotion: 'not_granted' },
    limits: [
      'descriptor_only',
      'credential_material_absent',
      'automatic_authority_promotion_absent'
    ]
  };
  const checked = validateDispatchDescriptor(descriptor);
  return checked.ok ? pass({ descriptor }) : checked;
}

export function validateProvider(provider) {
  const errors = [];
  if (!isObject(provider)) return fail(['provider:must_be_object']);
  errors.push(...unexpectedKeys(provider, ['providerId', 'createDescriptor'], 'provider'));
  if (!nonEmpty(provider.providerId) || !PROVIDER_ID_PATTERN.test(provider.providerId)) errors.push('provider.providerId:invalid');
  if (typeof provider.createDescriptor !== 'function') errors.push('provider.createDescriptor:must_be_function');
  return errors.length ? fail(errors) : pass({ provider });
}

export function registerProvider(registry, provider) {
  if (!(registry instanceof Map)) return fail(['provider_registry:must_be_map']);
  const checked = validateProvider(provider);
  if (!checked.ok) return checked;
  if (registry.has(provider.providerId)) return fail([`provider_registry:duplicate:${provider.providerId}`]);
  registry.set(provider.providerId, provider);
  return pass({ registry, provider });
}
