// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** Español (es-ES) — plantillas de notificación de Entrega de proyectos (`project_budget_alert`). */
export const esES: EmailTemplatePack = {
  'crm.project_budget_warning': {
    label: 'Aviso de presupuesto del proyecto',
    subject: 'Aviso de presupuesto: {{name}}',
    bodyHtml: '<p>El proyecto {{name}} ha gastado el 80 % o más de su presupuesto aprobado. Revise el presupuesto restante. Si no se deben enviar más horas ni gastos, marque Bloquear horas y gastos en el proyecto.</p>',
  },
  'crm.project_budget_exceeded': {
    label: 'Presupuesto del proyecto superado',
    subject: 'Presupuesto superado: {{name}}',
    bodyHtml: '<p>El proyecto {{name}} ha gastado todo su presupuesto aprobado. Para impedir que se envíen más horas y gastos, marque Bloquear horas y gastos en el proyecto y acuerde un nuevo presupuesto.</p>',
  },
  // `expense_project_approval` (hotcrm#2556): an expense submitted on a project
  // that takes none goes back to Draft, and its spender is told why.
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
