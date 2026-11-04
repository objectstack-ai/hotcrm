// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** Español (es-ES) — the revenue package's notification templates. See `en.ts`. */
export const esES: EmailTemplatePack = {
  'crm.quote_created': {
    label: 'Presupuesto creado',
    subject: 'Presupuesto creado: {{quote_name}}',
    bodyHtml: '<p>Tu presupuesto {{quote_name}} se ha creado a partir de esta oportunidad.</p>',
  },
};
