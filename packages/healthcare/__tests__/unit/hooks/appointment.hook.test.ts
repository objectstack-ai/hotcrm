import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppointmentConflictDetection,
  AppointmentReminderNotification,
  AppointmentNoShowTracking,
  AppointmentTelehealthLink
} from '../../../src/appointment.hook';

const mockQlFind = vi.fn();
const mockQlFindOne = vi.fn();
const mockQlDocUpdate = vi.fn();

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      find: mockQlFind,
      findOne: mockQlFindOne,
      doc: { update: mockQlDocUpdate }
    },
    session: { userId: 'user_1', tenantId: 'tenant_1' },
    user: { id: 'user_1' }
  };

  if (event.startsWith('before')) {
    base.input = { doc };
  } else {
    base.result = result || doc;
    base.input = { doc };
  }
  return base;
}

// ─── AppointmentConflictDetection ──────────────────────────────────────────────

describe('AppointmentConflictDetection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(AppointmentConflictDetection.name).toBe('AppointmentConflictDetection');
    expect(AppointmentConflictDetection.object).toBe('appointment');
    expect(AppointmentConflictDetection.events).toContain('beforeInsert');
  });

  it('should throw when scheduling conflict exists', async () => {
    mockQlFind.mockResolvedValue([{ _id: 'appt_existing' }]);

    const doc = {
      provider_id: 'doc_1',
      scheduled_date: '2024-06-15T10:00:00Z',
      status: 'scheduled'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(AppointmentConflictDetection.handler(ctx)).rejects.toThrow('Scheduling conflict');
  });

  it('should not throw when no conflict exists', async () => {
    mockQlFind.mockResolvedValue([]);

    const doc = {
      provider_id: 'doc_1',
      scheduled_date: '2024-06-15T10:00:00Z',
      status: 'scheduled'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(AppointmentConflictDetection.handler(ctx)).resolves.toBeUndefined();
  });

  it('should skip when provider_id is missing', async () => {
    const doc = { scheduled_date: '2024-06-15T10:00:00Z' };
    const ctx = createMockContext('beforeInsert', doc);

    await AppointmentConflictDetection.handler(ctx);
    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when scheduled_date is missing', async () => {
    const doc = { provider_id: 'doc_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await AppointmentConflictDetection.handler(ctx);
    expect(mockQlFind).not.toHaveBeenCalled();
  });
});

// ─── AppointmentReminderNotification ───────────────────────────────────────────

describe('AppointmentReminderNotification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(AppointmentReminderNotification.name).toBe('AppointmentReminderNotification');
    expect(AppointmentReminderNotification.object).toBe('appointment');
    expect(AppointmentReminderNotification.events).toContain('afterInsert');
  });

  it('should log reminder when appointment is created', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterInsert', {},
      { _id: 'appt_1', patient_id: 'patient_1' }
    );

    await AppointmentReminderNotification.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Reminder scheduled')
    );
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterInsert', {}, {});

    await AppointmentReminderNotification.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Reminder scheduled')
    );
    consoleSpy.mockRestore();
  });

  it('should skip when result has no patient_id', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterInsert', {}, { _id: 'appt_1' });

    await AppointmentReminderNotification.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Reminder scheduled')
    );
    consoleSpy.mockRestore();
  });
});

// ─── AppointmentNoShowTracking ─────────────────────────────────────────────────

describe('AppointmentNoShowTracking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(AppointmentNoShowTracking.name).toBe('AppointmentNoShowTracking');
    expect(AppointmentNoShowTracking.object).toBe('appointment');
    expect(AppointmentNoShowTracking.events).toContain('afterUpdate');
  });

  it('should log no-show when status is no_show', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQlFindOne.mockResolvedValue({ _id: 'patient_1', name: 'John Doe' });

    const ctx = createMockContext('afterUpdate',
      { status: 'no_show' },
      { _id: 'appt_1', patient_id: 'patient_1' }
    );

    await AppointmentNoShowTracking.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No-show recorded')
    );
    consoleSpy.mockRestore();
  });

  it('should not track when status is not no_show', async () => {
    const ctx = createMockContext('afterUpdate',
      { status: 'completed' },
      { _id: 'appt_1', patient_id: 'patient_1' }
    );

    await AppointmentNoShowTracking.handler(ctx);

    expect(mockQlFindOne).not.toHaveBeenCalled();
  });
});

// ─── AppointmentTelehealthLink ─────────────────────────────────────────────────

describe('AppointmentTelehealthLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(AppointmentTelehealthLink.name).toBe('AppointmentTelehealthLink');
    expect(AppointmentTelehealthLink.object).toBe('appointment');
    expect(AppointmentTelehealthLink.events).toContain('beforeInsert');
  });

  it('should generate telehealth link for telehealth appointments', async () => {
    const doc = { appointment_type: 'telehealth' } as any;
    const ctx = createMockContext('beforeInsert', doc);

    await AppointmentTelehealthLink.handler(ctx);

    expect(doc.telehealth_link).toBeDefined();
    expect(doc.telehealth_link).toMatch(/^https:\/\/telehealth\.hotcrm\.com\/session\//);
  });

  it('should not overwrite existing telehealth link', async () => {
    const doc = {
      appointment_type: 'telehealth',
      telehealth_link: 'https://existing-link.com/session/abc'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await AppointmentTelehealthLink.handler(ctx);

    expect(doc.telehealth_link).toBe('https://existing-link.com/session/abc');
  });

  it('should not generate link for non-telehealth appointments', async () => {
    const doc = { appointment_type: 'general' } as any;
    const ctx = createMockContext('beforeInsert', doc);

    await AppointmentTelehealthLink.handler(ctx);

    expect(doc.telehealth_link).toBeUndefined();
  });
});
