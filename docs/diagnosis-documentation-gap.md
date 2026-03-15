# Diagnosis-Documentation Gap

## Status: Deferred

Tracked follow-up: See GitHub issue `feat: Diagnosis-documentation validation support`

## What It Is

The ability to validate diagnosis-related documentation completeness:
- Missing `Condition` resources for documented treatments
- Weak diagnosis coding (free-text vs structured ICD-10)
- Diagnosis-to-procedure mismatch (e.g. billing for caries treatment without a caries diagnosis)
- Diagnosis-to-billing mismatch (e.g. diagnosis present but no corresponding billing code)

## Current Behavior

- `Condition` resources are seeded for 4 patients (Pflegegrad/Eingliederungshilfe conditions)
- `get_case_context` tool returns `conditions` array to agents
- Conditions are shown in the UI case context panel
- **No agent validates diagnosis completeness or correctness**
- No proposal type exists for diagnosis-specific changes

## Why Deferred

The current architecture is billing-code-driven:
- Documentation templates are linked to billing codes, not diagnoses
- The `check_documentation` tool looks up templates by code, not by condition
- The proposal schema supports `billingChange` and `documentationChange` tied to billing codes and templates
- Adding diagnosis validation requires new template types, new tool logic, and new proposal types

This is a product extension, not a bug fix.

## Scope for Future Implementation

1. **Missing Condition detection**: Treatment documented (Procedure exists) but no corresponding Condition resource
2. **Weak coding validation**: Condition exists but uses free-text instead of ICD-10 coding
3. **Diagnosis-to-procedure mismatch**: Condition code doesn't match the treatment type (e.g. K02 caries diagnosis but extraction procedure)
4. **Diagnosis-to-billing mismatch**: Diagnosis exists but required billing codes are missing (e.g. Pflegegrad documented but no Zuschlag codes)

## Seeded Test Scenarios

When implemented, the following seeded patients would be useful:
- **Lukas Berg**: Has `K02.1 Karies des Dentins` condition + composite filling procedure — good for diagnosis-to-procedure match
- **Monika Fischer**: Has Pflegegrad 3 condition — good for Pflegegrad-to-billing validation
- **Gerda Klein**: Has Eingliederungshilfe condition — good for special billing rule validation
