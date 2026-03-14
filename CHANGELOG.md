# Changelog — Odontathon 2026 Dental Billing Agent

## v2026.03.0 — 2026-03-14

### Features
- **Seed: Stammdaten** — 15 HKP-Szenarien, 15 Patienten/Coverages, 148 Zahnbefund-Observations, idempotent
- **Seed: Kataloge** — GOZ/BEMA ChargeItemDefinition Bundles via `seed:catalogs`
- **Projekt-Scaffold** — Hono-Backend, Aidbox FHIR R4, ETL-Pipeline (GOZ/BEMA), Voice-Agent-Struktur

### Fixes
- Stale Observations werden vor Re-Seed per Patient bereinigt (Aidbox conditional delete)

### Dokumentation
- `docs/szenarien.md` — 15 HKP-Szenarien für Odontathon-Kollegen dokumentiert

### Szenarien (seed:practice)
| # | Szenario | Patient |
|---|----------|---------|
| 1 | Einfache Brücke, 50% Bonus | Anna Müller |
| 2 | 5-gliedrige Brücke, 60% | Klaus Schmidt |
| 3 | Gleichartige Versorgung (Vollkeramik), 70% | Petra Wagner |
| 4 | PAR + ZE Kombination | Hans-Jürgen Becker |
| 5 | Teilprothese UK | Monika Fischer |
| 6 | Einzelimplantat, andersartig | Mehmet Yılmaz |
| 7 | Traumatischer Frontzahnverlust | Sophie Braun |
| 8 | PKV, 2 Implantate (GOZ) | Wolfgang Schulz |
| 9 | Kronenerneuerung (3× kw) | Fatima Al-Hassan |
| 10 | Teleskopprothese, PKV | Rainer Hoffmann |
| 11 | Freiendlücke beidseits, kein Bonus | Gerda Klein |
| 12 | Kombinierter ZE (Brücke + Teilprothese) | Erika Richter |
| 13 | Agenesie nach KFO | Lukas Berg |
| 14 | Totalprothese nach Parodontitis | Hildegard Vogel |
| 15 | Implantatgetragene Brücke (3 Impl.), PKV | Stefan Weber |
