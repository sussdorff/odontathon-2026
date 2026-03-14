# Changelog

All notable changes to the Claude configuration will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [CalVer](https://calver.org/) versioning (YYYY.0M.MICRO).

## [Unreleased]

### Added

- **api**: Setup basic agentic flow
- **api**: Setup basic agentic flow

### Maintenance

- **frontend**: Exclude playwright screenshots from git

## [2026.03.9] - 2026-03-14

### Added

- **api**: Setup basic agentic flow
- **billing**: Kostenkalkulator UI + API-Endpunkt (dent-k38)

### Changed

- **api**: In-memory Katalog-Cache + React-Frontend serving

### Documentation

- Frontend-Tech-Stack als TBD markiert (dent-k38)

### Maintenance

- Changelog aktualisiert
- VERSION v2026.03.9

## [2026.03.8] - 2026-03-14

### Added

- **api**: Proxy fhir api auth
- **billing**: Kostenkalkulator GOZ/BEMA/Eigenanteil

### Maintenance

- VERSION v2026.03.8 + changelog

### Merge

- Worktree-bead-dent-fbu — Kostenkalkulator GOZ/BEMA/Eigenanteil

## [2026.03.7] - 2026-03-14

### Added

- **seed**: Past invoice data for pattern-based billing suggestions

### Maintenance

- VERSION v2026.03.7 + changelog

## [2026.03.6] - 2026-03-14

### Added

- **billing**: Bidirektionale Template↔BillingPattern Verknüpfung

### Maintenance

- VERSION v2026.03.5 + fix billing codes in Untersuchung-Template
- VERSION v2026.03.6 + changelog

## [2026.03.5] - 2026-03-14

### Added

- **api**: Add GET rules endpoint
- **billing**: AuB-Abrechnungsregeln + FHIR-Modell für Pflegegrad/Eingliederungshilfe

## [2026.03.4] - 2026-03-14

### Added

- **documentation**: ETL Dokumentationsvorlagen - 17 JSON-Templates + TypeScript-Typen
- **bema**: BEMA-Katalog um 25 fehlende Positionen erweitert (256→281)

### Documentation

- Changelog v2026.03.4

## [2026.03.3] - 2026-03-14

### Added

- **billing**: Rule Engine + BEMA catalog erweitert

### Documentation

- Add AIDBOX_LICENSE_ID to .env.sample

## [2026.03.2] - 2026-03-14

### Added

- Dental catalog ETL pipeline (GOZ, BEMA, Festzuschüsse, Kürzel, Punktwerte)

### Documentation

- Changelog v2026.03.2

### Fixed

- Catalog data quality — GOZ complete at 215, BEMA verified, Festzuschüsse confirmed

### Maintenance

- Merge package.json — add license, seed:practice, keep ETL scripts

### Merge

- Worktree-bead-572 — Dental-Katalog ETL Pipeline (GOZ 215, BEMA 256, Festzuschüsse 48, Kürzel, Punktwerte Berlin)

## [2026.03.1] - 2026-03-14

### Maintenance

- Add data/logs/.claude to gitignore, include beads PRIME.md

### Merge

- Worktree-bead-6y1 — Seed Stammdaten + 15 HKP-Szenarien

## [2026.03.0] - 2026-03-14

### Added

- Project scaffold with Aidbox, dental billing catalogs, and voice agent structure
- **seed**: Stammdaten seed — 15 Orgs/Pract, 10 Patienten, ~100 Zahnbefunde
- **seed**: 15 HKP-Szenarien, szenario-getriebene Befunde, Szenariendokumentation

### Documentation

- README, MIT license, docker-compose port 8085
- Add CHANGELOG.md for v2026.03.0

### Fixed

- **seed**: Cleanup stale Observations per-patient before re-seed

### Maintenance

- Initial commit

