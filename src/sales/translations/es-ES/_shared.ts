// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Español (es-ES) — values shared by more than one part of this bundle.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/es-ES.ts`.
 *
 * Every constant here is spread into object rows that live in MORE THAN ONE
 * family file, so it cannot sit in any one of them. A value used by exactly
 * one family lives in that family's file instead — that split is mechanical,
 * not a judgement call.
 */

/**
 * Familia de acciones de actividad (#592): `log_call`, `log_meeting` y
 * `schedule_meeting` se registran una vez POR OBJETO (prospecto, contacto,
 * cuenta, oportunidad, caso), porque una acción de script sin `objectName`
 * queda bajo una clave que el despachador nunca consulta (#509). Los textos son
 * idénticos en los cinco, así que se declaran una vez aquí.
 */
export const activityActions = {
  log_call: {
    label: 'Registrar llamada',
    successMessage: '¡Llamada registrada exitosamente!',
    params: {
      subject: { label: 'Asunto de la llamada' },
      duration: { label: 'Duración (minutos)' },
      attendee_contacts: { label: 'Contactos participantes' },
      attendee_users: { label: 'Participantes internos' },
      notes: { label: 'Notas de la llamada' },
    },
  },
  log_meeting: {
    label: 'Registrar reunión',
    successMessage: '¡Reunión registrada exitosamente!',
    params: {
      subject: { label: 'Asunto de la reunión' },
      duration: { label: 'Duración (minutos)' },
      attendee_contacts: { label: 'Contactos participantes' },
      attendee_users: { label: 'Participantes internos' },
      notes: { label: 'Notas de la reunión' },
    },
  },
  schedule_meeting: {
    label: 'Programar reunión',
    successMessage: '¡Reunión programada!',
    params: {
      subject: { label: 'Asunto de la reunión' },
      start_date: { label: 'Fecha de inicio (UTC)' },
      start_time: { label: 'Hora de inicio (UTC)' },
      location: { label: 'Ubicación' },
      duration: { label: 'Duración (minutos)' },
      attendee_contacts: { label: 'Contactos participantes' },
      attendee_users: { label: 'Participantes internos' },
      notes: { label: 'Agenda' },
    },
  },
};
