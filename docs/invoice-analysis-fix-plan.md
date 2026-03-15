# Invoice Analysis Fix Plan

Based on [invoice-analysis-implementation-review.md](./invoice-analysis-implementation-review.md).

---

## Workstream 1: Fix Coverage Type Detection

**Root cause**: `get_case_context` checks `cd.code === 'SEL' || cd.code === 'PPO'` but seeded data uses `code: 'PKV'`. The `/api/patients` endpoint checks `cd.code === 'PKV'` (correct). Two divergent detection paths.

**Requirement** (review:95–100): One shared coverage-type resolver used across UI aggregation, case-context tooling, and all analysis inputs.

### Changes

1. **Create `src/lib/fhir/coverage-type.ts`**:
   ```ts
   const PKV_CODES = new Set(['PKV', 'SEL', 'PPO'])

   /** Resolves GKV vs PKV from a set of Coverage resources.
    *  Iterates all coverages and their codings. Returns PKV if any match. */
   export function resolveCoverageType(coverages: any[]): 'GKV' | 'PKV' {
     for (const cov of coverages) {
       for (const coding of cov?.type?.coding ?? []) {
         if (PKV_CODES.has(coding.code)) return 'PKV'
       }
     }
     return 'GKV'
   }
   ```

2. **Update `src/index.ts` `/api/patients`** (line ~82–86):
   - **Current**: `coverageByPatient` is a `Map<string, any>` that stores only the *last* coverage per patient (`.set()` overwrites).
   - **Fix**: Change to `Map<string, any[]>` that collects all coverages per patient:
     ```ts
     const coveragesByPatient = new Map<string, any[]>()
     for (const e of (covBundle.entry ?? [])) {
       const ref = e.resource.beneficiary?.reference
       if (!ref) continue
       if (!coveragesByPatient.has(ref)) coveragesByPatient.set(ref, [])
       coveragesByPatient.get(ref)!.push(e.resource)
     }
     ```
   - Then: `const coverages = coveragesByPatient.get(ref) ?? []`
   - And: `const coverageType = resolveCoverageType(coverages)`
   - Bonus/extension extraction continues using `coverages[0]` (or the active one) for single-valued fields.

3. **Update `src/agent/tools/case-context.ts`** (line ~31): Replace `coverages.some(...)` with `resolveCoverageType(coverages)` using the same shared import.

4. **Tests** (`src/lib/fhir/__tests__/coverage-type.test.ts`):
   - `[{ type: { coding: [{ code: 'PKV' }] } }]` → `'PKV'`
   - `[{ type: { coding: [{ code: 'GKV' }] } }]` → `'GKV'`
   - `[{ type: { coding: [{ code: 'SEL' }] } }]` → `'PKV'`
   - `[{ type: { coding: [{ code: 'PPO' }] } }]` → `'PKV'`
   - `[]` → `'GKV'`
   - Multi-coverage: `[gkvCov, pkvCov]` → `'PKV'` (PKV found in second)
   - Multi-coverage: `[gkvCov]` → `'GKV'`
   - Malformed: `[{ type: null }]` → `'GKV'`

5. **Regression**: `patient-berg-lukas` returns `coverageType: 'PKV'` from both `/api/patients` and `get_case_context`.

---

## Workstream 2: Full GOÄ Support

**Root cause**: GOÄ is coerced to BEMA in frontend selectors and excluded from backend tool schemas. Review:103–109 requires GOÄ as first-class across **all** relevant schemas.

### Changes (all 9 GOÄ blockers)

| # | File | Line | Current | Fix |
|---|---|---|---|---|
| 1 | `src/lib/billing/types.ts` | 7 | `type BillingSystem = 'GOZ' \| 'BEMA'` | `'GOZ' \| 'BEMA' \| 'GOÄ'` |
| 2 | `src/agent/tools/billing-validation.ts` | 10 | `system: z.enum(['GOZ', 'BEMA'])` in billingItemSchema | Add `'GOÄ'` |
| 3 | `src/agent/tools/catalog-lookup.ts` | 12 | `system: z.enum(['GOZ', 'BEMA'])` | Add `'GOÄ'` + add GOÄ URL prefix (`http://fhir.de/ChargeItemDefinition/goae`) in lookup logic |
| 4 | `src/agent/tools/documentation-check.ts` | 12 | `system: z.enum(['GOZ', 'BEMA'])` | Add `'GOÄ'` |
| 5 | `src/agent/tools/case-context.ts` | ~71 | `includes('goz') ? 'GOZ' : 'BEMA'` | `includes('goz') ? 'GOZ' : includes('goae') ? 'GOÄ' : 'BEMA'` |
| 6 | `src/agent/index.ts` | ~16 | `system: 'GOZ' \| 'BEMA' \| 'GOÄ'` | Verify already correct |
| 7 | `frontend/src/types.ts` | ~44 | `system: 'GOZ' \| 'BEMA'` in `BillingItem` | Add `\| 'GOÄ'` |
| 8 | `frontend/src/components/claim-selector.tsx` | ~12 | `it.system === 'GOÄ' ? 'BEMA'` coercion | Remove coercion, pass `it.system` through |
| 9 | `frontend/src/components/panels/invoice-analysis-panel.tsx` | ~189 | `it.system === 'GOÄ' ? 'BEMA'` coercion | Remove coercion |

### Tests

- `GOÄ 5` preserved as `GOÄ` through: case-context extraction, billing-validation schema, frontend claim selector
- `GOÄ 5000` preserved as `GOÄ` through same paths
- `catalog-lookup` accepts GOÄ system and uses correct URL prefix
- `documentation-check` accepts GOÄ without error (returns "no template" gracefully)
- No proposal claims BEMA/GOZ conflict where only GOÄ radiographs are present

---

## Workstream 3: Preserve Claim Line Identity

**Root cause**: `InvoiceSelect.onChange` strips session, note, quantity, original index. `formatBillingItemsJson` also strips them. Agent can't distinguish multi-session treatments from duplicates.

**Requirement** (review:115–124): Preserve at least index, system, session, quantity, tooth/teeth, note, date.

### Changes

1. **Extend `AnalysisRequest.billingItems`** in `src/agent/index.ts`:
   ```ts
   billingItems: Array<{
     code: string
     system: 'GOZ' | 'BEMA' | 'GOÄ'
     multiplier?: number
     teeth?: number[]
     index?: number          // 0-based original claim item position
     session?: number | null // treatment session number
     note?: string | null    // material/billing note
     quantity?: number
     date?: string           // claim date
   }>
   ```

2. **Extend `BillingItem`** in `frontend/src/types.ts`: Add `session?: number | null`, `note?: string | null`, `originalIndex?: number`.

3. **Update `InvoiceSelect.onChange`** in `invoice-analysis-panel.tsx`: Preserve all fields:
   ```ts
   session: it.session, note: it.note, originalIndex: idx
   ```
   Same fix in `claim-selector.tsx`.

4. **Update `formatBillingItemsJson`** in `src/agent/index.ts`: Include `index`, `session`, `note`, `quantity` in JSON.

5. **Update manager prompt** (`src/agent/manager.ts`): Add session-awareness AND clinical-purpose awareness:
   ```
   ## Sitzungen und klinischer Kontext

   Positionen können denselben Code mehrfach enthalten. Unterscheide:
   - **Gleicher Code, gleiche Sitzung, gleicher Zahn** = mögliches Duplikat → prüfen
   - **Gleicher Code, verschiedene Sitzung** = korrekt (z.B. WKB-Aufbereitung Sitzung 1 + Nachaufbereitung Sitzung 2)
   - **Gleicher Code, verschiedener klinischer Zweck** = korrekt (z.B. GOZ 2197 für Befestigung Füllung + GOZ 2197 für Befestigung Überkappung)
   - **Gleicher Code, verschiedener Zahn** = korrekt

   Nutze session, note, und teeth-Felder um den klinischen Kontext zu bewerten.
   Bei Unsicherheit: Warnung statt Fehler. Nur echte Duplikate als Fehler melden.
   ```

6. **Update compliance agent prompt** (`src/agent/agents/compliance.ts`): Add same session/purpose distinction:
   ```
   Beim Prüfen auf Duplikate: Beachte session-Nummer und Zahnbezug.
   Gleicher Code mit verschiedener session oder verschiedenem Zahn ist KEIN Duplikat.
   Gleicher Code mit verschiedenem note (z.B. verschiedenes Material) kann korrekt sein.
   ```

### Tests

- Multi-session WKB: GOZ 2410 in session 1 and session 2 → no duplicate warning
- Same-session duplicate: GOZ 2197 twice in same session, same tooth → duplicate warning
- Different teeth: GOZ 5010 on tooth 45 and tooth 47 → no duplicate warning
- `existingItemIndex` in proposals matches actual item positions

---

## Workstream 4: Proposal Canonicalization

**Root cause**: No dedup logic. No contradiction-pair detection. Manager prompt has no quality-control instructions. Review:125–134 requires canonical dedup key and contradiction filtering.

### Schema Changes

**Add `session` to `BillingChange`** — required for the canonical key to work.

1. **`src/agent/report-schema.ts`**: Add to `billingChangeSchema`:
   ```ts
   session: z.number().nullable().optional(),
   ```

2. **`frontend/src/types.ts`**: Add to `BillingChange` interface:
   ```ts
   session?: number | null
   ```

### Canonical Key Design

```ts
function canonicalKey(p: Proposal): string {
  const bc = p.billingChange
  const dc = p.documentationChange
  if (bc) {
    const teeth = (bc.teeth ?? []).sort().join(',')
    return `B:${bc.type}:${bc.system}:${bc.code}:${bc.existingItemIndex ?? ''}:${teeth}:${bc.session ?? ''}`
  }
  if (dc) {
    return `D:${dc.type}:${dc.code ?? ''}:${dc.system ?? ''}:${dc.templateId ?? ''}:${dc.fieldId ?? ''}:${p.category}`
  }
  return p.id
}
```

### Implementation: `src/agent/proposal-normalizer.ts`

```ts
export function normalizeProposals(proposals: Proposal[], claimItems: any[]): Proposal[] {
  let result = deduplicateProposals(proposals)
  result = filterContradictionPairs(result)
  result = filterClaimFacts(result, claimItems)
  return result
}
```

**`deduplicateProposals`**: Group by canonical key. Keep highest severity (`error > warning > suggestion > info`).

**`filterContradictionPairs`**: Detect and remove both sides of contradictory pairs. Before matching, **enrich `remove_code` proposals with teeth from claim items** — a `remove_code` proposal only has `existingItemIndex`, so look up `claimItems[existingItemIndex].tooth` to populate the teeth field for matching:
```ts
function enrichRemoveProposals(proposals: Proposal[], claimItems: any[]): void {
  for (const p of proposals) {
    const bc = p.billingChange
    if (bc?.type === 'remove_code' && bc.existingItemIndex != null && !bc.teeth?.length) {
      const item = claimItems[bc.existingItemIndex]
      if (item?.tooth) bc.teeth = [item.tooth]
    }
  }
}
```
Then detect pairs:
- `add_code` and `remove_code` for the same `(system, code, teeth)` → remove both
- `update_multiplier` for a code that's also targeted by `remove_code` → remove the multiplier update

**`filterClaimFacts`**: Remove proposals contradicted by claim contents:
- `add_code` where same `(code, system, tooth)` already exists in `claimItems`
- `remove_code` where `existingItemIndex` is out of range or `undefined`
- `update_multiplier` for non-GOZ items

### Manager Prompt Additions

Add to proposal-shape instructions:
```
## billingChange Pflichtfelder
- Setze billingChange.session wenn die betroffene Position eine Sitzungsnummer hat
- Bei add_code: session angeben wenn der neue Code zu einer bestimmten Sitzung gehört
- Bei remove_code: session aus der zu entfernenden Position übernehmen
- Bei update_multiplier: session der betroffenen Position übernehmen
- Ohne session kann die Duplikaterkennung nicht zwischen Sitzungen unterscheiden
```

Add quality-control section:
```
## Qualitätskontrolle
Vor dem finalen Output:
1. Keine doppelten Proposals (gleicher Code + gleiche Aktion + gleicher Zahn + gleiche Sitzung)
2. Keine Widersprüche (add + remove für gleichen Code/Zahn)
3. Keine Optimierung für bereits abgerechnete Codes (gleicher Code + gleicher Zahn)
4. existingItemIndex: 0-basiert, innerhalb der Rechnungspositionen
5. Jede proposal.id eindeutig (P1, P2, ...)
```

### Tests (`src/agent/__tests__/proposal-normalizer.test.ts`)

- Duplicate proposals (same canonical key) → only highest severity kept
- `add_code` for code already in claim (same tooth) → removed
- `remove_code` with index out of range → removed
- `update_multiplier` for BEMA item → removed
- Different teeth, same code → both kept
- Different sessions, same code → both kept
- Contradiction pair: `add_code(GOZ 0070)` + `remove_code(GOZ 0070)` → both removed
- Contradiction: `update_multiplier(GOZ 2100)` + `remove_code(GOZ 2100)` → multiplier update removed

---

## Workstream 5: Diagnosis-Documentation (Defer with Tracking)

**Decision**: Defer. Not a bug — a product gap.

### Deliverables

1. **Create `docs/diagnosis-documentation-gap.md`**:
   - What it is: Diagnosis-to-procedure mismatch detection, ICD coding validation, diagnosis completeness
   - Why deferred: Architecture is billing-code-driven; Condition data is in context but no diagnosis validator exists
   - Scope for future: Missing Condition detection, weak coding (ICD vs free-text), diagnosis-to-billing mismatch
   - Expected behavior today: Conditions shown in UI context, passed to agents, but not validated

2. **Create tracked follow-up issue**: `feat: Diagnosis-documentation validation support` referencing the gap doc, with acceptance criteria for when the feature is considered done.

3. **Engineering summary note** (`docs/invoice-analysis-fix-summary.md`):
   - Root causes addressed (coverage, GOÄ, claim context, dedup)
   - Test cases added (coverage resolver, GOÄ preservation, proposal normalizer, E2E)
   - Expected final normalized proposal set for Lukas Berg 2026-02-12 (after all fixes + dedup)
   - Diagnosis-documentation: deferred, tracked at [issue ref]

---

## Workstream 6: Deterministic E2E Testing

**Requirement** (review:199–224): Golden report fixtures, browser E2E with frozen analysis responses, review-gate checks.

### 6A: Frozen Analysis Mode

1. **Add fixture storage**: `data/fixtures/patient-berg-lukas/2026-02-12.json` — the normalized, human-reviewed golden report.

2. **Add mock mode to `POST /api/agent/analyze`**: When `AGENT_FIXTURE_MODE=true`:
   - Look up `data/fixtures/{patientId}/{analysisDate}.json`
   - If found: skip agent call, emit `analysis_start` → delay 500ms → emit `analysis_complete` with fixture report
   - If not found: return 404 with clear error
   - Same SSE stream format as real analysis

3. **Golden fixture for Lukas Berg 2026-02-12**: Human-reviewed after all WS1–WS4 fixes applied. Expected properties:
   - `coverageType: 'PKV'`
   - No GKV/Mehrkostenvereinbarung proposals
   - No BEMA/GOZ system conflict proposals
   - GOÄ items referenced as GOÄ
   - No duplicate proposals
   - No contradictory proposals
   - Session-aware duplicate handling

### 6B: Browser E2E Test

1. **Add Playwright**: `frontend/e2e/invoice-analysis.spec.ts`

2. **Test cases** (all against fixture mode, `AGENT_FIXTURE_MODE=true`):

   | Test | Asserts |
   |---|---|
   | PKV badge | Select Lukas Berg → PKV indicator visible |
   | GOÄ rendering | Select 2026-02-12 → GOÄ system badges in billing table (not BEMA) |
   | Proposals render | Click analyze → proposals from fixture appear, count matches fixture |
   | No duplicate cards | DOM query for proposal IDs → no duplicates |
   | Approve/reject → payload | Approve P1+P3, reject P2 → apply request body contains only P1+P3 |
   | Stale reset: patient change | After analysis, change patient → proposals cleared, selectors enabled |
   | Stale reset: invoice change | After analysis, change invoice → proposals cleared, selectors enabled |

### 6C: Review-Gate CI Checks

Pre-merge requirements (all must pass):
1. `bun test` — backend unit + integration (coverage resolver, GOÄ, normalizer tests)
2. `bun run build` — backend builds
3. `cd frontend && npx tsc --noEmit` — frontend type-checks clean
4. `cd frontend && npx vite build` — frontend production build succeeds
5. `cd frontend && bun run test` — frontend Vitest unit tests (store logic, proposal decision state, coverage display)
6. `cd frontend && npx playwright test` — browser E2E passes against fixture mode
7. Golden fixture `data/fixtures/patient-berg-lukas/2026-02-12.json` validates against `complianceReportSchema`

Frontend Vitest tests to add/verify:
- `billing-store.test.ts`: `setSelectedPatientId` clears report; `setSelectedClaimDate` clears report; `setProposalDecision` approve/reject/toggle
- `coverage-display.test.ts`: PKV patient shows PKV indicator; GKV patient shows GKV
- `claim-selector.test.ts`: GOÄ items are not coerced to BEMA

---

## Implementation Order

| Phase | Workstream | Effort |
|---|---|---|
| 1 | WS1: Coverage fix (shared resolver + multi-coverage aggregation) | 45 min |
| 2 | WS2: GOÄ support (all 9 files) | 1 hr |
| 3 | WS3: Claim line context (schema + prompts + session/purpose guidance) | 1 hr |
| 4 | WS4: Proposal canonicalization (schema change + normalizer + tests) | 2 hr |
| 5 | WS6A: Fixture mode + golden report | 1.5 hr |
| 6 | WS6B: Playwright E2E | 1.5 hr |
| 7 | WS5: Diagnosis defer docs + tracked issue + engineering summary | 30 min |

Total: ~8.5 hours

---

## Acceptance Criteria

All from review:234–248:

- [ ] Lukas Berg analyzed as PKV, not GKV
- [ ] Coverage resolver works over full coverage set (multi-coverage aggregation in `/api/patients`)
- [ ] GOÄ items remain GOÄ across all 9 identified files in the analysis path
- [ ] No false BEMA/GOZ conflict proposals for GOÄ radiographs
- [ ] `BillingChange` schema includes `session` field for canonical dedup
- [ ] Proposals are deduplicated (canonical key includes tooth, session, templateId, category)
- [ ] Contradiction pairs (add+remove same code) are detected and removed
- [ ] Optimization proposals not emitted for already-billed services (same code + same tooth)
- [ ] Same-day multi-session reasoning grounded in explicit session/item context
- [ ] Same-code different-clinical-purpose reasoning documented in prompts
- [ ] Deterministic regression tests pass for Lukas Berg (coverage, GOÄ, normalizer)
- [ ] Normalized golden-report fixture exists for Lukas Berg 2026-02-12
- [ ] Browser E2E tests exist and pass against fixture mode (7 test cases)
- [ ] E2E verifies: stale-result reset, approve/reject affects apply payload, no duplicate cards
- [ ] Frontend builds cleanly (`tsc --noEmit` + `vite build`)
- [ ] Backend builds and all tests pass
- [ ] Diagnosis-documentation gap documented with tracked follow-up issue
- [ ] Engineering summary note completed with final Lukas Berg proposal set and issue reference
