import type { HookContext } from '@objectstack/spec/data';

// Mock modules
const mockQlFind = jest.fn();
const mockQlDocGet = jest.fn();
const mockQlDocCreate = jest.fn();
const mockQlDocUpdate = jest.fn();

const createMockContext = (
  event: 'beforeInsert' | 'beforeUpdate' | 'afterInsert' | 'afterUpdate',
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

describe('Employee Hook - EmployeeDataValidationTrigger', () => {
  let EmployeeDataValidationTrigger: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    const module = await import('../../../src/hooks/employee.hook');
    EmployeeDataValidationTrigger = module.EmployeeDataValidationTrigger;
  });

  describe('beforeInsert - Data Validation', () => {
    it('should auto-set full name from first and last name', async () => {
      // Arrange
      const employee = {
        first_name: '明',
        last_name: '李',
        email: 'liming@company.com',
        hire_date: '2024-01-15'
      };

      const ctx = createMockContext('beforeInsert', employee);

      // Act
      await EmployeeDataValidationTrigger.handler(ctx);

      // Assert
      expect(employee.full_name).toBe('李明'); // LastFirst format
    });

    it('should not override existing full name', async () => {
      // Arrange
      const employee = {
        first_name: '明',
        last_name: '李',
        full_name: 'Li Ming',
        email: 'liming@company.com',
        hire_date: '2024-01-15'
      };

      const ctx = createMockContext('beforeInsert', employee);

      // Act
      await EmployeeDataValidationTrigger.handler(ctx);

      // Assert
      expect(employee.full_name).toBe('Li Ming');
    });

    it('should allow future hire dates for pre-boarding', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const hireDateStr = futureDate.toISOString().split('T')[0];

      const employee = {
        first_name: 'Future',
        last_name: 'Employee',
        email: 'future@company.com',
        hire_date: hireDateStr
      };

      const ctx = createMockContext('beforeInsert', employee);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      await EmployeeDataValidationTrigger.handler(ctx);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hire date')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('is in the future')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should validate termination date is after hire date', async () => {
      // Arrange
      const employee = {
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test@company.com',
        hire_date: '2024-01-15',
        termination_date: '2023-12-01' // Before hire date
      };

      const ctx = createMockContext('beforeInsert', employee);

      // Act & Assert
      await expect(EmployeeDataValidationTrigger.handler(ctx)).rejects.toThrow(
        'Termination date cannot be before hire date'
      );
    });

    it('should allow valid termination date', async () => {
      // Arrange
      const employee = {
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test@company.com',
        hire_date: '2024-01-15',
        termination_date: '2024-06-30' // After hire date
      };

      const ctx = createMockContext('beforeInsert', employee);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeDataValidationTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Employee data validation passed')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('beforeUpdate - Data Validation', () => {
    it('should validate data on update', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        first_name: 'Updated',
        last_name: 'Employee',
        email: 'updated@company.com',
        hire_date: '2024-01-15'
      };

      const previous = {
        id: 'emp_123',
        first_name: 'Original',
        last_name: 'Employee'
      };

      const ctx = createMockContext('beforeUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeDataValidationTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Employee data validation passed')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid data to prevent save', async () => {
      // Arrange
      const employee = {
        first_name: 'Invalid',
        last_name: 'Employee',
        email: 'invalid@company.com',
        hire_date: '2024-06-01',
        termination_date: '2024-01-01' // Invalid: before hire date
      };

      const ctx = createMockContext('beforeInsert', employee);

      // Act & Assert
      await expect(EmployeeDataValidationTrigger.handler(ctx)).rejects.toThrow();
    });
  });
});

describe('Employee Hook - EmployeeOnboardingTrigger', () => {
  let EmployeeOnboardingTrigger: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    const module = await import('../../../src/hooks/employee.hook');
    EmployeeOnboardingTrigger = module.EmployeeOnboardingTrigger;
  });

  describe('afterInsert - Onboarding Initiation', () => {
    it('should create onboarding record for new employee', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        employee_number: 'EMP20240001',
        first_name: 'New',
        last_name: 'Employee',
        hire_date: '2024-06-01',
        manager_id: 'mgr_456'
      };

      mockQlDocCreate.mockResolvedValue({ id: 'onboarding_123' });

      const ctx = createMockContext('afterInsert', employee);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeOnboardingTrigger.handler(ctx);

      // Assert
      expect(mockQlDocCreate).toHaveBeenCalledWith('onboarding', expect.objectContaining({
        employee_id: 'emp_123',
        status: 'In Progress',
        onboarding_type: 'New Hire'
      }));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initiating onboarding')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created onboarding record')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set 90-day target completion date', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        first_name: 'Test',
        last_name: 'Employee',
        hire_date: '2024-06-01'
      };

      mockQlDocCreate.mockResolvedValue({ id: 'onboarding_123' });

      const ctx = createMockContext('afterInsert', employee);

      // Act
      await EmployeeOnboardingTrigger.handler(ctx);

      // Assert
      expect(mockQlDocCreate).toHaveBeenCalledWith('onboarding', expect.objectContaining({
        start_date: '2024-06-01',
        target_completion_date: expect.any(String)
      }));

      const call = mockQlDocCreate.mock.calls[0][1];
      const startDate = new Date(call.start_date);
      const targetDate = new Date(call.target_completion_date);
      const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(90);
    });

    it('should create probation goals', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        first_name: 'Test',
        last_name: 'Employee',
        full_name: 'Test Employee',
        hire_date: '2024-06-01'
      };

      mockQlDocCreate.mockResolvedValue({ id: 'goal_123' });

      const ctx = createMockContext('afterInsert', employee);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeOnboardingTrigger.handler(ctx);

      // Assert
      expect(mockQlDocCreate).toHaveBeenCalledWith('goal', expect.objectContaining({
        employee_id: 'emp_123',
        goal_type: 'Onboarding',
        status: 'In Progress',
        progress: 0
      }));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created probation goals')
      );

      consoleLogSpy.mockRestore();
    });

    it('should notify manager if manager is assigned', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        first_name: 'New',
        last_name: 'Employee',
        full_name: 'New Employee',
        hire_date: '2024-06-01',
        manager_id: 'mgr_456'
      };

      mockQlDocCreate.mockResolvedValue({ id: 'onboarding_123' });

      const ctx = createMockContext('afterInsert', employee);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeOnboardingTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notification sent to manager')
      );

      consoleLogSpy.mockRestore();
    });

    it('should skip manager notification if no manager assigned', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        first_name: 'No',
        last_name: 'Manager',
        hire_date: '2024-06-01'
        // manager_id not set
      };

      mockQlDocCreate.mockResolvedValue({ id: 'onboarding_123' });

      const ctx = createMockContext('afterInsert', employee);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeOnboardingTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No manager assigned')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if onboarding creation fails', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        first_name: 'Test',
        last_name: 'Employee',
        hire_date: '2024-06-01'
      };

      mockQlDocCreate.mockRejectedValue(new Error('Database error'));

      const ctx = createMockContext('afterInsert', employee);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(EmployeeOnboardingTrigger.handler(ctx)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Employee Hook - EmployeeStatusChangeTrigger', () => {
  let EmployeeStatusChangeTrigger: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    const module = await import('../../../src/hooks/employee.hook');
    EmployeeStatusChangeTrigger = module.EmployeeStatusChangeTrigger;
  });

  describe('afterUpdate - Status Change Detection', () => {
    it('should not trigger if employment status has not changed', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Employee status changed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log status change when employment status changes', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        full_name: 'Jane Doe',
        employment_status: 'Terminated'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Employee status changed from "Active" to "Terminated"')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Activation', () => {
    it('should handle employee activation', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        full_name: 'Activated Employee',
        employment_status: 'Active'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Inactive'
      };

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Employee Activated Employee activated')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Termination', () => {
    it('should create offboarding record for terminated employee', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        full_name: 'Terminated Employee',
        employment_status: 'Terminated'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      mockQlDocCreate.mockResolvedValue({ id: 'offboarding_123' });

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeStatusChangeTrigger.handler(ctx);

      // Assert
      expect(mockQlDocCreate).toHaveBeenCalledWith('onboarding', expect.objectContaining({
        employee_id: 'emp_123',
        status: 'In Progress',
        onboarding_type: 'Offboarding',
        hr_coordinator_id: 'user_123'
      }));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created offboarding record')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle Inactive status as termination', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        full_name: 'Inactive Employee',
        employment_status: 'Inactive'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      mockQlDocCreate.mockResolvedValue({ id: 'offboarding_123' });

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing termination')
      );
      expect(mockQlDocCreate).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Leave', () => {
    it('should handle employee going on leave', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        full_name: 'On Leave Employee',
        employment_status: 'On Leave'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await EmployeeStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Employee On Leave Employee started leave')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if status change handling fails', async () => {
      // Arrange
      const employee = {
        id: 'emp_123',
        full_name: 'Test Employee',
        employment_status: 'Terminated'
      };

      const previous = {
        id: 'emp_123',
        employment_status: 'Active'
      };

      mockQlDocCreate.mockRejectedValue(new Error('Database error'));

      const ctx = createMockContext('afterUpdate', employee, previous);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(EmployeeStatusChangeTrigger.handler(ctx)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
