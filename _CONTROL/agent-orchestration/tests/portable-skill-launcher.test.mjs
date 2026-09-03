import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const sourceRoot = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const launcher = path.join(sourceRoot, 'skills', 'orchestrated-roadmap-builder', 'scripts', 'Invoke-OrchestratedWorker.ps1');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sola-orchestrated-launcher-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'codex.cmd'), '@exit /b 0\r\n');
  fs.writeFileSync(path.join(bin, 'claude.cmd'), '@exit /b 0\r\n');
  spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
  spawnSync('git', ['-C', root, 'config', 'user.email', 'test@example.invalid'], { encoding: 'utf8' });
  spawnSync('git', ['-C', root, 'config', 'user.name', 'Test'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(root, 'source.txt'), 'source\n');
  spawnSync('git', ['-C', root, 'add', 'source.txt'], { encoding: 'utf8' });
  spawnSync('git', ['-C', root, 'commit', '-q', '-m', 'fixture'], { encoding: 'utf8' });
  const revision = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const brief = path.join(root, 'brief.md');
  fs.writeFileSync(brief, '# Fixture\n');
  const packet = path.join(root, 'packet.json');
  fs.writeFileSync(packet, `${JSON.stringify({
    schemaVersion: 2,
    taskId: 'campaign:R01',
    campaignId: 'campaign',
    roadmapId: 'R01',
    sourceRevision: revision,
    briefPath: brief,
    constraints: { forkContext: false, childWorkersAllowed: false },
    target: { host: 'local', root },
    packetHash: 'a'.repeat(64)
  }, null, 2)}\n`);
  return { root, bin, packet };
}

function run(provider, packet, bin, extra = []) {
  return spawnSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', launcher,
    '-Provider', provider, '-PacketPath', packet, ...extra
  ], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin};${process.env.PATH}` }
  });
}

test('portable skill launcher dry-runs Codex and Claude from the same packet', () => {
  const value = fixture();
  try {
    for (const provider of ['codex', 'claude']) {
      const result = run(provider, value.packet, value.bin);
      assert.equal(result.status, 0, result.stderr);
      const descriptor = JSON.parse(result.stdout);
      assert.equal(descriptor.ready, true);
      assert.equal(descriptor.execute, false);
      assert.equal(descriptor.provider, provider);
      assert.equal(descriptor.taskId, 'campaign:R01');
      assert.equal(descriptor.outputDirectory.slice(2).includes(':'), false);
    }
  } finally {
    fs.rmSync(value.root, { recursive: true, force: true });
  }
});

test('portable skill launcher refuses a packet and workspace mismatch', () => {
  const value = fixture();
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'sola-orchestrated-other-'));
  try {
    const result = run('codex', value.packet, value.bin, ['-WorkspacePath', other]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /workspace_mismatch/);
  } finally {
    fs.rmSync(value.root, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  }
});
