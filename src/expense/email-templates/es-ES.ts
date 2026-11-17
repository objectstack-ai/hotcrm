// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** Español (es-ES) — plantillas de notificación del módulo de gastos (`expense_report_project_approval`). */
export const esES: EmailTemplatePack = {
  'crm.expense_report_project_over': {
    label: 'Informe de gastos en un proyecto cerrado',
    subject: 'Informe de gastos devuelto: {{name}}',
    bodyHtml: '<p>Tu informe de gastos {{name}} se envió en {{project}}, que está cerrado o cancelado y no admite gastos. Ha vuelto a Borrador: elimina el informe, mueve sus gastos a un proyecto abierto y envíalos de nuevo.</p>',
  },
  'crm.expense_report_project_locked': {
    label: 'Informe de gastos en un proyecto bloqueado',
    subject: 'Informe de gastos devuelto: {{name}}',
    bodyHtml: '<p>Tu informe de gastos {{name}} se envió en {{project}}, que está bloqueado para horas y gastos. Ha vuelto a Borrador: envíalo de nuevo cuando el jefe de proyecto desmarque Bloquear horas y gastos.</p>',
  },
};
