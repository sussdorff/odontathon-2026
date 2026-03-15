# Invoice Analysis Implementation Review

## Summary

This document reviews the current invoice-analysis implementation using the Lukas Berg case dated 2026-02-12 as the reference failure. The current implementation should not be treated as production-correct for proposal accuracy. The generated report contains materially wrong recommendations caused by context normalization errors, code-system drift, and insufficient proposal canonicalization.

Engineering should treat this as a correctness and trust issue, not a UI polish issue.

## Reference Case

- Patient: Lukas Berg
- Patient ID: `patient-berg-lukas`
- Invoice date: `2026-02-12`
- Observed result: 11 proposals, including multiple false positives
- User-visible mismatch:
  - UI shows Lukas Berg as `Private Health Insurance`
  - analysis report/log treats Lukas Berg as `GKV`

## What Failed

### 1. Wrong insurance context

The analyzer treats Lukas Berg as `GKV`, but the seeded patient coverage is `PKV`.

Impact:
- Invalid legal/compliance proposals were generated around GKV Mehrkostenvereinbarung.
- The report incorrectly escalated documentation issues that only make sense under the false GKV assumption.

### 2. Wrong code-system normalization

The February 12, 2026 invoice contains `GOÄ 5` and `GOÄ 5000`, but the analysis path treated them as `BEMA 5` and `BEMA 5000`.

Impact:
- The report produced a false “BEMA/GOZ system conflict”.
- The report treated radiographs as if they were BEMA endodontic services.
- Optimization suggested adding radiographs that were already billed.

### 3. Same-day multi-session treatment interpreted as duplicate billing

The source claim models a two-session endodontic case on the same date. The current analysis payload does not preserve enough claim-line context for the agent layer to reliably distinguish:
- true duplicates
- same-day separate sessions
- repeated codes with different treatment roles

Impact:
- Some duplicate flags may still be valid, but current reasoning is not reliable enough to approve automatically.

### 4. Proposal generation lacks contradiction and duplicate control

The current manager path can emit proposals that are:
- based on already-corrupted context
- duplicates in intent
- logically contradictory with the actual claim contents

Impact:
- Users receive overlapping or clearly wrong actions.
- Trust in the review feature degrades quickly.

### 5. Diagnosis-documentation proposals are not currently modeled

The absence of diagnosis-documentation proposals is expected under the current architecture.

Current behavior:
- documentation checks are billing-code-driven
- templates are looked up from billing codes
- proposal schema supports billing changes and documentation changes tied to billing/templates
- `Condition` data is passed into context, but there is no diagnosis-specific validator or proposal type

Conclusion:
- This is a product gap, not necessarily a defect in the current implementation.

## Proposal Review for Lukas Berg

### Likely valid

- Duplicate `Ä 1` removal
- Missing clinical documentation for the endodontic treatment

### Needs manual review

- `GOÄ 5` duplicate handling
- same-day `2020` duplicate handling
- same-day `2197` duplicate handling

These may be partially correct, but current reasoning is not trustworthy because session context is incomplete.

### Should be rejected as currently generated

- `BEMA 5000` duplicate/system-conflict findings
- all GKV / Mehrkostenvereinbarung-based findings
- “missing radiograph billing” optimization

## Root Causes

### A. Coverage-type detection is inconsistent across the product

Different parts of the system use different logic for deriving `GKV` vs `PKV`.

Required direction:
- introduce one shared coverage-type resolver
- use it in UI aggregation, case-context tooling, and all analysis inputs

### B. GOÄ is not preserved end-to-end

Several analysis-facing types and tools only support `GOZ` and `BEMA`, while seeded data and frontend state already include `GOÄ`.

Required direction:
- make `GOÄ` a supported first-class system in all relevant tool schemas, normalization logic, and history extraction
- stop coercing `GOÄ` to `BEMA`

### C. Invoice line context is too lossy for reliable analysis

The analyzer payload currently strips too much structure from claim items.

Required direction:
- preserve at least:
  - original item index
  - system
  - session
  - quantity
  - tooth/teeth
  - note
  - date

### D. Proposal assembly lacks canonicalization

There is no strict manager-side pass that removes:
- duplicate proposals
- contradictory proposals
- proposals invalidated by current claim facts

Required direction:
- normalize proposals before returning the report
- define a canonical dedup key across billing and documentation proposals

## Engineering Work Required

### Workstream 1: Fix context correctness

- unify coverage-type resolution behind one shared helper
- update case-context extraction to use the same helper as patient aggregation
- add regression coverage for `patient-berg-lukas` returning `PKV`

### Workstream 2: Add full GOÄ support to analysis

- update billing-system types to include `GOÄ` where appropriate
- update tool schemas that currently only allow `GOZ` and `BEMA`
- preserve `GOÄ` in billing history, case context, and invoice-analysis payloads
- audit any frontend mapping that converts `GOÄ` to `BEMA`

### Workstream 3: Preserve claim-line identity and session semantics

- include claim item index and session metadata in analyzer requests
- update agent prompts to distinguish:
  - same code, same date, same session
  - same code, same date, different session
  - same code, different clinical purpose
- ensure manager proposals reference the precise line being changed

### Workstream 4: Add proposal deduplication and contradiction checks

- implement canonical proposal normalization before final report emission
- reject duplicate proposals with the same target action
- reject proposals contradicted by already-billed lines
- reject optimization suggestions for already-present codes

### Workstream 5: Define diagnosis-documentation support

This should be implemented as an explicit product extension, not bundled into the bug fix silently.

Required scope:
- define what constitutes a diagnosis-documentation issue
- decide whether diagnosis proposals target:
  - missing `Condition`
  - weak diagnosis coding
  - diagnosis-to-procedure mismatch
  - diagnosis-to-billing mismatch
- extend report schema with a diagnosis-aware documentation action if needed
- add at least one seeded scenario where diagnosis proposals are expected

## Testing Strategy

### 1. Unit and integration tests

Add deterministic tests for:
- coverage-type resolution
- case-context extraction for Lukas Berg
- GOÄ preservation in history and active invoice items
- proposal deduplication logic
- contradiction filtering

Minimum regression cases:
- Lukas Berg on `2026-02-12` returns `PKV`
- `GOÄ 5` remains `GOÄ`
- `GOÄ 5000` remains `GOÄ`
- no proposal suggests adding radiographs when they already exist
- no proposal claims a BEMA/GOZ conflict where only GOÄ radiographs are present

### 2. Golden report fixtures

Introduce reviewed fixture outputs for seeded patients.

Recommendation:
- add a normalized expected report fixture for Lukas Berg
- compare on semantic content, not raw LLM wording
- assert:
  - expected proposal IDs or normalized proposal keys
  - no duplicate actions
  - no forbidden false positives

### 3. Browser end-to-end flow

Add a real invoice-analysis E2E flow for the frontend.

The E2E should verify:
- selecting Lukas Berg and invoice `2026-02-12` loads the expected claim
- analysis results render once per proposal
- duplicate cards do not appear
- approve/reject state changes the apply payload
- stale results do not persist across patient/invoice changes

Important:
- accuracy should not be verified against a live nondeterministic model in CI
- E2E should run against deterministic fixtures, mocked agent outputs, or a frozen analysis-response mode

### 4. Review-gate checks

A fix is not ready for review unless it passes:
- backend test suite for analysis-related cases
- frontend build
- frontend test suite
- new deterministic invoice-analysis E2E flow

## Acceptance Criteria

The work is complete when all statements below are true:

- Lukas Berg is analyzed as `PKV`, not `GKV`
- `GOÄ` items remain `GOÄ` throughout the analysis path
- the system does not emit false BEMA/GOZ conflict proposals for GOÄ radiographs
- proposals are not duplicated
- optimization proposals are not emitted for already-billed services
- same-day multi-session reasoning is grounded in explicit session/item context
- deterministic regression coverage exists for the Lukas Berg case
- browser E2E coverage exists for the invoice-analysis flow
- diagnosis-documentation behavior is explicitly documented as either:
  - supported with tests
  - not yet supported, with a tracked follow-up issue

## Requested Engineering Deliverables

- code changes for the four workstreams above
- test coverage for deterministic regression and E2E verification
- one short engineering note summarizing:
  - root cause addressed
  - test cases added
  - expected final proposal set for Lukas Berg
  - whether diagnosis-documentation support was added or deferred

## Follow-Up Review

Once engineering completes the work, the next review should include:
- updated Lukas Berg analysis output
- exact proposal list after normalization
- test results for unit, integration, and E2E coverage
- confirmation that no duplicate or contradictory proposals remain
