# Lukas Berg Demo Sprint — Technical Implementation Plan

Based on [lukas-berg-demo-sprint-prd.md](./lukas-berg-demo-sprint-prd.md).

## Design Decisions

### 1. Collapse 4 sub-agents into a single Sonnet call

**Current**: Manager (Sonnet, 15 turns) → spawns 4 sub-agents (2 Sonnet + 2 Haiku) = 5 model invocations with Agent SDK handoff overhead per delegation. Total: 2-4 minutes.

**Proposed**: One Sonnet call with all tools directly available. The model calls `validate_billing`, `check_documentation`, `match_patterns`, `lookup_catalog_code` within a single session using parallel tool use. No delegation overhead.

**Tradeoff**: Lose separation of concerns. For 4 billing items with clinical documentation, a single Sonnet with a merged prompt handles compliance + documentation + optimization in 3-5 tool-calling turns.

**Expected speedup**: 2-4 minutes → 20-40 seconds. Biggest savings from eliminating 4 agent spawns (~15-30s overhead each).

### 2. Drop practice rules

The practice rules sub-agent adds no value for the Lukas Berg demo case. The 5 static rules (GOZ 2197 requires 2020, PKV 2.3x, etc.) are either irrelevant to this case or produce noise. Remove `get_practice_rules` from the tool set.

### 3. Keep match_patterns

Low risk to keep — local in-memory tool (no Aidbox network call). Gives better optimization suggestions for missing optional codes.

### 4. Use fixture mode as default for E2E

Fixture mode already exists. Create a `2026-03-10` fixture. E2E tests drop from 5-minute timeout to 30 seconds. Real-agent tests run separately.

### 5. Minimal status indicator

Four German labels, one at a time:
- `Kontext wird geladen...`
- `Abrechnung wird geprüft...`
- `Dokumentation wird geprüft...`
- `Vorschläge werden erstellt...`

No event log. No agent transcript. Just one line.

### 6. Reseed is mandatory for apply verification

The sprint is not done if apply is only verified through a transient success toast.

We need a deterministic reset loop for Lukas Berg:

- reseed to known baseline
- run analysis
- apply approved changes
- verify persisted Claim and Procedure updates
- reseed again
- verify the baseline is restored

`bun run seed:practice` already performs idempotent PUT upserts for Claims, Procedures, Encounter, Coverage, and patient resources, so it should be the required reset command for demo verification.

---

## Implementation Steps

### Step 1: Merge agent prompts into single prompt

**File: `src/agent/manager.ts`**

Replace `managerPrompt` with a combined prompt that includes:
- Compliance instructions: call `validate_billing`, interpret ruleType results (exclusion, inclusion, requirement, frequency, multiplier)
- Documentation instructions: call `check_documentation` per code, cross-reference Encounters/Procedures, detect unbilled/undocumented services
- Optimization instructions: call `match_patterns` + `lookup_catalog_code` for revenue delta calculations
- Proposal generation: same proposal types (billingChange, documentationChange)
- Session awareness, quality control, output rules — kept as-is

Remove:
- All references to "Sub-Agenten beauftragen"
- Delegation examples
- Sub-agent descriptions

Change `managerAgent`:
- `maxTurns: 8` (from 15)
- Keep `model: 'claude-sonnet-4-6'`

**File: `src/agent/agents/index.ts`**

Export empty: `export const subAgents: Record<string, AgentDefinition> = {}`

This preserves the import chain without breaking anything.

### Step 2: Simplify the orchestrator

**File: `src/agent/index.ts`**

Changes to `createBillingCoach()`:

1. Remove from `allowedTools`:
   - `'dental-billing:get_practice_rules'`
   - `'Agent'`

2. Remove from `disallowedTools` or `tools` config: no need for Agent tool

3. Set `agents: subAgents` (now empty — no delegation possible)

4. Update the initial prompt template:
   - Remove "Delegiere dann an alle 4 Sub-Agenten..."
   - Replace with: "Analysiere die Rechnung direkt mit den verfügbaren Tools."

5. Simplify the message loop:
   - Remove all sub-agent lifecycle tracking (`agentTasks` Map, `task_started`/`task_progress`/`task_notification` handlers)
   - Replace `agent_start`/`agent_progress`/`agent_complete` events with tool-based status mapping:
     - `get_case_context` tool call → emit `analysis_status: "Kontext wird geladen..."`
     - `validate_billing` → emit `analysis_status: "Abrechnung wird geprüft..."`
     - `check_documentation` → emit `analysis_status: "Dokumentation wird geprüft..."`
     - `lookup_catalog_code` or `match_patterns` → keep the most recent relevant label; do not introduce a fourth optimization-only label in the demo UI
     - When entering the `result` handler → emit `analysis_status: "Vorschläge werden erstellt..."`

6. Remove the `console.log('[agent]...')` debug lines

7. Update the fixture-mode branch in `src/api/agent-routes.ts` to emit the same `analysis_status` progression before `analysis_complete`, otherwise fixture-mode E2E will never exercise the status UI.

### Step 3: Update progress events

**File: `src/agent/hooks/progress.ts`**

Add `'analysis_status'` to `ProgressEventType` union.

**File: `src/api/agent-routes.ts`**

The SSE stream already forwards all emitter events. The new `analysis_status` event type will stream automatically.

### Step 4: Update the frontend status display

**File: `frontend/src/components/panels/invoice-analysis-panel.tsx`**

In `AnalyzeBtn`, update the EventSource listeners:

Remove:
- `agent_start`, `agent_progress`, `agent_complete` listeners

Add:
```ts
es.addEventListener('analysis_status', (e) => {
  const d = JSON.parse(e.data)
  setAnalysisStatus(d.label)
})
```

Keep: `analysis_complete`, `analysis_error` listeners.

Update the button's loading state display to show `analysisStatus` as a single status line (already works — `analysisStatus` is shown in the button text).

### Step 5: Refresh the UI after apply

**File: `frontend/src/components/panels/invoice-analysis-panel.tsx`**

The current apply flow shows a success summary, but the plan also requires the updated billing items and updated clinical documentation to be visible afterward.

Add after successful apply:

- invalidate the React Query `['patients']` cache
- refetch patient data
- keep the same selected patient and claim date
- re-derive the visible claim items and procedures from the fresh server state

Without this step, the demo only proves that `/api/claims/apply` returned success, not that the UI reflects the persisted patch.

### Step 6: Create the 2026-03-10 fixture

**File: `data/fixtures/patient-berg-lukas/2026-03-10.json`**

Create a human-reviewed fixture for the demo case. The 2026-03-10 claim has 4 items (GOZ 0010, 0100, 2197, 2020) for a composite filling on Zahn 46, plus clinical documentation (Encounter + Procedure with treatment notes).

Expected proposals based on seeded data:

| ID | Severity | Category | Action | Code | Detail |
|---|---|---|---|---|---|
| P1 | suggestion | optimization | add_code | GOZ 0070 | Vitalitätsprüfung documented (Observation obs-berg-lukas-vitalitaet-46) but not billed |
| P2 | warning | optimization or compliance | add_code | GOZ 2100 | The documented composite filling is missing from the claim and should be added as a billing patch, not only described as a documentation issue |
| P3 | warning | documentation | add_field | — | Add the missing documentation field needed for the same filling case so billing + documentation patches are synchronized |

Do not freeze the fixture from one arbitrary live-agent run.

Allowed workflow:

- run the real agent to explore candidate proposals
- manually review against seeded data and apply semantics
- author the final fixture JSON to match the intended product behavior

The fixture should represent the desired synchronized patch set, not whatever the current model happened to emit on one run.

**File: `src/agent/__tests__/golden-fixture.test.ts`**

Add test for `2026-03-10.json`:
- Schema validates
- `coverageType === 'PKV'`
- No GKV proposals
- Unique proposal IDs
- At least one proposal referencing GOZ 0070

### Step 7: Update E2E tests

**File: `frontend/e2e/invoice-analysis.spec.ts`**

Restructure into two test suites:

```ts
test.describe('Invoice Analysis (fixture mode)', () => {
  test.setTimeout(30_000) // 30 seconds — fixture responds in ~500ms
  // ... all 9 E2E test cases from PRD section F
})

test.describe('Invoice Analysis (real agent)', () => {
  test.skip(true, 'Run manually: AGENT_FIXTURE_MODE=false npx playwright test')
  test.setTimeout(300_000)
  // ... real agent tests
})
```

Fixture-mode test cases (matching PRD F.1-F.9):

1. Select Lukas Berg → loads invoice and documentation context
2. Before-analysis: billing items visible, clinical docs visible
3. Run analysis → proposals appear (from fixture, <5s)
4. Billing proposals render under billing items
5. Documentation proposals render under clinical docs
6. Synchronized billing + documentation proposals for same issue
7. Apply → billing items updated
8. Apply → documentation updated
9. Change patient → stale results cleared

Add reset discipline for any test that applies patches:

- reseed before the apply-verification suite
- reseed again after the suite
- if tests are run against manually started servers, document the reset command explicitly

**Files: `package.json`, `frontend/playwright.config.ts`**

The current Playwright config does not use `webServer`, so do not rely on `webServer.env`.

Instead:

- add a root script such as `dev:fixture` or `test:e2e:fixture:setup` that starts the backend with `AGENT_FIXTURE_MODE=true`
- add a root script such as `reset:demo-data` that runs `bun run seed:practice`
- keep `frontend/playwright.config.ts` aligned with the actual manual-server or scripted-server workflow

---

## File Change Summary

| File | Change |
|---|---|
| `src/agent/manager.ts` | Merge 4 prompts into 1. Remove sub-agent delegation. `maxTurns: 8`. |
| `src/agent/agents/index.ts` | Export empty `subAgents = {}` |
| `src/agent/index.ts` | Remove Agent tool + practice rules. Simplify message loop. Emit `analysis_status` events. |
| `src/agent/hooks/progress.ts` | Add `'analysis_status'` event type |
| `src/api/agent-routes.ts` | Emit `analysis_status` events in fixture mode too |
| `frontend/src/components/panels/invoice-analysis-panel.tsx` | Update SSE listeners for `analysis_status`. Refresh query data after apply. |
| `data/fixtures/patient-berg-lukas/2026-03-10.json` | New fixture for demo case |
| `src/agent/__tests__/golden-fixture.test.ts` | Add 2026-03-10 fixture tests |
| `frontend/e2e/invoice-analysis.spec.ts` | Fixture-mode-first. 9 test cases from PRD. 30s timeout. Includes reset discipline for apply tests. |
| `package.json` | Add `reset:demo-data` and fixture-start helper scripts |
| `frontend/playwright.config.ts` | Keep test runner aligned with the chosen server-start strategy |

---

## Speed Comparison

| Component | Current | After |
|---|---|---|
| Model calls | 5 (manager + 4 sub-agents) | 1 (single Sonnet) |
| Agent handoffs | 4 delegations | 0 |
| Max turns | 15 + 5+3+5+3 | 8 total |
| Tool set | 6 tools + Agent | 5 tools |
| Practice rules | Checked | Removed |
| Expected time | 2-4 minutes | 20-40 seconds |
| E2E test time | 5 min timeout | 30 sec timeout |

---

## Acceptance Criteria (from PRD)

- [ ] Lukas Berg flow completes fast enough for live demo (<60s)
- [ ] Before-analysis state clearly shows billing items + clinical docs
- [ ] During analysis, minimal status line (not event log)
- [ ] After analysis, proposals inline with affected items
- [ ] Synchronized billing + documentation proposals
- [ ] After apply, updated billing and documentation state visible
- [ ] After apply, persisted Claim/Procedure changes verified against fresh server state
- [ ] Reseed restores Lukas Berg to baseline after verification
- [ ] No unnecessary agent complexity visible
- [ ] E2E covers full happy path (fixture mode)
- [ ] Practice rules removed from demo flow

---

## Implementation Order

| Phase | What | Est. |
|---|---|---|
| 1 | Merge agent prompts (`manager.ts` + `agents/index.ts`) | 30 min |
| 2 | Simplify orchestrator (`index.ts` + `progress.ts`) | 45 min |
| 3 | Update frontend status + fixture-mode events | 20 min |
| 4 | Refresh UI after apply | 20 min |
| 5 | Create 2026-03-10 fixture + golden tests | 40 min |
| 6 | Update E2E tests (fixture-first, 9 cases + reseed flow) | 60 min |
| 7 | Manual verification + reseed verification | 25 min |

**Total: ~4 hours**

---

## Open Decision

> Whether the demo path uses a fully deterministic fixture mode or a tightly constrained live analysis mode

**Recommendation**: Use fixture mode for E2E tests and for deterministic demo verification. Use the real agent only for optional rehearsal or live-demo upside. Before any demo or rehearsal that exercises apply, run `bun run seed:practice`, and run it again afterward to restore the baseline.
