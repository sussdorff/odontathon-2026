# Lukas Berg Demo Sprint PRD

## Summary

This sprint focuses on one outcome: make invoice analysis feel fast, clear, and trustworthy for one demo case.

The reference case is:

- Patient: `Lukas Berg`
- Patient ID: `patient-berg-lukas`
- Demo goal: show the current case clearly before analysis, prove that the system detects the relevant issues during analysis, and show what changed after apply

This sprint is not about making the analysis system universally flexible. It is about producing one polished, reliable demo flow for the strongest available seeded patient.

## Recommended Reference Case

Use `Lukas Berg` with invoice date `2026-03-10` as the primary sprint demo case.

Why this is the recommended demo path:

- it is already the active browser E2E target
- it has a simpler invoice with 4 visible billing items
- it has dedicated seeded clinical documentation for Zahn 46
- it is easier to explain in a live walkthrough because the clinical story is compact

Keep `2026-02-12` as a secondary regression case for backend and fixture validation, not as the primary demo path.

## Product Goal

At the end of the sprint, a user can open the invoice-analysis flow for Lukas Berg and immediately understand:

1. What the current billing items and clinical documentation look like before analysis
2. Which issues the system detects during analysis
3. What the analysis proposes to change
4. What was actually changed after apply

The experience must be fast enough for a live demo and simple enough that the product feels understandable without explanation from an engineer.

## Why This Sprint

The current implementation is too hard to trust in a demo setting because:

- analysis can take too long
- the UI does not clearly separate current state, detected issues, and applied fixes
- result rendering is not yet reliable enough in end-to-end coverage
- the agent flow includes complexity that does not improve the demo
- users do not get a simple live status of what the system is doing right now

For this sprint, we optimize for demo clarity over generality.

## Scope

### In Scope

- Optimize invoice analysis for the Lukas Berg demo path
- Make the analysis run as fast as reasonably possible for that path
- Present the current billing and documentation state clearly before analysis
- Present proposed fixes clearly after analysis
- Apply approved fixes and show the updated billing items and updated clinical documentation state
- Show a minimal current-status indicator of what the system is doing right now
- Cover the full happy path in end-to-end tests
- Remove unnecessary agentic steps that do not materially improve the Lukas Berg result

### Out of Scope

- General optimization for all patients
- Rich agent audit trails or full reasoning history in the UI
- Practice-specific rules if they do not materially improve this demo
- New diagnosis-documentation product scope
- Broad workflow configuration or orchestration features

## Product Principles

### 1. Demo-first

The Lukas Berg flow is the product target for this sprint. If a tradeoff is required between generality and a stronger Lukas Berg demo, prefer the stronger demo.

### 2. Fast over agentically elaborate

If a step does not add visible value for the user, remove it. We should prefer a shorter and more deterministic analysis path over a more complex multi-agent path.

### 3. Before and after must be obvious

Users should not have to infer what changed. The UI should make the current pre-analysis state, the detected issues, and the post-apply corrected state visually explicit.

### 4. Only show live status, not noise

Users need to know what is happening now, not a long event log. The sprint should ship a minimal current-status view instead of a full execution history.

## Target User Experience

### Step 1: Select Lukas Berg invoice

When the user selects Lukas Berg and the target invoice:

- the invoice items render immediately
- the relevant clinical documentation renders immediately

### Step 2: Review the current case before analysis

Before analysis starts, the user can clearly see:

- the current billing items for the invoice
- the current clinical documentation tied to the invoice

This state should answer the question: "What is the current case before the system analyzes it?"

### Step 3: Run analysis

When analysis starts:

- the system should execute the smallest useful flow
- the UI should show a minimal live status of the current step
- the result should appear quickly enough to feel responsive in a demo

### Step 4: Review proposed fixes

After analysis completes, the UI should clearly show:

- which issues the system detected in the current case
- which billing fixes are proposed
- which documentation fixes are proposed
- which existing items are affected
- what each fix will change

The billing and documentation proposals should read as one synchronized result set for the same case, not as disconnected outputs.

This state should answer the question: "What would the system fix?"

### Step 5: Apply fixes

After the user applies the accepted fixes:

- billing items should reflect the applied changes
- clinical documentation should reflect the applied documentation fixes
- the UI should clearly show which fixes were applied successfully

This state should answer the question: "What changed in the record?"

## Functional Requirements

### A. Speed for the Demo Path

- The Lukas Berg analysis path must be materially faster than the current flow
- The system should avoid unnecessary agent handoffs, retries, or rule passes
- Practice rules should be removed entirely if they are not required for the Lukas Berg demo output
- The implementation may use a narrowed or simplified path for this patient/invoice flow as long as the product behavior remains coherent

### B. Clear Before-Analysis State

Before analysis, the invoice-analysis screen must show:

- the full billing item list for the selected invoice
- the relevant clinical documentation for the selected invoice

The user should be able to explain the case from this state in a demo, but the plan does not require the product to pre-label invalid billing items or invalid documentation before analysis runs.

### C. Clear Post-Analysis State

After analysis, the screen must show:

- the issues detected by analysis for the selected case
- billing proposals grouped with the affected billing items
- documentation proposals grouped with the affected documentation section
- concise descriptions of each proposed fix
- a clear distinction between current data and proposed changes
- a synchronized relationship between billing fixes and documentation fixes when they belong to the same detected problem

### D. Clear Post-Apply State

After apply succeeds, the screen must show:

- the updated billing state
- the updated clinical documentation state
- a visible success state for applied changes

The user should be able to compare the result to the pre-analysis state without ambiguity.

### E. Minimal Live Status

During analysis, the UI must show only the current status, not the full history.

The status component should communicate one active step at a time, such as:

- `Kontext wird vorbereitet`
- `Abrechnung wird geprüft`
- `Dokumentation wird geprüft`
- `Vorschläge werden erstellt`

Requirements:

- no full event log in the main demo flow
- no verbose agent transcript
- no historical list of every prior step
- the current status should update as execution progresses

### F. End-to-End Coverage

The sprint is not complete without end-to-end coverage for the demo path.

The E2E must verify:

1. Selecting Lukas Berg loads the expected invoice and documentation context
2. The before-analysis state clearly renders the current billing items and documentation context
3. Running analysis returns detected issues and proposals successfully
4. Billing proposals render in the expected place
5. Documentation proposals render in the expected place
6. The analysis output demonstrates synchronized billing and documentation fix patches when applicable
7. Applying fixes updates the billing UI
8. Applying fixes updates the documentation UI
9. Changing patient or invoice clears stale results

The E2E should prefer deterministic execution over nondeterministic live-agent behavior whenever possible.

## UX Requirements

### Information Architecture

The screen should be readable in three layers:

1. Current invoice and current documentation
2. Detected issues and proposed changes
3. Applied result

These layers must not blur together.

### Visual Emphasis

The UI should emphasize:

- the current case before analysis
- the issues detected by analysis
- exact proposed fixes after analysis
- exact applied fixes after apply

The user should never need to scan raw logs to understand the state.

### Copy

The product language should be simple and operational:

- before analysis: what is currently documented and billed
- after analysis: what the system detected and what is proposed
- after apply: what was changed

Avoid technical agent terminology in the user-facing flow.

## Technical Direction

### Simplify the Analysis Flow

The default assumption for this sprint is that the current flow is too complex for the demo.

Implementation direction:

- collapse unnecessary agent stages
- remove practice rules if they do not materially improve results
- minimize orchestration overhead
- prefer deterministic and inspectable transformations where possible

### Keep One Narrow Golden Path

This sprint should optimize one golden path:

- Lukas Berg
- selected demo invoice
- fast analysis
- clear proposals
- successful apply

This is preferable to shipping partial support for many broader paths.

## Success Metrics

The sprint is successful if the following are true:

- The Lukas Berg flow completes fast enough to feel immediate in a live demo
- The before-analysis state is understandable enough to explain the case in a demo
- The analysis visibly detects the issues rather than relying on pre-analysis labels
- The post-analysis state clearly demonstrates the fixes
- The post-apply state clearly demonstrates the updated invoice and documentation
- The live status is minimal and useful
- There is no unnecessary visible agent complexity
- The end-to-end test covers the full happy path successfully

## Acceptance Criteria

### Product Acceptance

- A user can select Lukas Berg and see the relevant invoice and clinical documentation immediately
- Before analysis, the UI clearly presents the current billing and documentation state without needing to pre-label issues
- During analysis, the product demonstrates that the system detects the relevant issues
- After analysis, the UI clearly identifies proposed billing fixes and documentation fixes
- The analysis result presents synchronized billing and documentation fix patches when they belong to the same case issue
- After apply, the UI clearly reflects the applied billing changes and applied documentation changes
- The system exposes only a minimal current-status indicator during execution
- Practice rules are removed if they are not necessary for the demo output

### Engineering Acceptance

- The analysis path for the demo case is simplified relative to the current implementation
- The demo path is measurably faster than the current flow
- E2E coverage exists for the Lukas Berg happy path
- E2E coverage validates pre-analysis, post-analysis, and post-apply states
- E2E coverage validates stale-state reset on patient or invoice change

## Risks

- Optimizing too broadly will slow the sprint and weaken the demo outcome
- Keeping unnecessary agent layers will preserve latency and make status harder to explain
- If the UI mixes current state, detected issues, and proposed state, users will not understand the result
- If end-to-end remains nondeterministic, the sprint will not produce a trustworthy demo

## Sprint Deliverables

- One polished invoice-analysis demo flow for Lukas Berg
- Simplified analysis orchestration
- Minimal live-status component
- Clear pre-analysis, post-analysis, and post-apply UI states
- Working apply flow for both billing and documentation updates
- Deterministic end-to-end test coverage for the demo path

## Open Decisions

- Whether the demo path uses a fully deterministic fixture mode or a tightly constrained live analysis mode
- Whether any existing agent step is still required after practice rules are removed
