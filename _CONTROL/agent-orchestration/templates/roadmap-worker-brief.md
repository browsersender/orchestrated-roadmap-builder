# Work Package {{ROADMAP_ID}}: {{ROADMAP_TITLE}}

## Objective
{{OBJECTIVE}}

## Frozen Context
- Campaign: {{CAMPAIGN_ID}}
- Source revision: {{SOURCE_REVISION}}
- Workspace: {{WORKSPACE_ROOT}}
- Bar catalog: {{BAR_CATALOG_HASH}}
- Target: {{TARGET_HOST}} at {{TARGET_ROOT}}
- Portability: {{PORTABILITY_RULE}}

## Exact Inputs
{{EXACT_INPUTS}}

## Owned Outputs
{{OWNED_OUTPUTS}}

## Prohibited Paths
{{PROHIBITED_PATHS}}

## Phases
{{PHASES}}

## Roadmap Acceptance
- MUST FIRE: {{ACCEPTANCE_MUST_FIRE}}
- MUST STAY SILENT: {{ACCEPTANCE_MUST_STAY_SILENT}}
{{ACCEPTANCE_CHECKS}}

## Evidence Policy
{{EVIDENCE_POLICY}}

## Hard Rules
- Start with the supplied source and current branch. Do not re-audit unrelated completed work.
- Do not inherit coordinator history. Do not create child workers.
- Edit only owned outputs. Preserve owner and authority boundaries.
- Reuse current relevant proof. Run only checks needed for changed behavior and remaining gates.
- Commit the bounded result. Return at most 300 words with status, commit, changed paths, checks, blockers, sparks, and integration note.
