// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from './_bundle';

/** Español (es-ES) — the sales package's notification templates. See `en.ts`. */
export const esES: EmailTemplatePack = {
  'crm.account_approved': {
    label: 'Cuenta aprobada',
    subject: 'Cuenta aprobada: {{name}}',
    bodyHtml: '<p>Esta cuenta ha sido aprobada y ya es un dato consolidado.</p>',
  },
  'crm.account_rejected': {
    label: 'Cuenta no aprobada',
    subject: 'Cuenta no aprobada: {{name}}',
    bodyHtml: '<p>Esta cuenta no fue aprobada. Corrige sus datos y solicita otra revisión.</p>',
  },
  'crm.contact_welcome': {
    label: 'Nuevo contacto',
    subject: 'Nuevo contacto: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} se ha añadido como contacto. Ponte en contacto para darle la bienvenida.</p>',
  },
  'crm.deal_stalled': {
    label: 'Oportunidad estancada',
    subject: 'Oportunidad estancada: {{name}}',
    bodyHtml: '<p>La oportunidad {{name}} lleva {{days_in_stage}} días en {{stage}}. Es hora de avanzarla o volver a cualificarla.</p>',
  },
  'crm.large_deal_won': {
    label: 'Gran operación ganada',
    subject: 'Gran operación ganada: {{name}}',
    bodyHtml: '<p>{{name}} se cerró por {{amount}}. Enhorabuena al equipo.</p>',
  },
  'crm.lead_conversion_approved': {
    label: 'Cliente potencial aprobado para conversión',
    subject: 'Cliente potencial aprobado para conversión: {{first_name}} {{last_name}}',
    bodyHtml: '<p>Este cliente potencial ha sido aprobado. Puedes convertirlo en cuenta, contacto y oportunidad.</p>',
  },
  'crm.lead_conversion_rejected': {
    label: 'Cliente potencial no aprobado',
    subject: 'Cliente potencial no aprobado: {{first_name}} {{last_name}}',
    bodyHtml: '<p>La conversión de este cliente potencial no fue aprobada. Sigue trabajándolo o descalifícalo indicando un motivo.</p>',
  },
  'crm.lead_converted': {
    label: 'Cliente potencial convertido',
    subject: 'Cliente potencial convertido: {{first_name}} {{last_name}}',
    bodyHtml: '<p>El cliente potencial {{first_name}} {{last_name}} se convirtió en cuenta y contacto.</p>',
  },
  'crm.lead_routing_hot': {
    label: 'Asignación de cliente potencial caliente',
    subject: 'Cliente potencial caliente — asignar en 24 h: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} de {{company}} (puntuación {{rating}}) necesita propietario hoy.</p>',
  },
  'crm.lead_routing_new': {
    label: 'Asignación de cliente potencial',
    subject: 'Nuevo cliente potencial por asignar: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} de {{company}} está pendiente de asignación.</p>',
  },
  'crm.opportunity_approved': {
    label: 'Oportunidad aprobada',
    subject: 'Oportunidad aprobada: {{name}}',
    bodyHtml: '<p>Tu oportunidad {{name}} ha sido aprobada.</p>',
  },
  'crm.opportunity_rejected': {
    label: 'Oportunidad rechazada',
    subject: 'Oportunidad rechazada: {{name}}',
    bodyHtml: '<p>Tu oportunidad {{name}} no fue aprobada. Revísala y corrígela antes de volver a enviarla.</p>',
  },
  'crm.task_reminder': {
    label: 'Recordatorio de tarea',
    subject: 'Recordatorio de tarea: {{subject}}',
    bodyHtml: '<p>Tu tarea "{{subject}}" vence (recordatorio fijado para {{reminder_date}}).</p>',
  },
  'crm.urgent_task': {
    label: 'Tarea urgente',
    subject: 'Tarea urgente: {{subject}}',
    bodyHtml: '<p>Se te ha asignado una tarea urgente "{{subject}}" que requiere atención.</p>',
  },
};
