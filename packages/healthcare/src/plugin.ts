/**
 * @hotcrm/healthcare - Healthcare Plugin Definition
 *
 * This plugin provides healthcare management functionality including:
 * - Patient Management
 * - Appointment Scheduling
 * - Insurance Management
 * - Referral Processing
 * - HIPAA Compliance Auditing
 * - Prescription Management
 * - Care Plan Tracking
 * - AI-Powered Analytics & Risk Scoring
 *
 * Dependencies: @hotcrm/core
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Healthcare objects
import { Patient } from './patient.object.js';
import { Appointment } from './appointment.object.js';
import { Insurance } from './insurance.object.js';
import { Referral } from './referral.object.js';
import { HipaaAudit } from './hipaa_audit.object.js';
import { Prescription } from './prescription.object.js';
import { CarePlan } from './care_plan.object.js';

// Import hooks
import { AppointmentConflictDetection, AppointmentReminderNotification, AppointmentNoShowTracking, AppointmentTelehealthLink } from './appointment.hook.js';
import { PatientDataEncryption, PatientConsentTracking, PatientInsuranceVerification } from './patient.hook.js';
import { ReferralAutoRouting, ReferralStatusTracking, ReferralFollowUpScheduling } from './referral.hook.js';
import { HipaaAuditTrail, HipaaAnomalyDetection } from './hipaa_audit.hook.js';

// Import actions
import HealthcareAIAction from './healthcare_ai.action.js';

/**
 * Healthcare Plugin Definition
 *
 * Exports all healthcare-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const HealthcarePlugin = {
  name: 'healthcare',
  label: 'Healthcare Cloud',
  version: '1.0.0',
  description: 'Healthcare management - Patients, Appointments, Insurance, Referrals, and HIPAA Compliance',

  // Plugin dependencies
  dependencies: ['core'],

  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },

  // Business objects provided by this plugin
  objects: {
    patient: Patient,
    appointment: Appointment,
    insurance: Insurance,
    referral: Referral,
    hipaa_audit: HipaaAudit,
    prescription: Prescription,
    care_plan: CarePlan,
  },

  // Actions provided by this plugin
  actions: {
    healthcare_ai: HealthcareAIAction,
  },

  // Triggers/Hooks
  triggers: {
    appointment_conflict_detection: AppointmentConflictDetection,
    appointment_reminder_notification: AppointmentReminderNotification,
    appointment_no_show_tracking: AppointmentNoShowTracking,
    appointment_telehealth_link: AppointmentTelehealthLink,
    patient_data_encryption: PatientDataEncryption,
    patient_consent_tracking: PatientConsentTracking,
    patient_insurance_verification: PatientInsuranceVerification,
    referral_auto_routing: ReferralAutoRouting,
    referral_status_tracking: ReferralStatusTracking,
    referral_follow_up_scheduling: ReferralFollowUpScheduling,
    hipaa_audit_trail: HipaaAuditTrail,
    hipaa_anomaly_detection: HipaaAnomalyDetection,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'healthcare',
      label: 'Healthcare Cloud',
      navigation: [
        {
          id: 'patients',
          type: 'group',
          label: 'Patients',
          children: [
            { id: 'patient', label: 'Patient', type: 'object', objectName: 'patient' },
            { id: 'insurance', label: 'Insurance', type: 'object', objectName: 'insurance' },
          ]
        },
        {
          id: 'appointments',
          type: 'group',
          label: 'Appointments',
          children: [
            { id: 'appointment', label: 'Appointment', type: 'object', objectName: 'appointment' },
            { id: 'referral', label: 'Referral', type: 'object', objectName: 'referral' },
          ]
        },
        {
          id: 'clinical',
          type: 'group',
          label: 'Clinical',
          children: [
            { id: 'prescription', label: 'Prescription', type: 'object', objectName: 'prescription' },
            { id: 'care_plan', label: 'Care Plan', type: 'object', objectName: 'care_plan' },
          ]
        },
        {
          id: 'administration',
          type: 'group',
          label: 'Administration',
          children: [
            { id: 'hipaa_audit', label: 'HIPAA Audit', type: 'object', objectName: 'hipaa_audit' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const HealthcarePluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'healthcare',
  label: 'Healthcare Cloud',
  version: '1.0.0',
  description: 'Healthcare management - Patients, Appointments, Insurance, Referrals, and HIPAA Compliance',
});

export default HealthcarePlugin;
