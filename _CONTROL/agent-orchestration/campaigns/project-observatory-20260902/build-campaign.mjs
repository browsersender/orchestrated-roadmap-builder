import fs from 'node:fs';
import path from 'node:path';

const [outputRoot, workspaceRoot, sourceRevision] = process.argv.slice(2);
if (!outputRoot || !workspaceRoot || !sourceRevision) {
  throw new Error('usage: node generator.mjs <output-root> <workspace-root> <source-revision>');
}

const phase = (id, title, mustFire, mustStaySilent, type = 'AFK') => ({ id, title, type, mustFire, mustStaySilent });
const root = '_CONTROL/agent-orchestration';
const campaignRoot = `${root}/campaigns/project-observatory-20260902`;
const commonTarget = {
  host: 'Warehouse command plane',
  root: workspaceRoot,
  portabilityRule: 'Collectors run independently of browser visibility; Repository custody remains on Lab at R:\\Repository-v3 and remote access uses authenticated SSH or approved tunnels.'
};
const prohibited = ['products/**', 'R:/Repository-v3/**', '**/.env', '**/*credential*', '**/*private-key*'];
const roadmap = (id, title, outcome, dependsOn, inputs, ownedOutputs, acceptance, phases, profile = {}) => ({
  id,
  title,
  outcome,
  dependsOn,
  executionMode: profile.executionMode ?? 'worker',
  taskProfile: {
    ambiguity: profile.ambiguity ?? 'medium',
    blastRadius: profile.blastRadius ?? 'medium',
    crossProduct: profile.crossProduct ?? true,
    behaviorChange: profile.behaviorChange ?? true,
    mechanicalAcceptance: profile.mechanicalAcceptance ?? true,
    authorityRequired: profile.authorityRequired ?? false,
    filesExpected: profile.filesExpected ?? 8
  },
  inputs,
  ownedOutputs,
  prohibitedPaths: prohibited,
  acceptance: {
    mustFire: acceptance[0],
    mustStaySilent: acceptance[1],
    checks: acceptance.slice(2)
  },
  evidencePolicy: {
    reuse: ['ORB-R00 through ORB-R07 committed qualification evidence', 'Current provider descriptors, lease state machine, and evidence contracts'],
    rerunWhen: ['The roadmap-owned event, adapter, persistence, service, dashboard, transport, or redaction behavior changes']
  },
  target: commonTarget,
  phases
});

const roadmaps = [
  roadmap('OBS-R00', 'Observatory Constitution and Truth Boundary',
    'Freeze observability ownership, event vocabulary, source precedence, authority limits, and the relationship to the completed ORB campaign and drafted ORX extensions.', [],
    [`${root}/README.md`, `${root}/campaigns/orchestrated-roadmap-builder-20260902/ROADMAP-SET.md`, `${campaignRoot}/ROADMAP-SET.md`],
    [`${campaignRoot}/OWNER-TREATY.md`, `${campaignRoot}/SOURCE-PRECEDENCE.md`, `${campaignRoot}/SUPERSESSION-LEDGER.md`, `${campaignRoot}/PROVENANCE-LEDGER.md`],
    ['A view that grants acceptance, exposes hidden reasoning, or treats Riff as canon is refused.', 'A source-linked event view reports activity without gaining product or Repository authority.', 'Owner treaty names every authority boundary.', 'The completed ORB campaign remains unchanged.'], [
      phase('OBS-R00-P01', 'Freeze north star and operator questions', 'An undefined viewer or operator question refuses scope freeze.', 'The intended watch, inspect, replay, and handoff workflows are explicit.'),
      phase('OBS-R00-P02', 'Declare source precedence', 'A dashboard-only claim refuses truth status.', 'Events link to durable state, Git, checks, or receipts.'),
      phase('OBS-R00-P03', 'Freeze owner and authority treaty', 'Any observer able to self-accept or self-promote refuses.', 'Operator, orchestrator, worker, product, Riff, and Repository roles are bounded.'),
      phase('OBS-R00-P04', 'Define event vocabulary', 'Unknown or overloaded event kinds refuse ingestion.', 'Lifecycle, message, tool, file, check, commit, block, and completion events are distinct.'),
      phase('OBS-R00-P05', 'Separate transcript from hidden reasoning', 'A request to capture private chain-of-thought refuses.', 'Only emitted messages, tool metadata, and durable artifacts are represented.'),
      phase('OBS-R00-P06', 'Freeze campaign provenance', 'Missing source revision or gate catalog refuses dispatch.', 'Twelve roadmaps and seventy-two two-sided phase gates are hashed and readable.')
    ], { executionMode: 'coordinator', ambiguity: 'high', behaviorChange: false, filesExpected: 6 }),

  roadmap('OBS-R01', 'Canonical Event and Causal Identity ABI',
    'Create the provider-neutral event envelope, run identity, causal links, artifact references, clocks, sequence rules, and compatibility contract.', ['OBS-R00'],
    [`${root}/schemas/orchestration-campaign.schema.json`, `${root}/lib/execution-state.mjs`, `${campaignRoot}/OWNER-TREATY.md`],
    [`${root}/schemas/observatory-event.schema.json`, `${root}/schemas/observatory-run.schema.json`, `${root}/lib/observatory/event-identity.mjs`, `${root}/tests/observatory-event.test.mjs`],
    ['Malformed, duplicate, causally impossible, or secret-shaped events are refused.', 'Equivalent provider events normalize to stable identities without losing provenance.', 'Schema and identity tests pass.', 'Unknown fields survive versioned compatibility rules or refuse explicitly.'], [
      phase('OBS-R01-P01', 'Define run and worker identity', 'Missing campaign, roadmap, worker, provider, host, or source identity refuses.', 'A complete run identity serializes deterministically.'),
      phase('OBS-R01-P02', 'Define canonical event envelope', 'Missing kind, clock, sequence, actor, or payload identity refuses.', 'Valid events round-trip without semantic drift.'),
      phase('OBS-R01-P03', 'Bind causal parentage', 'Cycles and impossible parent references refuse.', 'Message, tool, artifact, check, and lifecycle chains remain traversable.'),
      phase('OBS-R01-P04', 'Bind artifact and Git pointers', 'Copied bodies or unverifiable mutable pointers refuse durable status.', 'Paths, hashes, commits, and Riff pointers remain references.'),
      phase('OBS-R01-P05', 'Version compatibility rules', 'A breaking producer version cannot silently ingest.', 'Compatible prior events migrate deterministically.'),
      phase('OBS-R01-P06', 'Seal event identity fixtures', 'Fixture mutation without identity change fails.', 'Cross-provider equivalent fixtures preserve distinct provenance and stable normalized meaning.')
    ]),

  roadmap('OBS-R02', 'Codex JSONL Live Adapter',
    'Translate Codex CLI JSONL into canonical Observatory events with backpressure, interruption recovery, and no dependency on a visible browser.', ['OBS-R01'],
    [`${root}/lib/providers/codex.mjs`, `${root}/scripts/Invoke-OrchestratedWorker.ps1`, `${root}/schemas/observatory-event.schema.json`],
    [`${root}/lib/observatory/adapters/codex-jsonl.mjs`, `${root}/scripts/observe-codex-run.mjs`, `${root}/tests/observatory-codex-adapter.test.mjs`, `${root}/fixtures/observatory/codex/`],
    ['Malformed JSONL, sequence regression, secret material, or unbound run identity refuses or quarantines.', 'A real bounded Codex run streams normalized lifecycle, message, tool, file, and completion events.', 'Adapter fixtures cover interruption and resume.', 'No chain-of-thought field is invented or inferred.'], [
      phase('OBS-R02-P01', 'Capture Codex stream contract', 'Unsupported or ambiguous record kinds refuse mapping.', 'Known emitted JSONL records have explicit mappings.'),
      phase('OBS-R02-P02', 'Normalize lifecycle and messages', 'Missing run binding refuses emission.', 'Started, message, and completed events retain provider provenance.'),
      phase('OBS-R02-P03', 'Normalize tools and file effects', 'Unlinked tool results refuse causal completion.', 'Tool calls, outputs, and file changes remain causally joined.'),
      phase('OBS-R02-P04', 'Handle backpressure and partial lines', 'Truncated records cannot masquerade as complete.', 'Chunked streams resume without duplicate events.'),
      phase('OBS-R02-P05', 'Recover interrupted Codex runs', 'A restarted observer cannot reuse a stale sequence silently.', 'Resume continues from the durable cursor.'),
      phase('OBS-R02-P06', 'Prove real bounded Codex capture', 'Fixture-only success cannot qualify the adapter.', 'One current run emits source-linked canonical events end to end.')
    ]),

  roadmap('OBS-R03', 'Claude Stream JSON Live Adapter',
    'Translate Claude CLI stream-json into the same event ABI while preserving Claude-specific provenance, refusal behavior, and process termination truth.', ['OBS-R01'],
    [`${root}/lib/providers/claude.mjs`, `${root}/scripts/Invoke-OrchestratedWorker.ps1`, `${root}/schemas/observatory-event.schema.json`],
    [`${root}/lib/observatory/adapters/claude-stream-json.mjs`, `${root}/scripts/observe-claude-run.mjs`, `${root}/tests/observatory-claude-adapter.test.mjs`, `${root}/fixtures/observatory/claude/`],
    ['Malformed stream JSON, false process completion, secret material, or unbound identity refuses or quarantines.', 'A real bounded Claude run produces the same canonical event classes with provider-specific evidence intact.', 'Process exit and final message remain separate facts.', 'Adapter parity does not erase provider differences.'], [
      phase('OBS-R03-P01', 'Capture Claude stream contract', 'Unsupported stream records refuse mapping.', 'Known records have explicit normalized meanings.'),
      phase('OBS-R03-P02', 'Normalize lifecycle and messages', 'A final message without process truth cannot close a run.', 'Message and lifecycle facts remain separate and linked.'),
      phase('OBS-R03-P03', 'Normalize tools and artifacts', 'Tool output without call identity refuses.', 'Tool and artifact pointers retain causality.'),
      phase('OBS-R03-P04', 'Handle process exit and timeout', 'Hung or killed processes cannot report success.', 'Exit, timeout, cancel, and completion are typed.'),
      phase('OBS-R03-P05', 'Recover interrupted Claude runs', 'Restart cannot duplicate accepted events.', 'Durable cursors make resume idempotent.'),
      phase('OBS-R03-P06', 'Prove real bounded Claude capture', 'Fixture-only success cannot qualify the adapter.', 'One current run emits canonical events end to end.')
    ]),

  roadmap('OBS-R04', 'Append-Only Journal, Replay, and Recovery',
    'Persist canonical events in an append-only journal with indexes, cursors, integrity checks, compaction snapshots, and deterministic replay.', ['OBS-R01'],
    [`${root}/lib/execution-state.mjs`, `${root}/schemas/observatory-event.schema.json`],
    [`${root}/lib/observatory/event-journal.mjs`, `${root}/lib/observatory/replay.mjs`, `${root}/schemas/observatory-snapshot.schema.json`, `${root}/tests/observatory-journal.test.mjs`],
    ['Tamper, torn writes, duplicate sequence, or invalid snapshot lineage refuses recovery.', 'A killed collector restarts and reconstructs identical visible state from journal plus snapshot.', 'Journal is append-only and content-addressed.', 'Compaction never deletes authoritative receipts.'], [
      phase('OBS-R04-P01', 'Build atomic append journal', 'Torn or concurrent invalid writes refuse.', 'Ordered events append durably.'),
      phase('OBS-R04-P02', 'Build run and artifact indexes', 'Index divergence is detected.', 'Run, roadmap, worker, event-kind, and artifact queries resolve.'),
      phase('OBS-R04-P03', 'Persist consumer cursors', 'Cursor regression or foreign journal identity refuses.', 'Consumers resume at the next unconsumed event.'),
      phase('OBS-R04-P04', 'Create immutable snapshots', 'Snapshot without journal range and hash refuses.', 'Snapshot recreates the same derived state.'),
      phase('OBS-R04-P05', 'Recover crash and partial write', 'Corrupt tail cannot enter replay.', 'Valid prefix recovers with a typed tail refusal.'),
      phase('OBS-R04-P06', 'Prove deterministic replay', 'Two replays producing divergent state fail.', 'Cold and snapshot-assisted replay match exactly.')
    ]),

  roadmap('OBS-R05', 'Orchestrator, Git, and Riff Hooks',
    'Emit Observatory events from orchestration transitions, Git milestones, and Riff artifact publication without allowing any hook to mutate acceptance truth.', ['OBS-R01', 'OBS-R04'],
    [`${root}/lib/execution-state.mjs`, `${root}/scripts/riff-artifact.js`, `${root}/lib/observatory/event-journal.mjs`],
    [`${root}/lib/observatory/orchestration-hooks.mjs`, `${root}/lib/observatory/git-hooks.mjs`, `${root}/lib/observatory/riff-hooks.mjs`, `${root}/tests/observatory-hooks.test.mjs`],
    ['A hook that alters lifecycle truth, blocks a commit on dashboard availability, or treats Riff as canon refuses installation.', 'Ready, leased, running, reviewing, integrating, verified, commit, and pointer events mirror durable transitions.', 'Hook failures degrade observability explicitly without corrupting work.', 'One root Riff pointer remains threaded across revisions.'], [
      phase('OBS-R05-P01', 'Instrument orchestration transitions', 'An event preceding its durable state transition refuses.', 'Committed transitions emit linked events.'),
      phase('OBS-R05-P02', 'Instrument work packet and lease events', 'Unleased ownership cannot report running.', 'Packet, lease, renewal, and expiry appear.'),
      phase('OBS-R05-P03', 'Instrument Git milestones', 'Dirty state cannot masquerade as a commit.', 'Branch, commit, and changed-path metadata are source-linked.'),
      phase('OBS-R05-P04', 'Instrument checks and evidence intake', 'A check result cannot grant acceptance by itself.', 'Check and evidence events cite their governing gate.'),
      phase('OBS-R05-P05', 'Instrument Riff publication', 'Copied artifact bodies or duplicate roots refuse.', 'One compact pointer event links the Riff thread.'),
      phase('OBS-R05-P06', 'Prove hook failure isolation', 'Observability failure that corrupts worker execution fails qualification.', 'Work continues with an explicit observability-degraded receipt.')
    ]),

  roadmap('OBS-R06', 'Live Query API and Event Stream',
    'Serve replayable state and live events through a local API and SSE stream with bounded clients, cursor resume, health, and graceful shutdown.', ['OBS-R02', 'OBS-R03', 'OBS-R04', 'OBS-R05'],
    [`${root}/lib/observatory/event-journal.mjs`, `${root}/lib/observatory/replay.mjs`],
    [`${root}/lib/observatory/server.mjs`, `${root}/scripts/start-project-observatory.mjs`, `${root}/tests/observatory-server.test.mjs`, `${root}/references/project-observatory-api.md`],
    ['Unauthorized remote binding, unbounded clients, stale cursor lies, or event loss refuses service readiness.', 'Local REST replay and SSE live updates produce continuous ordered state while the browser may be closed.', 'Health reports journal and adapter state.', 'Shutdown flushes cursors and journal state.'], [
      phase('OBS-R06-P01', 'Build health and run query API', 'Health cannot report ready over an unreadable journal.', 'Runs and service dependencies are queryable.'),
      phase('OBS-R06-P02', 'Build replay endpoints', 'Invalid ranges and foreign cursors refuse.', 'Bounded history pages preserve event order.'),
      phase('OBS-R06-P03', 'Build SSE live stream', 'Slow clients cannot exhaust the service.', 'Clients receive ordered live events with keepalive.'),
      phase('OBS-R06-P04', 'Support cursor resume', 'Expired or incompatible cursors refuse explicitly.', 'Reconnect resumes without gaps or duplicates.'),
      phase('OBS-R06-P05', 'Add lifecycle and graceful shutdown', 'Unflushed shutdown cannot claim clean exit.', 'Start, stop, and restart preserve visible state.'),
      phase('OBS-R06-P06', 'Prove browser-independent collection', 'Closing all browsers cannot stop collectors.', 'Events accumulate and replay after a browser-free interval.')
    ]),

  roadmap('OBS-R07', 'Visible Project Observatory Dashboard',
    'Build the operator-facing browser application for campaign lanes, workers, transcripts, tools, artifacts, checks, Git, dependencies, and exact next actions.', ['OBS-R06'],
    [`${root}/references/project-observatory-api.md`, `${campaignRoot}/ROADMAP-SET.md`],
    [`${root}/observatory/index.html`, `${root}/observatory/app.js`, `${root}/observatory/styles.css`, `${root}/tests/observatory-ui.test.mjs`],
    ['Stale, unsourced, overlapping, inaccessible, or authority-confusing UI fails qualification.', 'Desktop and narrow views update live, expose source time and maturity, and clearly separate activity from acceptance.', 'No nested-card dashboard or decorative marketing layout.', 'Long paths and messages remain readable.'], [
      phase('OBS-R07-P01', 'Build campaign and worker board', 'Counts diverging from API state are visible as an error.', 'Lane and worker states update without layout shift.'),
      phase('OBS-R07-P02', 'Build transcript and tool timeline', 'Hidden reasoning or secret payloads cannot render.', 'Emitted messages and tool metadata remain source-linked.'),
      phase('OBS-R07-P03', 'Build dependency and ownership view', 'Unowned or colliding work is highlighted.', 'Dependencies, leases, and owners are scan-friendly.'),
      phase('OBS-R07-P04', 'Build artifact, check, and Git view', 'Uncommitted evidence cannot look canonical.', 'Artifacts, checks, commits, and maturity are distinct.'),
      phase('OBS-R07-P05', 'Build operator actions', 'UI controls cannot bypass orchestrator validation.', 'Pause, cancel, retry, and open-artifact actions issue typed requests.'),
      phase('OBS-R07-P06', 'Prove responsive live operation', 'Blank, overlapping, stale, or disconnected views fail.', 'Desktop and mobile screenshots plus interaction checks pass.')
    ], { filesExpected: 10 }),

  roadmap('OBS-R08', 'Headless Monitoring and Visual Receipts',
    'Run browser checks headlessly for availability, rendering, stale-state detection, screenshots, and regressions while keeping collection independent of Playwright.', ['OBS-R06', 'OBS-R07'],
    [`${root}/observatory/index.html`, `${root}/scripts/start-project-observatory.mjs`],
    [`${root}/scripts/observe-project-headless.mjs`, `${root}/tests/observatory-visual.test.mjs`, `${root}/references/headless-observatory.md`],
    ['Headless checks that become the event source or hide service failure refuse.', 'A headless session verifies live state, captures source-linked screenshots, and exits without affecting workers.', 'Pixel and DOM checks detect blank output.', 'Visual receipts cite source revision and snapshot time.'], [
      phase('OBS-R08-P01', 'Create headless launch profile', 'A profile without explicit URL, timeout, and output root refuses.', 'Headless browser starts reproducibly.'),
      phase('OBS-R08-P02', 'Check service and freshness', 'Stale timestamps or disconnected SSE fail.', 'Live health and recent events are visible.'),
      phase('OBS-R08-P03', 'Check desktop rendering', 'Blank canvas, overlap, or clipped controls fail.', 'Desktop viewport remains readable.'),
      phase('OBS-R08-P04', 'Check narrow rendering', 'Overflow or unusable controls fail.', 'Narrow viewport remains usable.'),
      phase('OBS-R08-P05', 'Capture visual receipts', 'Screenshot without lineage refuses proof status.', 'Image receipt binds URL, commit, viewport, and time.'),
      phase('OBS-R08-P06', 'Prove browser shutdown isolation', 'Stopping Playwright cannot stop event intake.', 'Collectors and workers continue after headless exit.')
    ]),

  roadmap('OBS-R09', 'Multi-Machine Observatory Federation',
    'Aggregate Lab, Warehouse, Browser Sender, VPS, and future-node events under one campaign identity through authenticated transport and offline capsules.', ['OBS-R04', 'OBS-R06'],
    [`${root}/lib/observatory/event-journal.mjs`, `${root}/lib/observatory/server.mjs`, `${campaignRoot}/OWNER-TREATY.md`],
    [`${root}/lib/observatory/federation.mjs`, `${root}/schemas/observatory-node.schema.json`, `${root}/scripts/observatory-node-agent.mjs`, `${root}/tests/observatory-federation.test.mjs`],
    ['Unauthenticated nodes, host identity substitution, duplicate clocks, or assumed Warehouse R: access refuse.', 'Authenticated nodes stream or later reconcile events without changing Repository custody.', 'Offline capsules are content-addressed and idempotent.', 'Peer loss produces a typed gap rather than invented continuity.'], [
      phase('OBS-R09-P01', 'Define node identity and capability', 'Unknown host or mismatched key identity refuses.', 'Declared nodes advertise bounded capabilities.'),
      phase('OBS-R09-P02', 'Build authenticated event transport', 'Plain unauthenticated remote ingestion refuses.', 'Approved SSH tunnel or authenticated channel transports events.'),
      phase('OBS-R09-P03', 'Build offline event capsules', 'Mutable or unsigned capsule lineage refuses.', 'Disconnected nodes can ship content-addressed batches.'),
      phase('OBS-R09-P04', 'Reconcile clocks and duplicates', 'Conflicting sequence ownership refuses merge.', 'Duplicate delivery is idempotent and wall-clock skew is explicit.'),
      phase('OBS-R09-P05', 'Recover peer loss', 'Missing intervals cannot appear continuous.', 'Loss and recovery are visible with exact gaps.'),
      phase('OBS-R09-P06', 'Prove three-node campaign view', 'Machine-local absence is not reported as global absence.', 'Warehouse view joins Lab and Browser Sender evidence under one campaign.')
    ], { ambiguity: 'high', blastRadius: 'high', filesExpected: 10 }),

  roadmap('OBS-R10', 'Privacy, Redaction, and Operator Security',
    'Prevent credentials, private keys, cookies, hidden reasoning, unsafe command bodies, and sensitive live-account data from entering journals, APIs, screenshots, or Riff pointers.', ['OBS-R01', 'OBS-R06', 'OBS-R09'],
    [`${root}/schemas/observatory-event.schema.json`, `${root}/lib/observatory/server.mjs`],
    [`${root}/lib/observatory/redaction.mjs`, `${root}/lib/observatory/access-policy.mjs`, `${root}/tests/observatory-security.test.mjs`, `${root}/references/observatory-security.md`],
    ['Credential-shaped fixtures, path traversal, unauthorized bind, or raw private reasoning are refused before persistence.', 'Benign operational data remains useful after deterministic redaction and least-privilege access.', 'Redaction occurs before journal append.', 'Screenshots and Riff pointers contain no secret bodies.'], [
      phase('OBS-R10-P01', 'Define sensitive-data taxonomy', 'Unknown high-risk fields cannot default to public.', 'Secrets, accounts, personal data, commands, and artifacts have policies.'),
      phase('OBS-R10-P02', 'Redact before persistence', 'A seeded secret reaching disk fails.', 'Canonical redaction happens ahead of hashing and append.'),
      phase('OBS-R10-P03', 'Harden local API and binding', 'Non-local bind without explicit authenticated configuration refuses.', 'Default service is loopback-only.'),
      phase('OBS-R10-P04', 'Harden artifact and path access', 'Traversal or undeclared file access refuses.', 'Only declared artifact roots are readable.'),
      phase('OBS-R10-P05', 'Harden screenshots and exports', 'Sensitive seeded content in export fails.', 'Exports preserve meaning without secret bodies.'),
      phase('OBS-R10-P06', 'Run hostile security fixtures', 'Any seeded credential survives a surface scan fails.', 'Journal, API, HTML, screenshots, and Riff payloads remain clean.')
    ], { blastRadius: 'high', ambiguity: 'high' }),

  roadmap('OBS-R11', 'Whole-System Qualification and Protected Intake',
    'Prove live Codex and Claude observation, browser-independent collection, crash replay, operator comprehension, multi-machine continuity, security, and portable installation; then prepare protected Repository intake.', ['OBS-R02', 'OBS-R03', 'OBS-R05', 'OBS-R07', 'OBS-R08', 'OBS-R09', 'OBS-R10'],
    [`${campaignRoot}/campaign.json`, `${root}/observatory/index.html`, `${root}/tests/`],
    [`${campaignRoot}/QUALIFICATION-LEDGER.md`, `${campaignRoot}/BUILDER-CLOSEOUT.md`, `${campaignRoot}/roadmap-status.json`, `${campaignRoot}/index.html`, `${root}/scripts/install-project-observatory.ps1`],
    ['A fixture-only, single-provider, browser-dependent, secret-leaking, non-replayable, or self-promoting system cannot qualify.', 'One real mixed-provider campaign is watched live, replayed after failure, viewed headlessly, and packaged for owner-controlled intake.', 'All executable phases close before requesting intake.', 'Only Jenn or Repository intake authority can accept canonical placement.'], [
      phase('OBS-R11-P01', 'Run mixed-provider keystone', 'A single-provider or fixture-only run cannot qualify.', 'Codex and Claude events compose in one live campaign.'),
      phase('OBS-R11-P02', 'Prove crash, replay, and browser independence', 'State loss or browser-coupled collection fails.', 'Restart reproduces state and catches up.'),
      phase('OBS-R11-P03', 'Prove multi-machine continuity', 'Hidden gaps or identity substitution fail.', 'At least three declared nodes preserve provenance.'),
      phase('OBS-R11-P04', 'Prove security and operator comprehension', 'Secret leakage or authority confusion fails.', 'Hostile fixtures pass and an operator can locate run, blocker, commit, and artifact.'),
      phase('OBS-R11-P05', 'Package portable install and closeout', 'Machine-specific undocumented assumptions refuse release.', 'Installer, runbook, evidence ledger, and dashboard agree.'),
      phase('OBS-R11-P06', 'Submit protected Repository intake', 'Automatic or worker-declared canonization refuses.', 'A reviewed intake packet targets R:\\Repository-v3 without claiming acceptance.', 'HITL')
    ], { executionMode: 'coordinator', ambiguity: 'high', blastRadius: 'high', authorityRequired: true, filesExpected: 12 })
];

const campaign = {
  schemaVersion: 1,
  campaignId: 'project-observatory-20260902',
  title: 'Sola Project Observatory',
  northStar: 'Make multi-agent roadmap execution visibly inspectable live and replayable later, in a visible or headless browser, without coupling work to the browser or transferring truth, acceptance, promotion, secret custody, or Repository authority to the view.',
  sourceRevision,
  workspaceRoot,
  constraints: { forkContext: false, childWorkersAllowed: false, maximumBriefWords: 1500, maximumReturnWords: 300, correctionBudget: 1 },
  roadmaps
};

const waves = [
  ['Wave 1 - Constitution', 'OBS-R00'],
  ['Wave 2 - Event foundation', 'OBS-R01'],
  ['Wave 3 - Provider and journal fan-out', 'OBS-R02, OBS-R03, OBS-R04'],
  ['Wave 4 - Hooks', 'OBS-R05'],
  ['Wave 5 - Service', 'OBS-R06'],
  ['Wave 6 - Operator surfaces', 'OBS-R07, OBS-R08'],
  ['Wave 7 - Federation and security', 'OBS-R09, OBS-R10'],
  ['Wave 8 - Qualification and intake', 'OBS-R11']
];

const table = roadmaps.map((r) => `| ${r.id} | ${r.title} | ${r.phases.length} | ${r.dependsOn.join(', ') || 'None'} | ${r.executionMode} |`).join('\n');
const detail = roadmaps.map((r) => `## ${r.id}: ${r.title}\n\n**Outcome:** ${r.outcome}\n\n**Owned outputs:**\n${r.ownedOutputs.map((x) => `- \`${x}\``).join('\n')}\n\n**Six phases:**\n${r.phases.map((p) => `1. **${p.id} - ${p.title}** (${p.type})\n   - MUST FIRE: ${p.mustFire}\n   - MUST STAY SILENT: ${p.mustStaySilent}`).join('\n')}\n`).join('\n');
const roadmapSet = `# Sola Project Observatory\n\n## North Star\n\n${campaign.northStar}\n\nThe completed ORB-R00 through ORB-R07 campaign remains historical implementation truth. This campaign promotes and reconciles the relevant drafted ORX directions: authorized provider runner, durable queue and heartbeats, human authority inbox, federated runtime, and Mission Control. It supersedes those draft boundaries for the Observatory build without claiming they were already implemented.\n\n## Product Shape\n\n\`\`\`text\nCodex --json --------\\\n                         provider adapters -> canonical event ABI -> append-only journal\nClaude stream-json ---/                                      |\n                                                            +-> replay/query API\nORB state + Git + Riff hooks -------------------------------+-> SSE live stream\n                                                            +-> visible browser\n                                                            +-> headless checks\n                                                            +-> remote node capsules\n\`\`\`\n\nThe browser is a view and control client, never the collector or source of truth. Closing it does not stop work or event capture. No private chain-of-thought is captured; only emitted messages, tool metadata, lifecycle transitions, checks, commits, and artifact pointers are observable.\n\n## Ownership\n\n| Owner | Owns | Does not own |\n|---|---|---|\n| Jenn | ambition, protected decisions, acceptance, intake | routine event mechanics |\n| Sol | architecture, orchestration, integration, review | hidden promotion or private worker reasoning |\n| ORB runtime | packets, routes, leases, lifecycle, evidence state | product truth or Repository authority |\n| Project Observatory | event normalization, journal, replay, API, dashboard | acceptance, promotion, canonical custody |\n| Provider adapters | translation of emitted Codex and Claude streams | model identity or hidden reasoning |\n| Worker | declared assignment and outputs | campaign redesign or self-verification |\n| Riff | discovery pointers | artifact bodies, canon, acceptance |\n| Repository | protected canonical custody on Lab | automatic acceptance |\n\n## Roadmap Index\n\n| Roadmap | Title | Phases | Depends on | Execution |\n|---|---|---:|---|---|\n${table}\n\n**Total: 12 roadmaps, 72 phases.** Seventy-one phases are executable without a new owner decision. Only OBS-R11-P06 is HITL because protected Repository intake cannot be self-approved.\n\n## Execution Waves\n\n${waves.map(([a,b], i) => `${i + 1}. **${a}:** ${b}.`).join('\n')}\n\n## Non-Negotiable Qualification\n\n- A real Codex run and real Claude run must enter the same canonical event system.\n- Browser visibility is optional; collection and persistence continue with every browser closed.\n- Journal recovery reproduces state after a killed collector and refuses corrupt tails.\n- Git and Riff hooks report durable changes but never grant acceptance.\n- Multi-machine identity distinguishes Warehouse, Lab, Browser Sender, VPS, and future nodes.\n- Warehouse does not require a local R: mapping; canonical Repository custody remains on Lab.\n- Redaction occurs before journal persistence, API broadcast, screenshot, or Riff publication.\n- The UI exposes source, time, commit, evidence maturity, and whether a fact is live, staged, retrospective, or canonical.\n- No raw private reasoning is requested, inferred, persisted, or displayed.\n- Dashboard success never marks an implementation phase verified by itself.\n\n${detail}`;

const handoff = `# Builder Handoff - Sola Project Observatory\n\nBuild the complete 12-roadmap, 72-phase Project Observatory campaign from the machine-readable manifest in this directory. Preserve the verified ORB campaign and all unrelated dirty work. Do not shrink the campaign, replace real provider streams with mocks, couple event collection to a browser, copy artifact bodies into Riff, expose credentials or hidden reasoning, or claim Repository acceptance.\n\nStart with OBS-R00 and execute dependency order. Continue every safe independent phase when another lane blocks. Reuse current ORB proof where the campaign explicitly permits it; do not rerun unrelated broad suites. Commit bounded roadmap slices. After every status change, regenerate and validate the dashboard.\n\nThe keystone is a real mixed Codex and Claude campaign whose emitted events continue while browsers are closed, replay identically after collector failure, render in visible and headless browser modes, preserve multi-machine provenance, and refuse secret-shaped data before persistence.\n\nOnly OBS-R11-P06 requires owner action. Finish all other executable work before presenting the protected intake packet. Repository custody is R:\\Repository-v3 on Lab/ELISHA-DESKTOP; Warehouse is the command plane and reaches it through authenticated SSH or approved tunnels.\n\nRead first:\n\n1. \`${campaignRoot}/ROADMAP-SET.md\`\n2. \`${campaignRoot}/campaign.json\`\n3. \`${campaignRoot}/roadmap-status.json\`\n4. \`${root}/campaigns/orchestrated-roadmap-builder-20260902/ROADMAP-SET.md\`\n5. \`${root}/README.md\`\n\nReturn only a compact closeout with commits, exact proof, dashboard path, Riff pointer, and specific external gates.`;

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, 'campaign.json'), `${JSON.stringify(campaign, null, 2)}\n`);
fs.writeFileSync(path.join(outputRoot, 'ROADMAP-SET.md'), roadmapSet);
fs.writeFileSync(path.join(outputRoot, 'BUILDER-HANDOFF.md'), handoff);
fs.writeFileSync(path.join(outputRoot, 'DEPENDENCY-GRAPH.md'), `# Dependency Graph\n\n${waves.map(([a,b]) => `- ${a}: ${b}`).join('\n')}\n\n\`\`\`text\nOBS-R00 -> OBS-R01 -> OBS-R02 --\\\n                   -> OBS-R03 ----+-> OBS-R06 -> OBS-R07 -> OBS-R08 --\\\n                   -> OBS-R04 -> OBS-R05 ------------------------------+-> OBS-R11\n                              \\-> OBS-R06 -> OBS-R09 -----------------+\n                                             OBS-R10 -------------------/\n\`\`\`\n`);
fs.writeFileSync(path.join(outputRoot, 'SUPERSESSION-LEDGER.md'), `# Supersession Ledger\n\n- ORB-R00 through ORB-R07 remain completed and are not superseded.\n- Draft ORX-R02, ORX-R03, ORX-R04, ORX-R08, ORX-R09, and ORX-R15 are reconciled into OBS-R00 through OBS-R11 for this build.\n- Other ORX drafts remain available for later campaigns and are not silently cancelled.\n- This ledger changes planning boundaries only; it grants no implementation credit.\n`);
fs.writeFileSync(path.join(outputRoot, 'PROVENANCE-LEDGER.md'), `# Provenance Ledger\n\n- Campaign source revision: ${sourceRevision}\n- Manifest: campaign.json\n- Gate catalog: 12 roadmaps, 72 phases, one HITL phase\n- Gate status: prospective, frozen before implementation\n- Evidence boundary: roadmap prose and generated dashboards are planning evidence only\n- Existing reusable proof: verified ORB-R00 through ORB-R07 campaign\n- Canonical intake target: R:\\Repository-v3 through protected intake after qualification\n`);
console.log(JSON.stringify({ ok: true, outputRoot, roadmaps: roadmaps.length, phases: roadmaps.reduce((n, r) => n + r.phases.length, 0) }, null, 2));
