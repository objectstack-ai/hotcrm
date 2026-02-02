import type { HookContext } from '@objectstack/spec/data';
import {
  OfferCreationTrigger,
  OfferStatusChangeTrigger,
  OfferApprovalTrigger
} from '../../../src/hooks/offer.hook';

// Mock modules
const mockQlFind = jest.fn();
const mockQlDocGet = jest.fn();
const mockQlDocCreate = jest.fn();
const mockQlDocUpdate = jest.fn();

const createMockContext = (
  event: 'beforeInsert' | 'beforeUpdate' | 'afterUpdate',
  input: any,
  previous?: any
): HookContext => ({
  event,
  input,
  previous,
  ql: {
    find: mockQlFind,
    doc: {
      get: mockQlDocGet,
      create: mockQlDocCreate,
      update: mockQlDocUpdate
    }
  } as any,
  session: {
    userId: 'user_123',
    tenantId: 'tenant_123'
  } as any
});

describe('Offer Hook - OfferCreationTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('beforeInsert - Offer Number Generation', () => {
    it('should generate offer number if not provided', async () => {
      // Arrange
      const offer = {
        candidate_id: 'cand_123',
        application_id: 'app_123',
        position_id: 'pos_123',
        base_salary: 250000,
        offer_date: '2024-06-01'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', offer);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer.offer_number).toBeDefined();
      expect(offer.offer_number).toMatch(/^OFF-\d{6}-\d{4}$/);
    });

    it('should not override existing offer number', async () => {
      // Arrange
      const offer = {
        offer_number: 'CUSTOM-001',
        candidate_id: 'cand_123',
        offer_date: '2024-06-01'
      };

      const ctx = createMockContext('beforeInsert', offer);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer.offer_number).toBe('CUSTOM-001');
    });

    it('should generate sequential offer numbers', async () => {
      // Arrange
      const offer1 = {
        candidate_id: 'cand_123',
        offer_date: '2024-06-01'
      };

      const existingOffer = {
        offer_number: 'OFF-202406-0005'
      };

      mockQlFind.mockResolvedValue([existingOffer]);

      const ctx = createMockContext('beforeInsert', offer1);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer1.offer_number).toBe('OFF-202406-0006');
    });
  });

  describe('beforeInsert - Expiry Date Calculation', () => {
    it('should set default expiry date to 7 days from offer date', async () => {
      // Arrange
      const offer = {
        candidate_id: 'cand_123',
        offer_date: '2024-06-01'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', offer);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer.expiry_date).toBe('2024-06-08'); // 7 days after 2024-06-01
    });

    it('should not override existing expiry date', async () => {
      // Arrange
      const offer = {
        candidate_id: 'cand_123',
        offer_date: '2024-06-01',
        expiry_date: '2024-06-15'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', offer);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer.expiry_date).toBe('2024-06-15');
    });
  });

  describe('beforeInsert - Default Status', () => {
    it('should set default status to Draft', async () => {
      // Arrange
      const offer = {
        candidate_id: 'cand_123',
        offer_date: '2024-06-01'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', offer);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer.status).toBe('Draft');
    });

    it('should not override existing status', async () => {
      // Arrange
      const offer = {
        candidate_id: 'cand_123',
        offer_date: '2024-06-01',
        status: 'Approved'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', offer);

      // Act
      await OfferCreationTrigger.handler(ctx);

      // Assert
      expect(offer.status).toBe('Approved');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if offer creation fails', async () => {
      // Arrange
      const offer = {
        candidate_id: 'cand_123',
        offer_date: '2024-06-01'
      };

      mockQlFind.mockRejectedValue(new Error('Database error'));

      const ctx = createMockContext('beforeInsert', offer);

      // Act & Assert
      await expect(OfferCreationTrigger.handler(ctx)).rejects.toThrow();
    });
  });
});

describe('Offer Hook - OfferApprovalTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('beforeUpdate - Approval Status Change', () => {
    it('should not trigger if approval status has not changed', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        approval_status: 'Pending'
      };

      const previous = {
        id: 'off_123',
        approval_status: 'Pending'
      };

      const ctx = createMockContext('beforeUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferApprovalTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('approval status changed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle offer approval', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        approval_status: 'Approved',
        status: 'Draft'
      };

      const previous = {
        id: 'off_123',
        approval_status: 'Pending',
        status: 'Draft'
      };

      const ctx = createMockContext('beforeUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferApprovalTrigger.handler(ctx);

      // Assert
      expect(offer.status).toBe('Approved');
      expect(offer.approved_date).toBeDefined();
      expect(offer.approved_by).toBe('user_123');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('approved by user_123')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not change status if already sent', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        approval_status: 'Approved',
        status: 'Sent'
      };

      const previous = {
        id: 'off_123',
        approval_status: 'Pending',
        status: 'Sent'
      };

      const ctx = createMockContext('beforeUpdate', offer, previous);

      // Act
      await OfferApprovalTrigger.handler(ctx);

      // Assert
      expect(offer.status).toBe('Sent'); // Should remain Sent
    });

    it('should handle offer rejection', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        approval_status: 'Rejected',
        status: 'Pending Approval'
      };

      const previous = {
        id: 'off_123',
        approval_status: 'Pending',
        status: 'Pending Approval'
      };

      const ctx = createMockContext('beforeUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferApprovalTrigger.handler(ctx);

      // Assert
      expect(offer.status).toBe('Draft');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('rejected in approval')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not set approved_date for previously approved offer', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        approval_status: 'Approved',
        status: 'Draft',
        approved_date: '2024-05-15'
      };

      const previous = {
        id: 'off_123',
        approval_status: 'Approved', // Already approved
        status: 'Draft'
      };

      const ctx = createMockContext('beforeUpdate', offer, previous);

      // Act
      await OfferApprovalTrigger.handler(ctx);

      // Assert
      // Should not update approved_date since it was already approved
      expect(offer.approved_date).toBe('2024-05-15');
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if approval processing fails', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        approval_status: 'Approved'
      };

      const previous = {
        id: 'off_123',
        approval_status: 'Pending'
      };

      const ctx = createMockContext('beforeUpdate', offer, previous);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Force an error by making offer have no status
      delete offer.status;

      // Act & Assert
      await expect(OfferApprovalTrigger.handler(ctx)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Offer Hook - OfferStatusChangeTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('afterUpdate - Status Change Detection', () => {
    it('should not trigger if status has not changed', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        status: 'Draft'
      };

      const previous = {
        id: 'off_123',
        status: 'Draft'
      };

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('status changed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log status change when status changes', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        status: 'Sent'
      };

      const previous = {
        id: 'off_123',
        status: 'Draft'
      };

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Offer OFF-202406-0001 status changed from "Draft" to "Sent"')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Sent Status', () => {
    it('should update candidate and application status when offer sent', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Sent'
      };

      const previous = {
        id: 'off_123',
        status: 'Draft'
      };

      mockQlDocUpdate.mockResolvedValue({});

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('candidate', 'cand_123', {
        status: 'Offer Sent'
      });
      expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_123', {
        status: 'Offer Sent'
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Offer OFF-202406-0001 sent to candidate')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set sent_date if not already set', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Sent'
      };

      const previous = {
        id: 'off_123',
        status: 'Draft'
      };

      mockQlDocUpdate.mockResolvedValue({});

      const ctx = createMockContext('afterUpdate', offer, previous);

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('offer', 'off_123', {
        sent_date: expect.any(String)
      });
    });
  });

  describe('afterUpdate - Accepted Status', () => {
    it('should update candidate and application status when offer accepted', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Accepted'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      const mockCandidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        mobile_phone: '+8613812345678'
      };

      mockQlDocUpdate.mockResolvedValue({});
      mockQlDocGet.mockResolvedValue(mockCandidate);
      mockQlDocCreate.mockResolvedValue({ id: 'emp_123' });

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('candidate', 'cand_123', {
        status: 'Hired'
      });
      expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_123', {
        status: 'Hired'
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Offer OFF-202406-0001 accepted by candidate')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set acceptance_date if not already set', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Accepted'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      const mockCandidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com'
      };

      mockQlDocUpdate.mockResolvedValue({});
      mockQlDocGet.mockResolvedValue(mockCandidate);
      mockQlDocCreate.mockResolvedValue({ id: 'emp_123' });

      const ctx = createMockContext('afterUpdate', offer, previous);

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('offer', 'off_123', {
        acceptance_date: expect.any(String)
      });
    });

    it('should create employee record from accepted offer', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        department_id: 'dept_123',
        position_id: 'pos_123',
        hiring_manager_id: 'mgr_123',
        employment_type: 'Full-time',
        base_salary: 250000,
        start_date: '2024-07-01',
        status: 'Accepted'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      const mockCandidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        mobile_phone: '+8613812345678',
        date_of_birth: '1990-05-15',
        gender: 'Female'
      };

      mockQlDocUpdate.mockResolvedValue({});
      mockQlDocGet.mockResolvedValue(mockCandidate);
      mockQlDocCreate.mockResolvedValue({ id: 'emp_123' });
      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocCreate).toHaveBeenCalledWith('employee', expect.objectContaining({
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        mobile_phone: '+8613812345678',
        hire_date: '2024-07-01',
        department_id: 'dept_123',
        position_id: 'pos_123',
        manager_id: 'mgr_123',
        employment_type: 'Full-time',
        employment_status: 'Active',
        base_salary: 250000
      }));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created employee')
      );

      consoleLogSpy.mockRestore();
    });

    it('should link employee to offer', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Accepted'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      const mockCandidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com'
      };

      mockQlDocUpdate.mockResolvedValue({});
      mockQlDocGet.mockResolvedValue(mockCandidate);
      mockQlDocCreate.mockResolvedValue({ id: 'emp_123' });
      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('afterUpdate', offer, previous);

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('offer', 'off_123', {
        employee_id: 'emp_123'
      });
    });
  });

  describe('afterUpdate - Rejected Status', () => {
    it('should update candidate and application status when offer rejected', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Rejected'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      mockQlDocUpdate.mockResolvedValue({});

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('candidate', 'cand_123', {
        status: 'Offer Rejected'
      });
      expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_123', {
        status: 'Rejected'
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Offer OFF-202406-0001 rejected by candidate')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set rejection_date if not already set', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Rejected'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      mockQlDocUpdate.mockResolvedValue({});

      const ctx = createMockContext('afterUpdate', offer, previous);

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('offer', 'off_123', {
        rejection_date: expect.any(String)
      });
    });
  });

  describe('afterUpdate - Expired Status', () => {
    it('should update candidate status when offer expires', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        status: 'Expired'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      mockQlDocUpdate.mockResolvedValue({});

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('candidate', 'cand_123', {
        status: 'Offer Expired'
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Offer OFF-202406-0001 has expired')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Withdrawn Status', () => {
    it('should update candidate status when offer withdrawn', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        status: 'Withdrawn'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      mockQlDocUpdate.mockResolvedValue({});

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await OfferStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocUpdate).toHaveBeenCalledWith('candidate', 'cand_123', {
        status: 'Offer Withdrawn'
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Offer OFF-202406-0001 has been withdrawn')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if status change handling fails', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Sent'
      };

      const previous = {
        id: 'off_123',
        status: 'Draft'
      };

      mockQlDocUpdate.mockRejectedValue(new Error('Database error'));

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(OfferStatusChangeTrigger.handler(ctx)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should not throw if employee creation fails', async () => {
      // Arrange
      const offer = {
        id: 'off_123',
        offer_number: 'OFF-202406-0001',
        candidate_id: 'cand_123',
        application_id: 'app_123',
        status: 'Accepted'
      };

      const previous = {
        id: 'off_123',
        status: 'Sent'
      };

      mockQlDocUpdate.mockResolvedValue({});
      mockQlDocGet.mockRejectedValue(new Error('Candidate not found'));

      const ctx = createMockContext('afterUpdate', offer, previous);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(OfferStatusChangeTrigger.handler(ctx)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
