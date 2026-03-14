#!/usr/bin/env bun
/**
 * GOZ (Gebührenordnung für Zahnärzte) XML Parser
 *
 * Downloads and parses the official GOZ XML from gesetze-im-internet.de.
 * Source: https://www.gesetze-im-internet.de/goz_1987/xml.zip
 *
 * Output: JSON array to stdout (same pattern as MIRA GOÄ parse.ts)
 */

import { existsSync, readFileSync } from 'node:fs'
import { DOMParser } from '@xmldom/xmldom'
import * as JSZip from 'jszip'

const SOURCE_URL = 'https://www.gesetze-im-internet.de/goz_1987/xml.zip'
const XML_FILENAME = 'BJNR023160987.xml'

// GOZ Punktwert: 5.62421 Cent = 0.0562421 EUR (fixed since 1988)
const PUNKTWERT_EUR = 0.0562421

interface GozEntry {
  nummer: string
  beschreibung: string
  punktzahl: number | null
  euro_einfachsatz: number | null
  abschnitt: string
  hinweis?: string
}

async function downloadXml(localPath?: string): Promise<Document> {
  if (localPath && existsSync(localPath)) {
    console.error(`Using local XML: ${localPath}`)
    const xml = readFileSync(localPath, 'utf-8')
    return new DOMParser().parseFromString(xml, 'text/xml')
  }

  console.error(`Downloading from ${SOURCE_URL}...`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${SOURCE_URL}`)
  const buf = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  // Find XML file by extension
  let xmlText: string | null = null
  for (const [name, file] of Object.entries(zip.files)) {
    if (name.endsWith('.xml') && !name.includes('/')) {
      console.error(`Found XML: ${name}`)
      xmlText = await file.async('text')
      break
    }
  }
  if (!xmlText) throw new Error(`No .xml file found in ZIP`)
  return new DOMParser().parseFromString(xmlText, 'text/xml')
}

function getText(el: Element): string {
  return (el.textContent ?? '').trim().replace(/\xa0/g, ' ').replace(/\s+/g, ' ').trim()
}

function getEntryTexts(row: Element): string[] {
  const entries = row.getElementsByTagName('entry')
  const texts: string[] = []
  for (let i = 0; i < entries.length; i++) {
    texts.push(getText(entries[i]))
  }
  return texts
}

function getTitleText(el: Element): string {
  // Remove all child tags, keep text
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseGoz(doc: Document): GozEntry[] {
  // Find Anlage 1 norm (Gebührenverzeichnis)
  const norms = doc.getElementsByTagName('norm')
  let anlage1: Element | null = null
  for (let i = 0; i < norms.length; i++) {
    const norm = norms[i]
    const meta = norm.getElementsByTagName('metadaten')[0]
    if (!meta) continue
    const enbez = meta.getElementsByTagName('enbez')[0]
    if (enbez?.textContent?.includes('Anlage 1')) {
      anlage1 = norm
      break
    }
  }
  if (!anlage1) throw new Error('Could not find Anlage 1 in GOZ XML')

  const entries: GozEntry[] = []
  let currentAbschnitt = ''

  // Collect Titles and rows in document order
  const titles = anlage1.getElementsByTagName('Title')
  const rows = anlage1.getElementsByTagName('row')

  // Build a flat ordered list of nodes
  // We process row elements; track current section from Title elements that appear before
  // We'll use document order by walking through textdaten
  const textdaten = anlage1.getElementsByTagName('textdaten')[0]
  if (!textdaten) throw new Error('No textdaten in Anlage 1')

  // Walk all children recursively, collecting Title and row in order
  const items: Array<{ type: 'title'; text: string } | { type: 'row'; texts: string[] }> = []

  function walk(node: Node) {
    if (node.nodeType === 1) {
      const el = node as Element
      const tagName = el.tagName
      if (tagName === 'Title') {
        const text = getTitleText(el)
        if (text) items.push({ type: 'title', text })
        return // don't recurse into Title
      }
      if (tagName === 'row') {
        items.push({ type: 'row', texts: getEntryTexts(el) })
        return // don't recurse into row
      }
      // recurse
      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i])
      }
    }
  }

  walk(textdaten)

  for (const item of items) {
    if (item.type === 'title') {
      const t = item.text
      // Section letter headers like "A.", "B.", "C." etc followed by name
      if (/^[A-L]\.$/.test(t.trim())) {
        // Look for next title as the name
      } else if (/^[A-L]\.\s/.test(t.trim()) || /^[A-L]$/.test(t.trim())) {
        // Combined or letter only
      }
      // Track abschnitt: letter + name combination
      if (/^[A-L]\./.test(t) || t.match(/^[A-L]$/)) {
        currentAbschnitt = t
      } else if (currentAbschnitt && !t.includes('Bestimmungen') && !t.includes('Leistungstext') && !t.includes('Punktzahl') && !t.includes('Nummer')) {
        // Append descriptive name to letter
        if (/^[A-L]\.$/.test(currentAbschnitt)) {
          currentAbschnitt = `${currentAbschnitt} ${t}`
        }
      }
      continue
    }

    // It's a row
    const texts = item.texts
    if (texts.length === 3) {
      const [nummer, beschreibung, punktzahlStr] = texts
      // Skip header row
      if (nummer === 'Nummer' || nummer === '' || !beschreibung) continue
      // Must be a 4-digit number code
      if (!/^\d{4}$/.test(nummer.trim())) continue

      const punktzahlNum = parseInt(punktzahlStr.replace(/\D/g, ''), 10)
      const hasPunktzahl = !isNaN(punktzahlNum) && punktzahlNum > 0

      // Include positions without Punktzahl (e.g. percentage-based Teilleistungen like 0120, 2230, 2240, 5050, 5060, 5240)
      const punktzahl = hasPunktzahl ? punktzahlNum : null
      const euro = hasPunktzahl ? Math.round(punktzahlNum * PUNKTWERT_EUR * 100) / 100 : null

      // For entries without a fixed point value, extract any hint from the Punktzahl column
      const hinweis = !hasPunktzahl && punktzahlStr.trim() ? punktzahlStr.trim() : undefined

      entries.push({
        nummer: nummer.trim(),
        beschreibung: beschreibung.trim(),
        punktzahl,
        euro_einfachsatz: euro,
        abschnitt: currentAbschnitt,
        ...(hinweis ? { hinweis } : {}),
      })
    }
  }

  return entries
}

// --- Main ---

const localPath = process.argv[2] ?? '/tmp/goz_xml/BJNR023160987.xml'
const doc = await downloadXml(localPath)
const entries = parseGoz(doc)

console.error(`Parsed ${entries.length} GOZ fee entries`)
console.log(JSON.stringify(entries, null, 2))
