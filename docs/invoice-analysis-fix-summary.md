# Invoice Analysis Fix Summary

## Root Causes Addressed

### 1. Coverage type detection (WS1)
- **Cause**: `get_case_context` checked for `SEL`/`PPO` codes but seeded data uses `PKV`
- **Fix**: Shared `resolveCoverageType()` in `src/lib/fhir/coverage-type.ts`, used by both `/api/patients` and `get_case_context`
- **Additional**: `/api/patients` now collects all coverages per patient (not just the last one)

### 2. GOÄ support (WS2)
- **Cause**: GOÄ coerced to BEMA in 9 places across frontend and backend
- **Fix**: All 9 files updated — `BillingSystem` type, all tool schemas, case-context extraction, frontend selectors
- **Files changed**: `billing/types.ts`, `billing-validation.ts`, `catalog-lookup.ts`, `documentation-check.ts`, `case-context.ts`, `agent/index.ts`, `frontend/types.ts`, `claim-selector.tsx`, `invoice-analysis-panel.tsx`

### 3. Claim line context (WS3)
- **Cause**: Session, note, index stripped when converting claim items to billing items
- **Fix**: `AnalysisRequest` now includes `index`, `session`, `note`, `quantity`. Agent prompts include session-awareness and clinical-purpose distinction
- **Prompt changes**: Manager prompt adds session/purpose guidance and requires `billingChange.session` emission

### 4. Proposal canonicalization (WS4)
- **Cause**: No dedup, no contradiction detection
- **Fix**: `proposal-normalizer.ts` with full pipeline: enrich remove proposals → dedup by canonical key → filter contradiction pairs → filter claim facts
- **Schema change**: Added `session` to `BillingChange` for canonical key support

## Test Cases Added

### Unit tests
- `coverage-type.test.ts`: 9 tests (PKV, GKV, SEL, PPO, empty, multi-coverage, malformed)
- `proposal-normalizer.test.ts`: 13 tests (canonical key, dedup, enrichment, contradiction pairs, claim facts, full pipeline)
- `golden-fixture.test.ts`: 6 tests (schema validation, PKV check, no GKV proposals, no system conflict, no duplicate IDs, GOÄ correctness)

### Golden fixture
- `data/fixtures/patient-berg-lukas/2026-02-12.json`
- Validated against `complianceReportSchema`
- 3 proposals: Ä 1 duplicate removal (warning), WKB documentation gap (warning), GOZ 0070 optimization (suggestion)

### Browser E2E (Playwright)
- `frontend/e2e/invoice-analysis.spec.ts`: 7 test cases
- Runs against fixture mode (`AGENT_FIXTURE_MODE=true`)
- Tests: PKV badge, GOÄ rendering, proposal rendering, no duplicates, approve/reject payload, stale reset (patient change, invoice change)

## Expected Final Proposal Set: Lukas Berg 2026-02-12

After all fixes and normalization:

| ID | Severity | Category | Action | Code | Detail |
|---|---|---|---|---|---|
| P1 | warning | compliance | remove_code | BEMA Ä 1 | Duplicate Beratung in Sitzung 2 (index 12) |
| P2 | warning | documentation | flag_missing_documentation | GOZ 2390 | WKB documentation template incomplete |
| P3 | suggestion | optimization | add_code | GOZ 0070 | Vitalitätsprüfung performed but not optimally billed |

**No** false GKV proposals. **No** BEMA/GOZ system conflicts. **No** duplicate proposals.

## Diagnosis-Documentation

**Status**: Deferred. See `docs/diagnosis-documentation-gap.md`.
**Tracked follow-up**: GitHub issue `feat: Diagnosis-documentation validation support` to be created.

Condition data is available in agent context but no diagnosis-specific validator exists. This is a product extension.
