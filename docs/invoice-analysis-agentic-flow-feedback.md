# Invoice Analysis Agentic Flow Feedback

Date: 2026-03-15  
Scope: Improve how the system generates accurate fixes, not just how it critiques a single report  
Reference example: Lukas Berg sample analysis (`PKV`, analysis date `2026-03-10`)

## Goal

The main problem is not that the system sometimes chooses the wrong GOZ interpretation. The deeper problem is that the current flow asks one LLM pass to do four jobs at once:

1. gather context
2. interpret rules
3. decide whether a change is safe
4. emit an immediately applicable patch

That is too much compression into one step. When the model is wrong, it is wrong in the most dangerous way: it returns a concrete fix, not a bounded review task.

The target should be:

- evidence first
- classification second
- fix synthesis third
- apply only after deterministic preflight

The Lukas Berg case is a good demonstration:

- `P1` should have become `manual review with justification request`, not `remove GOZ 0090`
- `P2` should have become `missing evidence for temporary closure`, not `add GOZ 2020`
- `P3` should have been suppressed before proposal generation because the case is `PKV`, not `GKV`

## What The Current Flow Does

### Current runtime path

The current analysis path is a single manager-agent call with direct tool access in [src/agent/index.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/index.ts#L77) and a broad manager prompt in [src/agent/manager.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/manager.ts#L3).

Important characteristics:

- one model call is responsible for rule reading, documentation checks, optimization, and patch generation
- sub-agents are disabled entirely in [src/agent/agents/index.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/agents/index.ts#L1)
- the output schema only supports final proposals, not intermediate findings or evidence objects, in [src/agent/report-schema.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/report-schema.ts#L41)
- normalization is post hoc and mostly syntactic in [src/agent/proposal-normalizer.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/proposal-normalizer.ts#L146)
- apply executes approved changes directly against Claim and Procedure resources in [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L47)

### Why this creates inaccurate fixes

The current flow has no explicit stage for:

- evidence collection
- authority grading
- confidence scoring
- “safe to auto-apply” gating
- deterministic target binding for the exact claim line or procedure

That means a proposal can be structurally valid JSON while still being clinically or legally unsafe.

## Core Flow Problems

### 1. Proposal generation starts too early

The manager prompt tells the model to go straight from tool results to “concrete and actionable proposals” in [src/agent/manager.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/manager.ts#L30).

That is the central design issue. The system needs a finding stage before a fix stage.

Current failure mode:

- the model sees `0090 + 0100`
- it infers an exclusion
- it emits `remove_code`

Better flow:

- create finding: `simultaneous 0090 + 0100 on mandibular tooth`
- classify: `disputed / context-dependent`
- ask: `is there documented medical necessity for both anesthesia steps?`
- only then decide whether a billing change is appropriate

### 2. Documentation checks are not grounded in actual filled field state

The documentation tool treats missing `filledFields` as “everything empty” in [src/agent/tools/documentation-check.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/tools/documentation-check.ts#L31).

The manager prompt says “call `check_documentation` for each code” but does not require first extracting actual populated template values from the chart in [src/agent/manager.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/manager.ts#L20).

This creates an accuracy trap:

- if the model does not pass filled fields, the tool returns required fields as missing
- the model then emits a documentation fix
- the proposal looks precise, but the evidence base is incomplete

This is likely the hidden cause behind “missing field” false positives like the Mehrkosten/consent suggestions.

### 3. The schema has no way to express uncertainty

The report schema supports only `severity`, `category`, and direct change objects in [src/agent/report-schema.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/report-schema.ts#L41).

It cannot encode:

- authority level
- confidence
- disputed guidance
- review-only recommendation
- preconditions that must be checked before apply

So the model is forced to turn weak signals into strong actions.

### 4. Normalization filters duplicates, not bad reasoning

The proposal normalizer helps with:

- duplicate proposals
- some contradictions
- some claim-fact mismatches

See [src/agent/proposal-normalizer.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/proposal-normalizer.ts#L48), [src/agent/proposal-normalizer.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/proposal-normalizer.ts#L76), and [src/agent/proposal-normalizer.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/proposal-normalizer.ts#L113).

But it cannot answer:

- is this rule actually hard law or only a practice habit?
- does the proposal have chart evidence?
- is the legal context wrong because insurance was misread?
- is the code combination disputed and therefore not suitable for auto-apply?

That validation must happen before proposal output, not after.

### 5. Apply uses unstable targets

The apply path is still too optimistic for a system that generates patches from LLM output.

Examples:

- `remove_code` targets `existingItemIndex`, which is fragile across multi-change apply and any concurrent drift in [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L121)
- `update_multiplier` finds the first claim item by `code` only, ignoring tooth, session, and system in [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L134)
- documentation changes without `procedureId` bind to the first Procedure on the date in [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L78)
- `flag_unbilled_service` can directly append a claim item, which is too strong for a finding that may only indicate a chart/document mismatch in [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L166)

This is not only an LLM quality issue. The execution layer currently accepts proposals that should still be treated as review artifacts.

## Recommended Target Flow

Do not go back to a heavy multi-agent fan-out. That would likely hurt speed more than it helps. A better design is a staged flow with deterministic gates and one or two narrow LLM synthesis steps.

### Stage 0: Resolve canonical case state

Build one canonical analysis object before any model reasoning:

- patient and coverage type
- exact claim items with stable item IDs
- procedures and encounters on the analysis date
- extracted documentation fields already present
- billing history before the analysis date
- linked findings and diagnoses by tooth/date/session

This should be a backend-built object, not something the model reconstructs from scattered tool responses.

### Stage 1: Deterministic finding generation

Run deterministic checkers first and produce findings, not fixes.

Finding classes:

- `rule-hit`
- `documentation-gap`
- `possible-unbilled-service`
- `practice-pattern`
- `disputed-constellation`

Each finding should include:

- `findingId`
- `source`
- `evidence`
- `authorityLevel`
- `confidence`
- `autoApplyEligible`

Example:

```json
{
  "findingId": "F-0090-0100-46",
  "type": "disputed-constellation",
  "authorityLevel": "interpretive",
  "confidence": "medium",
  "autoApplyEligible": false,
  "evidence": [
    "Claim contains GOZ 0090 and GOZ 0100 on tooth 46",
    "Mandibular conduction anesthesia note present",
    "No explicit justification text found for combined anesthesia"
  ]
}
```

### Stage 2: Policy gating

Before any fix is generated, apply deterministic policy rules:

- suppress GKV-only logic for PKV
- suppress revenue suggestions without chart evidence of the underlying act
- downgrade disputed GOZ combinations to manual review
- downgrade missing-field findings when field state is inferred rather than observed
- block auto-apply if target resource binding is ambiguous

This is where the Lukas Berg false positives should have been stopped.

### Stage 3: LLM fix synthesis from vetted findings

Only now should the LLM write user-facing proposals.

Input to the model:

- vetted findings
- evidence bundle
- target resources
- allowed action set based on policy gate

Important constraint:

- the model may not invent a new finding at this stage
- it may only transform existing findings into explainable proposals

This makes the model an explainer and planner, not the original source of truth.

### Stage 4: Deterministic apply preflight

Before apply, re-validate every approved proposal against live state:

- target claim item still exists
- target procedure still matches date/tooth/session
- insurance context still matches
- no new contradiction after other approved changes
- all required preconditions are satisfied

If any precondition fails, convert the apply step into `manual review required`.

## Concrete Changes To The Data Contracts

### 1. Add a finding layer

The biggest missing concept is a typed finding object separate from a proposal.

Suggested shape:

```ts
type Finding = {
  id: string
  type: 'rule-hit' | 'documentation-gap' | 'practice-pattern' | 'disputed-constellation' | 'possible-unbilled-service'
  authorityLevel: 'primary' | 'interpretive' | 'practice' | 'heuristic'
  confidence: 'high' | 'medium' | 'low'
  autoApplyEligible: boolean
  evidence: Array<{
    kind: 'claim' | 'procedure' | 'template' | 'history' | 'rule'
    ref: string
    summary: string
  }>
  recommendedActionClass: 'auto-apply' | 'manual-review' | 'documentation-only' | 'suppress'
}
```

### 2. Expand proposal schema

The current proposal schema needs more than title and reason. Add:

- `findingId`
- `actionClass`
- `confidence`
- `authorityLevel`
- `preconditions`
- `applyTarget`

Example:

```ts
type ApplyTarget = {
  claimItemId?: string
  procedureId?: string
  tooth?: number
  session?: number | null
}
```

This is materially safer than relying on `existingItemIndex`.

Implement this as a backward-compatible extension first in [src/agent/report-schema.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/report-schema.ts#L1):

- keep current fields valid so existing fixtures still parse
- add the new fields as optional in phase 1
- make them mandatory only after the orchestrator and fixtures are migrated

Strict phase-1 schema additions:

```ts
const authorityLevelSchema = z.enum(['primary', 'interpretive', 'practice', 'heuristic'])
const confidenceSchema = z.enum(['high', 'medium', 'low'])
const actionClassSchema = z.enum([
  'auto-apply',
  'manual-review',
  'request-justification',
  'request-missing-evidence',
  'documentation-only',
  'suppress',
])

const preconditionSchema = z.object({
  code: z.string(),
  label: z.string(),
  satisfied: z.boolean(),
})

const applyTargetSchema = z.object({
  claimItemId: z.string().optional(),
  procedureId: z.string().optional(),
  tooth: z.number().optional(),
  session: z.number().nullable().optional(),
})
```

Required proposal additions:

- `findingId?: string`
- `authorityLevel?: AuthorityLevel`
- `confidence?: Confidence`
- `actionClass?: ActionClass`
- `preconditions?: Precondition[]`
- `applyTarget?: ApplyTarget`
- `autoApplyAllowed?: boolean`

### 3. Add “review-only” proposals

Right now the schema pushes toward direct mutation. You need a first-class non-mutating proposal type:

- `request-justification`
- `request-missing-evidence`
- `manual-review`

That is the right output for many legally disputed or poorly documented cases.

Important:

- review-only proposals should not reuse `billingChange` as a display hint
- if the product wants to show the likely next billing step on a review card, add a display-only text field such as `suggestedActionSummary`
- keep machine-executable mutation fields reserved for `auto-apply` proposals

### 4. Add a strict proposal action matrix

This must be implemented as deterministic policy logic, not left to prompt wording.

| Finding type | Authority | Max severity | Allowed action classes | Billing mutation allowed |
| --- | --- | --- | --- | --- |
| hard exclusion / hard requirement | primary | error | `auto-apply`, `manual-review` | yes, only with exact target binding |
| interpretive GOZ issue | interpretive | warning | `manual-review`, `request-justification`, `documentation-only` | no by default |
| practice rule | practice | suggestion | `manual-review`, `documentation-only`, `suppress` | no |
| heuristic chart cleanup | heuristic | info | `documentation-only`, `suppress` | no |
| documented unbilled service with exact evidence | primary or interpretive | warning | `auto-apply`, `manual-review` | yes, only if evidence is high and target exact |
| possible unbilled service without exact evidence | heuristic or practice | suggestion | `request-missing-evidence`, `manual-review` | no |

Non-negotiable gates:

- `practice` and `heuristic` findings must never emit `remove_code`
- `practice` findings must never emit `error`
- `disputed-constellation` must default to `manual-review`
- `PKV` cases must never receive GKV Mehrkosten proposals
- proposals with `confidence = low` must never be auto-applied

## Concrete Changes To The Tool Flow

### 1. Split `check_documentation` into two steps

Current tool behavior is too easy to misuse. Replace the single flow with:

1. `extract_documentation_state(procedureId | patientId + date)`
2. `check_documentation(code, system, filledFields)`

The second tool should not silently assume that all required fields are missing when `filledFields` is omitted.

Preferred compatibility behavior:

- return `observedFieldState: false`
- return `complete: null`
- return no hard missing-field conclusion
- optionally include a warning message that field-state extraction is required before compliance conclusions

### 2. Add a `bind_targets` step before proposal creation

The system needs a deterministic binder that maps findings to:

- exact claim line
- exact procedure
- exact tooth
- exact session

Without this, accurate fixes are impossible when the same code appears more than once.

### 3. Add a `policy_gate` step before LLM synthesis

This should be a deterministic function, not a prompt instruction.

Examples:

- `practice-rule` cannot emit `error`
- `heuristic` cannot emit `remove_code`
- `disputed-constellation` cannot emit `add_code` or `remove_code` without explicit human confirmation
- `possible-unbilled-service` cannot mutate Claim directly unless chart evidence is marked high-confidence

### 4. Prefer one synthesis pass; allow a second pass only if needed

Recommended shape:

- preferred: one synthesis pass that writes final human-facing proposals from gated findings
- optional second pass: review/QA pass that checks policy compliance and explanation quality only

Do not let any synthesis/review pass call tools freely again. Otherwise it can drift and re-invent logic already filtered out.

### 5. Move core Abrechnung checks out of the model

For `Abrechnung` analysis, the model should not be the first interpreter of raw rules.

Make these deterministic backend steps:

- coverage resolution
- claim-line normalization
- billing rule evaluation via `RuleEngine`
- documentation field extraction
- finding generation
- policy gating
- target binding

The model's responsibility should be reduced to:

- grouping related findings
- phrasing the explanation in German
- drafting the final proposal text
- choosing between already-allowed action classes

That will improve accuracy more than adding more tool freedom.

## Example: How The Improved Flow Would Handle Lukas Berg

### P1: GOZ 0090 + 0100

Current output:

- hard error
- remove `0090`

Improved flow:

1. deterministic detector flags same-session anesthesia constellation
2. authority label marks it as interpretive/disputed, not hard exclusion
3. policy gate marks `autoApplyEligible = false`
4. model emits:
   - `manual-review`
   - `request-justification`
   - optional documentation suggestion to merge anesthesia note

### P2: GOZ 2197 -> add 2020

Current output:

- practice rule becomes direct revenue patch

Improved flow:

1. pattern layer detects historical co-occurrence only
2. no chart evidence of temporary closure is found
3. policy gate suppresses `add_code`
4. model emits either:
   - nothing
   - or `manual review: verify whether temporary cavity closure was actually performed`

### P3: Mehrkostenvereinbarung in PKV case

Current output:

- wrong legal frame becomes a documentation warning

Improved flow:

1. Stage 0 resolves `coverageType = PKV`
2. GKV Mehrkosten rules never enter candidate generation
3. optional PKV information/consent checks run instead
4. result is either no proposal or a correctly framed PKV documentation reminder

## Apply-Safety Improvements

If the product will continue to offer one-click apply, the execution layer needs stronger safeguards than it has now.

### Replace index-based mutation

Do not apply removals by `existingItemIndex`. Bind proposals to a stable claim line identifier captured during analysis.

### Re-resolve targets at apply time

Before mutation:

- fetch live Claim and Procedure resources
- verify every target still matches code, tooth, session, and expected date
- abort individual proposals that no longer match

### Separate “write note” from “change billing”

`flag_unbilled_service` currently behaves like a billing mutation path. That is too aggressive. A chart/document mismatch should not directly become a claim addition unless the proposal was explicitly generated as a verified billing change with high-confidence evidence.

## Strict Implementation Plan

### Phase 1: Contract hardening

Goal: make unsafe ambiguity representable before changing the orchestration.

Files:

- [src/agent/report-schema.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/report-schema.ts#L1)
- [src/agent/proposal-normalizer.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/proposal-normalizer.ts#L1)
- [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L1)

Required changes:

1. Add optional fields: `findingId`, `authorityLevel`, `confidence`, `actionClass`, `preconditions`, `applyTarget`, `autoApplyAllowed`.
2. Add review-only proposal support:
   - proposals without `billingChange` or `documentationChange` must be allowed if `actionClass` is review-oriented.
3. Update normalizer and apply-payload rules:
   - keep review-only and non-auto-apply proposals in the analysis report
   - exclude proposals with `autoApplyAllowed = false` from the auto-apply payload builder
   - dedupe by `findingId` first when present
   - treat same code on different sessions as distinct if `applyTarget.session` differs
4. Apply route must reject:
   - proposals missing an exact target for destructive changes
   - any proposal with `actionClass !== 'auto-apply'`
   - any proposal whose preconditions are unsatisfied

Definition of done:

- schema accepts old fixtures and new enriched fixtures
- review-only proposals render without apply actions
- remove/update actions require exact target metadata

### Phase 2: Canonical case-state builder

Goal: stop making the LLM reconstruct raw billing context from scattered tool responses.

Files:

- [src/agent/index.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/index.ts#L77)
- [src/agent/tools/case-context.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/tools/case-context.ts#L14)
- [src/lib/billing/types.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/lib/billing/types.ts#L1)

Required changes:

1. Replace ad hoc prompt-level context stitching with one canonical `caseState` object.
2. `caseState` must contain:
   - `coverageType`
   - `claimId`
   - `claimItems[]` with stable analysis-scoped `claimItemId`
   - `procedureState[]` with `procedureId`, date, tooth, session, extracted fields
   - `billingHistory[]`
   - `clinicalFindings[]` and `conditions[]`
3. Claim items must preserve:
   - `system`, `code`, `multiplier`, `tooth`, `session`, `quantity`, `note`, `sequence`
4. Stop using array position as the primary mutation handle in analysis.

Recommended `claimItemId` strategy:

- if FHIR item IDs exist, use them
- otherwise derive an analysis-scoped fingerprint from:
  - `claimId`
  - `sequence`
  - `system`
  - `code`
  - `tooth`
  - `session`

Important:

- do not treat a synthetic `claimItemId` as a permanent FHIR identity
- apply preflight must rebind the target against live claim facts using the fingerprint fields

Definition of done:

- every proposal can reference a stable claim/procedure target
- no fix logic depends on `existingItemIndex` as the primary identifier

### Phase 3: Deterministic finding pipeline

Goal: produce structured findings before any proposal text exists.

Files:

- [src/agent/index.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/index.ts#L77)
- [src/agent/tools/billing-validation.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/tools/billing-validation.ts#L23)
- [src/agent/tools/documentation-check.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/tools/documentation-check.ts#L8)
- [src/agent/tools/index.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/tools/index.ts#L1)

Required changes:

1. Introduce deterministic steps before the LLM:
   - `build_case_state`
   - `extract_documentation_state`
   - `detect_billing_findings`
   - `detect_documentation_findings`
   - `detect_pattern_findings`
   - `policy_gate_findings`
   - `bind_targets`
2. `check_documentation` must no longer assume empty fields when `filledFields` is absent.
3. If observed fields are unavailable, emit a finding with:
   - `type = documentation-gap`
   - `authorityLevel = heuristic`
   - `confidence = low`
   - `actionClass = request-missing-evidence`
4. Practice-pattern output must be tagged explicitly as `practice`, never as `primary`.

These should be implemented as orchestrator-internal services first. Exposing them as LLM-callable tools is optional and should only be done for debugging or reuse, not as the primary runtime path.

Strict service contracts:

```ts
extract_documentation_state({
  patientId: string,
  analysisDate: string,
}): {
  procedures: Array<{
    procedureId: string
    date: string
    tooth?: number
    session?: number | null
    templateId?: string
    filledFields: Record<string, unknown>
  }>
}

policy_gate_findings({
  caseState: CaseState,
  findings: Finding[],
}): {
  gatedFindings: Finding[]
  suppressedFindings: Array<{ id: string; reason: string }>
}

bind_targets({
  caseState: CaseState,
  findings: Finding[],
}): {
  boundFindings: Array<Finding & { applyTarget?: ApplyTarget }>
}
```

Definition of done:

- the LLM never sees raw template absence as proof of missing documentation
- every billing proposal derives from a precomputed finding

### Phase 4: Proposal synthesis prompt split

Goal: narrow the model's role to explanation and proposal phrasing.

Files:

- [src/agent/manager.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/manager.ts#L3)
- [src/agent/index.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/index.ts#L87)

Required changes:

1. Replace the current “call tools and create proposals” prompt with a synthesis-only prompt.
2. The prompt must explicitly forbid:
   - inventing new findings
   - changing authority or confidence labels
   - upgrading `manual-review` findings into billing mutations
3. The prompt input should be:
   - canonical case summary
   - gated findings
   - explicit allowed action classes per finding
4. The prompt output should be:
   - enriched proposals only
   - no raw reasoning

Prompt contract:

```text
Du erhältst ausschließlich bereits geprüfte Findings.
Für jedes Finding darfst du nur einen Vorschlag erzeugen, der innerhalb der erlaubten actionClass bleibt.
Wenn actionClass nicht `auto-apply` ist, darfst du keine billingChange erzeugen.
Wenn für einen Review-Fall eine Handlungsempfehlung angezeigt werden soll, formuliere sie nur als Text und nicht als maschinenlesbare Mutation.
Wenn authorityLevel `practice` oder `heuristic` ist, darfst du keine remove_code-Proposals erzeugen.
Du darfst keine neuen Abrechnungsregeln erfinden.
```

Definition of done:

- the model cannot produce direct fixes from unvetted signals
- the same finding always stays within the same action envelope

### Phase 5: Apply preflight and allowlist

Goal: stop unsafe proposals from mutating FHIR state even if they passed UI review.

Files:

- [src/api/apply-routes.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/api/apply-routes.ts#L47)

Required rules:

1. `auto-apply` allowlist:
   - `documentationChange.add_field`
   - `documentationChange.update_field`
   - `billingChange.update_multiplier` only for exact single GOZ target
   - `billingChange.add_code` only when:
     - evidence confidence is high
     - service is documented
     - target tooth/session is exact
   - `billingChange.remove_code` only when:
     - authority is primary
     - target is exact
     - rule is not disputed
2. Never auto-apply:
   - practice-only revenue suggestions
   - disputed GOZ constellations
   - low-confidence missing-documentation findings
   - proposals without `applyTarget`
3. Revalidate live resources before mutation:
   - code still present
   - target still matches tooth/session
   - claim/procedure has not drifted semantically
4. Return per-proposal preflight failure reasons to the UI.

Definition of done:

- destructive apply is impossible without exact target and exact authority
- stale proposals fail closed, not open

### Phase 6: Acceptance tests and fixture policy

Goal: make accuracy regressions visible.

Files:

- [src/agent/__tests__/golden-fixture.test.ts](/Users/reza/Projects/odonathon/odontathon-2026/src/agent/__tests__/golden-fixture.test.ts#L1)
- new tests for policy gate, binder, and apply preflight

Required test matrix:

1. `PKV` composite case must not emit `Mehrkostenvereinbarung`.
2. `GKV` composite Mehrkosten case may emit `Mehrkostenvereinbarung`, but only if insurance context is `GKV`.
3. `0090 + 0100` same mandibular tooth:
   - must not emit hard `remove_code`
   - must emit `manual-review` or `request-justification`
4. `2197` without documented temporary closure:
   - must not emit `add_code 2020`
5. documentation template check without observed `filledFields`:
   - must emit low-confidence evidence request, not hard missing-field proposal
6. exact same code on two sessions:
   - binder must keep targets distinct
7. apply preflight with stale target:
   - mutation must be rejected with explicit reason

Golden fixture assertions should evolve from “schema validates” to:

- expected `actionClass`
- expected `authorityLevel`
- expected `confidence`
- `autoApplyAllowed` correctness
- no forbidden proposal classes in PKV/GKV mismatches

## Delivery Sequence

### Sprint 1

Implement phases 1 and 2.

Expected outcome:

- proposals can represent uncertainty
- apply is safer even before the LLM flow is redesigned

### Sprint 2

Implement phase 3 and phase 4.

Expected outcome:

- the model stops generating first-order billing truth
- false-positive fixes drop materially

### Sprint 3

Implement phase 5 and phase 6.

Expected outcome:

- one-click apply becomes defensible
- regressions are blocked by fixtures and policy tests

## Explicit Non-Goals

To keep this plan focused, do not bundle in:

- diagnosis-documentation expansion
- new GOZ legal content research
- UI redesign beyond showing action class and preflight status
- broad multi-agent reintroduction

## Bottom Line

The product does not primarily need a “smarter model.” It needs a stricter decision pipeline.

The current system is strongest at generating candidate ideas. It is weakest at deciding which of those ideas are safe to turn into concrete fixes.

If you add:

- typed findings
- authority/confidence
- policy gating
- stable target binding
- apply preflight

and enforce the action matrix above,

then the model can stay fast and still become much more reliable.

That is the right direction for better agentic flow in this feature.
