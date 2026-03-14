# HKP-Szenarien — Odontathon 2026

## Überblick

Dieses Dokument beschreibt die 15 Patientenszenarien, die als Seed-Daten für den Dental Billing Voice Agent verwendet werden. Jeder Patient repräsentiert einen klar definierten HKP-Fall (Heil- und Kostenplan Zahnersatz).

Die Szenarien decken die wichtigsten Versorgungstypen in der deutschen Zahnarztpraxis ab:
- GKV-Patienten mit verschiedenen Bonusstufen (50 %, 60 %, 70 %)
- PKV-Patienten (GOZ-Abrechnung, kein Festzuschuss)
- Brücken, Teilprothesen, Totalprothesen, Implantate, Teleskopprothesen
- Kronenerneuerungen, PAR-Vorbehandlungen, Extraktionen

### Zahnbefund-Codes (FDI-Notation)

| Code | Bedeutung | Kürzel im ZE-Heil- und Kostenplan |
|------|-----------|-----------------------------------|
| `absent` | Zahn fehlt (Lücke, noch nicht versorgt) | — |
| `crown-intact` | Vorhandene Krone intakt | k |
| `crown-needs-renewal` | Krone erneuerungsbedürftig | kw |
| `implant-with-crown` | Implantat mit Suprakonstruktion vorhanden | ix |
| `implant` | Implantat ohne Suprakonstruktion | i |
| `filled` | Füllung vorhanden (mit Flächenangabe) | f |
| `carious` | Kariöser Zahn (Sanierung vor ZE erforderlich) | c |
| `bridge-anchor` | Zahn dient als Brückenanker (wird präpariert) | — |
| `replaced-bridge` | Zahn durch Brückenglied ersetzt | b |

---

## Szenario 1: Einfache 3-gliedrige Brücke (50 % Bonus)

**Patient:** Anna Müller, 28 Jahre, weiblich
**Versicherung:** TK (GKV), kein Bonusheft
**Festzuschuss:** 50 % des Regelversorgungsbetrags

**Situation:** Zahn 46 (unterer rechter Sechser) durch Unfall verloren. Nachbarzähne 45 und 47 als Brückenanker geeignet. Weisheitszähne 18, 28, 38, 48 nicht angelegt.

**Zahnbefund:**
- 46 = fehlend (Lücke)
- 45, 47 = Brückenanker
- 18, 28, 38, 48 = fehlend (Agenesie/Extraktion)

**HKP-Typ:** Dreigliedrige Brücke 45-46-47, Regelversorgung (Metallkeramik)
**Eigenanteil:** Hoch (kein Bonus)
**Besonderheit:** Klassischer Erstfall — häufigster HKP in der Praxis. Idealer Ausgangsfall für das Billing-Coach-Training.

---

## Szenario 2: 4-gliedrige Brücke (60 % Bonus)

**Patient:** Klaus Schmidt, 35 Jahre, männlich
**Versicherung:** AOK Nordost (GKV), 5 Jahre Bonusheft
**Festzuschuss:** 60 % des Regelversorgungsbetrags

**Situation:** Zähne 35 und 36 (unterer linker Prämolar und Sechser) fehlen. 34 und 37 als Anker. Vorhandene Krone auf 46. Mehrere Füllungen.

**Zahnbefund:**
- 35, 36 = fehlend (Lücken)
- 34, 37 = Brückenanker
- 46 = Krone intakt
- 16, 26 = Füllungen

**HKP-Typ:** 4-gliedrige Brücke 34-35-36-37, Regelversorgung
**Besonderheit:** Zweigliedrige Lücke — etwas aufwändiger als Szenario 1. Bonus-Nachweis wichtig für Kostenschätzung.

---

## Szenario 3: Gleichartige Versorgung Vollkeramik (70 % Bonus)

**Patient:** Petra Wagner, 52 Jahre, weiblich
**Versicherung:** Barmer (GKV), 10 Jahre Bonusheft
**Festzuschuss:** 70 % des Regelversorgungsbetrags

**Situation:** Zahn 26 fehlt. Patient wünscht Vollkeramikbrücke (ästhetisch). Zusätzlich Kronenerneuerungen bei 36 und 46 (kw). Zahn 13 kariös — Sanierung vor ZE.

**Zahnbefund:**
- 26 = fehlend (Brückenlücke)
- 25, 27 = Brückenanker
- 36, 46 = Krone erneuerungsbedürftig (kw)
- 16 = Krone intakt
- 13 = kariös
- 15, 14 = Füllungen

**HKP-Typ:** Brücke 25-26-27 (gleichartige Versorgung — Vollkeramik) + Kronenerneuerungen 36 und 46
**Besonderheit:** "Gleichartige Versorgung" = Mehrkosten für Vollkeramik gehen über Regelversorgung hinaus, aber Festzuschuss bleibt auf Regelversorgungsniveau. Sanierung 13 ist Voraussetzung für ZE-Genehmigung.

---

## Szenario 4: Komplexer ZE mit PAR-Vorbehandlung (70 % Bonus)

**Patient:** Hans-Jürgen Becker, 63 Jahre, männlich
**Versicherung:** AOK Nordost (GKV), 10+ Jahre Bonusheft
**Festzuschuss:** 70 % des Regelversorgungsbetrags

**Situation:** Schwere Parodontitis. 35, 36, 45, 46 fehlen. Zähne 37 und 47 parodontal vorgeschädigt und kronenerneuerungsbedürftig — können erst nach PAR-Sanierung als Brückenanker dienen. Zähne 14 und 24 kariös.

**Zahnbefund:**
- 35, 36, 45, 46 = fehlend
- 37, 47 = Krone erneuerungsbedürftig (kw, PAR-geschädigt)
- 16, 26, 17 = Kronen intakt
- 14, 24 = kariös
- 15, 25 = Füllungen

**HKP-Typ:** ZE erst nach PAR-Sanierung (UPT-Abschluss). Großer HKP: 4-gliedrige Brücken UK beidseits + Kronenerneuerungen 37 und 47.
**Besonderheit:** PAR-Systemik erfordert zwingend Vorbehandlung. Der Billing Coach muss auf fehlende PAR-UPT hinweisen. Kariessanierung 14+24 ebenfalls Voraussetzung.

---

## Szenario 5: Teilprothese Unterkiefer Kennedyklasse I (70 % Bonus)

**Patient:** Monika Fischer, 71 Jahre, weiblich
**Versicherung:** TK (GKV), 10+ Jahre Bonusheft
**Festzuschuss:** 70 % des Regelversorgungsbetrags

**Situation:** Umfangreicher Zahnverlust im Unterkiefer — beidseits freiendig (kein distaler Anker vorhanden). Brücke nicht möglich. Oberkiefer weitgehend intakt mit Kronen.

**Zahnbefund:**
- UK fehlend: 35, 36, 37, 45, 46, 47
- OK: 16, 26, 17, 27 = Kronen intakt
- OK: 15, 25, 14 = Füllungen

**HKP-Typ:** Schleimhautgetragene Teilprothese UK Kennedyklasse I (beidseits Freiend)
**Besonderheit:** Freiend-Situation = keine Brücke möglich. Kennedyklasse I erfordert beidseitige Abstützung über Sattelprothese. Wichtig für Aufklärung: Weniger stabile Versorgung als festsitzend.

---

## Szenario 6: Einzelimplantat UK (60 % Bonus)

**Patient:** Mehmet Yılmaz, 42 Jahre, männlich
**Versicherung:** AOK Nordost (GKV), 5 Jahre Bonusheft
**Festzuschuss:** 60 % des Regelversorgungsbetrags (bezogen auf Regelversorgungsbetrag, nicht auf Implantatkosten)

**Situation:** Zahn 46 seit 2 Jahren verloren. Patient wünscht Implantat als andersartige Versorgung. GKV übernimmt Festzuschuss auf Regelversorgungsniveau; Implantatzuzahlung trägt Patient selbst.

**Zahnbefund:**
- 46 = fehlend (Implantat geplant)
- 36 = Krone intakt
- 16, 26, 15, 25, 14 = Füllungen

**HKP-Typ:** Einzelimplantat 46 (andersartige Versorgung, GOZ-Positionen)
**Besonderheit:** Wichtige Aufklärung: GKV zahlt Festzuschuss auf Regelversorgungsbetrag — nicht auf tatsächliche Implantatkosten. Differenz ist privat.

---

## Szenario 7: Frontzahn-Implantat (50 % Bonus)

**Patient:** Sophie Braun, 25 Jahre, weiblich
**Versicherung:** Barmer (GKV), kein Bonusheft
**Festzuschuss:** 50 % des Regelversorgungsbetrags

**Situation:** Sportunfall, Zahn 21 (oberer linker mittlerer Schneidezahn) traumatisch verloren. Implantat im Frontzahnbereich — ästhetisch hochrelevant. Kein Bonusheft bisher.

**Zahnbefund:**
- 21 = fehlend (Traumaverlust, Implantat geplant)
- 46, 36 = Füllungen

**HKP-Typ:** Einzelimplantat 21 (Frontzahn, andersartige Versorgung)
**Besonderheit:** Frontzahnimplantat stellt hohe ästhetische Anforderungen (Gingivamanagement, Provisorium während Einheilzeit). Trotz Jugend kein Bonus → hoher Eigenanteil.

---

## Szenario 8: PKV — 2 Implantate + vorhandene Implantate (PKV, GOZ)

**Patient:** Wolfgang Schulz, 58 Jahre, männlich
**Versicherung:** Signal Iduna (PKV)
**Festzuschuss:** Keiner (PKV, Kostenerstattung nach GOZ)

**Situation:** 36 und 46 fehlen (neu zu implantieren). 37 und 47 bereits mit Implantaten und Suprakonstruktionen versorgt. Viele Kronen im Mund.

**Zahnbefund:**
- 36, 46 = fehlend (Implantate geplant)
- 37, 47 = Implantat mit Krone (ix, bereits vorhanden)
- 16, 26, 17 = Kronen intakt
- 18, 28, 48 = fehlend (Weisheitszähne)
- 15, 25, 14, 24 = Füllungen

**HKP-Typ:** 2 Implantate 36 + 46, GOZ-Abrechnung (§ 5 GOZ, Steigerungsfaktoren individuell)
**Besonderheit:** PKV-Patient = keine Festzuschüsse, volle GOZ-Abrechnung. Implantatchirurgie, Aufbau und Suprakonstruktion werden separat berechnet. Previouse Implantate dokumentiert.

---

## Szenario 9: 3 Kronenerneuerungen (60 % Bonus)

**Patient:** Fatima Al-Hassan, 33 Jahre, weiblich
**Versicherung:** TK (GKV), 5 Jahre Bonusheft
**Festzuschuss:** 60 % des Regelversorgungsbetrags

**Situation:** 3 alte Kronen erneuerungsbedürftig (kw) — kein neuer Zahnersatz, aber HKP für Kronenerneuerungen. Kein Zahnverlust.

**Zahnbefund:**
- 16, 26, 36 = Krone erneuerungsbedürftig (kw)
- 46, 14, 24, 25, 15 = Füllungen

**HKP-Typ:** 3 Kronenerneuerungen (kw → k), Regelversorgung
**Besonderheit:** Reine Kronenerneuerung ohne Zahnverlust — häufig unterschätzt in der Praxisplanung. Alle drei Kronen in einer Behandlungsphase planbar.

---

## Szenario 10: PKV — Implantatgetragene Teleskopprothese UK (PKV, GOZ)

**Patient:** Rainer Hoffmann, 67 Jahre, männlich
**Versicherung:** Signal Iduna (PKV)
**Festzuschuss:** Keiner (PKV, Kostenerstattung nach GOZ)

**Situation:** Massiver Zahnverlust UK. Implantate 35 und 45 bereits als Teleskoppfeiler gesetzt. 36, 37, 46, 47 fehlen (Sattelbereich). OK: 4 Kronen als Prothesenpfeiler.

**Zahnbefund:**
- 35, 45 = Implantat mit Krone (ix, Teleskoppfeiler)
- 36, 37, 46, 47 = fehlend (Sattelbereich)
- 16, 26, 17, 27 = Kronen intakt (Teleskopträger)
- 18, 28, 38, 48 = fehlend (Weisheitszähne)

**HKP-Typ:** Implantatgetragene Teleskopprothese UK (GOZ §§ 8000 ff.)
**Besonderheit:** Hochkomplexe Versorgung. Teleskopkronen auf Implantaten als Verankerung. PKV-Abrechnung nach GOZ Abschnitt H. Höchstes Honorarpotential.

---

## Szenario 11: Freiend UK, Teilprothese, kein Bonusheft (50 %)

**Patient:** Gerda Klein, 68 Jahre, weiblich
**Versicherung:** AOK Nordost (GKV), kein Bonusheft
**Festzuschuss:** 50 % des Regelversorgungsbetrags

**Situation:** UK beidseits freiendig — keine distalen Anker vorhanden. Brücke nicht möglich. GKV-Patientin ohne Bonusheft (Bonus nicht geführt).

**Zahnbefund:**
- UK fehlend: 36, 37, 38, 46, 47, 48
- OK: 16, 26 = Kronen intakt (Prothesenverankerung)
- UK: 35, 45 = Brückenanker (Prothesenhalter/Klammerzähne)
- 15, 25 = Füllungen

**HKP-Typ:** Schleimhautgetragene Teilprothese UK Kennedyklasse I
**Besonderheit:** Ähnlich Szenario 5, aber ohne Bonus → höherer Eigenanteil. Patientin hat Bonusheft nicht geführt — wichtige Aufklärung über zukünftigen Bonusaufbau.

---

## Szenario 12: Kombinierter ZE Brücke OK + Prothese UK (70 % Bonus)

**Patient:** Erika Richter, 65 Jahre, weiblich
**Versicherung:** Barmer (GKV), 10 Jahre Bonusheft
**Festzuschuss:** 70 % des Regelversorgungsbetrags

**Situation:** Oberkiefer: 15 und 16 fehlen — festsitzende Brücke 14-15-16-17 möglich. Unterkiefer: 35, 36, 45, 46 fehlen mit Freiend-Anteilen — kombinierte Prothese (Brücke + Teleskop-Prothese).

**Zahnbefund:**
- OK fehlend: 15, 16
- OK Anker: 14, 17 = Brückenanker
- UK fehlend: 35, 36, 45, 46
- UK Halter: 34, 44 = Brückenanker/Prothesenhalter
- Verbleibend: 26, 27, 37, 47 = Kronen intakt

**HKP-Typ:** Brücke 14-15-16-17 (OK) + Kombinierte Prothese UK
**Besonderheit:** Komplexer Gesamtplan — zwei Kiefer, verschiedene Versorgungsformen. Sorgfältige Priorisierung und Planung der Behandlungsabfolge nötig.

---

## Szenario 13: Einzelimplantat Agenesie-Lücke (50 %)

**Patient:** Lukas Berg, 22 Jahre, männlich
**Versicherung:** TK (GKV), kein Bonusheft
**Festzuschuss:** 50 % des Regelversorgungsbetrags

**Situation:** Nach KFO-Behandlung. Zahn 35 nie angelegt (Agenesie/Hypodontie). Implantat nach Wachstumsabschluss nun möglich und geplant.

**Zahnbefund:**
- 35 = fehlend (Agenesie, Implantat geplant)
- 45, 36 = Füllungen (kontralateral/benachbart)

**HKP-Typ:** Einzelimplantat 35 (andersartige Versorgung, Agenesie-Indikation)
**Besonderheit:** Agenesie ist anerkannte Implantatindikation. Junger Patient — kein Bonusheft → 50 %. Wichtig: Röntgennachweis der Agenesie und Wachstumsabschluss dokumentieren.

---

## Szenario 14: Totalprothese UK nach Extraktion (50 %)

**Patient:** Hildegard Vogel, 72 Jahre, weiblich
**Versicherung:** AOK Nordost (GKV), kein Bonusheft
**Festzuschuss:** 50 % des Regelversorgungsbetrags

**Situation:** Schwere generalisierte Parodontitis. UK fast zahnlos — nur noch 33 und 43 als stark parodontal geschädigte Restzähne. Extraktion und Totalprothese UK geplant. OK: Totalprothese bereits vorhanden.

**Zahnbefund:**
- UK Restpfeilerzähne: 33, 43 = Krone erneuerungsbedürftig (paro-geschädigt, Extraktionskandidaten)
- UK fehlend: 31, 32, 41, 42, 34, 35, 36, 37, 44, 45, 46, 47

**HKP-Typ:** Extraktion 33 und 43, anschließend Totalprothese UK
**Besonderheit:** Komplexe Entscheidung: Wann Extraktion der Restzähne, wann Prothese anfertigen. "Sofortprothese" vs. "verzögerter Prothese". Patientin ohne Bonus → hoher Eigenanteil.

---

## Szenario 15: PKV — 3 Implantate + verblockte implantatgetragene Brücke (PKV, GOZ)

**Patient:** Stefan Weber, 48 Jahre, männlich
**Versicherung:** Signal Iduna (PKV)
**Festzuschuss:** Keiner (PKV, GOZ-Abrechnung)

**Situation:** OK Seitenzähne 14, 15, 16 fehlen. Patient wünscht implantatgetragene verblockte Brücke (Premiumversorgung, PKV übernimmt alles).

**Zahnbefund:**
- 14, 15, 16 = fehlend (Implantate geplant)
- 13, 17 = Kronen intakt (Brückenabschluss)
- 36, 46 = Kronen intakt (UK)
- 26, 24, 25 = Füllungen

**HKP-Typ:** 3 Implantate 14 + 15 + 16 + verblockte implantatgetragene Brücke (GOZ Abschnitt D und H)
**Besonderheit:** Höchste Versorgungsqualität — PKV-Patient wünscht Premiumversorgung. 3 Implantate + verblockte Suprakonstruktion = hoher Planungsaufwand. Implantatchirurgie in Phasen möglich (Sinuslift?).

---

## Anhang: Versicherungsstatus der Patienten

| Patient | Alter | Versicherung | Typ | Bonus |
|---------|-------|--------------|-----|-------|
| Anna Müller | 28 | TK | GKV | 0 % (kein Bonusheft) |
| Klaus Schmidt | 35 | AOK Nordost | GKV | 60 % (5 Jahre) |
| Petra Wagner | 52 | Barmer | GKV | 70 % (10 Jahre) |
| Hans-Jürgen Becker | 63 | AOK Nordost | GKV | 70 % (10+ Jahre) |
| Monika Fischer | 71 | TK | GKV | 70 % (10+ Jahre) |
| Mehmet Yılmaz | 42 | AOK Nordost | GKV | 60 % (5 Jahre) |
| Sophie Braun | 25 | Barmer | GKV | 0 % (kein Bonusheft) |
| Wolfgang Schulz | 58 | Signal Iduna | PKV | — |
| Fatima Al-Hassan | 33 | TK | GKV | 60 % (5 Jahre) |
| Rainer Hoffmann | 67 | Signal Iduna | PKV | — |
| Gerda Klein | 68 | AOK Nordost | GKV | 0 % (kein Bonusheft) |
| Erika Richter | 65 | Barmer | GKV | 70 % (10 Jahre) |
| Lukas Berg | 22 | TK | GKV | 0 % (kein Bonusheft) |
| Hildegard Vogel | 72 | AOK Nordost | GKV | 0 % (kein Bonusheft) |
| Stefan Weber | 48 | Signal Iduna | PKV | — |

## Festzuschuss-Stufen (GKV)

| Bonusjahre | Festzuschuss |
|------------|-------------|
| 0 Jahre (kein Bonusheft) | 50 % |
| Bis 5 Jahre | 60 % |
| 10 Jahre und mehr | 70 % |

*Quelle: § 55 SGB V*
