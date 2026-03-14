/**
 * DocumentationLinkService — bidirectional linking between DocumentationTemplates and BillingPatterns.
 *
 * Forward:  billing code → template
 * Reverse:  template ID → billing items
 * Validate: check required fields are filled
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DocumentationTemplate } from './types'
import type { BillingItem, BillingSystem } from '../billing/types'
import { allPatterns } from '../billing/patterns'

// Resolve data/documentation-templates relative to project root
// import.meta.dir = <project>/src/lib/documentation  →  3 levels up = project root
const TEMPLATES_DIR = join(import.meta.dir, '../../../data/documentation-templates')

export class DocumentationLinkService {
  private templates: Map<string, DocumentationTemplate> | null = null

  /** Load and cache all templates from disk */
  private async loadTemplates(): Promise<Map<string, DocumentationTemplate>> {
    if (this.templates) return this.templates

    const map = new Map<string, DocumentationTemplate>()
    const entries = await readdir(TEMPLATES_DIR)

    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const raw = await readFile(join(TEMPLATES_DIR, entry), 'utf-8')
      const tpl = JSON.parse(raw) as DocumentationTemplate
      map.set(tpl.id, tpl)
    }

    this.templates = map
    return map
  }

  /**
   * Forward lookup: given a billing code + system, return the matching template (if any).
   * Checks template.relatedBillingCodes first, then falls back to allPatterns.requiredDocTemplate.
   */
  async getTemplateForCode(code: string, system: BillingSystem): Promise<DocumentationTemplate | undefined> {
    const templates = await this.loadTemplates()

    // 1. Direct match via relatedBillingCodes in templates
    for (const tpl of templates.values()) {
      if (tpl.relatedBillingCodes.includes(code)) {
        return tpl
      }
    }

    // 2. Pattern-based fallback: find a pattern that contains this code and has a requiredDocTemplate
    for (const pattern of allPatterns) {
      if (pattern.system !== system && pattern.system !== 'mixed') continue
      if (!pattern.requiredDocTemplate) continue

      const allCodes = [...pattern.required, ...pattern.optional]
      if (allCodes.some(pos => pos.code === code && pos.system === system)) {
        return templates.get(pattern.requiredDocTemplate)
      }
    }

    return undefined
  }

  /**
   * Reverse lookup: given a template ID, return all billing items associated with it.
   * Combines relatedBillingCodes from the template with codes from patterns that reference
   * this template via requiredDocTemplate.
   */
  async getBillingCodesForTemplate(templateId: string): Promise<BillingItem[]> {
    const templates = await this.loadTemplates()
    const tpl = templates.get(templateId)
    if (!tpl) return []

    const items: BillingItem[] = []
    const seen = new Set<string>()

    // 1. Codes from template.relatedBillingCodes — infer system from code format
    for (const code of tpl.relatedBillingCodes) {
      const system = inferSystem(code)
      const key = `${system}:${code}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push({ code, system })
      }
    }

    // 2. Codes from patterns that reference this template
    for (const pattern of allPatterns) {
      if (pattern.requiredDocTemplate !== templateId) continue

      for (const pos of [...pattern.required, ...pattern.optional]) {
        const key = `${pos.system}:${pos.code}`
        if (!seen.has(key)) {
          seen.add(key)
          items.push({ code: pos.code, system: pos.system })
        }
      }
    }

    return items
  }

  /**
   * Validation: check that all required fields in the template have non-null/non-empty values
   * in the provided filledFields map.
   */
  async isDocumentationComplete(
    templateId: string,
    filledFields: Record<string, unknown>,
  ): Promise<boolean> {
    const templates = await this.loadTemplates()
    const tpl = templates.get(templateId)
    if (!tpl) return false

    for (const field of tpl.fields) {
      if (!field.required) continue

      const value = filledFields[field.id]
      if (value === null || value === undefined || value === '') return false
    }

    return true
  }
}

/**
 * Heuristic: infer billing system from code format.
 * GOZ codes are 4-digit numbers (0010-9999).
 * BEMA codes are short strings: numeric (01-107), alphanumeric (IP1, ATa, BEVa, UPTa).
 */
function inferSystem(code: string): BillingSystem {
  // 4-digit numeric -> GOZ
  if (/^\d{4}$/.test(code)) return 'GOZ'
  // Contains letters -> BEMA (IP1, ATa, BEVa, UPTa, etc.)
  if (/[a-zA-Z]/.test(code)) return 'BEMA'
  // Short numeric (1-3 digits) -> BEMA
  return 'BEMA'
}
