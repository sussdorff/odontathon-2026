## [unreleased]

### 🚀 Features

- *(api)* Setup basic agentic flow
- *(billing)* Kostenkalkulator UI + API-Endpunkt (dent-k38)

### 🚜 Refactor

- *(api)* In-memory Katalog-Cache + React-Frontend serving

### 📚 Documentation

- Frontend-Tech-Stack als TBD markiert (dent-k38)
## [2026.03.8] - 2026-03-14

### 🚀 Features

- *(api)* Proxy fhir api auth
- *(billing)* Kostenkalkulator GOZ/BEMA/Eigenanteil

### 💼 Other

- Worktree-bead-dent-fbu — Kostenkalkulator GOZ/BEMA/Eigenanteil

### ⚙️ Miscellaneous Tasks

- VERSION v2026.03.8 + changelog
## [2026.03.7] - 2026-03-14

### 🚀 Features

- *(seed)* Past invoice data for pattern-based billing suggestions

### ⚙️ Miscellaneous Tasks

- VERSION v2026.03.7 + changelog
## [2026.03.6] - 2026-03-14

### 🚀 Features

- *(billing)* Bidirektionale Template↔BillingPattern Verknüpfung

### ⚙️ Miscellaneous Tasks

- VERSION v2026.03.5 + fix billing codes in Untersuchung-Template
- VERSION v2026.03.6 + changelog
## [2026.03.5] - 2026-03-14

### 🚀 Features

- *(api)* Add GET rules endpoint
- *(billing)* AuB-Abrechnungsregeln + FHIR-Modell für Pflegegrad/Eingliederungshilfe
## [2026.03.4] - 2026-03-14

### 🚀 Features

- *(documentation)* ETL Dokumentationsvorlagen - 17 JSON-Templates + TypeScript-Typen
- *(bema)* BEMA-Katalog um 25 fehlende Positionen erweitert (256→281)

### 📚 Documentation

- Changelog v2026.03.4
## [2026.03.3] - 2026-03-14

### 🚀 Features

- *(billing)* Rule Engine + BEMA catalog erweitert

### 📚 Documentation

- Add AIDBOX_LICENSE_ID to .env.sample
## [2026.03.2] - 2026-03-14

### 🚀 Features

- Dental catalog ETL pipeline (GOZ, BEMA, Festzuschüsse, Kürzel, Punktwerte)

### 🐛 Bug Fixes

- Catalog data quality — GOZ complete at 215, BEMA verified, Festzuschüsse confirmed

### 💼 Other

- Worktree-bead-572 — Dental-Katalog ETL Pipeline (GOZ 215, BEMA 256, Festzuschüsse 48, Kürzel, Punktwerte Berlin)

### 📚 Documentation

- Changelog v2026.03.2

### ⚙️ Miscellaneous Tasks

- Merge package.json — add license, seed:practice, keep ETL scripts
## [2026.03.1] - 2026-03-14

### 💼 Other

- Worktree-bead-6y1 — Seed Stammdaten + 15 HKP-Szenarien

### ⚙️ Miscellaneous Tasks

- Add data/logs/.claude to gitignore, include beads PRIME.md
## [2026.03.0] - 2026-03-14

### 🚀 Features

- Project scaffold with Aidbox, dental billing catalogs, and voice agent structure
- *(seed)* Stammdaten seed — 15 Orgs/Pract, 10 Patienten, ~100 Zahnbefunde
- *(seed)* 15 HKP-Szenarien, szenario-getriebene Befunde, Szenariendokumentation

### 🐛 Bug Fixes

- *(seed)* Cleanup stale Observations per-patient before re-seed

### 📚 Documentation

- README, MIT license, docker-compose port 8085
- Add CHANGELOG.md for v2026.03.0

### ⚙️ Miscellaneous Tasks

- Initial commit
