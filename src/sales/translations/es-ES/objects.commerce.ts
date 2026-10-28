// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`,
 * `crm_price_book`, `crm_price_book_entry`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/es-ES.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_contract: {
    _validations: {
      end_after_start: {
        message: 'La fecha de fin debe ser posterior a la de inicio',
      },
      contract_status_progression: {
        message: 'Este cambio de estado no está permitido. Un contrato avanza Borrador → En Aprobación → Activado → Expirado; En Aprobación puede volver a Borrador, y Borrador, En Aprobación o Activado pueden pasar a Rescindido. Expirado y Rescindido son definitivos: una renovación es un contrato nuevo.',
      },
    },
    label: 'Contrato',
    pluralLabel: 'Contratos',
    description: 'Contratos y acuerdos legales',
    fields: {
      contract_number: { label: 'Número de Contrato' },
      crm_account: { label: 'Cuenta' },
      crm_contact: { label: 'Contacto Principal' },
      crm_opportunity: { label: 'Oportunidad Relacionada' },
      owner_id: { label: 'Propietario del Contrato' },
      status: {
        label: 'Estado',
        options: {
          draft: 'Borrador', in_approval: 'En Aprobación', activated: 'Activado',
          expired: 'Expirado', terminated: 'Rescindido',
        },
      },
      contract_term_months: { label: 'Plazo del Contrato (Meses)' },
      start_date: { label: 'Fecha de Inicio' },
      end_date: { label: 'Fecha de Fin' },
      contract_value: { label: 'Valor del Contrato' },
      billing_frequency: {
        label: 'Frecuencia de Facturación',
        options: { monthly: 'Mensual', quarterly: 'Trimestral', annually: 'Anual', one_time: 'Pago Único' },
      },
      // Mismo juego de valores que `crm_quote.payment_terms` — tradúzcanse igual.
      payment_terms: { label: 'Términos de Pago' },
      auto_renewal: { label: 'Renovación Automática' },
      renewal_notice_days: { label: 'Aviso de Renovación (Días)' },
      contract_type: {
        label: 'Tipo de Contrato',
        options: {
          subscription: 'Suscripción', service: 'Acuerdo de Servicio', license: 'Licencia',
          partnership: 'Asociación', nda: 'Acuerdo de Confidencialidad (NDA)',
          msa: 'Acuerdo Marco de Servicios (MSA)',
        },
      },
      signed_date: { label: 'Fecha de Firma' },
      signed_by: { label: 'Firmado Por' },
      document_url: { label: 'Documento de Contrato' },
      special_terms: { label: 'Términos Especiales' },
      description: { label: 'Descripción' },
      billing_address: { label: 'Dirección de Facturación' },
    },
    _views: {
      all_contracts: { label: 'Todos los Contratos' },
      renewal_calendar: { label: 'Calendario de Renovación' },
      contract_gantt: { label: 'Plazos del Contrato' },
      contract_timeline: { label: 'Línea de Tiempo' },
    },
    _sections: {
      basic: { label: 'Información del Contrato' },
      parties: { label: 'Partes' },
      terms: { label: 'Términos y Fechas' },
      value: { label: 'Valor del Contrato' },
      status: { label: 'Estado y Aprobación' },
      renewal: { label: 'Renovación' },
      // Nombres de sección del formulario en contract.view.ts (#1100)
      contract_terms: { label: 'Términos' },
      signing_and_documents: { label: 'Firma y Documentos' },
      notes: { label: 'Notas' },
    },
  },
};
