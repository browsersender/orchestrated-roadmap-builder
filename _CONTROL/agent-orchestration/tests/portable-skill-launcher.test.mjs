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

test('portable skill launcher survives provider stderr chatter and fails only on a non-zero exit', () => {
  const value = fixture();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sola-orchestrated-runs-'));
  try {
    // Windows PowerShell 5.1 wraps redirected native stderr in ErrorRecords; the launcher must not die on them.
    fs.writeFileSync(path.join(value.bin, 'codex.cmd'), '@echo 2026-09-03T00:00:00Z ERROR fake_provider: stderr noise 1>&2\r\n@exit /b 0\r\n');
    const chatty = run('codex', value.packet, value.bin, ['-Execute', '-OutputRoot', path.join(out, 'chatty')]);
    assert.equal(chatty.status, 0, `${chatty.stdout}\n${chatty.stderr}`);
    const result = JSON.parse(chatty.stdout.slice(chatty.stdout.lastIndexOf('{')));
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'codex');
    assert.equal(fs.existsSync(path.join(out, 'chatty', 'transcript.jsonl')), true);
    assert.equal(fs.existsSync(path.join(out, 'chatty', 'launch.json')), true);
    assert.match(fs.readFileSync(path.join(out, 'chatty', 'transcript.jsonl'), 'utf8'), /stderr noise/);

    fs.writeFileSync(path.join(value.bin, 'codex.cmd'), '@echo fatal 1>&2\r\n@exit /b 3\r\n');
    const failing = run('codex', value.packet, value.bin, ['-Execute', '-OutputRoot', path.join(out, 'failing')]);
    assert.notEqual(failing.status, 0);
    assert.match(`${failing.stdout}\n${failing.stderr}`, /provider_failed:codex:exit_3/);
  } finally {
    fs.rmSync(value.root, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
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
