# Model Routing Policy

## Default Order

1. Keep work with Sol when architecture, disputed truth, owner boundaries, integration, or high-consequence judgment dominates.
2. Route to Terra when a bounded lane still requires substantial source comprehension, multiple coordinated files, debugging, or behavior-changing implementation.
3. Route to Luna when the contract is frozen, paths are exact, blast radius is low, and acceptance can be decided mechanically.
4. Use Luna fan-out under Terra only when files are disjoint and Terra remains responsible for the combined behavior.

## Task Classes

| Lane | Suitable work | Unsuitable work | Default effort |
|---|---|---|---|
| `SOL_OWNED` | architecture, reconciliation, ambiguous recovery, integration, final review | repetitive bounded production | xhigh |
| `TERRA_PRIMARY` | multi-file implementation, debugging, contracts, migrations, performance work | owner acceptance or unclear product direction | xhigh |
| `LUNA_BOUNDED` | exact transforms, fixtures, adapters, local evaluators, inventories, mechanical UI slices | broad refactors, uncertain architecture, authority decisions | high; xhigh for pilot |
| `TERRA_LUNA_FANOUT` | Terra-owned implementation with disjoint Luna fixtures, corpus work, or adapters | shared-file edits or coupled design | Terra xhigh, Luna high |
| `CLAUDE_OPUS48_SPECIALIST` | independent architecture challenge, difficult source synthesis, high-value review, or an ambiguity-heavy bounded implementation | routine fixtures, repetitive production, or any lane whose acceptance depends on unreviewed evidence claims | Opus 4.8 xhigh through Claude CLI |
| `HUMAN_AUTHORITY` | promotion, destructive action, live accounts, external acceptance | implementation work | n/a |

## Escalation

- Luna to Terra: one contract correction is insufficient, shared behavior changes, or source ambiguity appears.
- Terra to Sol: ownership conflicts, architecture must change, evidence contradicts the brief, or integration spans products.
- Any model to human authority: the packet names a protected decision or live external effect.

## Resource Warnings

Low local disk space is a dispatch warning, not acceptance authority. The coordinator reports it and may recommend cleanup. Jenn may explicitly authorize an isolated run despite the warning; record that override in campaign status and keep worker writes on the declared drive and paths.

## Target-Machine Portability

- A packet that will integrate or execute on another machine must name that target and its owner-root resolution rule.
- Worker code must not embed a coordinator-local absolute path as a product dependency. Resolve an owner package from the declared integration root, or use an explicit environment override whose absence refuses cleanly.
- Sol must run the focused integration proof on the target machine before accepting the slice. A laptop-only pass is local builder evidence, not target-machine evidence.
- If the target does not contain the required owner source, recover the exact committed owner files into their own product boundary with provenance. Do not copy owner logic into the consuming package.

## Measurement

Record observed facts by task shape:

- brief and return word counts;
- elapsed wall time;
- changed paths and diff size;
- targeted checks passed and failed;
- out-of-scope edits;
- correction rounds;
- review defects by severity;
- whether typed refusal and evidence boundaries were preserved.

Do not infer exact token use unless the runtime supplies it. Do not turn one pilot into a global model ranking.

## Crossover Finding

The second matched Oracle round showed that both worker models can cross into the other's initial task family when contracts and ownership are explicit. Terra remains the default for substantial or ambiguous cross-file work because it produced the frozen statistical adapter faster and more compactly. Luna remains effective for bounded interpretive work, but packets should cap proof expansion when exhaustive event bodies do not add decision value. These are task-shape observations, not global rankings.

## Foundry Finding

The Cinema witness slice confirmed the proposed production split. Terra handled a substantial multi-file ABI and real-browser adapter; Luna handled an exact hostile-fixture and validator lane; Sol integrated both on the Lab and retained owner boundaries. The first Terra result assumed a laptop-local Program B path, which Sol corrected before Lab qualification. Future remote-target packets therefore freeze portability at dispatch instead of treating it as integration cleanup.

## Claude Opus 4.8 Finding

Opus 4.8 completed all six matched internal assignments with clean worker branches, exact file boundaries, typed refusals, and no authority widening. It is retained as a specialist, not the default production worker. Across these six runs it used 72.15 minutes of wall time and 319,475 output tokens. Claude CLI reported a $19.59 equivalent-cost estimate, but authentication was the Claude Max subscription (`claude.ai`), not an Anthropic API key; this figure is routing telemetry, not an observed API charge. Its bounded Oracle work was sound, but it did not displace Terra on compact technical implementation or Luna on fixture production.

The Cinema crossover exposed two review defects. Opus substituted a partial software rasterizer for browser Canvas while describing it as a real Canvas path, and its raw-byte owner hash changed across laptop and Lab checkouts because line-ending normalization changed the checked-out bytes. The candidate therefore remains benchmark evidence only. The accepted Terra/Luna Cinema slice is unchanged.

Future matched runs must freeze protocol fixtures and normalization rules, not only prose and public interfaces. Different valid tokenization or counting choices otherwise prevent scientific model-quality comparison even when both implementations satisfy their packets.
