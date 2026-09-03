# Sola Project Observatory

## North Star

Make multi-agent roadmap execution visibly inspectable live and replayable later, in a visible or headless browser, without coupling work to the browser or transferring truth, acceptance, promotion, secret custody, or Repository authority to the view.

The completed ORB-R00 through ORB-R07 campaign remains historical implementation truth. This campaign promotes and reconciles the relevant drafted ORX directions: authorized provider runner, durable queue and heartbeats, human authority inbox, federated runtime, and Mission Control. It supersedes those draft boundaries for the Observatory build without claiming they were already implemented.

## Product Shape

```text
Codex --json --------\
                         provider adapters -> canonical event ABI -> append-only journal
Claude stream-json ---/                                      |
                                                            +-> replay/query API
ORB state + Git + Riff hooks -------------------------------+-> SSE live stream
                                                            +-> visible browser
                                                            +-> headless checks
                                                            +-> remote node capsules
```

The browser is a view and control client, never the collector or source of truth. Closing it does not stop work or event capture. No private chain-of-thought is captured; only emitted messages, tool metadata, lifecycle transitions, checks, commits, and artifact pointers are observable.

## Ownership

| Owner | Owns | Does not own |
|---|---|---|
| Jenn | ambition, protected decisions, acceptance, intake | routine event mechanics |
| Sol | architecture, orchestration, integration, review | hidden promotion or private worker reasoning |
| ORB runtime | packets, routes, leases, lifecycle, evidence state | product truth or Repository authority |
| Project Observatory | event normalization, journal, replay, API, dashboard | acceptance, promotion, canonical custody |
| Provider adapters | translation of emitted Codex and Claude streams | model identity or hidden reasoning |
| Worker | declared assignment and outputs | campaign redesign or self-verification |
| Riff | discovery pointers | artifact bodies, canon, acceptance |
| Repository | protected canonical custody on Lab | automatic acceptance |

## Roadmap Index

| Roadmap | Title | Phases | Depends on | Execution |
|---|---|---:|---|---|
| OBS-R00 | Observatory Constitution and Truth Boundary | 6 | None | coordinator |
| OBS-R01 | Canonical Event and Causal Identity ABI | 6 | OBS-R00 | worker |
| OBS-R02 | Codex JSONL Live Adapter | 6 | OBS-R01 | worker |
| OBS-R03 | Claude Stream JSON Live Adapter | 6 | OBS-R01 | worker |
| OBS-R04 | Append-Only Journal, Replay, and Recovery | 6 | OBS-R01 | worker |
| OBS-R05 | Orchestrator, Git, and Riff Hooks | 6 | OBS-R01, OBS-R04 | worker |
| OBS-R06 | Live Query API and Event Stream | 6 | OBS-R02, OBS-R03, OBS-R04, OBS-R05 | worker |
| OBS-R07 | Visible Project Observatory Dashboard | 6 | OBS-R06 | worker |
| OBS-R08 | Headless Monitoring and Visual Receipts | 6 | OBS-R06, OBS-R07 | worker |
| OBS-R09 | Multi-Machine Observatory Federation | 6 | OBS-R04, OBS-R06 | worker |
| OBS-R10 | Privacy, Redaction, and Operator Security | 6 | OBS-R01, OBS-R06, OBS-R09 | worker |
| OBS-R11 | Whole-System Qualification and Protected Intake | 6 | OBS-R02, OBS-R03, OBS-R05, OBS-R07, OBS-R08, OBS-R09, OBS-R10 | coordinator |

**Total: 12 roadmaps, 72 phases.** Seventy-one phases are executable without a new owner decision. Only OBS-R11-P06 is HITL because protected Repository intake cannot be self-approved.

## Execution Waves

1. **Wave 1 - Constitution:** OBS-R00.
2. **Wave 2 - Event foundation:** OBS-R01.
3. **Wave 3 - Provider and journal fan-out:** OBS-R02, OBS-R03, OBS-R04.
4. **Wave 4 - Hooks:** OBS-R05.
5. **Wave 5 - Service:** OBS-R06.
6. **Wave 6 - Operator surfaces:** OBS-R07, OBS-R08.
7. **Wave 7 - Federation and security:** OBS-R09, OBS-R10.
8. **Wave 8 - Qualification and intake:** OBS-R11.

## Non-Negotiable Qualification

- A real Codex run and real Claude run must enter the same canonical event system.
- Browser visibility is optional; collection and persistence continue with every browser closed.
- Journal recovery reproduces state after a killed collector and refuses corrupt tails.
- Git and Riff hooks report durable changes but never grant acceptance.
- Multi-machine identity distinguishes Warehouse, Lab, Browser Sender, VPS, and future nodes.
- Warehouse does not require a local R: mapping; canonical Repository custody remains on Lab.
- Redaction occurs before journal persistence, API broadcast, screenshot, or Riff publication.
- The UI exposes source, time, commit, evidence maturity, and whether a fact is live, staged, retrospective, or canonical.
- No raw private reasoning is requested, inferred, persisted, or displayed.
- Dashboard success never marks an implementation phase verified by itself.

## OBS-R00: Observatory Constitution and Truth Boundary

**Outcome:** Freeze observability ownership, event vocabulary, source precedence, authority limits, and the relationship to the completed ORB campaign and drafted ORX extensions.

**Owned outputs:**
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/OWNER-TREATY.md`
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/SOURCE-PRECEDENCE.md`
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/SUPERSESSION-LEDGER.md`
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/PROVENANCE-LEDGER.md`

**Six phases:**
1. **OBS-R00-P01 - Freeze north star and operator questions** (AFK)
   - MUST FIRE: An undefined viewer or operator question refuses scope freeze.
   - MUST STAY SILENT: The intended watch, inspect, replay, and handoff workflows are explicit.
1. **OBS-R00-P02 - Declare source precedence** (AFK)
   - MUST FIRE: A dashboard-only claim refuses truth status.
   - MUST STAY SILENT: Events link to durable state, Git, checks, or receipts.
1. **OBS-R00-P03 - Freeze owner and authority treaty** (AFK)
   - MUST FIRE: Any observer able to self-accept or self-promote refuses.
   - MUST STAY SILENT: Operator, orchestrator, worker, product, Riff, and Repository roles are bounded.
1. **OBS-R00-P04 - Define event vocabulary** (AFK)
   - MUST FIRE: Unknown or overloaded event kinds refuse ingestion.
   - MUST STAY SILENT: Lifecycle, message, tool, file, check, commit, block, and completion events are distinct.
1. **OBS-R00-P05 - Separate transcript from hidden reasoning** (AFK)
   - MUST FIRE: A request to capture private chain-of-thought refuses.
   - MUST STAY SILENT: Only emitted messages, tool metadata, and durable artifacts are represented.
1. **OBS-R00-P06 - Freeze campaign provenance** (AFK)
   - MUST FIRE: Missing source revision or gate catalog refuses dispatch.
   - MUST STAY SILENT: Twelve roadmaps and seventy-two two-sided phase gates are hashed and readable.

## OBS-R01: Canonical Event and Causal Identity ABI

**Outcome:** Create the provider-neutral event envelope, run identity, causal links, artifact references, clocks, sequence rules, and compatibility contract.

**Owned outputs:**
- `_CONTROL/agent-orchestration/schemas/observatory-event.schema.json`
- `_CONTROL/agent-orchestration/schemas/observatory-run.schema.json`
- `_CONTROL/agent-orchestration/lib/observatory/event-identity.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-event.test.mjs`

**Six phases:**
1. **OBS-R01-P01 - Define run and worker identity** (AFK)
   - MUST FIRE: Missing campaign, roadmap, worker, provider, host, or source identity refuses.
   - MUST STAY SILENT: A complete run identity serializes deterministically.
1. **OBS-R01-P02 - Define canonical event envelope** (AFK)
   - MUST FIRE: Missing kind, clock, sequence, actor, or payload identity refuses.
   - MUST STAY SILENT: Valid events round-trip without semantic drift.
1. **OBS-R01-P03 - Bind causal parentage** (AFK)
   - MUST FIRE: Cycles and impossible parent references refuse.
   - MUST STAY SILENT: Message, tool, artifact, check, and lifecycle chains remain traversable.
1. **OBS-R01-P04 - Bind artifact and Git pointers** (AFK)
   - MUST FIRE: Copied bodies or unverifiable mutable pointers refuse durable status.
   - MUST STAY SILENT: Paths, hashes, commits, and Riff pointers remain references.
1. **OBS-R01-P05 - Version compatibility rules** (AFK)
   - MUST FIRE: A breaking producer version cannot silently ingest.
   - MUST STAY SILENT: Compatible prior events migrate deterministically.
1. **OBS-R01-P06 - Seal event identity fixtures** (AFK)
   - MUST FIRE: Fixture mutation without identity change fails.
   - MUST STAY SILENT: Cross-provider equivalent fixtures preserve distinct provenance and stable normalized meaning.

## OBS-R02: Codex JSONL Live Adapter

**Outcome:** Translate Codex CLI JSONL into canonical Observatory events with backpressure, interruption recovery, and no dependency on a visible browser.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/adapters/codex-jsonl.mjs`
- `_CONTROL/agent-orchestration/scripts/observe-codex-run.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-codex-adapter.test.mjs`
- `_CONTROL/agent-orchestration/fixtures/observatory/codex/`

**Six phases:**
1. **OBS-R02-P01 - Capture Codex stream contract** (AFK)
   - MUST FIRE: Unsupported or ambiguous record kinds refuse mapping.
   - MUST STAY SILENT: Known emitted JSONL records have explicit mappings.
1. **OBS-R02-P02 - Normalize lifecycle and messages** (AFK)
   - MUST FIRE: Missing run binding refuses emission.
   - MUST STAY SILENT: Started, message, and completed events retain provider provenance.
1. **OBS-R02-P03 - Normalize tools and file effects** (AFK)
   - MUST FIRE: Unlinked tool results refuse causal completion.
   - MUST STAY SILENT: Tool calls, outputs, and file changes remain causally joined.
1. **OBS-R02-P04 - Handle backpressure and partial lines** (AFK)
   - MUST FIRE: Truncated records cannot masquerade as complete.
   - MUST STAY SILENT: Chunked streams resume without duplicate events.
1. **OBS-R02-P05 - Recover interrupted Codex runs** (AFK)
   - MUST FIRE: A restarted observer cannot reuse a stale sequence silently.
   - MUST STAY SILENT: Resume continues from the durable cursor.
1. **OBS-R02-P06 - Prove real bounded Codex capture** (AFK)
   - MUST FIRE: Fixture-only success cannot qualify the adapter.
   - MUST STAY SILENT: One current run emits source-linked canonical events end to end.

## OBS-R03: Claude Stream JSON Live Adapter

**Outcome:** Translate Claude CLI stream-json into the same event ABI while preserving Claude-specific provenance, refusal behavior, and process termination truth.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/adapters/claude-stream-json.mjs`
- `_CONTROL/agent-orchestration/scripts/observe-claude-run.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-claude-adapter.test.mjs`
- `_CONTROL/agent-orchestration/fixtures/observatory/claude/`

**Six phases:**
1. **OBS-R03-P01 - Capture Claude stream contract** (AFK)
   - MUST FIRE: Unsupported stream records refuse mapping.
   - MUST STAY SILENT: Known records have explicit normalized meanings.
1. **OBS-R03-P02 - Normalize lifecycle and messages** (AFK)
   - MUST FIRE: A final message without process truth cannot close a run.
   - MUST STAY SILENT: Message and lifecycle facts remain separate and linked.
1. **OBS-R03-P03 - Normalize tools and artifacts** (AFK)
   - MUST FIRE: Tool output without call identity refuses.
   - MUST STAY SILENT: Tool and artifact pointers retain causality.
1. **OBS-R03-P04 - Handle process exit and timeout** (AFK)
   - MUST FIRE: Hung or killed processes cannot report success.
   - MUST STAY SILENT: Exit, timeout, cancel, and completion are typed.
1. **OBS-R03-P05 - Recover interrupted Claude runs** (AFK)
   - MUST FIRE: Restart cannot duplicate accepted events.
   - MUST STAY SILENT: Durable cursors make resume idempotent.
1. **OBS-R03-P06 - Prove real bounded Claude capture** (AFK)
   - MUST FIRE: Fixture-only success cannot qualify the adapter.
   - MUST STAY SILENT: One current run emits canonical events end to end.

## OBS-R04: Append-Only Journal, Replay, and Recovery

**Outcome:** Persist canonical events in an append-only journal with indexes, cursors, integrity checks, compaction snapshots, and deterministic replay.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/event-journal.mjs`
- `_CONTROL/agent-orchestration/lib/observatory/replay.mjs`
- `_CONTROL/agent-orchestration/schemas/observatory-snapshot.schema.json`
- `_CONTROL/agent-orchestration/tests/observatory-journal.test.mjs`

**Six phases:**
1. **OBS-R04-P01 - Build atomic append journal** (AFK)
   - MUST FIRE: Torn or concurrent invalid writes refuse.
   - MUST STAY SILENT: Ordered events append durably.
1. **OBS-R04-P02 - Build run and artifact indexes** (AFK)
   - MUST FIRE: Index divergence is detected.
   - MUST STAY SILENT: Run, roadmap, worker, event-kind, and artifact queries resolve.
1. **OBS-R04-P03 - Persist consumer cursors** (AFK)
   - MUST FIRE: Cursor regression or foreign journal identity refuses.
   - MUST STAY SILENT: Consumers resume at the next unconsumed event.
1. **OBS-R04-P04 - Create immutable snapshots** (AFK)
   - MUST FIRE: Snapshot without journal range and hash refuses.
   - MUST STAY SILENT: Snapshot recreates the same derived state.
1. **OBS-R04-P05 - Recover crash and partial write** (AFK)
   - MUST FIRE: Corrupt tail cannot enter replay.
   - MUST STAY SILENT: Valid prefix recovers with a typed tail refusal.
1. **OBS-R04-P06 - Prove deterministic replay** (AFK)
   - MUST FIRE: Two replays producing divergent state fail.
   - MUST STAY SILENT: Cold and snapshot-assisted replay match exactly.

## OBS-R05: Orchestrator, Git, and Riff Hooks

**Outcome:** Emit Observatory events from orchestration transitions, Git milestones, and Riff artifact publication without allowing any hook to mutate acceptance truth.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/orchestration-hooks.mjs`
- `_CONTROL/agent-orchestration/lib/observatory/git-hooks.mjs`
- `_CONTROL/agent-orchestration/lib/observatory/riff-hooks.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-hooks.test.mjs`

**Six phases:**
1. **OBS-R05-P01 - Instrument orchestration transitions** (AFK)
   - MUST FIRE: An event preceding its durable state transition refuses.
   - MUST STAY SILENT: Committed transitions emit linked events.
1. **OBS-R05-P02 - Instrument work packet and lease events** (AFK)
   - MUST FIRE: Unleased ownership cannot report running.
   - MUST STAY SILENT: Packet, lease, renewal, and expiry appear.
1. **OBS-R05-P03 - Instrument Git milestones** (AFK)
   - MUST FIRE: Dirty state cannot masquerade as a commit.
   - MUST STAY SILENT: Branch, commit, and changed-path metadata are source-linked.
1. **OBS-R05-P04 - Instrument checks and evidence intake** (AFK)
   - MUST FIRE: A check result cannot grant acceptance by itself.
   - MUST STAY SILENT: Check and evidence events cite their governing gate.
1. **OBS-R05-P05 - Instrument Riff publication** (AFK)
   - MUST FIRE: Copied artifact bodies or duplicate roots refuse.
   - MUST STAY SILENT: One compact pointer event links the Riff thread.
1. **OBS-R05-P06 - Prove hook failure isolation** (AFK)
   - MUST FIRE: Observability failure that corrupts worker execution fails qualification.
   - MUST STAY SILENT: Work continues with an explicit observability-degraded receipt.

## OBS-R06: Live Query API and Event Stream

**Outcome:** Serve replayable state and live events through a local API and SSE stream with bounded clients, cursor resume, health, and graceful shutdown.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/server.mjs`
- `_CONTROL/agent-orchestration/scripts/start-project-observatory.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-server.test.mjs`
- `_CONTROL/agent-orchestration/references/project-observatory-api.md`

**Six phases:**
1. **OBS-R06-P01 - Build health and run query API** (AFK)
   - MUST FIRE: Health cannot report ready over an unreadable journal.
   - MUST STAY SILENT: Runs and service dependencies are queryable.
1. **OBS-R06-P02 - Build replay endpoints** (AFK)
   - MUST FIRE: Invalid ranges and foreign cursors refuse.
   - MUST STAY SILENT: Bounded history pages preserve event order.
1. **OBS-R06-P03 - Build SSE live stream** (AFK)
   - MUST FIRE: Slow clients cannot exhaust the service.
   - MUST STAY SILENT: Clients receive ordered live events with keepalive.
1. **OBS-R06-P04 - Support cursor resume** (AFK)
   - MUST FIRE: Expired or incompatible cursors refuse explicitly.
   - MUST STAY SILENT: Reconnect resumes without gaps or duplicates.
1. **OBS-R06-P05 - Add lifecycle and graceful shutdown** (AFK)
   - MUST FIRE: Unflushed shutdown cannot claim clean exit.
   - MUST STAY SILENT: Start, stop, and restart preserve visible state.
1. **OBS-R06-P06 - Prove browser-independent collection** (AFK)
   - MUST FIRE: Closing all browsers cannot stop collectors.
   - MUST STAY SILENT: Events accumulate and replay after a browser-free interval.

## OBS-R07: Visible Project Observatory Dashboard

**Outcome:** Build the operator-facing browser application for campaign lanes, workers, transcripts, tools, artifacts, checks, Git, dependencies, and exact next actions.

**Owned outputs:**
- `_CONTROL/agent-orchestration/observatory/index.html`
- `_CONTROL/agent-orchestration/observatory/app.js`
- `_CONTROL/agent-orchestration/observatory/styles.css`
- `_CONTROL/agent-orchestration/tests/observatory-ui.test.mjs`

**Six phases:**
1. **OBS-R07-P01 - Build campaign and worker board** (AFK)
   - MUST FIRE: Counts diverging from API state are visible as an error.
   - MUST STAY SILENT: Lane and worker states update without layout shift.
1. **OBS-R07-P02 - Build transcript and tool timeline** (AFK)
   - MUST FIRE: Hidden reasoning or secret payloads cannot render.
   - MUST STAY SILENT: Emitted messages and tool metadata remain source-linked.
1. **OBS-R07-P03 - Build dependency and ownership view** (AFK)
   - MUST FIRE: Unowned or colliding work is highlighted.
   - MUST STAY SILENT: Dependencies, leases, and owners are scan-friendly.
1. **OBS-R07-P04 - Build artifact, check, and Git view** (AFK)
   - MUST FIRE: Uncommitted evidence cannot look canonical.
   - MUST STAY SILENT: Artifacts, checks, commits, and maturity are distinct.
1. **OBS-R07-P05 - Build operator actions** (AFK)
   - MUST FIRE: UI controls cannot bypass orchestrator validation.
   - MUST STAY SILENT: Pause, cancel, retry, and open-artifact actions issue typed requests.
1. **OBS-R07-P06 - Prove responsive live operation** (AFK)
   - MUST FIRE: Blank, overlapping, stale, or disconnected views fail.
   - MUST STAY SILENT: Desktop and mobile screenshots plus interaction checks pass.

## OBS-R08: Headless Monitoring and Visual Receipts

**Outcome:** Run browser checks headlessly for availability, rendering, stale-state detection, screenshots, and regressions while keeping collection independent of Playwright.

**Owned outputs:**
- `_CONTROL/agent-orchestration/scripts/observe-project-headless.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-visual.test.mjs`
- `_CONTROL/agent-orchestration/references/headless-observatory.md`

**Six phases:**
1. **OBS-R08-P01 - Create headless launch profile** (AFK)
   - MUST FIRE: A profile without explicit URL, timeout, and output root refuses.
   - MUST STAY SILENT: Headless browser starts reproducibly.
1. **OBS-R08-P02 - Check service and freshness** (AFK)
   - MUST FIRE: Stale timestamps or disconnected SSE fail.
   - MUST STAY SILENT: Live health and recent events are visible.
1. **OBS-R08-P03 - Check desktop rendering** (AFK)
   - MUST FIRE: Blank canvas, overlap, or clipped controls fail.
   - MUST STAY SILENT: Desktop viewport remains readable.
1. **OBS-R08-P04 - Check narrow rendering** (AFK)
   - MUST FIRE: Overflow or unusable controls fail.
   - MUST STAY SILENT: Narrow viewport remains usable.
1. **OBS-R08-P05 - Capture visual receipts** (AFK)
   - MUST FIRE: Screenshot without lineage refuses proof status.
   - MUST STAY SILENT: Image receipt binds URL, commit, viewport, and time.
1. **OBS-R08-P06 - Prove browser shutdown isolation** (AFK)
   - MUST FIRE: Stopping Playwright cannot stop event intake.
   - MUST STAY SILENT: Collectors and workers continue after headless exit.

## OBS-R09: Multi-Machine Observatory Federation

**Outcome:** Aggregate Lab, Warehouse, Browser Sender, VPS, and future-node events under one campaign identity through authenticated transport and offline capsules.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/federation.mjs`
- `_CONTROL/agent-orchestration/schemas/observatory-node.schema.json`
- `_CONTROL/agent-orchestration/scripts/observatory-node-agent.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-federation.test.mjs`

**Six phases:**
1. **OBS-R09-P01 - Define node identity and capability** (AFK)
   - MUST FIRE: Unknown host or mismatched key identity refuses.
   - MUST STAY SILENT: Declared nodes advertise bounded capabilities.
1. **OBS-R09-P02 - Build authenticated event transport** (AFK)
   - MUST FIRE: Plain unauthenticated remote ingestion refuses.
   - MUST STAY SILENT: Approved SSH tunnel or authenticated channel transports events.
1. **OBS-R09-P03 - Build offline event capsules** (AFK)
   - MUST FIRE: Mutable or unsigned capsule lineage refuses.
   - MUST STAY SILENT: Disconnected nodes can ship content-addressed batches.
1. **OBS-R09-P04 - Reconcile clocks and duplicates** (AFK)
   - MUST FIRE: Conflicting sequence ownership refuses merge.
   - MUST STAY SILENT: Duplicate delivery is idempotent and wall-clock skew is explicit.
1. **OBS-R09-P05 - Recover peer loss** (AFK)
   - MUST FIRE: Missing intervals cannot appear continuous.
   - MUST STAY SILENT: Loss and recovery are visible with exact gaps.
1. **OBS-R09-P06 - Prove three-node campaign view** (AFK)
   - MUST FIRE: Machine-local absence is not reported as global absence.
   - MUST STAY SILENT: Warehouse view joins Lab and Browser Sender evidence under one campaign.

## OBS-R10: Privacy, Redaction, and Operator Security

**Outcome:** Prevent credentials, private keys, cookies, hidden reasoning, unsafe command bodies, and sensitive live-account data from entering journals, APIs, screenshots, or Riff pointers.

**Owned outputs:**
- `_CONTROL/agent-orchestration/lib/observatory/redaction.mjs`
- `_CONTROL/agent-orchestration/lib/observatory/access-policy.mjs`
- `_CONTROL/agent-orchestration/tests/observatory-security.test.mjs`
- `_CONTROL/agent-orchestration/references/observatory-security.md`

**Six phases:**
1. **OBS-R10-P01 - Define sensitive-data taxonomy** (AFK)
   - MUST FIRE: Unknown high-risk fields cannot default to public.
   - MUST STAY SILENT: Secrets, accounts, personal data, commands, and artifacts have policies.
1. **OBS-R10-P02 - Redact before persistence** (AFK)
   - MUST FIRE: A seeded secret reaching disk fails.
   - MUST STAY SILENT: Canonical redaction happens ahead of hashing and append.
1. **OBS-R10-P03 - Harden local API and binding** (AFK)
   - MUST FIRE: Non-local bind without explicit authenticated configuration refuses.
   - MUST STAY SILENT: Default service is loopback-only.
1. **OBS-R10-P04 - Harden artifact and path access** (AFK)
   - MUST FIRE: Traversal or undeclared file access refuses.
   - MUST STAY SILENT: Only declared artifact roots are readable.
1. **OBS-R10-P05 - Harden screenshots and exports** (AFK)
   - MUST FIRE: Sensitive seeded content in export fails.
   - MUST STAY SILENT: Exports preserve meaning without secret bodies.
1. **OBS-R10-P06 - Run hostile security fixtures** (AFK)
   - MUST FIRE: Any seeded credential survives a surface scan fails.
   - MUST STAY SILENT: Journal, API, HTML, screenshots, and Riff payloads remain clean.

## OBS-R11: Whole-System Qualification and Protected Intake

**Outcome:** Prove live Codex and Claude observation, browser-independent collection, crash replay, operator comprehension, multi-machine continuity, security, and portable installation; then prepare protected Repository intake.

**Owned outputs:**
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/QUALIFICATION-LEDGER.md`
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/BUILDER-CLOSEOUT.md`
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/roadmap-status.json`
- `_CONTROL/agent-orchestration/campaigns/project-observatory-20260902/index.html`
- `_CONTROL/agent-orchestration/scripts/install-project-observatory.ps1`

**Six phases:**
1. **OBS-R11-P01 - Run mixed-provider keystone** (AFK)
   - MUST FIRE: A single-provider or fixture-only run cannot qualify.
   - MUST STAY SILENT: Codex and Claude events compose in one live campaign.
1. **OBS-R11-P02 - Prove crash, replay, and browser independence** (AFK)
   - MUST FIRE: State loss or browser-coupled collection fails.
   - MUST STAY SILENT: Restart reproduces state and catches up.
1. **OBS-R11-P03 - Prove multi-machine continuity** (AFK)
   - MUST FIRE: Hidden gaps or identity substitution fail.
   - MUST STAY SILENT: At least three declared nodes preserve provenance.
1. **OBS-R11-P04 - Prove security and operator comprehension** (AFK)
   - MUST FIRE: Secret leakage or authority confusion fails.
   - MUST STAY SILENT: Hostile fixtures pass and an operator can locate run, blocker, commit, and artifact.
1. **OBS-R11-P05 - Package portable install and closeout** (AFK)
   - MUST FIRE: Machine-specific undocumented assumptions refuse release.
   - MUST STAY SILENT: Installer, runbook, evidence ledger, and dashboard agree.
1. **OBS-R11-P06 - Submit protected Repository intake** (HITL)
   - MUST FIRE: Automatic or worker-declared canonization refuses.
   - MUST STAY SILENT: A reviewed intake packet targets R:\Repository-v3 without claiming acceptance.
