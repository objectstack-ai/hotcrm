import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'student', 'course', 'enrollment', 'application_form',
  'scholarship', 'campus_event', 'alumni'
] as const;

const fullAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: true,
  viewAllRecords: true,
  modifyAllRecords: true
};

const staffAccess = {
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
 * Education permission sets for students, faculty, registrar, and admin roles.
 * Enforces role-based access control across all education objects.
 */

export const EducationAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'education_admin',
  label: 'Education Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'student.gpa': { readable: true, editable: true },
    'student.email': { readable: true, editable: true },
    'application_form.decision': { readable: true, editable: true },
    'scholarship.fund_balance': { readable: true, editable: true },
    'enrollment.grade': { readable: true, editable: true }
  },
  systemPermissions: ['manage_education_settings', 'view_audit_logs', 'manage_admissions']
});

export const Faculty: PermissionSet = PermissionSetSchema.parse({
  name: 'faculty',
  label: 'Faculty',
  isProfile: false,
  objects: {
    student: { ...staffAccess, allowCreate: false },
    course: staffAccess,
    enrollment: staffAccess,
    application_form: readOnlyAccess,
    scholarship: readOnlyAccess,
    campus_event: staffAccess,
    alumni: readOnlyAccess
  },
  fields: {
    'student.gpa': { readable: true, editable: false },
    'student.email': { readable: true, editable: false },
    'enrollment.grade': { readable: true, editable: true },
    'application_form.decision': { readable: false, editable: false },
    'scholarship.fund_balance': { readable: false, editable: false }
  }
});

export const Registrar: PermissionSet = PermissionSetSchema.parse({
  name: 'registrar',
  label: 'Registrar',
  isProfile: false,
  objects: {
    student: staffAccess,
    course: staffAccess,
    enrollment: { ...staffAccess, allowDelete: true },
    application_form: staffAccess,
    scholarship: readOnlyAccess,
    campus_event: readOnlyAccess,
    alumni: staffAccess
  },
  fields: {
    'student.gpa': { readable: true, editable: true },
    'student.email': { readable: true, editable: true },
    'enrollment.grade': { readable: true, editable: true },
    'application_form.decision': { readable: true, editable: true },
    'scholarship.fund_balance': { readable: true, editable: false }
  }
});

export const StudentRole: PermissionSet = PermissionSetSchema.parse({
  name: 'student_role',
  label: 'Student',
  isProfile: false,
  objects: {
    student: readOnlyAccess,
    course: readOnlyAccess,
    enrollment: readOnlyAccess,
    application_form: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    scholarship: readOnlyAccess,
    campus_event: readOnlyAccess,
    alumni: noAccess
  },
  fields: {
    'student.gpa': { readable: true, editable: false },
    'student.email': { readable: true, editable: false },
    'enrollment.grade': { readable: true, editable: false },
    'application_form.decision': { readable: true, editable: false },
    'scholarship.fund_balance': { readable: false, editable: false }
  }
});
