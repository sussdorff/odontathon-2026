/**
 * Documentation template types for dental treatment documentation.
 *
 * Templates are JSON files (not FHIR) — they're agent logic for structured
 * treatment documentation, supporting the billing coach's documentation analysis.
 */

export type DocumentationCategory =
  | 'allgemein'
  | 'prophylaxe'
  | 'parodontologie'
  | 'konservierend'
  | 'prothetik'
  | 'chirurgie'
  | 'endodontie'

export type FieldType =
  | 'boolean'
  | 'text'
  | 'tooth_reference'
  | 'material_ref'
  | 'enum'
  | 'number'
  | 'range'
  | 'date'

// --- Field Definition ---

export interface DocumentationField {
  /** camelCase unique identifier within template */
  id: string
  /** German display label from PDF source */
  label: string
  /** Data type for rendering and validation */
  type: FieldType
  /** If true, field must be filled before documentation is complete */
  required: boolean
  /** Predefined options — only for enum type */
  options?: string[]
  /** Optional UI hint */
  placeholder?: string
  /** Optional grouping label for UI sections */
  group?: string
}

// --- Template Definition ---

export interface DocumentationTemplate {
  /** kebab-case unique identifier */
  id: string
  /** German display name for the treatment type */
  name: string
  /** Treatment category */
  category: DocumentationCategory
  /** Related GOZ/BEMA billing codes (informational) */
  relatedBillingCodes: string[]
  /** True if template includes fields merged from BFS detail PDFs */
  bfsSource: boolean
  /** Ordered list of documentation fields */
  fields: DocumentationField[]
}

// --- Runtime Value Types ---

export type FieldValue = string | boolean | number | null

export interface DocumentationEntry {
  fieldId: string
  value: FieldValue
}

export interface TreatmentDocumentation {
  templateId: string
  patientId: string
  /** ISO date string */
  date: string
  entries: DocumentationEntry[]
  /** True if all required fields have values */
  complete: boolean
}

// --- Validation ---

export interface DocumentationValidationIssue {
  fieldId: string
  message: string
}

export interface DocumentationValidationResult {
  valid: boolean
  issues: DocumentationValidationIssue[]
}
