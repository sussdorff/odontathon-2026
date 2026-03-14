## [2026.03.7] - 2026-03-14

### 🚀 Features

- *(seed)* Past invoice data for pattern-based billing suggestions (30 Claims: Kompositfüllung, Brücke, WKB)

## [unreleased]

### 🚀 Features

- *(billing)* Bidirektionale Template↔BillingPattern Verknüpfung
- *(documentation)* ETL Dokumentationsvorlagen - 17 JSON-Templates + TypeScript-Typen
- *(bema)* BEMA-Katalog um 25 fehlende Positionen erweitert (256→281)

### ⚙️ Miscellaneous Tasks

- VERSION v2026.03.5 + fix billing codes in Untersuchung-Template

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
