import path from 'node:path';
import { createDispatchDescriptor, validateAdapterInput } from './provider-contract.mjs';

export const MANUAL_RIFF_PROVIDER_ID = 'manual-riff';

function fail(errors) {
  return { ok: false, errors: [...new Set(errors)] };
}

export function createManualRiffDescriptor(input) {
  const inputResult = validateAdapterInput(input, {
    providerId: MANUAL_RIFF_PROVIDER_ID,
    allowedKeys: ['packet', 'room', 'artifactPath', 'artifactBody', 'canonicalAuthority'],
    requiredKeys: ['packet', 'room', 'artifactPath']
  });
  if (!inputResult.ok) return inputResult;
  const errors = [];
  if (typeof input.room !== 'string' || !/^[a-z0-9][a-z0-9._:-]*$/i.test(input.room)) errors.push('manual_riff.room:invalid');
  if (typeof input.artifactPath !== 'string' || !path.isAbsolute(input.artifactPath)) errors.push('manual_riff.artifact_path:must_be_absolute');
  if (input.artifactBody !== undefined) errors.push('manual_riff.artifact_body:forbidden');
  if (input.canonicalAuthority !== undefined && input.canonicalAuthority !== false) errors.push('manual_riff.canonical_authority:forbidden');
  if (errors.length) return fail(errors);
  return createDispatchDescriptor({
    providerId: MANUAL_RIFF_PROVIDER_ID,
    packet: input.packet,
    target: 'riff.publish_pointer',
    arguments: [
      '--room', input.room,
      '--task', input.packet.taskId,
      '--artifact-path', input.artifactPath,
      '--brief-path', input.packet.briefPath,
      '--pointer-only'
    ]
  });
}

export const manualRiffProvider = Object.freeze({
  providerId: MANUAL_RIFF_PROVIDER_ID,
  createDescriptor: createManualRiffDescriptor
});
