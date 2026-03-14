# BEMA ETL Pipeline

Bewertungsmaßstab zahnärztlicher Leistungen — statutory (GKV) dental billing catalog.

## Source

BEMA is published by KZBV (Kassenzahnärztliche Bundesvereinigung).
Unlike GOÄ/GOZ, there is no official XML download — data comes from PDF or DAISY.

Options:
1. Manual curation from official BEMA-Katalog PDF (~200 positions)
2. Public sources (KZBV website, dental textbooks)
3. DAISY deep-links (no content copying — see .claude/standards/billing/dental-daisy.md)

## Pipeline

```
parse.ts → data/bema_catalog.json → to_fhir.ts → aidbox/seed/bema-catalog.json
```

## BEMA Structure

- ~200 Leistungsnummern (much simpler than EBM)
- Punktzahl-based: Punktzahl × Punktwert (varies by KZV region)
- Sections: 1 (Konservierend-chirurgisch), 2 (Kieferbruch), 3 (Systematische
  Behandlung Parodontopathien), 4 (Kieferorthopädie), 5 (Röntgenleistungen)
- No multiplier (unlike GOZ) — fixed points per position
- Regional variations: Punktwert differs between KZV regions

## Key Differences to EBM

- Much simpler structure (~200 vs ~2,884 positions)
- No exclusion chains (vs EBM's complex Ausschlüsse)
- No Prüfzeiten
- Fixed per-point, no Zuschläge system
