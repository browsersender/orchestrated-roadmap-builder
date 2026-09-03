#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createBarCatalog } from '../lib/roadmap-compiler.mjs';
import { semanticHash, validateCampaign } from '../lib/roadmap-graph.mjs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function atomicWrite(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, file);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function currentCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unavailable';
  }
}

export function deriveRoadmapStatus(campaign, executionState, options = {}) {
  const validation = validateCampaign(campaign);
  if (!validation.ok) throw new Error(validation.errors.join(';'));
  if (executionState.campaignId !== campaign.campaignId) throw new Error('state:campaign_mismatch');
  if (executionState.campaignHash !== semanticHash(campaign)) throw new Error('state:campaign_hash_mismatch');

  const barCatalog = createBarCatalog(campaign);
  const roadmaps = campaign.roadmaps.map((roadmap) => {
    const state = executionState.roadmaps[roadmap.id];
    if (!state) throw new Error(`state:missing_roadmap:${roadmap.id}`);
    const phases = roadmap.phases.map((phase) => {
      const phaseState = state.phases[phase.id];
      if (!phaseState) throw new Error(`state:missing_phase:${phase.id}`);
      return {
        ...phase,
        status: phaseState.status,
        evidenceCount: phaseState.evidence?.length ?? 0
      };
    });
    return {
      id: roadmap.id,
      title: roadmap.title,
      outcome: roadmap.outcome,
      dependsOn: roadmap.dependsOn,
      executionMode: roadmap.executionMode,
      status: state.status,
      phaseCounts: phases.reduce((counts, phase) => {
        counts[phase.status] = (counts[phase.status] ?? 0) + 1;
        return counts;
      }, {}),
      phases
    };
  });

  const allPhases = roadmaps.flatMap((roadmap) => roadmap.phases);
  const phaseCounts = allPhases.reduce((counts, phase) => {
    counts[phase.status] = (counts[phase.status] ?? 0) + 1;
    return counts;
  }, {});
  const roadmapCounts = roadmaps.reduce((counts, roadmap) => {
    counts[roadmap.status] = (counts[roadmap.status] ?? 0) + 1;
    return counts;
  }, {});
  const verifiedEvidence = allPhases
    .filter((phase) => phase.status === 'verified')
    .reduce((count, phase) => count + phase.evidenceCount, 0);

  return {
    schemaVersion: 1,
    campaignId: campaign.campaignId,
    title: campaign.title,
    northStar: campaign.northStar,
    authority: options.authority ?? 'staged-self-hosting-evidence',
    snapshotAt: options.snapshotAt ?? new Date().toISOString(),
    gitCommit: options.gitCommit ?? currentCommit(campaign.workspaceRoot),
    campaignSource: options.campaignSource ?? 'campaign.json',
    executionStateSource: options.executionStateSource ?? 'execution-state.json',
    manifestIdentity: `${campaign.campaignId}@${campaign.sourceRevision}`,
    validatorIdentity: '_CONTROL/agent-orchestration/lib/roadmap-graph.mjs',
    campaignHash: semanticHash(campaign),
    gateCatalogHash: barCatalog.semanticHash,
    evidenceMaturity: {
      verifiedPhases: phaseCounts.verified ?? 0,
      totalPhases: allPhases.length,
      verifiedEvidenceRecords: verifiedEvidence,
      boundary: 'Committed implementation and focused checks qualify phases; planning files alone never do.'
    },
    roadmapCounts,
    phaseCounts,
    roadmaps
  };
}

export function renderDashboard(status) {
  const roadmapRows = status.roadmaps.map((roadmap) => {
    const dependencies = roadmap.dependsOn.length ? roadmap.dependsOn.join(', ') : 'Bootstrap';
    const phaseSummary = Object.entries(roadmap.phaseCounts).map(([key, value]) => `${value} ${key}`).join(', ');
    return `<tr><td><strong>${escapeHtml(roadmap.id)}</strong><span>${escapeHtml(roadmap.title)}</span></td><td><span class="state state-${escapeHtml(roadmap.status)}">${escapeHtml(roadmap.status)}</span></td><td>${escapeHtml(phaseSummary)}</td><td>${escapeHtml(dependencies)}</td><td>${escapeHtml(roadmap.executionMode)}</td></tr>`;
  }).join('');
  const roadmapDetails = status.roadmaps.map((roadmap) => `
    <section class="roadmap" id="${escapeHtml(roadmap.id)}">
      <header><div><span class="roadmap-id">${escapeHtml(roadmap.id)}</span><h2>${escapeHtml(roadmap.title)}</h2></div><span class="state state-${escapeHtml(roadmap.status)}">${escapeHtml(roadmap.status)}</span></header>
      <p>${escapeHtml(roadmap.outcome)}</p>
      <div class="phase-grid">${roadmap.phases.map((phase) => `<article><div><strong>${escapeHtml(phase.id)}</strong><span class="state state-${escapeHtml(phase.status)}">${escapeHtml(phase.status)}</span></div><h3>${escapeHtml(phase.title)}</h3><dl><dt>MUST FIRE</dt><dd>${escapeHtml(phase.mustFire)}</dd><dt>MUST STAY SILENT</dt><dd>${escapeHtml(phase.mustStaySilent)}</dd><dt>Evidence</dt><dd>${phase.evidenceCount} record${phase.evidenceCount === 1 ? '' : 's'}</dd></dl></article>`).join('')}</div>
    </section>`).join('');
  const verified = status.evidenceMaturity.verifiedPhases;
  const total = status.evidenceMaturity.totalPhases;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(status.title)}</title>
<style>
:root{color-scheme:light;--ink:#18212b;--muted:#5f6b76;--line:#c8d0d8;--paper:#f6f8fa;--surface:#fff;--blue:#1769aa;--green:#197345;--amber:#a65d00;--red:#a53030;--gray:#66717d}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:0}main{max-width:1440px;margin:auto;padding:24px}header.top{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;border-bottom:3px solid var(--ink);padding-bottom:18px}h1{font-size:30px;line-height:1.15;margin:2px 0 8px}h2{font-size:19px;margin:0}h3{font-size:14px;margin:9px 0}.eyebrow,.roadmap-id{font-size:12px;font-weight:750;text-transform:uppercase;color:var(--blue)}.lede{max-width:850px;color:var(--muted);margin:0}.snapshot{min-width:270px;font-size:12px}.snapshot div{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding:3px 0}.snapshot strong{text-align:right;overflow-wrap:anywhere}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.metric{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:14px}.metric strong{display:block;font-size:25px}.metric span{color:var(--muted)}.truth{border-left:5px solid var(--amber);background:#fff9ec;padding:12px 14px;margin:16px 0}.table-wrap{overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:6px}table{border-collapse:collapse;width:100%;min-width:800px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{background:#e9eef2;font-size:12px;text-transform:uppercase}td span{display:block;color:var(--muted)}.state{display:inline-block!important;color:white!important;font-size:11px;font-weight:750;text-transform:uppercase;padding:2px 6px;border-radius:4px;white-space:nowrap}.state-verified{background:var(--green)}.state-ready,.state-review,.state-integrated{background:var(--blue)}.state-leased,.state-running{background:var(--amber)}.state-failed,.state-expired,.state-blocked{background:var(--red)}.state-not_started{background:var(--gray)}.roadmap{padding:22px 0;border-bottom:2px solid var(--line)}.roadmap>header{display:flex;justify-content:space-between;gap:18px}.roadmap>p{max-width:950px;color:var(--muted)}.phase-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.phase-grid article{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px;min-width:0}.phase-grid article>div{display:flex;justify-content:space-between;gap:8px}dl{margin:0}dt{font-size:10px;font-weight:800;color:var(--muted);margin-top:8px}dd{margin:1px 0;overflow-wrap:anywhere}footer{padding:18px 0;color:var(--muted);font-size:12px}@media(max-width:900px){header.top{display:block}.snapshot{margin-top:16px}.metrics{grid-template-columns:repeat(2,1fr)}.phase-grid{grid-template-columns:1fr}}@media(max-width:520px){main{padding:14px}.metrics{grid-template-columns:1fr}h1{font-size:25px}}
</style></head><body><main>
<header class="top"><div><div class="eyebrow">Staged execution control</div><h1>${escapeHtml(status.title)}</h1><p class="lede">${escapeHtml(status.northStar)}</p></div><div class="snapshot"><div><span>Snapshot</span><strong>${escapeHtml(status.snapshotAt)}</strong></div><div><span>Commit</span><strong>${escapeHtml(status.gitCommit)}</strong></div><div><span>Authority</span><strong>${escapeHtml(status.authority)}</strong></div><div><span>Gate catalog</span><strong>${escapeHtml(status.gateCatalogHash.slice(0,16))}</strong></div></div></header>
<section class="metrics"><div class="metric"><strong>${verified}/${total}</strong><span>Verified phases</span></div><div class="metric"><strong>${status.roadmapCounts.verified ?? 0}/${status.roadmaps.length}</strong><span>Verified roadmaps</span></div><div class="metric"><strong>${status.evidenceMaturity.verifiedEvidenceRecords}</strong><span>Evidence records</span></div><div class="metric"><strong>${Object.keys(status.phaseCounts).length}</strong><span>Visible execution states</span></div></section>
<aside class="truth"><strong>Truth boundary:</strong> ${escapeHtml(status.evidenceMaturity.boundary)} Sources: ${escapeHtml(status.campaignSource)} and ${escapeHtml(status.executionStateSource)}. Manifest: ${escapeHtml(status.manifestIdentity)}. Validator: ${escapeHtml(status.validatorIdentity)}.</aside>
<section><div class="eyebrow">Campaign order</div><h2>Roadmaps and dependencies</h2><div class="table-wrap"><table><thead><tr><th>Roadmap</th><th>Status</th><th>Phases</th><th>Depends on</th><th>Owner mode</th></tr></thead><tbody>${roadmapRows}</tbody></table></div></section>
${roadmapDetails}
<footer>Campaign hash ${escapeHtml(status.campaignHash)}. Gate catalog ${escapeHtml(status.gateCatalogHash)}. This dashboard reports evidence and does not grant acceptance, promotion, or canonical authority.</footer>
</main></body></html>`;
}

export function writeDashboard(campaignFile, stateFile, outputRoot, options = {}) {
  const campaignPath = path.resolve(campaignFile);
  const statePath = path.resolve(stateFile);
  const campaign = readJson(campaignPath);
  const state = readJson(statePath);
  const status = deriveRoadmapStatus(campaign, state, {
    ...options,
    campaignSource: campaignPath,
    executionStateSource: statePath
  });
  const statusPath = path.resolve(outputRoot, 'roadmap-status.json');
  const dashboardPath = path.resolve(outputRoot, 'index.html');
  atomicWrite(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  atomicWrite(dashboardPath, renderDashboard(status));
  return { ok: true, statusPath, dashboardPath, phaseCounts: status.phaseCounts, roadmapCounts: status.roadmapCounts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))) {
  const [campaignFile, stateFile, outputRoot] = process.argv.slice(2);
  if (!campaignFile || !stateFile || !outputRoot) {
    process.stderr.write('usage: generate-orchestration-dashboard <campaign.json> <execution-state.json> <output-root>\n');
    process.exitCode = 1;
  } else {
    try {
      process.stdout.write(`${JSON.stringify(writeDashboard(campaignFile, stateFile, outputRoot), null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
