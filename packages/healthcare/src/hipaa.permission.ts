import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'patient', 'appointment', 'referral', 'prescription',
  'care_plan', 'insurance', 'hipaa_audit'
] as const;

const fullAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: true,
  viewAllRecords: true,
  modifyAllRecords: true
};

const clinicalAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: false,
  viewAllRecords: true,
  modifyAllRecords: false
};

const readOnlyAccess = {
  allowCreate: false,
  allowRead: true,
  allowEdit: false,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

const noAccess = {
  allowCreate: false,
  allowRead: false,
  allowEdit: false,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

/**
 * HIPAA-compliant permission sets for healthcare data access.
 * Enforces minimum necessary access principle per HIPAA requirements.
 */

export const HealthcareAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'healthcare_admin',
  label: 'Healthcare Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'patient.email': { readable: true, editable: true },
    'patient.phone': { readable: true, editable: true },
    'patient.allergies': { readable: true, editable: true },
    'prescription.dosage': { readable: true, editable: true },
    'hipaa_audit.access_details': { readable: true, editable: true }
  },
  systemPermissions: ['manage_healthcare_settings', 'view_audit_logs', 'manage_hipaa_compliance']
});

export const Physician: PermissionSet = PermissionSetSchema.parse({
  name: 'physician',
  label: 'Physician',
  isProfile: false,
  objects: {
    patient: clinicalAccess,
    appointment: clinicalAccess,
    referral: clinicalAccess,
    prescription: { ...clinicalAccess, allowCreate: true },
    care_plan: clinicalAccess,
    insurance: readOnlyAccess,
    hipaa_audit: readOnlyAccess
  },
  fields: {
    'patient.email': { readable: true, editable: false },
    'patient.phone': { readable: true, editable: false },
    'patient.allergies': { readable: true, editable: true },
    'prescription.dosage': { readable: true, editable: true }
  }
});

export const Nurse: PermissionSet = PermissionSetSchema.parse({
  name: 'nurse',
  label: 'Nurse',
  isProfile: false,
  objects: {
    patient: { ...clinicalAccess, allowDelete: false },
    appointment: clinicalAccess,
    referral: readOnlyAccess,
    prescription: readOnlyAccess,
    care_plan: clinicalAccess,
    insurance: readOnlyAccess,
    hipaa_audit: noAccess
  },
  fields: {
    'patient.email': { readable: true, editable: false },
    'patient.phone': { readable: true, editable: false },
    'patient.allergies': { readable: true, editable: true },
    'prescription.dosage': { readable: true, editable: false }
  }
});

export const MedicalReceptionist: PermissionSet = PermissionSetSchema.parse({
  name: 'medical_receptionist',
  label: 'Medical Receptionist',
  isProfile: false,
  objects: {
    patient: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    appointment: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    referral: readOnlyAccess,
    prescription: noAccess,
    care_plan: noAccess,
    insurance: readOnlyAccess,
    hipaa_audit: noAccess
  },
  fields: {
    'patient.email': { readable: true, editable: true },
    'patient.phone': { readable: true, editable: true },
    'patient.allergies': { readable: false, editable: false },
    'prescription.dosage': { readable: false, editable: false }
  }
});

export const HIPAAReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'hipaa_read_only',
  label: 'HIPAA Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess])),
  fields: {
    'patient.email': { readable: false, editable: false },
    'patient.phone': { readable: false, editable: false },
    'patient.allergies': { readable: false, editable: false },
    'prescription.dosage': { readable: false, editable: false }
  }
});
