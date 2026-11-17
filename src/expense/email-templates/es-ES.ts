// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** Español (es-ES) — plantillas de notificación del módulo de gastos (`expense_project_approval`). */
export const esES: EmailTemplatePack = {
  'crm.expense_project_over': {
    label: 'Gasto en un proyecto cerrado',
    subject: 'Gasto devuelto: {{name}}',
    bodyHtml: '<p>Tu gasto {{name}} se envió en {{project}}, que está cerrado o cancelado y no admite gastos. Ha vuelto a Borrador: muévelo a un proyecto abierto y envíalo allí.</p>',
  },
  'crm.expense_project_locked': {
    label: 'Gasto en un proyecto bloqueado',
    subject: 'Gasto devuelto: {{name}}',
    bodyHtml: '<p>Tu gasto {{name}} se envió en {{project}}, que está bloqueado para horas y gastos. Ha vuelto a Borrador: envíalo de nuevo cuando el jefe de proyecto desmarque Bloquear horas y gastos.</p>',
  },
};
