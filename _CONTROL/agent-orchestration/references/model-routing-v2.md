# Model Routing V2

`lib/model-router.mjs` is a pure routing library. A dispatch caller reads the current capability ledger and policy, discovers provider support at the target, then calls `routeModelTask`. It never accepts credentials and receipts never include them.

```js
const result = routeModelTask({
  taskId: 'ORB-R03',
  profile: {
    ambiguity: 'low',
    blastRadius: 'low',
    crossProduct: false,
    behaviorChange: true,
    mechanicalAcceptance: true,
    authorityRequired: false,
    filesExpected: 4
  },
  ledger,
  policy,
  targetSupport: {
    providers: {
      'gpt-5.6-terra': { available: true, authorized: true },
      'gpt-5.6-luna': { available: true, authorized: true },
      'claude-opus-4-8': { available: false, authorized: false },
      'claude-opus-5': { available: false, authorized: false },
      'claude-sonnet-5': { available: false, authorized: false },
      'claude-haiku-4-5-20251001': { available: false, authorized: false },
      'gpt-5.6-sol': { available: true, authorized: true }
    }
  },
  resourcePreferences: { time: 'medium', tokens: 'ignore', equivalentCost: 'ignore' }
});
```

## Contract

- Task profiles are strict. The supported ambiguity and blast-radius values are `low`, `medium`, and `high`; unknown fields, values, malformed tags, or non-positive file counts refuse.
- If `taskShape` is omitted, the router derives a conservative shape from the frozen profile. If it is supplied, every supplied tag must be present in a matching capability observation.
- The ledger must be structurally valid and contain matching observations before automatic ranking. Evidence is aggregated only within that shape cohort; it does not establish a universal model winner.
- `targetSupport.providers` is dispatch-time state. A missing provider is unavailable and unauthorized. A lane requires every model it names to be both available and authorized, including the Terra/Luna fanout lane.
- High ambiguity, high blast radius, or cross-product work escalates to `SOL_OWNED` without automatic dispatch. Protected authority refuses automatic dispatch and records a refusal receipt.

## Ranking And Telemetry

Scores combine lane fit, mean review score from retained observations, and optional resource adjustments. The `time`, `tokens`, and `equivalentCost` priorities accept `ignore`, `low`, `medium`, or `high`. An adjustment applies only where at least two candidate lanes have the same metric; absent telemetry is not converted into a penalty.

`reportedEquivalentCostUsd` is explicitly serialized as reported equivalent-cost telemetry. The receipt always records `billingStatus: "not_billing"` and `acceptanceStatus: "not_acceptance_evidence"`; it is neither an observed provider charge nor acceptance proof.

## Overrides And Corrections

A coordinator may provide `{ lane, rationale }`. The requested lane still must be available, authorized, and evidence-supported. A successful override sets `coordinatorOverride.applied` and makes `automaticDispatch` false.

`decideReroute` preserves one recoverable correction when `correctionRounds < correctionBudget`. At exhaustion, Luna escalates to Terra and Haiku 4.5 escalates to Sonnet 5; Terra, fanout, Sonnet 5, and both Claude specialist lanes escalate to Sol; Sol escalates to human authority. Escalation is a routing boundary, not an acceptance decision.

## Lane Tiers

Claude lanes share the task-fit formula of their Codex tier (`primary`, `bounded`, `specialist`) so that ranking between providers is decided by measured review scores and telemetry, not by a fit bias written into the router. A lane whose model has no retained observation for the task shape is excluded with `capability_evidence_missing` and cannot be selected by override.

## Receipt

Every returned routing or refusal receipt records policy identity, normalized profile, explicit override state, reasons, capability-observation identifiers, ranked lanes when applicable, correction state, resource-telemetry limits, and authority limits. `validateRoutingReceipt` and `routing-receipt.schema.json` reject a routed receipt that omits policy identity, reasons, selected ranked lane, or observation identifiers.
