import { describe, it, expect } from 'vitest';
import { Patient } from '../../../src/patient.object';
import { Appointment } from '../../../src/appointment.object';
import { Insurance } from '../../../src/insurance.object';
import { Referral } from '../../../src/referral.object';
import { HipaaAudit } from '../../../src/hipaa_audit.object';
import { Prescription } from '../../../src/prescription.object';
import { CarePlan } from '../../../src/care_plan.object';

// ─── Patient ───────────────────────────────────────────────────────────────────

describe('Patient Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Patient).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Patient.name).toBe('patient');
    expect(Patient.label).toBe('Patient');
  });

  it('should use snake_case name', () => {
    expect(Patient.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Patient.fields).toBeDefined();
    expect(Object.keys(Patient.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Patient.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Patient.fields.name.type).toBe('text');
    expect(Patient.fields.date_of_birth.type).toBe('text');
    expect(Patient.fields.gender.type).toBe('select');
    expect(Patient.fields.insurance_id.type).toBe('lookup');
    expect(Patient.fields.primary_physician.type).toBe('lookup');
    expect(Patient.fields.allergies.type).toBe('textarea');
    expect(Patient.fields.medical_record_number.type).toBe('text');
    expect(Patient.fields.email.type).toBe('text');
    expect(Patient.fields.phone.type).toBe('text');
    expect(Patient.fields.emergency_contact.type).toBe('text');
    expect(Patient.fields.status.type).toBe('select');
  });

  it('should have gender select with valid options', () => {
    const values = Patient.fields.gender.options.map((o: any) => o.value);
    expect(values).toContain('male');
    expect(values).toContain('female');
    expect(values).toContain('other');
    expect(values).toContain('prefer_not_to_say');
  });

  it('should have status select with valid options', () => {
    const values = Patient.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
    expect(values).toContain('deceased');
  });

  it('should default status to active', () => {
    expect(Patient.fields.status.defaultValue).toBe('active');
  });

  it('should have insurance_id lookup referencing insurance', () => {
    expect(Patient.fields.insurance_id.type).toBe('lookup');
    expect(Patient.fields.insurance_id.reference).toBe('insurance');
  });

  it('should have primary_physician lookup referencing contact', () => {
    expect(Patient.fields.primary_physician.type).toBe('lookup');
    expect(Patient.fields.primary_physician.reference).toBe('contact');
  });

  it('should have medical_record_number as unique', () => {
    expect(Patient.fields.medical_record_number.unique).toBe(true);
  });
});

// ─── Appointment ───────────────────────────────────────────────────────────────

describe('Appointment Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Appointment).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Appointment.name).toBe('appointment');
    expect(Appointment.label).toBe('Appointment');
  });

  it('should use snake_case name', () => {
    expect(Appointment.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Appointment.fields).toBeDefined();
    expect(Object.keys(Appointment.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(Appointment.fields.patient_id.type).toBe('master_detail');
    expect(Appointment.fields.provider_id.type).toBe('lookup');
    expect(Appointment.fields.appointment_type.type).toBe('select');
    expect(Appointment.fields.scheduled_date.type).toBe('text');
    expect(Appointment.fields.duration.type).toBe('number');
    expect(Appointment.fields.status.type).toBe('select');
    expect(Appointment.fields.notes.type).toBe('textarea');
    expect(Appointment.fields.telehealth_link.type).toBe('text');
    expect(Appointment.fields.reason.type).toBe('text');
  });

  it('should have patient_id master_detail referencing patient', () => {
    expect(Appointment.fields.patient_id.reference).toBe('patient');
  });

  it('should have provider_id lookup referencing contact', () => {
    expect(Appointment.fields.provider_id.reference).toBe('contact');
  });

  it('should have scheduled_date as required', () => {
    expect(Appointment.fields.scheduled_date.required).toBe(true);
  });

  it('should have appointment_type select with valid options', () => {
    const values = Appointment.fields.appointment_type.options.map((o: any) => o.value);
    expect(values).toContain('general');
    expect(values).toContain('follow_up');
    expect(values).toContain('specialist');
    expect(values).toContain('telehealth');
    expect(values).toContain('emergency');
  });

  it('should have status select with valid options', () => {
    const values = Appointment.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('scheduled');
    expect(values).toContain('confirmed');
    expect(values).toContain('checked_in');
    expect(values).toContain('in_progress');
    expect(values).toContain('completed');
    expect(values).toContain('cancelled');
    expect(values).toContain('no_show');
  });

  it('should default status to scheduled', () => {
    expect(Appointment.fields.status.defaultValue).toBe('scheduled');
  });

  it('should default duration to 30', () => {
    expect(Appointment.fields.duration.defaultValue).toBe(30);
  });
});

// ─── Insurance ─────────────────────────────────────────────────────────────────

describe('Insurance Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Insurance).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Insurance.name).toBe('insurance');
    expect(Insurance.label).toBe('Insurance');
  });

  it('should use snake_case name', () => {
    expect(Insurance.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Insurance.fields).toBeDefined();
    expect(Object.keys(Insurance.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Insurance.fields.provider_name.required).toBe(true);
    expect(Insurance.fields.policy_number.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Insurance.fields.provider_name.type).toBe('text');
    expect(Insurance.fields.plan_type.type).toBe('select');
    expect(Insurance.fields.policy_number.type).toBe('text');
    expect(Insurance.fields.group_number.type).toBe('text');
    expect(Insurance.fields.coverage_start.type).toBe('text');
    expect(Insurance.fields.coverage_end.type).toBe('text');
    expect(Insurance.fields.copay.type).toBe('number');
    expect(Insurance.fields.deductible.type).toBe('number');
    expect(Insurance.fields.status.type).toBe('select');
  });

  it('should have plan_type select with valid options', () => {
    const values = Insurance.fields.plan_type.options.map((o: any) => o.value);
    expect(values).toContain('hmo');
    expect(values).toContain('ppo');
    expect(values).toContain('epo');
    expect(values).toContain('pos');
    expect(values).toContain('hdhp');
  });

  it('should have status select with valid options', () => {
    const values = Insurance.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('expired');
    expect(values).toContain('cancelled');
  });

  it('should default status to active', () => {
    expect(Insurance.fields.status.defaultValue).toBe('active');
  });
});

// ─── Referral ──────────────────────────────────────────────────────────────────

describe('Referral Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Referral).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Referral.name).toBe('referral');
    expect(Referral.label).toBe('Referral');
  });

  it('should use snake_case name', () => {
    expect(Referral.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Referral.fields).toBeDefined();
    expect(Object.keys(Referral.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(Referral.fields.patient_id.type).toBe('master_detail');
    expect(Referral.fields.referring_provider.type).toBe('lookup');
    expect(Referral.fields.receiving_provider.type).toBe('lookup');
    expect(Referral.fields.reason.type).toBe('textarea');
    expect(Referral.fields.status.type).toBe('select');
    expect(Referral.fields.urgency.type).toBe('select');
    expect(Referral.fields.referral_date.type).toBe('text');
    expect(Referral.fields.authorization_number.type).toBe('text');
    expect(Referral.fields.notes.type).toBe('textarea');
  });

  it('should have patient_id master_detail referencing patient', () => {
    expect(Referral.fields.patient_id.reference).toBe('patient');
  });

  it('should have referring_provider lookup referencing contact', () => {
    expect(Referral.fields.referring_provider.reference).toBe('contact');
  });

  it('should have receiving_provider lookup referencing contact', () => {
    expect(Referral.fields.receiving_provider.reference).toBe('contact');
  });

  it('should have reason as required', () => {
    expect(Referral.fields.reason.required).toBe(true);
  });

  it('should have status select with valid options', () => {
    const values = Referral.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('pending');
    expect(values).toContain('approved');
    expect(values).toContain('completed');
    expect(values).toContain('declined');
    expect(values).toContain('expired');
  });

  it('should default status to pending', () => {
    expect(Referral.fields.status.defaultValue).toBe('pending');
  });

  it('should have urgency select with valid options', () => {
    const values = Referral.fields.urgency.options.map((o: any) => o.value);
    expect(values).toContain('routine');
    expect(values).toContain('urgent');
    expect(values).toContain('emergent');
  });

  it('should default urgency to routine', () => {
    expect(Referral.fields.urgency.defaultValue).toBe('routine');
  });
});

// ─── HIPAA Audit ───────────────────────────────────────────────────────────────

describe('HipaaAudit Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(HipaaAudit).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(HipaaAudit.name).toBe('hipaa_audit');
    expect(HipaaAudit.label).toBe('HIPAA Audit');
  });

  it('should use snake_case name', () => {
    expect(HipaaAudit.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(HipaaAudit.fields).toBeDefined();
    expect(Object.keys(HipaaAudit.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(HipaaAudit.fields.user_id.required).toBe(true);
    expect(HipaaAudit.fields.action.required).toBe(true);
    expect(HipaaAudit.fields.record_type.required).toBe(true);
    expect(HipaaAudit.fields.record_id.required).toBe(true);
    expect(HipaaAudit.fields.timestamp.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(HipaaAudit.fields.user_id.type).toBe('lookup');
    expect(HipaaAudit.fields.action.type).toBe('select');
    expect(HipaaAudit.fields.record_type.type).toBe('text');
    expect(HipaaAudit.fields.record_id.type).toBe('text');
    expect(HipaaAudit.fields.timestamp.type).toBe('text');
    expect(HipaaAudit.fields.ip_address.type).toBe('text');
    expect(HipaaAudit.fields.access_reason.type).toBe('textarea');
    expect(HipaaAudit.fields.risk_level.type).toBe('select');
  });

  it('should have user_id lookup referencing users', () => {
    expect(HipaaAudit.fields.user_id.reference).toBe('users');
  });

  it('should have action select with valid options', () => {
    const values = HipaaAudit.fields.action.options.map((o: any) => o.value);
    expect(values).toContain('view');
    expect(values).toContain('create');
    expect(values).toContain('update');
    expect(values).toContain('delete');
    expect(values).toContain('export');
    expect(values).toContain('print');
  });

  it('should have risk_level select with valid options', () => {
    const values = HipaaAudit.fields.risk_level.options.map((o: any) => o.value);
    expect(values).toContain('low');
    expect(values).toContain('medium');
    expect(values).toContain('high');
    expect(values).toContain('critical');
  });

  it('should default risk_level to low', () => {
    expect(HipaaAudit.fields.risk_level.defaultValue).toBe('low');
  });
});

// ─── Prescription ──────────────────────────────────────────────────────────────

describe('Prescription Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Prescription).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Prescription.name).toBe('prescription');
    expect(Prescription.label).toBe('Prescription');
  });

  it('should use snake_case name', () => {
    expect(Prescription.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Prescription.fields).toBeDefined();
    expect(Object.keys(Prescription.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Prescription.fields.medication.required).toBe(true);
    expect(Prescription.fields.dosage.required).toBe(true);
    expect(Prescription.fields.frequency.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Prescription.fields.patient_id.type).toBe('master_detail');
    expect(Prescription.fields.medication.type).toBe('text');
    expect(Prescription.fields.dosage.type).toBe('text');
    expect(Prescription.fields.frequency.type).toBe('text');
    expect(Prescription.fields.prescriber_id.type).toBe('lookup');
    expect(Prescription.fields.pharmacy.type).toBe('text');
    expect(Prescription.fields.refills_remaining.type).toBe('number');
    expect(Prescription.fields.status.type).toBe('select');
    expect(Prescription.fields.start_date.type).toBe('text');
    expect(Prescription.fields.end_date.type).toBe('text');
    expect(Prescription.fields.instructions.type).toBe('textarea');
  });

  it('should have patient_id master_detail referencing patient', () => {
    expect(Prescription.fields.patient_id.reference).toBe('patient');
  });

  it('should have prescriber_id lookup referencing contact', () => {
    expect(Prescription.fields.prescriber_id.reference).toBe('contact');
  });

  it('should have status select with valid options', () => {
    const values = Prescription.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('completed');
    expect(values).toContain('cancelled');
    expect(values).toContain('expired');
  });

  it('should default status to active', () => {
    expect(Prescription.fields.status.defaultValue).toBe('active');
  });

  it('should default refills_remaining to 0', () => {
    expect(Prescription.fields.refills_remaining.defaultValue).toBe(0);
  });
});

// ─── Care Plan ─────────────────────────────────────────────────────────────────

describe('CarePlan Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(CarePlan).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(CarePlan.name).toBe('care_plan');
    expect(CarePlan.label).toBe('Care Plan');
  });

  it('should use snake_case name', () => {
    expect(CarePlan.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(CarePlan.fields).toBeDefined();
    expect(Object.keys(CarePlan.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(CarePlan.fields.condition.required).toBe(true);
    expect(CarePlan.fields.goals.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(CarePlan.fields.patient_id.type).toBe('master_detail');
    expect(CarePlan.fields.condition.type).toBe('text');
    expect(CarePlan.fields.goals.type).toBe('textarea');
    expect(CarePlan.fields.interventions.type).toBe('textarea');
    expect(CarePlan.fields.start_date.type).toBe('text');
    expect(CarePlan.fields.review_date.type).toBe('text');
    expect(CarePlan.fields.status.type).toBe('select');
    expect(CarePlan.fields.assigned_provider.type).toBe('lookup');
    expect(CarePlan.fields.notes.type).toBe('textarea');
  });

  it('should have patient_id master_detail referencing patient', () => {
    expect(CarePlan.fields.patient_id.reference).toBe('patient');
  });

  it('should have assigned_provider lookup referencing contact', () => {
    expect(CarePlan.fields.assigned_provider.reference).toBe('contact');
  });

  it('should have status select with valid options', () => {
    const values = CarePlan.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('completed');
    expect(values).toContain('on_hold');
    expect(values).toContain('cancelled');
  });

  it('should default status to active', () => {
    expect(CarePlan.fields.status.defaultValue).toBe('active');
  });
});
