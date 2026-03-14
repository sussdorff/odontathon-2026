# Odontathon 2026 — Dental Billing Voice Agent

> **Recovery**: Run `bd prime` after compaction, clear, or new session

## What This Is

Hackathon project for the Odontathon 2026 (Berlin). A voice-driven billing agent for dental practices.
NOT a fork of MIRA — a standalone project that reuses MIRA's infrastructure patterns (Aidbox, ETL, deployment).

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono (TypeScript) in `src/`
- **FHIR Server**: Aidbox (R4 4.0.1)
- **Voice**: TBD (STT/TTS integration)
- **No Frontend** — voice-first, no Next.js

## Architecture

- **FHIR Store**: Aidbox for dental billing catalogs (GOZ, BEMA) and patient data
- **Billing Catalogs**: GOZ + BEMA as ChargeItemDefinition FHIR resources (same pattern as MIRA's EBM/GOÄ)
- **Agent**: Voice interface → billing code suggestion → HKP generation
- **Local-first**: Agent runs in-practice, no cloud dependency (§203-konform)

## Key Directories

- `etl/goz/` — GOZ catalog ETL (parse → FHIR Bundle)
- `etl/bema/` — BEMA catalog ETL (parse → FHIR Bundle)
- `aidbox/seed/` — FHIR seed data bundles
- `src/agent/` — Voice agent logic
- `src/lib/billing/` — Billing catalog service + rules
- `src/fhir/` — Aidbox FHIR client

## Two Hackathon Challenges

1. **"Agent am Stuhl"** (Billing Coach) — Doku-Analyse, Rückfragen zur Vollständigkeit, Sofort-Kostenschätzung
2. **"Agent nach dem Stuhl"** (Practice Orchestrator) — Voice-Anweisungen, Terminbuchung, Rezeptionsentlastung

Focus for hackathon: Challenge 1 (Billing Coach).

## Commands

- `bun run dev` — Start dev server
- `bun run seed:catalogs` — Load GOZ/BEMA into Aidbox
- `bun run etl:goz` — Parse + convert GOZ catalog
- `bun run etl:bema` — Parse + convert BEMA catalog

## Git / Commits

- **No `Co-Authored-By` line** in commit messages
- Branch naming: typ/kurze-beschreibung

## Beads

- **Kein Dolt Remote** — `bd dolt push` und `bd dolt pull` überspringen. Beads-Daten leben nur lokal.
