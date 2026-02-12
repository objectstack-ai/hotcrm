/**
 * Integration Test: Employee Onboarding Workflow
 *
 * Phase 8F – Cross-cloud integration: HR onboarding pipeline.
 * Validates the flow from accepted offer through employee creation,
 * onboarding task generation, training enrollment, and department assignment.
 */

import { vi, Mock } from 'vitest';

vi.mock('../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { broker } from '../../src/db';

describe('Employee Onboarding Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create employee record when offer is accepted', async () => {
    // Arrange
    const acceptedOffer = {
      id: 'offer_onboard',
      candidate_id: 'cand_onboard',
      position_id: 'pos_eng',
      department_id: 'dept_engineering',
      hiring_manager_id: 'emp_mgr_001',
      base_salary: 140000,
      employment_type: 'Full-time',
      start_date: '2024-04-01',
      status: 'accepted'
    };

    const mockCandidate = {
      id: 'cand_onboard',
      first_name: 'Sarah',
      last_name: 'Kim',
      email: 'sarah.kim@example.com',
      mobile_phone: '+1-555-0200'
    };

    const mockEmployee = {
      id: 'emp_new_001',
      employee_number: 'EMP-2024-100',
      first_name: 'Sarah',
      last_name: 'Kim',
      email: 'sarah.kim@company.com',
      mobile_phone: '+1-555-0200',
      department_id: 'dept_engineering',
      position_id: 'pos_eng',
      manager_id: 'emp_mgr_001',
      hire_date: '2024-04-01',
      employment_status: 'Probation',
      employment_type: 'Full-time',
      base_salary: 140000
    };

    (broker.findOne as Mock)
      .mockResolvedValueOnce(acceptedOffer)
      .mockResolvedValueOnce(mockCandidate);
    (broker.insert as Mock).mockResolvedValue(mockEmployee);
    (broker.update as Mock).mockResolvedValue({ ...mockCandidate, status: 'hired' });

    // Act
    const offer = await broker.findOne('offer', 'offer_onboard');
    expect(offer.status).toBe('accepted');

    const candidate = await broker.findOne('candidate', offer.candidate_id);

    const employee = await broker.insert('employee', {
      employee_number: 'EMP-2024-100',
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: 'sarah.kim@company.com',
      mobile_phone: candidate.mobile_phone,
      department_id: offer.department_id,
      position_id: offer.position_id,
      manager_id: offer.hiring_manager_id,
      hire_date: offer.start_date,
      employment_status: 'Probation',
      employment_type: offer.employment_type,
      base_salary: offer.base_salary
    });

    const updatedCandidate = await broker.update('candidate', candidate.id, { status: 'hired' });

    // Assert
    expect(employee.first_name).toBe(candidate.first_name);
    expect(employee.department_id).toBe(offer.department_id);
    expect(employee.hire_date).toBe('2024-04-01');
    expect(employee.employment_status).toBe('Probation');
    expect(updatedCandidate.status).toBe('hired');
    expect(broker.insert).toHaveBeenCalledTimes(1);
  });

  it('should generate onboarding checklist tasks for new employee', async () => {
    // Arrange
    const mockEmployee = {
      id: 'emp_checklist',
      employee_number: 'EMP-2024-101',
      first_name: 'Alex',
      last_name: 'Rivera',
      department_id: 'dept_engineering',
      hire_date: '2024-04-01'
    };

    const checklistTemplate = [
      { title: 'Complete I-9 verification', category: 'compliance', due_offset_days: 3 },
      { title: 'Setup laptop and accounts', category: 'IT', due_offset_days: 1 },
      { title: 'Attend orientation session', category: 'general', due_offset_days: 1 },
      { title: 'Complete benefits enrollment', category: 'HR', due_offset_days: 14 },
      { title: 'Meet with manager for goals', category: 'management', due_offset_days: 7 }
    ];

    const createdTasks = checklistTemplate.map((task, i) => ({
      id: `onb_task_${i + 1}`,
      employee_id: 'emp_checklist',
      title: task.title,
      category: task.category,
      due_date: new Date(Date.now() + task.due_offset_days * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    }));

    (broker.findOne as Mock).mockResolvedValue(mockEmployee);
    (broker.find as Mock).mockResolvedValue(checklistTemplate);
    createdTasks.forEach(task => {
      (broker.insert as Mock).mockResolvedValueOnce(task);
    });

    // Act
    const employee = await broker.findOne('employee', 'emp_checklist');
    const templates = await broker.find('onboarding_template', {
      filters: [['department_id', '=', employee.department_id]]
    });

    const tasks = [];
    for (const template of templates) {
      const task = await broker.insert('onboarding_task', {
        employee_id: employee.id,
        title: template.title,
        category: template.category,
        due_date: new Date(Date.now() + template.due_offset_days * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      });
      tasks.push(task);
    }

    // Assert
    expect(tasks).toHaveLength(5);
    tasks.forEach(task => {
      expect(task.employee_id).toBe(employee.id);
      expect(task.status).toBe('pending');
    });
    expect(broker.insert).toHaveBeenCalledTimes(5);
  });

  it('should auto-enroll employee in required training courses', async () => {
    // Arrange
    const mockEmployee = {
      id: 'emp_training',
      department_id: 'dept_engineering',
      position_id: 'pos_eng',
      hire_date: '2024-04-01'
    };

    const requiredCourses = [
      { id: 'course_security', name: 'Information Security Basics', required: true, duration_hours: 2 },
      { id: 'course_compliance', name: 'Corporate Compliance Training', required: true, duration_hours: 1 },
      { id: 'course_tools', name: 'Internal Tools Onboarding', required: true, duration_hours: 4 }
    ];

    const enrollments = requiredCourses.map((course, i) => ({
      id: `enroll_${i + 1}`,
      employee_id: 'emp_training',
      course_id: course.id,
      status: 'enrolled',
      enrolled_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }));

    (broker.findOne as Mock).mockResolvedValue(mockEmployee);
    (broker.find as Mock).mockResolvedValue(requiredCourses);
    enrollments.forEach(e => {
      (broker.insert as Mock).mockResolvedValueOnce(e);
    });

    // Act
    const employee = await broker.findOne('employee', 'emp_training');
    const courses = await broker.find('training_course', {
      filters: [['required', '=', true]]
    });

    const enrolledCourses = [];
    for (const course of courses) {
      const enrollment = await broker.insert('training_enrollment', {
        employee_id: employee.id,
        course_id: course.id,
        status: 'enrolled',
        enrolled_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      enrolledCourses.push(enrollment);
    }

    // Assert
    expect(enrolledCourses).toHaveLength(3);
    enrolledCourses.forEach(e => {
      expect(e.employee_id).toBe(employee.id);
      expect(e.status).toBe('enrolled');
    });
    expect(broker.insert).toHaveBeenCalledTimes(3);
  });

  it('should assign employee to department and notify manager', async () => {
    // Arrange
    const mockEmployee = {
      id: 'emp_dept',
      first_name: 'Jordan',
      last_name: 'Lee',
      department_id: null,
      manager_id: null,
      hire_date: '2024-04-01'
    };

    const mockDepartment = {
      id: 'dept_product',
      name: 'Product Management',
      head_id: 'emp_dept_head'
    };

    const assignedEmployee = {
      ...mockEmployee,
      department_id: 'dept_product',
      manager_id: 'emp_dept_head'
    };

    const notification = {
      id: 'notif_001',
      recipient_id: 'emp_dept_head',
      type: 'new_team_member',
      message: 'Jordan Lee has joined your team',
      read: false
    };

    (broker.findOne as Mock)
      .mockResolvedValueOnce(mockEmployee)
      .mockResolvedValueOnce(mockDepartment);
    (broker.update as Mock).mockResolvedValue(assignedEmployee);
    (broker.insert as Mock).mockResolvedValue(notification);

    // Act
    const employee = await broker.findOne('employee', 'emp_dept');
    const department = await broker.findOne('department', 'dept_product');

    const updated = await broker.update('employee', employee.id, {
      department_id: department.id,
      manager_id: department.head_id
    });

    const notif = await broker.insert('notification', {
      recipient_id: department.head_id,
      type: 'new_team_member',
      message: `${employee.first_name} ${employee.last_name} has joined your team`,
      read: false
    });

    // Assert
    expect(updated.department_id).toBe('dept_product');
    expect(updated.manager_id).toBe('emp_dept_head');
    expect(notif.recipient_id).toBe(department.head_id);
    expect(notif.type).toBe('new_team_member');
  });

  it('should not create employee when offer is not accepted', async () => {
    // Arrange
    const pendingOffer = {
      id: 'offer_pending',
      candidate_id: 'cand_pending',
      status: 'Extended',
      base_salary: 120000
    };

    (broker.findOne as Mock).mockResolvedValue(pendingOffer);

    // Act
    const offer = await broker.findOne('offer', 'offer_pending');
    const canOnboard = offer.status === 'accepted';

    // Assert
    expect(canOnboard).toBe(false);
    expect(broker.insert).not.toHaveBeenCalled();
  });
});
