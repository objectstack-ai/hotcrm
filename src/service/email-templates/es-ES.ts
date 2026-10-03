// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** Español (es-ES) — the service package's notification templates. See `en.ts`. */
export const esES: EmailTemplatePack = {
  'crm.case_escalated': {
    label: 'Caso escalado',
    subject: 'Caso escalado: {{case_number}}',
    bodyHtml: '<p>El caso {{case_number}} ({{priority}}) se ha escalado automáticamente por prioridad crítica. La propiedad pasa al responsable de servicio con menos carga; mientras nadie ocupe ese puesto, el caso sigue siendo tuyo. Abre el caso para ver quién lo tiene ahora.</p>',
  },
  'crm.case_sla_breach': {
    label: 'SLA del caso incumplido',
    subject: 'SLA incumplido: caso {{case_number}}',
    bodyHtml: '<p>El caso {{case_number}} ({{priority}}) superó su fecha límite de SLA y se ha escalado automáticamente.</p>',
  },
};
