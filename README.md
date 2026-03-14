# Odontathon 2026 — Dental Billing Voice Agent

Ein sprachgesteuerter Abrechnungs-Agent für Zahnarztpraxen. Hackathon-Projekt für den Odontathon 2026 (Berlin).

**Kernidee:** Zahnarzt spricht am Stuhl → Agent schlägt Abrechnungscodes (GOZ/BEMA) vor → generiert sofort einen Heil- und Kostenplan (HKP). Der Patient verlässt die Praxis mit Preisindikation statt 2 Wochen warten.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Backend:** [Hono](https://hono.dev) (TypeScript)
- **FHIR Server:** [Aidbox](https://www.health-samurai.io/aidbox) (R4 4.0.1)
- **Issue Tracking:** [beads](https://github.com/cognovis/beads) (bd CLI)
- **Lizenz:** MIT

## Schnellstart

### Voraussetzungen

- [Bun](https://bun.sh) (>= 1.0)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [beads](https://github.com/cognovis/beads) (`bd` CLI) — siehe [Installation](#beads-installieren)

### Setup

```bash
# 1. Repository klonen
git clone https://github.com/cognovis/dental-agent.git
cd dental-agent

# 2. Dependencies installieren
bun install

# 3. Environment konfigurieren
cp .env.sample .env
# → Aidbox License Key eintragen (Malte fragen)

# 4. Aidbox starten
docker compose up -d

# 5. Kataloge laden (GOZ, BEMA, Festzuschüsse)
bun run seed:catalogs

# 6. Praxis-Seed-Daten laden (Patienten, Befunde)
bun run seed:practice

# 7. Dev-Server starten
bun run dev
```

### Verfügbare Scripts

| Script | Beschreibung |
|--------|-------------|
| `bun run dev` | Dev-Server mit Hot-Reload |
| `bun run seed:catalogs` | GOZ/BEMA/Festzuschüsse in Aidbox laden |
| `bun run seed:practice` | Praxis + Patienten + Befunde laden |
| `bun run etl:goz` | GOZ-Katalog parsen + FHIR-Bundle erzeugen |
| `bun run etl:bema` | BEMA-Katalog parsen + FHIR-Bundle erzeugen |
| `bun run typecheck` | TypeScript Typ-Checks |
| `bun test` | Tests ausführen |

## Projektstruktur

```
src/
  index.ts               — Hono-Server Entry
  agent/                  — Voice Agent Logik
  lib/
    billing/              — Billing Service + Regeln
    config.ts             — Aidbox-Konfiguration
    fhir-extensions.ts    — FHIR Extension URIs
  seed/                   — Seed-Daten Module
etl/
  goz/                    — GOZ ETL (XML → FHIR)
  bema/                   — BEMA ETL (JSON → FHIR)
aidbox/
  seed/                   — FHIR Seed Bundles
scripts/                  — CLI Scripts
docs/                     — Dokumentation
tests/                    — Tests
```

## Daten im System

Nach dem Seeding hat Aidbox:

| Daten | Menge | Quelle |
|-------|-------|--------|
| GOZ-Positionen | 215 | gesetze-im-internet.de (XML) |
| BEMA-Positionen | ~230 | KZBV (manuell kuratiert) |
| Festzuschuss-Befundklassen | ~50 | KZBV FZ-Kompendium |
| Befund-/Therapiekürzel | ~40 | KZBV Anlage 2 |
| Punktwerte Berlin | pro Kassenart/Bereich | KZV Berlin |
| Patienten | 10 | synthetisch |
| Zahnbefunde | ~350 | synthetisch, realistisch |
| Beispiel-HKPs | 5 | synthetisch |

## Abrechnungs-Glossar

| Abkürzung | Bedeutung |
|-----------|-----------|
| **GOZ** | Gebührenordnung für Zahnärzte (Privatpatienten) |
| **BEMA** | Bewertungsmaßstab zahnärztlicher Leistungen (Kassenpatienten) |
| **HKP** | Heil- und Kostenplan (Zahnersatz-Genehmigung) |
| **FDI** | Zahnschema-Nummerierung (11-48) |
| **BEL II** | Bundeseinheitliches Leistungsverzeichnis (Laborpreise) |
| **KZV** | Kassenzahnärztliche Vereinigung |
| **EBZ** | Elektronisches Beantragungs-/Genehmigungsverfahren |

---

## beads installieren

[beads](https://github.com/cognovis/beads) (`bd`) ist unser Issue-Tracker. Er ist git-basiert und läuft lokal — kein Server, kein Account nötig.

### macOS / Linux

```bash
# Via Homebrew
brew install cognovis/tap/beads

# Oder: Binary direkt herunterladen
# → https://github.com/cognovis/beads/releases/latest
# Binary nach /usr/local/bin/bd verschieben und ausführbar machen
```

### Windows

```powershell
# Option 1: Scoop (empfohlen)
scoop bucket add cognovis https://github.com/cognovis/scoop-bucket
scoop install beads

# Option 2: Binary manuell
# 1. https://github.com/cognovis/beads/releases/latest
# 2. beads_windows_amd64.zip herunterladen
# 3. Entpacken, bd.exe in einen Ordner im PATH legen
#    z.B. C:\Users\<name>\bin\bd.exe
# 4. PATH prüfen: In PowerShell `bd version` ausführen

# Option 3: WSL (Windows Subsystem for Linux)
# In WSL die Linux-Variante installieren (s.o.)
```

### Verifizieren

```bash
bd version
bd doctor     # Prüft ob alles korrekt eingerichtet ist
```

## Mit beads arbeiten

beads trackt alle Aufgaben als Issues mit Dependencies, direkt im Repository.

### Erste Schritte

```bash
# Was gibt es zu tun?
bd ready                    # Zeigt unblockierte, offene Issues

# Issue anschauen
bd show dent-572            # Details, Beschreibung, Abhängigkeiten

# Arbeit starten
bd update dent-572 --status=in_progress

# Arbeit abschließen
bd close dent-572 --reason="GOZ+BEMA Pipeline fertig, 215+230 Positionen"
```

### Neues Issue anlegen

```bash
bd create --title="Voice Input Parser" --type=feature --priority=2 \
  --description="STT-Output in strukturierte Abrechnungscodes übersetzen"
```

### Abhängigkeiten

```bash
bd dep add dent-nmy --depends-on dent-572    # nmy ist blockiert bis 572 fertig
bd blocked                                    # Zeigt alle blockierten Issues
```

### Für KI-Agents (Claude Code)

Agents nutzen beads automatisch — die Konfiguration ist in `CLAUDE.md` und `AGENTS.md` hinterlegt. Agents:

1. Prüfen `bd ready` für verfügbare Arbeit
2. Claimen Issues mit `bd update <id> --status=in_progress`
3. Dokumentieren Fortschritt mit `bd update <id> --append-notes="..."`
4. Schließen mit `bd close <id> --reason="..."`

### Session beenden

```bash
# 1. Offene Issues updaten
bd close <id> --reason="..."

# 2. Code committen + pushen
git add <files>
git commit -m "feat: ..."
git push

# 3. Beads-Daten committen
bd dolt commit
```

> **Kein zentraler Dolt-Server für den Hackathon.** Beads synchronisiert über die JSONL-Datei in `.beads/`, die via git geteilt wird. Das reicht für Team-Arbeit innerhalb eines Hackathon-Tages.

## Challenges

### Challenge 1: "Agent am Stuhl" (Billing Coach) ← unser Fokus

- Behandlungsdoku → sofortige Kostenschätzung
- KI stellt Rückfragen zur Vollständigkeit
- Patient verlässt Praxis MIT Preisindikation

### Challenge 2: "Agent nach dem Stuhl" (Practice Orchestrator)

- Voice-Anweisungen: "Sag Petra, Herr Müller braucht Termin für Füllung"
- Terminbuchung, Dokumentenversand, Recall

## Lizenz

MIT — siehe [LICENSE](LICENSE)
