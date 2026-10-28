// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — the marketing module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const esES: TranslationData = {
  objects: {
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
        enroll_leads: { label: 'Inscribir Miembros' },
      },
    },
    crm_campaign_member: {
      _validations: {
        lead_or_contact_required: {
          message: 'Un miembro de campaña debe referenciar un prospecto o un contacto',
        },
        lead_and_contact_exclusive: {
          message: 'Un miembro de campaña referencia un prospecto o un contacto, no ambos',
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
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_campaign: { label: 'Campañas' },
      },
    },
  },
  flows: {
    campaign_enrollment: {
      label: 'Inscribir miembros en la campaña',
      successMessage: 'Miembros elegibles inscritos en la campaña.',
      refusals: {
        end_refused: {
          message:
            'Inscripción rechazada para {{refusedCount}} de las personas seleccionadas: {{enrolledCount}} inscritas, {{refusedCount}} rechazadas. Una persona rechazada no se añadió a la campaña; el registro de la ejecución del flujo indica el motivo de cada una.',
        },
        refuse_not_open: {
          message:
            'Esta campaña no está abierta a inscripciones o ya no existe: solo una campaña en Planificación o En Curso admite miembros. No se inscribió a nadie.',
        },
      },
      screens: {
        screen_1: {
          title: 'Criterios de Inscripción',
          fields: {
            memberSource: { label: 'Tipo de miembro a inscribir', options: { leads: 'Prospectos', contacts: 'Contactos' } },
            leadStatus: { label: 'Inscribir prospectos con estado', options: { new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado' } },
            contactDepartment: {
              label: 'Inscribir contactos del departamento',
              options: { executive: 'Ejecutivo', sales: 'Ventas', marketing: 'Marketing', engineering: 'Ingeniería', support: 'Soporte', finance: 'Finanzas', hr: 'Recursos Humanos', operations: 'Operaciones' },
            },
          },
        },
      },
    },
    campaign_lead_member_enroll: {
      refusals: {
        refuse_campaign_not_open: {
          message:
            '{{ campaignRecord.display_title | default: "La campaña elegida" }} no está abierta a inscripciones o ya no existe: solo una campaña en Planificación o En Curso admite miembros. No se inscribió a nadie.',
        },
        refuse_lead_opted_out: {
          message: '{{ leadRecord.first_name }} {{ leadRecord.last_name }} se dio de baja del correo electrónico, así que el prospecto no se añadió a la campaña.',
        },
      },
    },
    campaign_contact_member_enroll: {
      refusals: {
        refuse_campaign_not_open: {
          message:
            '{{ campaignRecord.display_title | default: "La campaña elegida" }} no está abierta a inscripciones o ya no existe: solo una campaña en Planificación o En Curso admite miembros. No se inscribió a nadie.',
        },
        refuse_contact_opted_out: {
          message: '{{ contactRecord.full_name | default: "Este contacto" }} se dio de baja del correo electrónico, así que el contacto no se añadió a la campaña.',
        },
      },
    },
  },
};
