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
};
