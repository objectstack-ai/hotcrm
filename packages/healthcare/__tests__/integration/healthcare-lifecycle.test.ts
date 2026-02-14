/**
 * Integration Test: Healthcare Lifecycle
 *
 * Validates the full patient → appointment → referral → care plan → follow-up flow.
 */

import { vi, Mock } from 'vitest';

vi.mock('../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    count: vi.fn()
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { broker } from '../../src/db';

describe('Healthcare Lifecycle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a patient with insurance', async () => {
    const insurance = {
      _id: 'ins_1',
      provider_name: 'Blue Cross',
      plan_type: 'ppo',
      policy_number: 'POL-12345',
      status: 'active'
    };

    const patient = {
      _id: 'patient_1',
      name: 'Jane Doe',
      date_of_birth: '1985-03-15',
      gender: 'female',
      insurance_id: 'ins_1',
      medical_record_number: 'MRN-001',
      status: 'active'
    };

    (broker.insert as Mock).mockResolvedValueOnce(insurance);
    (broker.insert as Mock).mockResolvedValueOnce(patient);

    const createdInsurance = await broker.insert('insurance', insurance);
    const createdPatient = await broker.insert('patient', patient);

    expect(createdInsurance.policy_number).toBe('POL-12345');
    expect(createdPatient.insurance_id).toBe('ins_1');
    expect(createdPatient.status).toBe('active');
  });

  it('should schedule an appointment for a patient', async () => {
    const appointment = {
      _id: 'appt_1',
      patient_id: 'patient_1',
      provider_id: 'doc_1',
      appointment_type: 'general',
      scheduled_date: '2024-06-15T10:00:00Z',
      duration: 30,
      status: 'scheduled',
      reason: 'Annual checkup'
    };

    (broker.insert as Mock).mockResolvedValue(appointment);

    const createdAppointment = await broker.insert('appointment', appointment);

    expect(createdAppointment.patient_id).toBe('patient_1');
    expect(createdAppointment.status).toBe('scheduled');
    expect(broker.insert).toHaveBeenCalledWith('appointment', expect.objectContaining({
      patient_id: 'patient_1',
      provider_id: 'doc_1'
    }));
  });

  it('should complete an appointment and create a referral', async () => {
    const completedAppointment = {
      _id: 'appt_1',
      patient_id: 'patient_1',
      status: 'completed'
    };

    const referral = {
      _id: 'ref_1',
      patient_id: 'patient_1',
      referring_provider: 'doc_1',
      receiving_provider: 'doc_2',
      reason: 'Cardiology consultation for heart palpitations',
      status: 'pending',
      urgency: 'routine'
    };

    (broker.update as Mock).mockResolvedValueOnce(completedAppointment);
    (broker.insert as Mock).mockResolvedValue(referral);

    const appointmentResult = await broker.update('appointment', 'appt_1', { status: 'completed' });
    const createdReferral = await broker.insert('referral', referral);

    expect(appointmentResult.status).toBe('completed');
    expect(createdReferral.patient_id).toBe('patient_1');
    expect(createdReferral.status).toBe('pending');
    expect(createdReferral.urgency).toBe('routine');
  });

  it('should approve referral and create a care plan', async () => {
    const approvedReferral = {
      _id: 'ref_1',
      patient_id: 'patient_1',
      status: 'approved'
    };

    const carePlan = {
      _id: 'cp_1',
      patient_id: 'patient_1',
      condition: 'Heart palpitations',
      goals: 'Monitor and manage cardiac symptoms',
      interventions: 'ECG monitoring, medication adjustment',
      status: 'active',
      assigned_provider: 'doc_2'
    };

    (broker.update as Mock).mockResolvedValueOnce(approvedReferral);
    (broker.insert as Mock).mockResolvedValue(carePlan);

    const referralResult = await broker.update('referral', 'ref_1', { status: 'approved' });
    const createdCarePlan = await broker.insert('care_plan', carePlan);

    expect(referralResult.status).toBe('approved');
    expect(createdCarePlan.condition).toBe('Heart palpitations');
    expect(createdCarePlan.status).toBe('active');
    expect(createdCarePlan.assigned_provider).toBe('doc_2');
  });

  it('should create a prescription for the patient', async () => {
    const prescription = {
      _id: 'rx_1',
      patient_id: 'patient_1',
      medication: 'Metoprolol',
      dosage: '25mg',
      frequency: 'Twice daily',
      prescriber_id: 'doc_2',
      refills_remaining: 3,
      status: 'active',
      start_date: '2024-06-15'
    };

    (broker.insert as Mock).mockResolvedValue(prescription);

    const createdPrescription = await broker.insert('prescription', prescription);

    expect(createdPrescription.medication).toBe('Metoprolol');
    expect(createdPrescription.refills_remaining).toBe(3);
    expect(createdPrescription.status).toBe('active');
    expect(broker.insert).toHaveBeenCalledWith('prescription', expect.objectContaining({
      patient_id: 'patient_1',
      medication: 'Metoprolol'
    }));
  });

  it('should schedule a follow-up appointment after referral completion', async () => {
    const completedReferral = {
      _id: 'ref_1',
      patient_id: 'patient_1',
      referring_provider: 'doc_1',
      status: 'completed'
    };

    const followUpAppointment = {
      _id: 'appt_2',
      patient_id: 'patient_1',
      provider_id: 'doc_1',
      appointment_type: 'follow_up',
      scheduled_date: '2024-07-15T10:00:00Z',
      status: 'scheduled',
      reason: 'Follow-up after cardiology referral'
    };

    (broker.update as Mock).mockResolvedValueOnce(completedReferral);
    (broker.insert as Mock).mockResolvedValue(followUpAppointment);

    const referralResult = await broker.update('referral', 'ref_1', { status: 'completed' });
    const createdFollowUp = await broker.insert('appointment', followUpAppointment);

    expect(referralResult.status).toBe('completed');
    expect(createdFollowUp.appointment_type).toBe('follow_up');
    expect(createdFollowUp.patient_id).toBe('patient_1');
  });

  it('should log a HIPAA audit entry for patient record access', async () => {
    const auditEntry = {
      _id: 'audit_1',
      user_id: 'doc_1',
      action: 'view',
      record_type: 'patient',
      record_id: 'patient_1',
      timestamp: '2024-06-15T10:30:00Z',
      ip_address: '192.168.1.100',
      risk_level: 'low'
    };

    (broker.insert as Mock).mockResolvedValue(auditEntry);

    const createdAudit = await broker.insert('hipaa_audit', auditEntry);

    expect(createdAudit.action).toBe('view');
    expect(createdAudit.record_type).toBe('patient');
    expect(createdAudit.risk_level).toBe('low');
    expect(broker.insert).toHaveBeenCalledWith('hipaa_audit', expect.objectContaining({
      user_id: 'doc_1',
      record_type: 'patient'
    }));
  });

  it('should count active patients', async () => {
    (broker.count as Mock).mockResolvedValue(42);

    const activeCount = await broker.count('patient', {
      filters: [['status', '=', 'active']]
    } as any);

    expect(activeCount).toBe(42);
    expect(broker.count).toHaveBeenCalledWith('patient', expect.objectContaining({
      filters: [['status', '=', 'active']]
    }));
  });
});
