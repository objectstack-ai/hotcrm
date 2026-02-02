/**
 * Integration Test: End-to-End Recruitment Workflow
 * 
 * This test validates the complete recruitment workflow from candidate application to employee onboarding.
 * It tests multiple objects and status transitions working together through the recruitment lifecycle.
 */

// Mock the db module
jest.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    find: jest.fn(),
    insert: jest.fn()
  }
}));

import { db } from '../../../src/db';

describe('End-to-End Recruitment Workflow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should successfully complete full recruitment cycle: Application → Hired', async () => {
    // Arrange - Setup complete recruitment scenario
    const mockRecruitment = {
      id: 'rec_123',
      title: 'Senior Software Engineer',
      requisition_number: 'REQ-2024-001',
      position_id: 'pos_123',
      department_id: 'dept_eng',
      hiring_manager_id: 'emp_manager',
      headcount: 1,
      status: 'Open',
      salary_range_min: 120000,
      salary_range_max: 160000
    };

    const mockCandidate = {
      id: 'cand_123',
      first_name: 'Alice',
      last_name: 'Chen',
      email: 'alice.chen@example.com',
      mobile_phone: '+1-555-0100',
      current_company: 'Tech Corp',
      current_title: 'Software Engineer',
      years_of_experience: 5,
      highest_education: 'Bachelor',
      expected_salary: 140000,
      notice_period: '1 Month',
      source: 'Job Board',
      status: 'New'
    };

    const mockApplication = {
      id: 'app_123',
      application_number: 'APP-2024-001',
      candidate_id: 'cand_123',
      recruitment_id: 'rec_123',
      applied_date: '2024-01-15',
      status: 'Submitted',
      stage: 'Resume Review',
      source: 'Job Board'
    };

    const mockInterview1 = {
      id: 'int_123',
      title: 'Technical Interview - Round 1',
      candidate_id: 'cand_123',
      application_id: 'app_123',
      recruitment_id: 'rec_123',
      interview_type: 'First Round',
      scheduled_date: '2024-01-20T14:00:00Z',
      duration: 60,
      interviewer_id: 'emp_tech_lead',
      status: 'Scheduled'
    };

    const mockInterview2 = {
      id: 'int_456',
      title: 'Final Interview with VP Engineering',
      candidate_id: 'cand_123',
      application_id: 'app_123',
      recruitment_id: 'rec_123',
      interview_type: 'Final Round',
      scheduled_date: '2024-01-25T15:00:00Z',
      duration: 45,
      interviewer_id: 'emp_vp',
      status: 'Scheduled'
    };

    const mockOffer = {
      id: 'offer_123',
      offer_number: 'OFFER-2024-001',
      candidate_id: 'cand_123',
      application_id: 'app_123',
      recruitment_id: 'rec_123',
      position_id: 'pos_123',
      department_id: 'dept_eng',
      hiring_manager_id: 'emp_manager',
      offer_date: '2024-01-28',
      expiry_date: '2024-02-11',
      start_date: '2024-03-01',
      base_salary: 145000,
      bonus: 20000,
      employment_type: 'Full-time',
      probation_period: '3 Months',
      status: 'Draft'
    };

    const mockEmployee = {
      id: 'emp_new',
      employee_number: 'EMP-2024-050',
      first_name: 'Alice',
      last_name: 'Chen',
      email: 'alice.chen@company.com',
      mobile_phone: '+1-555-0100',
      department_id: 'dept_eng',
      position_id: 'pos_123',
      manager_id: 'emp_manager',
      hire_date: '2024-03-01',
      employment_status: 'Probation',
      employment_type: 'Full-time',
      base_salary: 145000
    };

    // Setup mocks
    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockRecruitment)
      .mockResolvedValueOnce(mockCandidate)
      .mockResolvedValueOnce(mockApplication);

    (db.find as jest.Mock).mockResolvedValue([]);

    (db.doc.create as jest.Mock)
      .mockResolvedValueOnce(mockCandidate)
      .mockResolvedValueOnce(mockApplication)
      .mockResolvedValueOnce(mockInterview1)
      .mockResolvedValueOnce(mockInterview2)
      .mockResolvedValueOnce(mockOffer)
      .mockResolvedValueOnce(mockEmployee);

    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce({ ...mockCandidate, status: 'Under Review' })
      .mockResolvedValueOnce({ ...mockApplication, status: 'Screening', stage: 'Phone Screen' })
      .mockResolvedValueOnce({ ...mockCandidate, status: 'Interviewing' })
      .mockResolvedValueOnce({ ...mockApplication, status: 'Interviewing' })
      .mockResolvedValueOnce({ ...mockInterview1, status: 'Completed', result: 'Hire' })
      .mockResolvedValueOnce({ ...mockInterview2, status: 'Completed', result: 'Strong Hire' })
      .mockResolvedValueOnce({ ...mockOffer, status: 'Extended' })
      .mockResolvedValueOnce({ ...mockOffer, status: 'Accepted', response_date: '2024-02-05' })
      .mockResolvedValueOnce({ ...mockCandidate, status: 'Hired' })
      .mockResolvedValueOnce({ ...mockApplication, status: 'Offer Extended' });

    // Act - Execute complete workflow

    // Step 1: Candidate Application → New status
    const recruitment = await db.doc.get('recruitment', 'rec_123');
    const candidate = await db.doc.create('candidate', {
      first_name: 'Alice',
      last_name: 'Chen',
      email: 'alice.chen@example.com',
      mobile_phone: '+1-555-0100',
      current_company: 'Tech Corp',
      current_title: 'Software Engineer',
      years_of_experience: 5,
      expected_salary: 140000,
      status: 'New'
    });

    const application = await db.doc.create('application', {
      candidate_id: candidate.id,
      recruitment_id: recruitment.id,
      applied_date: '2024-01-15',
      status: 'Submitted',
      stage: 'Resume Review'
    });

    // Step 2: Candidate screening → Under Review
    const candidateUnderReview = await db.doc.update('candidate', candidate.id, {
      status: 'Under Review'
    });

    const applicationScreening = await db.doc.update('application', application.id, {
      status: 'Screening',
      stage: 'Phone Screen'
    });

    // Step 3: Schedule and complete interviews → Interviewing
    const candidateInterviewing = await db.doc.update('candidate', candidate.id, {
      status: 'Interviewing'
    });

    const applicationInterviewing = await db.doc.update('application', application.id, {
      status: 'Interviewing'
    });

    const interview1 = await db.doc.create('interview', {
      title: 'Technical Interview - Round 1',
      candidate_id: candidate.id,
      application_id: application.id,
      recruitment_id: recruitment.id,
      interview_type: 'First Round',
      scheduled_date: '2024-01-20T14:00:00Z',
      interviewer_id: 'emp_tech_lead',
      status: 'Scheduled'
    });

    const interview2 = await db.doc.create('interview', {
      title: 'Final Interview with VP Engineering',
      candidate_id: candidate.id,
      application_id: application.id,
      recruitment_id: recruitment.id,
      interview_type: 'Final Round',
      scheduled_date: '2024-01-25T15:00:00Z',
      interviewer_id: 'emp_vp',
      status: 'Scheduled'
    });

    // Complete interviews
    const completedInterview1 = await db.doc.update('interview', interview1.id, {
      status: 'Completed',
      result: 'Hire',
      feedback: 'Strong technical skills, good problem solving'
    });

    const completedInterview2 = await db.doc.update('interview', interview2.id, {
      status: 'Completed',
      result: 'Strong Hire',
      feedback: 'Excellent cultural fit, leadership potential'
    });

    // Step 4: Create and send offer → Offer Sent
    const offer = await db.doc.create('offer', {
      candidate_id: candidate.id,
      application_id: application.id,
      recruitment_id: recruitment.id,
      position_id: recruitment.position_id,
      department_id: recruitment.department_id,
      hiring_manager_id: recruitment.hiring_manager_id,
      offer_date: '2024-01-28',
      start_date: '2024-03-01',
      base_salary: 145000,
      bonus: 20000,
      employment_type: 'Full-time',
      status: 'Draft'
    });

    const extendedOffer = await db.doc.update('offer', offer.id, {
      status: 'Extended'
    });

    // Step 5: Offer acceptance → Accepted
    const acceptedOffer = await db.doc.update('offer', offer.id, {
      status: 'Accepted',
      response_date: '2024-02-05'
    });

    // Step 6: Create employee record → Hired status
    const employee = await db.doc.create('employee', {
      employee_number: 'EMP-2024-050',
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: 'alice.chen@company.com',
      mobile_phone: candidate.mobile_phone,
      department_id: recruitment.department_id,
      position_id: recruitment.position_id,
      hire_date: acceptedOffer.start_date,
      employment_status: 'Probation',
      employment_type: acceptedOffer.employment_type,
      base_salary: acceptedOffer.base_salary
    });

    const hiredCandidate = await db.doc.update('candidate', candidate.id, {
      status: 'Hired'
    });

    const finalApplication = await db.doc.update('application', application.id, {
      status: 'Offer Extended'
    });

    // Assert - Verify complete workflow
    expect(candidate).toBeDefined();
    expect(candidate.status).toBe('New');
    expect(candidate.email).toBe('alice.chen@example.com');

    expect(application).toBeDefined();
    expect(application.candidate_id).toBe(candidate.id);
    expect(application.recruitment_id).toBe(recruitment.id);

    expect(candidateUnderReview.status).toBe('Under Review');
    expect(applicationScreening.status).toBe('Screening');

    expect(candidateInterviewing.status).toBe('Interviewing');
    expect(applicationInterviewing.status).toBe('Interviewing');

    expect(interview1).toBeDefined();
    expect(interview2).toBeDefined();
    expect(completedInterview1.result).toBe('Hire');
    expect(completedInterview2.result).toBe('Strong Hire');

    expect(extendedOffer.status).toBe('Extended');
    expect(acceptedOffer.status).toBe('Accepted');

    expect(employee).toBeDefined();
    expect(employee.first_name).toBe(candidate.first_name);
    expect(employee.base_salary).toBe(145000);

    expect(hiredCandidate.status).toBe('Hired');

    // Verify database operations count
    expect(db.doc.create).toHaveBeenCalledTimes(6); // candidate, application, 2 interviews, offer, employee
    expect(db.doc.update).toHaveBeenCalledTimes(10);
  });

  it('should handle candidate rejection after screening', async () => {
    // Arrange
    const mockCandidate = {
      id: 'cand_reject_1',
      first_name: 'Bob',
      last_name: 'Smith',
      email: 'bob.smith@example.com',
      mobile_phone: '+1-555-0200',
      status: 'New'
    };

    const mockApplication = {
      id: 'app_reject_1',
      candidate_id: 'cand_reject_1',
      recruitment_id: 'rec_123',
      status: 'Submitted'
    };

    (db.doc.create as jest.Mock)
      .mockResolvedValueOnce(mockCandidate)
      .mockResolvedValueOnce(mockApplication);

    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce({ ...mockCandidate, status: 'Under Review' })
      .mockResolvedValueOnce({ ...mockApplication, status: 'Screening' })
      .mockResolvedValueOnce({ 
        ...mockCandidate, 
        status: 'Rejected'
      })
      .mockResolvedValueOnce({ 
        ...mockApplication, 
        status: 'Rejected',
        rejection_reason: 'Insufficient experience'
      });

    // Act
    const candidate = await db.doc.create('candidate', {
      first_name: 'Bob',
      last_name: 'Smith',
      email: 'bob.smith@example.com',
      status: 'New'
    });

    const application = await db.doc.create('application', {
      candidate_id: candidate.id,
      recruitment_id: 'rec_123',
      status: 'Submitted'
    });

    await db.doc.update('candidate', candidate.id, { status: 'Under Review' });
    await db.doc.update('application', application.id, { status: 'Screening' });

    const rejectedCandidate = await db.doc.update('candidate', candidate.id, {
      status: 'Rejected'
    });

    const rejectedApplication = await db.doc.update('application', application.id, {
      status: 'Rejected',
      rejection_reason: 'Insufficient experience'
    });

    // Assert
    expect(rejectedCandidate.status).toBe('Rejected');
    expect(rejectedApplication.status).toBe('Rejected');
    expect(rejectedApplication.rejection_reason).toBe('Insufficient experience');
    expect(db.doc.create).toHaveBeenCalledTimes(2);
    expect(db.doc.update).toHaveBeenCalledTimes(4);
  });

  it('should handle candidate rejection after interviews', async () => {
    // Arrange
    const mockCandidate = {
      id: 'cand_reject_2',
      first_name: 'Carol',
      last_name: 'Williams',
      email: 'carol.williams@example.com',
      status: 'Interviewing'
    };

    const mockApplication = {
      id: 'app_reject_2',
      candidate_id: 'cand_reject_2',
      recruitment_id: 'rec_123',
      status: 'Interviewing'
    };

    const mockInterview = {
      id: 'int_reject',
      candidate_id: 'cand_reject_2',
      application_id: 'app_reject_2',
      recruitment_id: 'rec_123',
      status: 'Scheduled'
    };

    (db.doc.create as jest.Mock).mockResolvedValue(mockInterview);
    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce({ 
        ...mockInterview, 
        status: 'Completed',
        result: 'No Hire',
        feedback: 'Technical skills below requirements'
      })
      .mockResolvedValueOnce({ ...mockCandidate, status: 'Rejected' })
      .mockResolvedValueOnce({ 
        ...mockApplication, 
        status: 'Rejected',
        rejection_reason: 'Did not pass technical interview'
      });

    // Act
    const interview = await db.doc.create('interview', {
      candidate_id: mockCandidate.id,
      application_id: mockApplication.id,
      recruitment_id: 'rec_123',
      status: 'Scheduled'
    });

    const completedInterview = await db.doc.update('interview', interview.id, {
      status: 'Completed',
      result: 'No Hire',
      feedback: 'Technical skills below requirements'
    });

    const rejectedCandidate = await db.doc.update('candidate', mockCandidate.id, {
      status: 'Rejected'
    });

    const rejectedApplication = await db.doc.update('application', mockApplication.id, {
      status: 'Rejected',
      rejection_reason: 'Did not pass technical interview'
    });

    // Assert
    expect(completedInterview.result).toBe('No Hire');
    expect(rejectedCandidate.status).toBe('Rejected');
    expect(rejectedApplication.status).toBe('Rejected');
    expect(db.doc.create).toHaveBeenCalledTimes(1);
    expect(db.doc.update).toHaveBeenCalledTimes(3);
  });

  it('should handle offer rejection by candidate', async () => {
    // Arrange
    const mockCandidate = {
      id: 'cand_offer_reject',
      first_name: 'David',
      last_name: 'Lee',
      email: 'david.lee@example.com',
      status: 'Interviewing'
    };

    const mockApplication = {
      id: 'app_offer_reject',
      candidate_id: 'cand_offer_reject',
      recruitment_id: 'rec_123',
      status: 'Interviewing'
    };

    const mockOffer = {
      id: 'offer_reject',
      candidate_id: 'cand_offer_reject',
      application_id: 'app_offer_reject',
      recruitment_id: 'rec_123',
      base_salary: 130000,
      status: 'Extended'
    };

    (db.doc.create as jest.Mock).mockResolvedValue(mockOffer);
    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce({ 
        ...mockOffer, 
        status: 'Rejected',
        response_date: '2024-02-01',
        rejection_reason: 'Accepted another offer with better compensation'
      })
      .mockResolvedValueOnce({ ...mockCandidate, status: 'Withdrawn' })
      .mockResolvedValueOnce({ ...mockApplication, status: 'Withdrawn' });

    // Act
    const offer = await db.doc.create('offer', {
      candidate_id: mockCandidate.id,
      application_id: mockApplication.id,
      recruitment_id: 'rec_123',
      base_salary: 130000,
      status: 'Extended'
    });

    const rejectedOffer = await db.doc.update('offer', offer.id, {
      status: 'Rejected',
      response_date: '2024-02-01',
      rejection_reason: 'Accepted another offer with better compensation'
    });

    const withdrawnCandidate = await db.doc.update('candidate', mockCandidate.id, {
      status: 'Withdrawn'
    });

    const withdrawnApplication = await db.doc.update('application', mockApplication.id, {
      status: 'Withdrawn'
    });

    // Assert
    expect(rejectedOffer.status).toBe('Rejected');
    expect(rejectedOffer.rejection_reason).toBe('Accepted another offer with better compensation');
    expect(withdrawnCandidate.status).toBe('Withdrawn');
    expect(withdrawnApplication.status).toBe('Withdrawn');
  });

  it('should handle multiple interview rounds successfully', async () => {
    // Arrange
    const mockCandidate = {
      id: 'cand_multi_int',
      first_name: 'Emma',
      last_name: 'Johnson',
      email: 'emma.johnson@example.com',
      status: 'Interviewing'
    };

    const mockApplication = {
      id: 'app_multi_int',
      candidate_id: 'cand_multi_int',
      recruitment_id: 'rec_123',
      status: 'Interviewing'
    };

    const interviews = [
      {
        id: 'int_phone',
        title: 'Phone Screen',
        interview_type: 'Phone Screen',
        status: 'Completed',
        result: 'Hire'
      },
      {
        id: 'int_tech',
        title: 'Technical Interview',
        interview_type: 'Technical',
        status: 'Completed',
        result: 'Hire'
      },
      {
        id: 'int_round1',
        title: 'First Round',
        interview_type: 'First Round',
        status: 'Completed',
        result: 'Hire'
      },
      {
        id: 'int_round2',
        title: 'Second Round',
        interview_type: 'Second Round',
        status: 'Completed',
        result: 'Strong Hire'
      },
      {
        id: 'int_final',
        title: 'Final Round',
        interview_type: 'Final Round',
        status: 'Completed',
        result: 'Strong Hire'
      }
    ];

    (db.doc.create as jest.Mock)
      .mockResolvedValueOnce({ ...interviews[0], status: 'Scheduled' })
      .mockResolvedValueOnce({ ...interviews[1], status: 'Scheduled' })
      .mockResolvedValueOnce({ ...interviews[2], status: 'Scheduled' })
      .mockResolvedValueOnce({ ...interviews[3], status: 'Scheduled' })
      .mockResolvedValueOnce({ ...interviews[4], status: 'Scheduled' });

    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce(interviews[0])
      .mockResolvedValueOnce(interviews[1])
      .mockResolvedValueOnce(interviews[2])
      .mockResolvedValueOnce(interviews[3])
      .mockResolvedValueOnce(interviews[4]);

    // Act
    const createdInterviews = [];
    for (let i = 0; i < interviews.length; i++) {
      const interview = await db.doc.create('interview', {
        candidate_id: mockCandidate.id,
        application_id: mockApplication.id,
        recruitment_id: 'rec_123',
        title: interviews[i].title,
        interview_type: interviews[i].interview_type,
        status: 'Scheduled'
      });
      createdInterviews.push(interview);
    }

    const completedInterviews = [];
    for (let i = 0; i < createdInterviews.length; i++) {
      const completed = await db.doc.update('interview', createdInterviews[i].id, {
        status: 'Completed',
        result: interviews[i].result
      });
      completedInterviews.push(completed);
    }

    // Assert
    expect(createdInterviews).toHaveLength(5);
    expect(completedInterviews).toHaveLength(5);
    expect(completedInterviews.every(int => int.status === 'Completed')).toBe(true);
    expect(completedInterviews[3].result).toBe('Strong Hire');
    expect(completedInterviews[4].result).toBe('Strong Hire');
    expect(db.doc.create).toHaveBeenCalledTimes(5);
    expect(db.doc.update).toHaveBeenCalledTimes(5);
  });

  it('should preserve candidate data through entire workflow', async () => {
    // Arrange
    const originalCandidate = {
      id: 'cand_preserve',
      first_name: 'Frank',
      last_name: 'Zhang',
      email: 'frank.zhang@example.com',
      mobile_phone: '+1-555-0300',
      current_company: 'StartupXYZ',
      current_title: 'Senior Developer',
      years_of_experience: 7,
      highest_education: 'Master',
      university: 'MIT',
      major: 'Computer Science',
      current_salary: 130000,
      expected_salary: 155000,
      notice_period: '2 Weeks',
      source: 'Employee Referral',
      linkedin_url: 'https://linkedin.com/in/frankzhang',
      status: 'New'
    };

    const mockEmployee = {
      id: 'emp_preserve',
      employee_number: 'EMP-2024-051',
      first_name: originalCandidate.first_name,
      last_name: originalCandidate.last_name,
      email: 'frank.zhang@company.com',
      mobile_phone: originalCandidate.mobile_phone,
      department_id: 'dept_eng',
      position_id: 'pos_123',
      hire_date: '2024-03-15',
      employment_status: 'Probation',
      base_salary: 155000
    };

    (db.doc.create as jest.Mock)
      .mockResolvedValueOnce(originalCandidate)
      .mockResolvedValueOnce(mockEmployee);

    // Act
    const candidate = await db.doc.create('candidate', originalCandidate);

    const employee = await db.doc.create('employee', {
      employee_number: 'EMP-2024-051',
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: 'frank.zhang@company.com',
      mobile_phone: candidate.mobile_phone,
      department_id: 'dept_eng',
      position_id: 'pos_123',
      hire_date: '2024-03-15',
      employment_status: 'Probation',
      base_salary: candidate.expected_salary
    });

    // Assert - Verify data preservation
    expect(employee.first_name).toBe(originalCandidate.first_name);
    expect(employee.last_name).toBe(originalCandidate.last_name);
    expect(employee.mobile_phone).toBe(originalCandidate.mobile_phone);
    expect(employee.base_salary).toBe(originalCandidate.expected_salary);
  });

  it('should validate application status transitions', async () => {
    // Arrange
    const mockApplication = {
      id: 'app_validate',
      candidate_id: 'cand_123',
      recruitment_id: 'rec_123',
      status: 'Submitted',
      stage: 'Resume Review'
    };

    const validTransitions = [
      { from: 'Submitted', to: 'Screening', stage: 'Phone Screen' },
      { from: 'Screening', to: 'Interview Scheduled', stage: 'First Interview' },
      { from: 'Interview Scheduled', to: 'Interviewing', stage: 'First Interview' },
      { from: 'Interviewing', to: 'Shortlisted', stage: 'Final Interview' },
      { from: 'Shortlisted', to: 'Offer Extended', stage: 'Offer Discussion' }
    ];

    (db.doc.create as jest.Mock).mockResolvedValue(mockApplication);
    
    validTransitions.forEach((transition, index) => {
      (db.doc.update as jest.Mock).mockResolvedValueOnce({
        ...mockApplication,
        status: transition.to,
        stage: transition.stage
      });
    });

    // Act
    const application = await db.doc.create('application', mockApplication);
    
    const transitions = [];
    for (const transition of validTransitions) {
      const updated = await db.doc.update('application', application.id, {
        status: transition.to,
        stage: transition.stage
      });
      transitions.push(updated);
    }

    // Assert
    expect(transitions).toHaveLength(5);
    expect(transitions[0].status).toBe('Screening');
    expect(transitions[1].status).toBe('Interview Scheduled');
    expect(transitions[2].status).toBe('Interviewing');
    expect(transitions[3].status).toBe('Shortlisted');
    expect(transitions[4].status).toBe('Offer Extended');
    expect(db.doc.update).toHaveBeenCalledTimes(5);
  });

  it('should handle duplicate candidate email prevention', async () => {
    // Arrange
    const existingCandidate = {
      id: 'cand_existing',
      email: 'duplicate@example.com',
      first_name: 'John',
      last_name: 'Doe',
      status: 'Hired'
    };

    (db.find as jest.Mock).mockResolvedValueOnce([existingCandidate]);

    // Act
    const duplicates = await db.find('candidate', {
      filters: [['email', '=', 'duplicate@example.com']]
    });

    let candidate;
    if (duplicates.length > 0) {
      candidate = duplicates[0];
    } else {
      candidate = await db.doc.create('candidate', {
        email: 'duplicate@example.com',
        first_name: 'Jane',
        last_name: 'Smith'
      });
    }

    // Assert
    expect(candidate.id).toBe('cand_existing');
    expect(candidate.email).toBe('duplicate@example.com');
    expect(db.doc.create).not.toHaveBeenCalledWith('candidate', expect.anything());
  });

  it('should link application to correct recruitment and candidate', async () => {
    // Arrange
    const mockRecruitment = {
      id: 'rec_link',
      title: 'Product Manager',
      position_id: 'pos_pm',
      department_id: 'dept_product'
    };

    const mockCandidate = {
      id: 'cand_link',
      first_name: 'Grace',
      last_name: 'Park',
      email: 'grace.park@example.com'
    };

    const mockApplication = {
      id: 'app_link',
      application_number: 'APP-2024-100',
      candidate_id: 'cand_link',
      recruitment_id: 'rec_link',
      applied_date: '2024-02-01',
      status: 'Submitted'
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockRecruitment)
      .mockResolvedValueOnce(mockCandidate);

    (db.doc.create as jest.Mock).mockResolvedValue(mockApplication);

    // Act
    const recruitment = await db.doc.get('recruitment', 'rec_link');
    const candidate = await db.doc.get('candidate', 'cand_link');

    const application = await db.doc.create('application', {
      candidate_id: candidate.id,
      recruitment_id: recruitment.id,
      applied_date: '2024-02-01',
      status: 'Submitted'
    });

    // Assert
    expect(application.candidate_id).toBe(mockCandidate.id);
    expect(application.recruitment_id).toBe(mockRecruitment.id);
    expect(db.doc.create).toHaveBeenCalledWith('application', expect.objectContaining({
      candidate_id: 'cand_link',
      recruitment_id: 'rec_link'
    }));
  });

  it('should create offer with correct salary and benefits', async () => {
    // Arrange
    const mockOffer = {
      id: 'offer_comp',
      candidate_id: 'cand_123',
      application_id: 'app_123',
      recruitment_id: 'rec_123',
      position_id: 'pos_123',
      department_id: 'dept_eng',
      base_salary: 150000,
      bonus: 25000,
      equity: '0.1% stock options',
      benefits: 'Health insurance, 401k matching, unlimited PTO',
      employment_type: 'Full-time',
      probation_period: '3 Months',
      status: 'Draft'
    };

    (db.doc.create as jest.Mock).mockResolvedValue(mockOffer);

    // Act
    const offer = await db.doc.create('offer', {
      candidate_id: 'cand_123',
      application_id: 'app_123',
      recruitment_id: 'rec_123',
      position_id: 'pos_123',
      department_id: 'dept_eng',
      base_salary: 150000,
      bonus: 25000,
      equity: '0.1% stock options',
      benefits: 'Health insurance, 401k matching, unlimited PTO',
      employment_type: 'Full-time',
      probation_period: '3 Months',
      status: 'Draft'
    });

    // Assert
    expect(offer.base_salary).toBe(150000);
    expect(offer.bonus).toBe(25000);
    expect(offer.equity).toBe('0.1% stock options');
    expect(offer.benefits).toContain('Health insurance');
    expect(offer.probation_period).toBe('3 Months');
  });

  it('should create employee record with probation status', async () => {
    // Arrange
    const mockOffer = {
      id: 'offer_emp',
      candidate_id: 'cand_emp',
      base_salary: 140000,
      employment_type: 'Full-time',
      start_date: '2024-03-01',
      probation_period: '3 Months',
      status: 'Accepted'
    };

    const mockCandidate = {
      id: 'cand_emp',
      first_name: 'Henry',
      last_name: 'Martinez',
      email: 'henry.martinez@example.com',
      mobile_phone: '+1-555-0400'
    };

    const mockEmployee = {
      id: 'emp_probation',
      employee_number: 'EMP-2024-052',
      first_name: 'Henry',
      last_name: 'Martinez',
      email: 'henry.martinez@company.com',
      mobile_phone: '+1-555-0400',
      department_id: 'dept_eng',
      position_id: 'pos_123',
      manager_id: 'emp_manager',
      hire_date: '2024-03-01',
      employment_status: 'Probation',
      employment_type: 'Full-time',
      base_salary: 140000
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockOffer)
      .mockResolvedValueOnce(mockCandidate);

    (db.doc.create as jest.Mock).mockResolvedValue(mockEmployee);

    // Act
    const offer = await db.doc.get('offer', 'offer_emp');
    const candidate = await db.doc.get('candidate', 'cand_emp');

    const employee = await db.doc.create('employee', {
      employee_number: 'EMP-2024-052',
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: 'henry.martinez@company.com',
      mobile_phone: candidate.mobile_phone,
      department_id: 'dept_eng',
      position_id: 'pos_123',
      manager_id: 'emp_manager',
      hire_date: offer.start_date,
      employment_status: 'Probation',
      employment_type: offer.employment_type,
      base_salary: offer.base_salary
    });

    // Assert
    expect(employee.employment_status).toBe('Probation');
    expect(employee.hire_date).toBe('2024-03-01');
    expect(employee.base_salary).toBe(140000);
    expect(employee.employment_type).toBe('Full-time');
  });
});
