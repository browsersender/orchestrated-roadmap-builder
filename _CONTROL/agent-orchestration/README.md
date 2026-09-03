# Sola Agent Orchestration

This control layer routes bounded work among Sol, Terra, Luna, and selected external specialist workers without transferring the coordinator's conversation history or surrendering owner authority.

## Roles

- **Sol** owns architecture, ambiguity reduction, work decomposition, integration, review, and final claims.
- **Terra** is the default technical builder for substantial, cross-file, or behavior-changing lanes.
- **Luna** handles narrow source-grounded implementation, extraction, transformation, fixtures, and independent fan-out work.
- **Claude Opus 4.8** is an independently reviewed specialist for high-value architecture challenge, source synthesis, and bounded ambiguity-heavy work; it is not the routine production default.
- **Claude Opus 5, Sonnet 5, and Haiku 4.5** are policy-visible lanes at the specialist, primary, and bounded tiers respectively. They have no capability observations yet and cannot win a route until a matched benchmark records them.
- **Human and product owners** retain decisions, promotion, live-account action, protected intake, and external acceptance.

Routing is a reversible recommendation. It is not acceptance authority and it does not establish that a model is globally better. The capability ledger records performance by task shape.

## Commands

```powershell
node _CONTROL\agent-orchestration\scripts\agent-orchestrator.mjs route <task-profile.json>
node _CONTROL\agent-orchestration\scripts\agent-orchestrator.mjs preflight <target-root> [required-workspace-bytes]
node _CONTROL\agent-orchestration\scripts\agent-orchestrator.mjs validate-packet <work-packet.json>
node _CONTROL\agent-orchestration\scripts\agent-orchestrator.mjs validate-result <worker-result.json>
node _CONTROL\agent-orchestration\scripts\agent-orchestrator.mjs audit-result <work-packet.json> <worker-result.json>
node _CONTROL\agent-orchestration\scripts\agent-orchestrator.mjs record-observation <observation.json> <capability-ledger.json>
```

Routing has no arbitrary machine-wide free-space floor. Capacity preflight inspects the packet's target volume and refuses only when the assignment declares a concrete byte requirement that the target cannot satisfy. Packet limits, child-worker prohibition, exact paths, and ownership boundaries remain mandatory.

## Pilot

`campaigns/oracle-model-fit-20260902/` defines a matched Product Oracle experiment:

- Luna: an offline confidence-calibration readiness evaluator.
- Terra: an offline answer-quality diagnostics evaluator.
- Sol: reviews both with the same rubric and records corrections, boundary discipline, evidence honesty, and implementation quality.

Neither pilot may change live Oracle behavior, close Product Oracle G4, alter roadmap status, or publish acceptance claims.

## Operating Loop

1. Sol writes or validates a work packet.
2. The router recommends a lane from the declared task shape.
3. Sol dispatches a no-history worker at the declared reasoning effort.
4. The worker returns a compact structured result and committed implementation.
5. Sol checks owned paths, diff, targeted tests, refusal behavior, and claims.
6. Sol records one capability observation and either integrates, corrects once, reroutes, or rejects.

Observed capability updates future routing; it never rewrites historical results.
