import { describe, it, expect, beforeEach } from 'bun:test'
import { DocumentationLinkService } from '../link-service'

describe('DocumentationLinkService', () => {
  let service: DocumentationLinkService

  beforeEach(() => {
    service = new DocumentationLinkService()
  })

  // ---------------------------------------------------------------------------
  // getTemplateForCode
  // ---------------------------------------------------------------------------

  describe('getTemplateForCode', () => {
    it('returns template for GOZ code 2380 (Wurzelkanalbehandlung)', async () => {
      const tpl = await service.getTemplateForCode('2380', 'GOZ')
      expect(tpl).toBeDefined()
      expect(tpl?.id).toBe('endodontische-behandlung')
    })

    it('returns template for BEMA code 13a (Fuellung)', async () => {
      const tpl = await service.getTemplateForCode('13a', 'BEMA')
      expect(tpl).toBeDefined()
      expect(tpl?.id).toBe('fuellungstherapie')
    })

    it('returns template for GOZ code 3000 (Extraktion)', async () => {
      const tpl = await service.getTemplateForCode('3000', 'GOZ')
      expect(tpl).toBeDefined()
      expect(tpl?.id).toBe('extraktion')
    })

    it('returns template for GOZ code 3110 (WSR)', async () => {
      const tpl = await service.getTemplateForCode('3110', 'GOZ')
      expect(tpl).toBeDefined()
      expect(tpl?.id).toBe('wurzelspitzenresektion')
    })

    it('returns template for BEMA code 01 (Allgemeine Untersuchung)', async () => {
      const tpl = await service.getTemplateForCode('01', 'BEMA')
      expect(tpl).toBeDefined()
      expect(tpl?.id).toBe('allgemeine-untersuchung')
    })

    it('returns template for GOZ code 7190 (Schienentherapie)', async () => {
      const tpl = await service.getTemplateForCode('7190', 'GOZ')
      expect(tpl).toBeDefined()
      expect(tpl?.id).toBe('schienentherapie')
    })

    it('returns undefined for an unknown code', async () => {
      const tpl = await service.getTemplateForCode('9999', 'GOZ')
      expect(tpl).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // getBillingCodesForTemplate
  // ---------------------------------------------------------------------------

  describe('getBillingCodesForTemplate', () => {
    it('returns billing codes for endodontische-behandlung', async () => {
      const items = await service.getBillingCodesForTemplate('endodontische-behandlung')
      expect(items.length).toBeGreaterThan(0)

      const codes = items.map(i => i.code)
      // From relatedBillingCodes
      expect(codes).toContain('2380')
      expect(codes).toContain('2360')
      // From pattern positions (goz-root-canal)
      expect(codes).toContain('2390')
      expect(codes).toContain('2400')
    })

    it('returns billing codes for fuellungstherapie (GOZ + BEMA)', async () => {
      const items = await service.getBillingCodesForTemplate('fuellungstherapie')
      const codes = items.map(i => i.code)

      expect(codes).toContain('2060')
      expect(codes).toContain('13a')
      expect(codes).toContain('13b')
    })

    it('returns billing codes for extraktion', async () => {
      const items = await service.getBillingCodesForTemplate('extraktion')
      const codes = items.map(i => i.code)

      expect(codes).toContain('3000')
      expect(codes).toContain('3010')
      expect(codes).toContain('41')
    })

    it('returns billing codes for wurzelspitzenresektion (including WSR pattern codes)', async () => {
      const items = await service.getBillingCodesForTemplate('wurzelspitzenresektion')
      const codes = items.map(i => i.code)

      expect(codes).toContain('3110')
      expect(codes).toContain('3120')
    })

    it('returns empty array for unknown template', async () => {
      const items = await service.getBillingCodesForTemplate('does-not-exist')
      expect(items).toEqual([])
    })

    it('does not include duplicate codes', async () => {
      const items = await service.getBillingCodesForTemplate('fuellungstherapie')
      const keys = items.map(i => `${i.system}:${i.code}`)
      const unique = new Set(keys)
      expect(keys.length).toBe(unique.size)
    })
  })

  // ---------------------------------------------------------------------------
  // isDocumentationComplete
  // ---------------------------------------------------------------------------

  describe('isDocumentationComplete', () => {
    it('returns false when a required field is missing', async () => {
      // allgemeine-untersuchung has einverstaendnisVorhanden as required
      const complete = await service.isDocumentationComplete('allgemeine-untersuchung', {})
      expect(complete).toBe(false)
    })

    it('returns true when all required fields are provided', async () => {
      const complete = await service.isDocumentationComplete('allgemeine-untersuchung', {
        einverstaendnisVorhanden: true,
      })
      expect(complete).toBe(true)
    })

    it('returns false when required field is null', async () => {
      const complete = await service.isDocumentationComplete('allgemeine-untersuchung', {
        einverstaendnisVorhanden: null,
      })
      expect(complete).toBe(false)
    })

    it('returns false when required field is empty string', async () => {
      const complete = await service.isDocumentationComplete('allgemeine-untersuchung', {
        einverstaendnisVorhanden: '',
      })
      expect(complete).toBe(false)
    })

    it('returns false for unknown template', async () => {
      const complete = await service.isDocumentationComplete('does-not-exist', { foo: 'bar' })
      expect(complete).toBe(false)
    })

    it('returns true for template with no required fields when all are optional', async () => {
      // schienentherapie - check if it has any required fields
      const items = await service.getBillingCodesForTemplate('schienentherapie')
      expect(items.length).toBeGreaterThan(0)

      // Load template to verify required fields behavior
      const tpl = await service.getTemplateForCode('7190', 'GOZ')
      expect(tpl).toBeDefined()
      const requiredFields = tpl!.fields.filter(f => f.required)
      if (requiredFields.length === 0) {
        const complete = await service.isDocumentationComplete('schienentherapie', {})
        expect(complete).toBe(true)
      }
    })
  })
})
