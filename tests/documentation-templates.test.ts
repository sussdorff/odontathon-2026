import { describe, it, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { DocumentationTemplate, FieldType, DocumentationCategory } from '@/lib/documentation/types'

const TEMPLATES_DIR = join(import.meta.dir, '../data/documentation-templates')

const VALID_FIELD_TYPES: FieldType[] = [
  'boolean',
  'text',
  'tooth_reference',
  'material_ref',
  'enum',
  'number',
  'range',
  'date',
]

const VALID_CATEGORIES: DocumentationCategory[] = [
  'allgemein',
  'prophylaxe',
  'parodontologie',
  'konservierend',
  'prothetik',
  'chirurgie',
  'endodontie',
]

function loadTemplates(): DocumentationTemplate[] {
  const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'))
  return files.map((file) => {
    const content = readFileSync(join(TEMPLATES_DIR, file), 'utf-8')
    return JSON.parse(content) as DocumentationTemplate
  })
}

describe('Documentation Templates', () => {
  const templates = loadTemplates()

  it('should contain exactly 17 templates', () => {
    expect(templates.length).toBe(17)
  })

  it('each template should have required top-level fields', () => {
    for (const template of templates) {
      expect(typeof template.id).toBe('string')
      expect(template.id.length).toBeGreaterThan(0)

      expect(typeof template.name).toBe('string')
      expect(template.name.length).toBeGreaterThan(0)

      expect(typeof template.category).toBe('string')
      expect(VALID_CATEGORIES).toContain(template.category)

      expect(Array.isArray(template.relatedBillingCodes)).toBe(true)

      expect(typeof template.bfsSource).toBe('boolean')

      expect(Array.isArray(template.fields)).toBe(true)
    }
  })

  it('each template should have at least 1 field', () => {
    for (const template of templates) {
      expect(template.fields.length).toBeGreaterThan(0)
    }
  })

  it('all field types should be valid', () => {
    for (const template of templates) {
      for (const field of template.fields) {
        expect(VALID_FIELD_TYPES).toContain(field.type)
      }
    }
  })

  it('each field should have id, label, type and required', () => {
    for (const template of templates) {
      for (const field of template.fields) {
        expect(typeof field.id).toBe('string')
        expect(field.id.length).toBeGreaterThan(0)

        expect(typeof field.label).toBe('string')
        expect(field.label.length).toBeGreaterThan(0)

        expect(typeof field.type).toBe('string')

        expect(typeof field.required).toBe('boolean')
      }
    }
  })

  it('enum fields should have options array', () => {
    for (const template of templates) {
      for (const field of template.fields) {
        if (field.type === 'enum') {
          expect(Array.isArray(field.options)).toBe(true)
          expect(field.options!.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('each template id should be kebab-case and match filename convention', () => {
    const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'))
    const fileIds = new Set(files.map((f) => f.replace('.json', '')))

    for (const template of templates) {
      // id should be kebab-case (lowercase letters, digits, hyphens)
      expect(template.id).toMatch(/^[a-z0-9-]+$/)
      expect(fileIds.has(template.id)).toBe(true)
    }
  })

  it('required fields exist in consent-critical templates', () => {
    const pzr = templates.find((t) => t.id === 'professionelle-zahnreinigung')
    expect(pzr).toBeDefined()
    const requiredFields = pzr!.fields.filter((f) => f.required)
    expect(requiredFields.length).toBeGreaterThan(0)

    const endo = templates.find((t) => t.id === 'endodontische-behandlung')
    expect(endo).toBeDefined()
    const endoRequired = endo!.fields.filter((f) => f.required)
    expect(endoRequired.length).toBeGreaterThan(0)
  })

  it('BFS-enriched templates should have bfsSource: true', () => {
    const bfsTemplates = ['endodontische-behandlung', 'wurzelspitzenresektion', 'extraktion', 'osteotomie']
    for (const id of bfsTemplates) {
      const template = templates.find((t) => t.id === id)
      expect(template).toBeDefined()
      expect(template!.bfsSource).toBe(true)
    }
  })
})
