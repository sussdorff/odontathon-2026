# GOZ ETL Pipeline

Gebührenordnung für Zahnärzte — private dental billing catalog.

## Source

Official XML from gesetze-im-internet.de:
https://www.gesetze-im-internet.de/goz_1987/xml.zip

Same pattern as the GOÄ ETL in MIRA (etl/goae/).

## Pipeline

```
parse.ts → data/goz_catalog.json → to_fhir.ts → aidbox/seed/goz-catalog.json
```

## GOZ Structure

- ~380 Gebührenummern (vs ~2,338 in GOÄ)
- Multiplikator: 1.0–3.5× (Standardsatz: 2.3×)
- Sections: A (Allgemein), B (Prophylaxe), C (Konservierend), D (Chirurgisch),
  E (Prothetisch), F (Kieferorthopädie), G (Parodontologie), H (Implantologie),
  J (Funktionsanalytik), K (Analgesie)
- Points-based: Punktzahl × Punktwert (aktuell 5,62421 ct)

## Key Differences to GOÄ

- Zahnspezifische Felder: FDI-Zahnschema, Zahnflächen (okklusal, mesial, etc.)
- Materialkosten: BEL II Laborkosten als separate Position
- Festzuschüsse: ZE-Richtlinie für Zahnersatz (Befund → Regelversorgung → Festzuschuss)
