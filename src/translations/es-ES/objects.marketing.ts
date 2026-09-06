// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — `objects` translations for the MARKETING family:
 * demand generation — campaigns and their membership.
 *
 * Roster: `crm_campaign`, `crm_campaign_member`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 */
export const marketing: Record<string, ObjectTranslationData> = {
  crm_campaign: {
    _validations: {
      end_after_start: {
        message: 'La fecha de fin debe ser posterior a la de inicio',
      },
      actual_cost_within_budget: {
        message: 'El coste real supera el coste presupuestado',
      },
    },
    label: 'Campaña',
    pluralLabel: 'Campañas',
    description: 'Campañas e iniciativas de marketing',
    fields: {
      campaign_code: { label: 'Código de Campaña' },
      display_title: { label: 'Título Mostrado' },
      name: { label: 'Nombre de Campaña' },
      description: { label: 'Descripción' },
      type: {
        label: 'Tipo de Campaña',
        options: {
          email: 'Email', webinar: 'Seminario Web', trade_show: 'Feria Comercial',
          conference: 'Conferencia', direct_mail: 'Correo Postal', social_media: 'Redes Sociales',
          content: 'Marketing de Contenidos', partner: 'Marketing con Socios',
        },
      },
      channel: {
        label: 'Canal Principal',
        options: {
          digital: 'Digital', social: 'Redes Sociales', email: 'Email',
          events: 'Eventos', partner: 'Socios',
        },
      },
      status: {
        label: 'Estado',
        options: {
          planning: 'Planificación', in_progress: 'En Curso',
          completed: 'Completada', aborted: 'Cancelada',
        },
      },
      start_date: { label: 'Fecha de Inicio' },
      end_date: { label: 'Fecha de Fin' },
      budgeted_cost: { label: 'Costo Presupuestado' },
      actual_cost: { label: 'Costo Real' },
      expected_revenue: { label: 'Ingresos Previstos' },
      actual_revenue: { label: 'Ingresos Reales' },
      target_size: { label: 'Tamaño Objetivo', help: 'Número objetivo de prospectos/contactos' },
      num_sent: { label: 'Cantidad Enviada' },
      num_responses: { label: 'Número de Respuestas' },
      num_leads: { label: 'Número de Prospectos' },
      num_converted_leads: { label: 'Prospectos Convertidos' },
      num_opportunities: { label: 'Oportunidades Creadas' },
      num_won_opportunities: { label: 'Oportunidades Ganadas' },
      response_rate: { label: 'Tasa de Respuesta %' },
      roi: { label: 'ROI %' },
      owner_id: { label: 'Propietario de Campaña' },
      landing_page_url: { label: 'Página de Aterrizaje' },
      is_active: { label: 'Activo' },
    },
    _views: {
      all_campaigns: { label: 'Todas las Campañas' },
      campaign_gantt: { label: 'Programación de Campañas' },
      campaign_calendar: { label: 'Calendario de Campañas' },
      campaign_timeline: { label: 'Línea de Tiempo de Marketing' },
    },
    _sections: {
      basic: { label: 'Información de Campaña' },
      schedule: { label: 'Programación' },
      budget: { label: 'Presupuesto y ROI' },
      metrics: { label: 'Rendimiento' },
      // El inglés de este grupo es «Ownership», no «Assignment»: agrupa al
      // propietario de la campaña, igual que `crm_account.ownership`.
      assignment: { label: 'Propiedad' },
      assets: { label: 'Recursos de Campaña' },
    },
    _actions: {
      enroll_leads: {
        label: 'Inscribir Miembros',
        successMessage: 'Miembros elegibles inscritos en la campaña.',
      },
    },
  },
  crm_campaign_member: {
    _validations: {
      lead_or_contact_required: {
        message: 'Un miembro de campaña debe referenciar un prospecto o un contacto',
      },
    },
    label: 'Miembro de Campaña',
    pluralLabel: 'Miembros de Campaña',
    description: 'Prospectos y contactos alcanzados por una campaña, con su estado de respuesta',
    fields: {
      member_number: { label: 'Número de Miembro' },
      crm_campaign: { label: 'Campaña' },
      crm_lead: { label: 'Prospecto', help: 'Se rellena cuando el miembro era un Prospecto en el momento de la inscripción' },
      crm_contact: { label: 'Contacto', help: 'Se rellena cuando el miembro es un Contacto existente' },
      status: {
        label: 'Estado',
        options: {
          sent: 'Enviado', responded: 'Respondido',
          converted: 'Convertido', unsubscribed: 'Dado de Baja',
        },
      },
      added_date: { label: 'Fecha de Alta' },
      response_date: { label: 'Fecha de Respuesta' },
      has_responded: { label: 'Ha Respondido' },
    },
    _sections: {
      basic: { label: 'Información Básica' },
      response: { label: 'Seguimiento de Respuesta' },
    },
    _actions: {
      mark_responded: {
        label: 'Marcar como Respondido',
        successMessage: 'Respuesta registrada en este miembro de campaña.',
      },
    },
  },
};
