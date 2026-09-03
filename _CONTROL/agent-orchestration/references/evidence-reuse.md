# Evidence Reuse and Integration Gate

ORB-R05 treats evidence as a decision with a reason, not as a permanent green badge.

## Reuse contract

`classifyEvidence({ proof, current, changedPaths, relevantPaths })` returns `reuse` only when the proof has compatible source revision, gate identity, stable target identity, and evidence class. When available, relevant content hashes and commit identity are part of the proof identity. A changed source revision, gate, relevant content or path, target environment, evidence class, suspected regression, or missing identity returns `rerun` with reason codes and plain-language reasons.

Unrelated changed paths remain silent. Absolute checkout roots are deliberately excluded from `stableTarget` and `proofIdentity`; receipts travel by source/content and commit identity rather than machine-specific checkout bytes.

## Worker scope

`auditWorkerScope(packet, result)` resolves changed paths against the packet target and accepts only exact declared `ownedOutputs`. Any undeclared write refuses intake. A complete result with no changed output is also refused.

## Composition gate

Worker results are local evidence. `evaluateIntegration` requires every worker result to be complete, unblocked, and green, plus a separate composition proof with a reference and passing checks bound to the participating worker IDs. Pairwise green results alone never produce an integration receipt.

## Correction and sealing

`decideCorrection` spends the declared correction budget on one bounded conceptual repair. Once the budget is exhausted it reroutes to fresh ownership. `sealVerificationReceipt` refuses missing source identity, gate evidence, passing tests, or composition proof. Only the complete path produces a `sola.evidence-receipt.v1` verification receipt.

The receipt records the campaign, roadmap, source revision, portable gate identity, stable target, evidence class, proof references, passing checks, reasons, timestamp, and authority. It does not grant promotion or protected external acceptance.
