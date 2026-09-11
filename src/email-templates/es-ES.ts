// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

/**
 * Español (`es-ES`) — notification bundles for the `notify` flow nodes.
 *
 * Row-for-row with `en-US.ts`: same `name`, same `{{key}}` placeholders, same
 * order. Object nouns follow the es-ES language pack
 * (`src/translations/es-ES/`).
 */
export const esES: EmailTemplateDefinition[] = [
  {
    name: 'crm_case_escalated', label: 'Caso escalado', category: 'notification', locale: 'es-ES',
    subject: 'Caso escalado: {{case_number}}',
    bodyHtml: '<p>El caso {{case_number}} ({{priority}}) se ha escalado automáticamente por prioridad crítica. La propiedad pasa al responsable de servicio con menos carga; mientras nadie ocupe ese puesto, el caso sigue siendo suyo. Abra el caso para ver quién es el propietario ahora.</p>',
  },
  {
    name: 'crm_case_sla_breach', label: 'SLA del caso incumplido', category: 'notification', locale: 'es-ES',
    subject: 'SLA incumplido: caso {{case_number}}',
    bodyHtml: '<p>El caso {{case_number}} ({{priority}}) superó su fecha de vencimiento de SLA y se ha escalado automáticamente.</p>',
  },
  {
    name: 'crm_contact_welcome', label: 'Nuevo contacto al que dar la bienvenida', category: 'notification', locale: 'es-ES',
    subject: 'Nuevo contacto: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} se ha añadido como contacto. Póngase en contacto para darle la bienvenida.</p>',
  },
  {
    name: 'crm_contract_expired', label: 'Contrato vencido', category: 'notification', locale: 'es-ES',
    subject: 'Contrato vencido: {{contract_number}}',
    bodyHtml: '<p>El contrato {{contract_number}} alcanzó su fecha de finalización y se ha marcado como vencido.</p>',
  },
  {
    name: 'crm_contract_renewal', label: 'Renovación de contrato pendiente', category: 'notification', locale: 'es-ES',
    subject: 'Renovación de contrato pendiente: {{contract_number}}',
    bodyHtml: '<p>El contrato {{contract_number}} finaliza el {{end_date}}. Inicie ahora la conversación de renovación.</p>',
  },
  {
    name: 'crm_lead_hot', label: 'Cliente potencial caliente asignado', category: 'notification', locale: 'es-ES',
    subject: 'Cliente potencial caliente — asignar en 24 h: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} de {{company}} (calificación {{rating}}) necesita un propietario hoy mismo.</p>',
  },
  {
    name: 'crm_lead_new', label: 'Nuevo cliente potencial por asignar', category: 'notification', locale: 'es-ES',
    subject: 'Nuevo cliente potencial por asignar: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} de {{company}} está a la espera de asignación.</p>',
  },
  {
    name: 'crm_lead_converted', label: 'Cliente potencial convertido', category: 'notification', locale: 'es-ES',
    subject: 'Cliente potencial convertido: {{first_name}} {{last_name}}',
    bodyHtml: '<p>El cliente potencial {{first_name}} {{last_name}} se convirtió en cuenta y contacto.</p>',
  },
  {
    name: 'crm_opportunity_approved', label: 'Oportunidad aprobada', category: 'notification', locale: 'es-ES',
    subject: 'Oportunidad aprobada: {{name}}',
    bodyHtml: '<p>Su oportunidad {{name}} ha sido aprobada.</p>',
  },
  {
    name: 'crm_opportunity_rejected', label: 'Oportunidad rechazada', category: 'notification', locale: 'es-ES',
    subject: 'Oportunidad rechazada: {{name}}',
    bodyHtml: '<p>Su oportunidad {{name}} no fue aprobada. Revísela y corríjala antes de volver a enviarla.</p>',
  },
  {
    name: 'crm_deal_stalled', label: 'Oportunidad estancada', category: 'notification', locale: 'es-ES',
    subject: 'Oportunidad estancada: {{name}}',
    bodyHtml: '<p>La oportunidad {{name}} lleva {{days_in_stage}} días en {{stage}}. Es hora de avanzarla o volver a cualificarla.</p>',
  },
  {
    name: 'crm_large_deal_won', label: 'Gran oportunidad ganada', category: 'notification', locale: 'es-ES',
    subject: 'Gran oportunidad ganada: {{name}}',
    bodyHtml: '<p>{{name}} se cerró por {{amount}}. Enhorabuena al equipo.</p>',
  },
  {
    name: 'crm_quote_created', label: 'Presupuesto creado', category: 'notification', locale: 'es-ES',
    subject: 'Presupuesto creado: {{quote_name}}',
    bodyHtml: '<p>Su presupuesto {{quote_name}} se ha creado a partir de esta oportunidad.</p>',
  },
  {
    name: 'crm_task_reminder', label: 'Recordatorio de tarea', category: 'notification', locale: 'es-ES',
    subject: 'Recordatorio de tarea: {{subject}}',
    bodyHtml: '<p>Su tarea «{{subject}}» ha vencido (recordatorio fijado para {{reminder_date}}).</p>',
  },
  {
    name: 'crm_urgent_task', label: 'Tarea urgente asignada', category: 'notification', locale: 'es-ES',
    subject: 'Tarea urgente: {{subject}}',
    bodyHtml: '<p>Se le ha asignado una tarea urgente «{{subject}}» que requiere atención.</p>',
  },
];
