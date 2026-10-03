// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** Español (es-ES) — the revenue package's notification templates. See `en.ts`. */
export const esES: EmailTemplatePack = {
  'crm.contract_expired': {
    label: 'Contrato vencido',
    subject: 'Contrato vencido: {{contract_number}}',
    bodyHtml: '<p>El contrato {{contract_number}} alcanzó su fecha de fin y se ha marcado como vencido.</p>',
  },
  'crm.contract_renewal': {
    label: 'Renovación de contrato pendiente',
    subject: 'Renovación de contrato pendiente: {{contract_number}}',
    bodyHtml: '<p>El contrato {{contract_number}} finaliza el {{end_date}}. Inicia ya la conversación de renovación.</p>',
  },
  'crm.quote_created': {
    label: 'Presupuesto creado',
    subject: 'Presupuesto creado: {{quote_name}}',
    bodyHtml: '<p>Tu presupuesto {{quote_name}} se ha creado a partir de esta oportunidad.</p>',
  },
};
