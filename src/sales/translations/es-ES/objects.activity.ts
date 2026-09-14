// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * Español (es-ES) — `objects` translations for the ACTIVITY family:
 * the interaction log — tasks, events, and who attended.
 *
 * Roster: `crm_task`, `crm_event`, `crm_event_attendee`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 */
export const activity: Record<string, ObjectTranslationData> = {
  crm_task: {
    _validations: {
      completed_date_required: {
        message: 'La fecha de finalización es obligatoria cuando el estado es Completada',
      },
      recurrence_fields_required: {
        message: 'El tipo de recurrencia es obligatorio para las tareas recurrentes',
      },
      related_to_required: {
        message: 'Debe seleccionarse al menos un registro relacionado',
      },
    },
    label: 'Tarea',
    pluralLabel: 'Tareas',
    description: 'Actividades y tareas pendientes',
    fields: {
      subject: { label: 'Asunto' },
      description: { label: 'Descripción' },
      status: {
        label: 'Estado',
        options: {
          not_started: 'No Iniciada', in_progress: 'En Curso', waiting: 'En Espera',
          completed: 'Completada', deferred: 'Aplazada',
        },
      },
      priority: {
        label: 'Prioridad',
        options: { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' },
      },
      priority_rank: { label: 'Rango de Prioridad' },
      type: {
        label: 'Tipo de Tarea',
        options: {
          call: 'Llamada', email: 'Email', meeting: 'Reunión',
          follow_up: 'Seguimiento', demo: 'Demostración', other: 'Otro',
        },
      },
      due_date: { label: 'Fecha Límite' },
      reminder_date: { label: 'Fecha/Hora de Recordatorio' },
      reminder_sent: { label: 'Recordatorio Enviado' },
      completed_date: { label: 'Fecha de Finalización' },
      owner_id: { label: 'Asignado A' },
      // Los valores son nombres de objeto: se reutilizan las etiquetas ya
      // traducidas de cada objeto en este mismo paquete (igual que
      // `crm_event.related_to_type`).
      related_to_type: {
        label: 'Tipo de Objeto Relacionado',
        options: {
          crm_account: 'Cuenta', crm_contact: 'Contacto', crm_opportunity: 'Oportunidad',
          crm_lead: 'Prospecto', crm_case: 'Caso',
        },
      },
      related_to_account: { label: 'Cuenta Relacionada' },
      related_to_contact: { label: 'Contacto Relacionado' },
      related_to_opportunity: { label: 'Oportunidad Relacionada' },
      related_to_lead: { label: 'Prospecto Relacionado' },
      related_to_case: { label: 'Caso Relacionado' },
      is_recurring: { label: 'Tarea Recurrente' },
      recurrence_type: {
        label: 'Tipo de Recurrencia',
        options: { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' },
      },
      recurrence_interval: { label: 'Intervalo de Recurrencia' },
      recurrence_end_date: { label: 'Fecha Fin de Recurrencia' },
      is_completed: { label: 'Está Completado' },
      is_overdue: { label: 'Está Vencido' },
      progress_percent: { label: 'Progreso (%)' },
    },
    _views: {
      all_tasks: { label: 'Todas las Tareas' },
      task_board: { label: 'Tablero de Tareas' },
      task_calendar: { label: 'Calendario de Tareas' },
      task_gantt: { label: 'Plan de Ejecución' },
      task_timeline: { label: 'Línea de Tiempo' },
      my_open_tasks: { label: 'Mis Tareas Abiertas' },
      todays_tasks: { label: '📅 Mis Tareas Prioritarias' },
      overdue_tasks: { label: '⏰ Tareas Abiertas · Más Vencidas Primero' },
    },
    _sections: {
      basic: { label: 'Información de la Tarea' },
      scheduling: { label: 'Programación' },
      related: { label: 'Registros Relacionados' },
      recurrence: { label: 'Recurrencia' },
      effort: { label: 'Progreso y Esfuerzo' },
      system: { label: 'Sistema' },
      // Nombres de sección del formulario en task.view.ts (#1100)
      task: { label: 'Tarea' },
      related_records: { label: 'Registros Relacionados' },
      recurrence_and_effort: { label: 'Recurrencia y Esfuerzo' },
    },
  },
  crm_event: {
    _validations: {
      end_after_start: {
        message: 'La hora de fin debe ser posterior a la de inicio',
      },
      related_to_required: {
        message: 'Debe seleccionarse al menos un registro relacionado',
      },
    },
    label: 'Evento',
    pluralLabel: 'Eventos',
    description: 'Reuniones, llamadas y otras interacciones programadas con clientes',
    fields: {
      subject: { label: 'Asunto' },
      description: { label: 'Descripción' },
      type: {
        label: 'Tipo de evento',
        options: {
          meeting: 'Reunión', call: 'Llamada', demo: 'Demostración',
          webinar: 'Seminario web', onsite_visit: 'Visita presencial', other: 'Otro',
        },
      },
      status: {
        label: 'Estado',
        options: {
          planned: 'Planificado', held: 'Realizado', cancelled: 'Cancelado', no_show: 'No asistió',
        },
      },
      owner_id: { label: 'Asignado a' },
      start_datetime: { label: 'Inicio' },
      end_datetime: { label: 'Fin' },
      all_day: { label: 'Evento de todo el día' },
      duration_minutes: { label: 'Duración (minutos)' },
      location: { label: 'Ubicación', help: 'Sala, dirección o enlace de la reunión' },
      related_to_type: {
        label: 'Tipo de registro relacionado',
        options: {
          crm_account: 'Cuenta', crm_contact: 'Contacto', crm_opportunity: 'Oportunidad',
          crm_lead: 'Prospecto', crm_case: 'Caso',
        },
      },
      related_to_account: { label: 'Cuenta relacionada' },
      related_to_contact: { label: 'Contacto relacionado' },
      related_to_opportunity: { label: 'Oportunidad relacionada' },
      related_to_lead: { label: 'Prospecto relacionado' },
      related_to_case: { label: 'Caso relacionado' },
      outcome_notes: { label: 'Notas de resultado', help: 'Qué se acordó y qué sigue' },
    },
    _views: {
      all_events: { label: 'Todos los eventos' },
      event_calendar: { label: 'Calendario de eventos' },
      event_timeline: { label: 'Agenda del equipo' },
      my_events: { label: 'Mi calendario' },
      upcoming_events: { label: '📅 Próximos · Más cercanos primero' },
      held_events: { label: '✅ Historial de interacciones' },
    },
    _sections: {
      basic: { label: 'Información del Evento' },
      schedule: { label: 'Programación' },
      related: { label: 'Registros Relacionados' },
      outcome: { label: 'Resultado' },
      // Nombres de sección del formulario en event.view.ts (#1100)
      event: { label: 'Evento' },
      related_records: { label: 'Registros Relacionados' },
    },
  },
  crm_event_attendee: {
    _validations: {
      attendee_resolves: {
        message: 'Un asistente debe indicar la parte que nombra su tipo: el tipo Contacto requiere un contacto y el tipo Externo requiere un nombre de asistente externo',
      },
      attendee_type_exclusive: {
        message: 'Un asistente nombra exactamente una parte: borre las columnas que su tipo de asistente no nombra',
      },
    },
    label: 'Asistente al evento',
    pluralLabel: 'Asistentes al evento',
    description: 'Persona invitada o presente en un evento',
    fields: {
      attendee_number: { label: 'Número de asistente' },
      crm_event: { label: 'Evento' },
      attendee_type: {
        label: 'Tipo de asistente',
        options: { contact: 'Contacto', lead: 'Prospecto', user: 'Usuario', external: 'Externo' },
      },
      crm_contact: { label: 'Contacto', help: 'Se rellena cuando el asistente es un contacto de cliente ya existente' },
      crm_lead: { label: 'Prospecto', help: 'Se rellena cuando el asistente sigue siendo un prospecto sin convertir' },
      sys_user: { label: 'Usuario', help: 'Se rellena cuando el asistente es un compañero de la empresa' },
      external_name: { label: 'Asistente externo', help: 'Nombre de un asistente que no está en ningún objeto del CRM: se rellena cuando el tipo de asistente es Externo' },
      response: {
        label: 'Respuesta',
        options: {
          no_response: 'Sin respuesta', accepted: 'Aceptado',
          declined: 'Rechazado', tentative: 'Tentativo',
        },
      },
      is_organizer: { label: 'Organizador' },
      invited_date: { label: 'Invitado el' },
    },
    _views: {
      all_event_attendees: { label: 'Asistentes al evento' },
    },
    _sections: {
      // El inglés es «Attendee» / «Invitation», no el par
      // «Basic Information» / «Response Tracking» de crm_campaign_member.
      basic: { label: 'Asistente' },
      response: { label: 'Invitación' },
      // Nombres de sección del formulario en event_attendee.view.ts (#1100)
      attendee: { label: 'Asistente' },
      invitation: { label: 'Invitación' },
    },
  },
};
