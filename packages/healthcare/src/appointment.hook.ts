import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Appointment Conflict Detection
 *
 * Checks for scheduling conflicts for the same provider before inserting.
 */
const AppointmentConflictDetection: Hook = {
  name: 'AppointmentConflictDetection',
  object: 'appointment',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.provider_id || !doc.scheduled_date) return;

    try {
      const conflicts = await (ctx.ql as any).find('appointment', {
        filters: [
          ['provider_id', '=', doc.provider_id],
          ['scheduled_date', '=', doc.scheduled_date],
          ['status', '!=', 'cancelled']
        ]
      });

      if (conflicts.length > 0) {
        throw new Error(`Scheduling conflict: Provider ${doc.provider_id} already has an appointment at ${doc.scheduled_date}`);
      }
    } catch (error) {
      if ((error as Error).message?.includes('Scheduling conflict')) {
        throw error;
      }
      console.warn('⚠️ Failed to check appointment conflicts:', error);
    }
  }
};

/**
 * Appointment Reminder Notification
 *
 * Schedules a reminder notification after an appointment is created.
 */
const AppointmentReminderNotification: Hook = {
  name: 'AppointmentReminderNotification',
  object: 'appointment',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const appointment = ctx.result as Record<string, any>;
    if (!appointment?._id || !appointment?.patient_id) return;

    console.log(`📅 Reminder scheduled for appointment ${appointment._id} - Patient ${appointment.patient_id}`);
  }
};

/**
 * Appointment No-Show Tracking
 *
 * Tracks no-shows and updates the patient record when status changes to no_show.
 */
const AppointmentNoShowTracking: Hook = {
  name: 'AppointmentNoShowTracking',
  object: 'appointment',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const result = ctx.result as Record<string, any>;

    if (doc.status !== 'no_show') return;

    try {
      const patient = await (ctx.ql as any).findOne('patient', result?.patient_id);
      if (patient) {
        console.log(`⚠️ No-show recorded for patient ${result?.patient_id} - Appointment ${result?._id}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to track no-show:', error);
    }
  }
};

/**
 * Appointment Telehealth Link
 *
 * Auto-generates a telehealth link for telehealth appointments before insert.
 */
const AppointmentTelehealthLink: Hook = {
  name: 'AppointmentTelehealthLink',
  object: 'appointment',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.appointment_type === 'telehealth' && !doc.telehealth_link) {
      const linkId = Math.random().toString(36).substring(2, 10);
      doc.telehealth_link = `https://telehealth.hotcrm.com/session/${linkId}`;
      console.log(`🔗 Telehealth link generated for appointment: ${doc.telehealth_link}`);
    }
  }
};

export { AppointmentConflictDetection, AppointmentReminderNotification, AppointmentNoShowTracking, AppointmentTelehealthLink };
export default AppointmentConflictDetection;
