# German Dentist Review of Invoice Analysis Suggestions

Date: 2026-03-15  
Case reviewed: `patient-berg-lukas` / Lukas Berg  
Coverage type in input: `PKV`  
Analysis date in input: 2026-03-10

## Scope

This note reviews the five generated proposals from the sample analysis from the perspective of a German dentist working under GOZ-oriented billing and documentation rules.

It is an operational billing assessment, not legal advice. Where the analysis engine appears to overstate a rule, I call that out explicitly and tie the conclusion to primary sources from BZÄK, KZBV, and German patient-rights law references reproduced by BZÄK.

## Executive Summary

| Proposal | Engine severity | Assessment | Recommendation |
| --- | --- | --- | --- |
| P1: Remove GOZ 0090 because 0090 and 0100 "must not" be billed together | error | Incorrect as a hard exclusion | Do not auto-apply; convert to manual review with documentation hint |
| P2: Add GOZ 2020 whenever GOZ 2197 exists | warning | Incorrect as a blanket rule | Do not auto-apply; require documented temporary closure |
| P3: Missing Mehrkostenvereinbarung for PKV composite case | warning | Incorrect insurance logic | Replace with PKV cost-information / consent check |
| P4: Missing consent field makes GOZ 0010 formally incomplete | warning | Partly valid, but overstated | Keep only as low-severity documentation reminder |
| P5: Structured surface documentation for MOD / F3 missing | suggestion | Good suggestion | Safe to apply |

## Detailed Review

### P1: GOZ 0090 and 0100 as a hard exclusion

**Engine claim**

The engine treats `GOZ 0090` and `GOZ 0100` as mutually exclusive in the same region and proposes deleting `0090`.

**Why this is not reliable**

BZÄK's Beratungsforum states the opposite: `GOZ 0090` can be billed tooth-/region-same next to `GOZ 0100` if there is a medical necessity. The BZÄK commentary to `GOZ 0100` goes further and says a justification for simultaneous billing is advisable, and gives an example where infiltration is used in the same session in addition to conduction anesthesia.

For tooth `46` in the mandible, the clinical idea behind `0100` is plausible because the BZÄK `0100` commentary explicitly describes mandibular conduction anesthesia. But that does not turn `0090` into an automatic billing error. It only means the case should be justified if both were used.

**Operational conclusion**

- Reject the hard exclusion.
- Replace the rule with: `0090 + 0100 -> allow, but request medical justification and merged anesthesia note`.
- Suggested engine severity: `warning`, not `error`.

**Evidence**

- BZÄK Beratungsforum Beschluss Nr. 52 says `0090` is billable next to `0100` if medically necessary.
- BZÄK `GOZ 0100` commentary says simultaneous billing of `0100` and `0090` may be justified and recommends documenting the reason.
- BZÄK `GOZ 0100` commentary gives a clinical example for combined use in the same session.

**Source links**

- https://www.bzaek.de/goz/beratungsforum/beschluss/goz-nr-0090-und-goz-nr-0100-nebeneinanderberechnung.html
- https://www.bzaek.de/goz/goz-kommentar/allgemeine-zahnaerztliche-leistungen/goz-nr-0100.html

### P2: Add GOZ 2020 whenever GOZ 2197 is present

**Engine claim**

The engine says internal practice rule `pr-001` requires `GOZ 2020` whenever `GOZ 2197` is billed.

**Why this is not reliable**

`GOZ 2020` is not a general companion code for adhesive techniques. It is specifically the temporary saliva-tight closure of a cavity. BZÄK describes it as a temporary closure and gives examples around emergency care, pulp preservation, and endodontics.

BZÄK's `GOZ 2020` commentary says that if, in endodontic treatment, such a closure is adhesively fixed, `2197` can additionally be billed. That is a conditional relationship in a specific scenario. It is not a rule that the presence of `2197` requires `2020`.

The `GOZ 2197` commentary also shows `2020` among additionally billable services, meaning they can be combined if both services were actually provided. It does not support "always add `2020`."

There is also a second problem: BZÄK states that the scope of `GOZ 2197` itself is disputed in some constellations, including billing next to direct composite restorations such as `2100`. That makes a revenue-maximizing auto-add rule especially risky.

**Operational conclusion**

- Reject the blanket add-code rule.
- Only suggest `2020` if the record documents a temporary cavity closure.
- If the actual intent was to check for rubber dam or special cavity measures during composite treatment, evaluate `2040` or `2030` based on documentation, not `2020`.
- Add a separate manual-review rule when `2197` appears together with direct composite codes such as `2100`, because this area is disputed.

**Evidence**

- BZÄK `GOZ 2020` commentary defines the code as a temporary saliva-tight cavity closure.
- BZÄK `GOZ 2020` commentary links `2197` to `2020` only in a specific endodontic constellation.
- BZÄK `GOZ 2197` commentary lists `2020` as an additional billable code, which means optional coexistence when both services were rendered.
- BZÄK information page says the application scope of `2197` is disputed, including next to `2060`, `2080`, `2100`, and `2120`.

**Source links**

- https://www.bzaek.de/goz/goz-kommentar/konservierende-leistungen/goz-nr-2020.html
- https://www.bzaek.de/goz/goz-kommentar/konservierende-leistungen/goz-nr-2197.html
- https://www.bzaek.de/goz/informationen-zur-goz.html

### P3: Missing Mehrkostenvereinbarung in a PKV case

**Engine claim**

The engine says a signed `Mehrkostenvereinbarung` is mandatory in this case because the patient received a composite filling and is marked `PKV`.

**Why this is not reliable**

This mixes up GKV Mehrkosten logic with PKV logic.

KZBV explains that the `Mehrkostenvereinbarung` for fillings applies where an insured person chooses treatment beyond the statutory cash benefit and the statutory portion is still billed to the Krankenkasse. KZBV also provides the corresponding form explicitly under `Vereinbarung von GOZ-Leistungen mit Versicherten der GKV`, including the form named `Vereinbarung gem. § 28 Abs. 2 Satz 2 SGB V (Mehrkosten bei Füllungen)`.

That is not the logic of a pure `PKV` case. For PKV, the more relevant obligations are:

- consent and treatment information under patient-rights law, and
- cost information in text form if full third-party reimbursement is not secured or appears doubtful.

BZÄK's statement on Heil- und Kostenpläne reproduces `§ 630c Abs. 3 BGB`, which requires advance cost information in text form when full coverage by a third party is not assured, and reproduces `§ 630e BGB`, which governs consent-related information.

**Operational conclusion**

- Reject this proposal as written for a `PKV` patient.
- Replace it with insurance-aware logic:
  - `GKV`: check for Mehrkostenvereinbarung when treatment exceeds the GKV benefit.
  - `PKV`: check for documented cost information / treatment information, especially where reimbursement uncertainty exists.
- Never infer a GKV-style Mehrkostenvereinbarung solely from the presence of composite treatment in a PKV case.

**Evidence**

- KZBV describes Mehrkosten in fillings as part of the GKV benefit model.
- KZBV explicitly groups the forms under `GOZ services with GKV insured persons`.
- BZÄK reproduces `§ 630c Abs. 3 BGB` on cost information in text form and `§ 630e BGB` on consent-related information.

**Source links**

- https://www.kzbv.de/patienten/medizinische-infos/karies-und-fuellungen/welche-zahnfuellungen-gibt-es/
- https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/musterformulare-goz-leistungen/
- https://www.bzaek.de/goz/stellungnahmen-zur-goz/stellungnahme/heil-und-kostenplan-1.html

### P4: Missing consent field makes GOZ 0010 formally incomplete

**Engine claim**

The engine says that missing documentation of patient consent makes `GOZ 0010` formally incomplete.

**Why this is only partly right**

Patient consent and patient information are obviously important. But the connection the engine makes to `GOZ 0010` is too strong.

BZÄK's `GOZ 0010` commentary says the finding must be documented and that the dentist determines the form and extent of the documentation. That supports a documentation reminder if the examination record is thin.

However, the source does not say that a dedicated consent checkbox is a billing prerequisite of `GOZ 0010`. Consent is rooted more generally in patient-rights law and should not be modeled as a unique billing condition of the examination code.

**Operational conclusion**

- Keep only as a documentation-quality reminder.
- Lower severity from `warning` to `info` or low-severity `warning`.
- Reframe the message:
  - not "`GOZ 0010` formally incomplete because checkbox missing"
  - but "`Examination documentation lacks explicit consent marker; verify patient information / consent documentation under practice workflow`"

**Evidence**

- BZÄK `GOZ 0010` commentary requires documentation of the findings.
- The same BZÄK commentary leaves form and scope of that documentation to the dentist.
- BZÄK's patient-rights summary ties consent to general treatment information and patient decision-making, not specifically to `GOZ 0010`.

**Source links**

- https://www.bzaek.de/goz/goz-kommentar/allgemeine-zahnaerztliche-leistungen/goz-nr-0010.html
- https://www.bzaek.de/goz/stellungnahmen-zur-goz/stellungnahme/heil-und-kostenplan-1.html

### P5: Missing structured documentation of MOD / F3

**Engine claim**

The engine suggests adding structured surface documentation for the MOD restoration because the free text describes a three-surface filling but the structured field is empty.

**Why this is a good suggestion**

BZÄK describes `GOZ 2100` as the code for preparation and restoration with composite materials in adhesive technique for a three-surface cavity. If the note already says `MOD`, then structured documentation of the three-surface pattern strengthens consistency between free text, structured template data, and the billed `2100`.

This does not create a new billing claim. It improves traceability and defense of the existing claim.

**Operational conclusion**

- Accept and apply.
- Severity is appropriate as `suggestion`.

**Evidence**

- BZÄK `GOZ 2100` commentary identifies the code as the three-surface composite restoration code.
- The BZÄK commentary also ties the code to all three-surface cavities treated in adhesive restoration technique.

**Source link**

- https://www.bzaek.de/goz/goz-kommentar/konservierende-leistungen/goz-nr-2100.html

## System Feedback for the Analysis Engine

### 1. Separate hard law from practice heuristics

The current output mixes three different rule types:

- GOZ billing rules or formal exclusions
- practice-specific habits or revenue heuristics
- documentation quality reminders

These must not share the same severity model.

**Recommended rule classes**

- `hard-rule`: statutory / GOZ exclusion or formal requirement backed by primary authority
- `soft-rule`: expert recommendation or common billing hygiene
- `practice-rule`: internal convention, never auto-applied without configuration ownership
- `documentation-gap`: chart-quality reminder with no automatic billing effect

### 2. Make insurance type a mandatory input into every rule

The `PKV` vs `GKV` distinction is not optional context. It materially changes which agreement and documentation logic applies.

**Required behavior**

- Do not run GKV Mehrkosten rules on PKV cases.
- Do not use wording such as `Mehrkostenvereinbarung` unless the case is actually in the GKV Mehrkosten model.
- When insurance type is unknown, downgrade the suggestion and ask for classification first.

### 3. Ban blanket revenue rules without a documented procedural trigger

`Add 2020 because 2197 exists` is a classic unsafe pattern. A revenue suggestion should only fire when the chart contains the factual predicate for the code.

**Required behavior**

- Every add-code suggestion must reference a concrete chart fact.
- If the required fact is absent, convert the output to a question or review task instead of an add-code proposal.
- Distinguish `co-billable` from `required companion code`. They are not the same.

### 4. Treat disputed GOZ combinations as manual review, not automation

BZÄK explicitly says the scope of `2197` is disputed in some constellations, including next to direct composite codes. That kind of controversy should suppress automation.

**Required behavior**

- Introduce a `disputed-goz-area` flag.
- If a proposal depends on a disputed constellation, the engine must not auto-apply it.
- The UI should show both the pro and contra risk instead of presenting a one-sided revenue opportunity.

### 5. Prefer documentation-merge suggestions over deletion when two steps were clinically performed

In anesthesia workflows, two clinically real steps may justify one combined documentation narrative even if the billing ultimately changes. The current P1 proposal gets the documentation idea partly right but the billing conclusion wrong.

**Required behavior**

- When the engine detects two related anesthesia entries, first ask whether both services were medically necessary and performed.
- Only after that, decide between:
  - keep both with justification,
  - keep one,
  - or request manual review.

### 6. Show the evidence strength behind each suggestion

The user currently sees a confident recommendation, but not the authority level behind it.

**Recommended evidence labels**

- `Primary authority`: GOZ text, BZÄK Beratungsforum, statute
- `Interpretive authority`: BZÄK commentary, KZBV guidance
- `Practice convention`: local rule or historical pattern
- `Heuristic`: chart-cleanup or consistency check

This would make the weak points in P2 and P3 obvious immediately.

## Bottom Line

Only `P5` is safe to apply directly. `P4` can remain as a documentation reminder after wording and severity are reduced. `P1`, `P2`, and `P3` should not be auto-applied in their current form.

The reported net revenue effect in the sample is not reliable because it depends on at least one false hard exclusion (`P1`) and one unsafe add-code rule (`P2`).

## Sources

- BZÄK, GOZ Nr. 0090 und GOZ Nr. 0100 - Nebeneinanderberechnung  
  https://www.bzaek.de/goz/beratungsforum/beschluss/goz-nr-0090-und-goz-nr-0100-nebeneinanderberechnung.html
- BZÄK, GOZ Nr. 0100  
  https://www.bzaek.de/goz/goz-kommentar/allgemeine-zahnaerztliche-leistungen/goz-nr-0100.html
- BZÄK, GOZ Nr. 2020  
  https://www.bzaek.de/goz/goz-kommentar/konservierende-leistungen/goz-nr-2020.html
- BZÄK, GOZ Nr. 2100  
  https://www.bzaek.de/goz/goz-kommentar/konservierende-leistungen/goz-nr-2100.html
- BZÄK, GOZ Nr. 2197  
  https://www.bzaek.de/goz/goz-kommentar/konservierende-leistungen/goz-nr-2197.html
- BZÄK, Informationen zur GOZ  
  https://www.bzaek.de/goz/informationen-zur-goz.html
- BZÄK, Heil- und Kostenpläne  
  https://www.bzaek.de/goz/stellungnahmen-zur-goz/stellungnahme/heil-und-kostenplan-1.html
- BZÄK, GOZ Nr. 0010  
  https://www.bzaek.de/goz/goz-kommentar/allgemeine-zahnaerztliche-leistungen/goz-nr-0010.html
- KZBV, Musterformulare GOZ-Leistungen  
  https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/musterformulare-goz-leistungen/
- KZBV, Welche Zahnfüllungen gibt es?  
  https://www.kzbv.de/patienten/medizinische-infos/karies-und-fuellungen/welche-zahnfuellungen-gibt-es/
