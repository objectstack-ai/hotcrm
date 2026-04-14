import { describe, it, expect } from 'vitest';
import { Student } from '../../../src/student.object';
import { Enrollment } from '../../../src/enrollment.object';
import { Course } from '../../../src/course.object';
import { Alumni } from '../../../src/alumni.object';
import { Scholarship } from '../../../src/scholarship.object';
import { ApplicationForm } from '../../../src/application_form.object';
import { CampusEvent } from '../../../src/campus_event.object';

// ─── Student ───────────────────────────────────────────────────────────────────

describe('Student Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Student).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Student.name).toBe('student');
    expect(Student.label).toBe('Student');
  });

  it('should use snake_case name', () => {
    expect(Student.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Student.fields).toBeDefined();
    expect(Object.keys(Student.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Student.fields.name.required).toBe(true);
    expect(Student.fields.email.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Student.fields.name.type).toBe('text');
    expect(Student.fields.email.type).toBe('text');
    expect(Student.fields.enrollment_status.type).toBe('select');
    expect(Student.fields.program.type).toBe('text');
    expect(Student.fields.gpa.type).toBe('number');
    expect(Student.fields.advisor_id.type).toBe('lookup');
    expect(Student.fields.graduation_date.type).toBe('date');
    expect(Student.fields.student_id_number.type).toBe('text');
    expect(Student.fields.phone.type).toBe('text');
    expect(Student.fields.major.type).toBe('text');
    expect(Student.fields.minor.type).toBe('text');
    expect(Student.fields.year.type).toBe('select');
  });

  it('should have enrollment_status select with valid options', () => {
    const values = Student.fields.enrollment_status.options.map((o: any) => o.value);
    expect(values).toContain('prospective');
    expect(values).toContain('applied');
    expect(values).toContain('admitted');
    expect(values).toContain('enrolled');
    expect(values).toContain('graduated');
    expect(values).toContain('withdrawn');
    expect(values).toContain('suspended');
  });

  it('should default enrollment_status to prospective', () => {
    expect(Student.fields.enrollment_status.defaultValue).toBe('prospective');
  });

  it('should have advisor_id lookup referencing contact', () => {
    expect(Student.fields.advisor_id.type).toBe('lookup');
    expect(Student.fields.advisor_id.reference).toBe('contact');
  });

  it('should have student_id_number as unique', () => {
    expect(Student.fields.student_id_number.unique).toBe(true);
  });

  it('should have year select with valid options', () => {
    const values = Student.fields.year.options.map((o: any) => o.value);
    expect(values).toContain('freshman');
    expect(values).toContain('sophomore');
    expect(values).toContain('junior');
    expect(values).toContain('senior');
    expect(values).toContain('graduate');
  });
});

// ─── Enrollment ────────────────────────────────────────────────────────────────

describe('Enrollment Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Enrollment).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Enrollment.name).toBe('enrollment');
    expect(Enrollment.label).toBe('Enrollment');
  });

  it('should use snake_case name', () => {
    expect(Enrollment.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Enrollment.fields).toBeDefined();
    expect(Object.keys(Enrollment.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(Enrollment.fields.student_id.type).toBe('master_detail');
    expect(Enrollment.fields.course_id.type).toBe('lookup');
    expect(Enrollment.fields.term.type).toBe('text');
    expect(Enrollment.fields.status.type).toBe('select');
    expect(Enrollment.fields.grade.type).toBe('text');
    expect(Enrollment.fields.credits.type).toBe('number');
    expect(Enrollment.fields.enrollment_date.type).toBe('date');
  });

  it('should have student_id master_detail referencing student', () => {
    expect(Enrollment.fields.student_id.reference).toBe('student');
  });

  it('should have course_id lookup referencing course', () => {
    expect(Enrollment.fields.course_id.reference).toBe('course');
  });

  it('should have course_id as required', () => {
    expect(Enrollment.fields.course_id.required).toBe(true);
  });

  it('should have term as required', () => {
    expect(Enrollment.fields.term.required).toBe(true);
  });

  it('should have status select with valid options', () => {
    const values = Enrollment.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('enrolled');
    expect(values).toContain('completed');
    expect(values).toContain('dropped');
    expect(values).toContain('withdrawn');
    expect(values).toContain('incomplete');
  });

  it('should default status to enrolled', () => {
    expect(Enrollment.fields.status.defaultValue).toBe('enrolled');
  });
});

// ─── Course ────────────────────────────────────────────────────────────────────

describe('Course Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Course).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Course.name).toBe('course');
    expect(Course.label).toBe('Course');
  });

  it('should use snake_case name', () => {
    expect(Course.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Course.fields).toBeDefined();
    expect(Object.keys(Course.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Course.fields.name.required).toBe(true);
    expect(Course.fields.course_code.required).toBe(true);
    expect(Course.fields.department.required).toBe(true);
    expect(Course.fields.credits.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Course.fields.name.type).toBe('text');
    expect(Course.fields.course_code.type).toBe('text');
    expect(Course.fields.department.type).toBe('text');
    expect(Course.fields.credits.type).toBe('number');
    expect(Course.fields.instructor_id.type).toBe('lookup');
    expect(Course.fields.capacity.type).toBe('number');
    expect(Course.fields.schedule.type).toBe('text');
    expect(Course.fields.prerequisites.type).toBe('textarea');
    expect(Course.fields.description.type).toBe('textarea');
    expect(Course.fields.status.type).toBe('select');
  });

  it('should have course_code as unique', () => {
    expect(Course.fields.course_code.unique).toBe(true);
  });

  it('should have instructor_id lookup referencing contact', () => {
    expect(Course.fields.instructor_id.type).toBe('lookup');
    expect(Course.fields.instructor_id.reference).toBe('contact');
  });

  it('should have status select with valid options', () => {
    const values = Course.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('cancelled');
    expect(values).toContain('archived');
  });

  it('should default status to active', () => {
    expect(Course.fields.status.defaultValue).toBe('active');
  });
});

// ─── Alumni ────────────────────────────────────────────────────────────────────

describe('Alumni Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Alumni).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Alumni.name).toBe('alumni');
    expect(Alumni.label).toBe('Alumni');
  });

  it('should use snake_case name', () => {
    expect(Alumni.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Alumni.fields).toBeDefined();
    expect(Object.keys(Alumni.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Alumni.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Alumni.fields.student_id.type).toBe('lookup');
    expect(Alumni.fields.name.type).toBe('text');
    expect(Alumni.fields.graduation_year.type).toBe('number');
    expect(Alumni.fields.degree.type).toBe('text');
    expect(Alumni.fields.employer.type).toBe('text');
    expect(Alumni.fields.job_title.type).toBe('text');
    expect(Alumni.fields.giving_history.type).toBe('number');
    expect(Alumni.fields.engagement_score.type).toBe('number');
    expect(Alumni.fields.email.type).toBe('email');
    expect(Alumni.fields.location.type).toBe('text');
  });

  it('should have student_id lookup referencing student', () => {
    expect(Alumni.fields.student_id.type).toBe('lookup');
    expect(Alumni.fields.student_id.reference).toBe('student');
  });

  it('should default giving_history to 0', () => {
    expect(Alumni.fields.giving_history.defaultValue).toBe(0);
  });
});

// ─── Scholarship ───────────────────────────────────────────────────────────────

describe('Scholarship Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Scholarship).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Scholarship.name).toBe('scholarship');
    expect(Scholarship.label).toBe('Scholarship');
  });

  it('should use snake_case name', () => {
    expect(Scholarship.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Scholarship.fields).toBeDefined();
    expect(Object.keys(Scholarship.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Scholarship.fields.name.required).toBe(true);
    expect(Scholarship.fields.amount.required).toBe(true);
    expect(Scholarship.fields.criteria.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Scholarship.fields.name.type).toBe('text');
    expect(Scholarship.fields.amount.type).toBe('number');
    expect(Scholarship.fields.criteria.type).toBe('textarea');
    expect(Scholarship.fields.application_deadline.type).toBe('date');
    expect(Scholarship.fields.recipients.type).toBe('number');
    expect(Scholarship.fields.fund_balance.type).toBe('number');
    expect(Scholarship.fields.status.type).toBe('select');
    expect(Scholarship.fields.academic_year.type).toBe('text');
    expect(Scholarship.fields.department.type).toBe('text');
    expect(Scholarship.fields.min_gpa.type).toBe('number');
  });

  it('should have status select with valid options', () => {
    const values = Scholarship.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('open');
    expect(values).toContain('closed');
    expect(values).toContain('awarded');
    expect(values).toContain('depleted');
  });

  it('should default status to open', () => {
    expect(Scholarship.fields.status.defaultValue).toBe('open');
  });

  it('should default recipients to 0', () => {
    expect(Scholarship.fields.recipients.defaultValue).toBe(0);
  });
});

// ─── Application Form ──────────────────────────────────────────────────────────

describe('ApplicationForm Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(ApplicationForm).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(ApplicationForm.name).toBe('application_form');
    expect(ApplicationForm.label).toBe('Application Form');
  });

  it('should use snake_case name', () => {
    expect(ApplicationForm.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(ApplicationForm.fields).toBeDefined();
    expect(Object.keys(ApplicationForm.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(ApplicationForm.fields.applicant_name.required).toBe(true);
    expect(ApplicationForm.fields.email.required).toBe(true);
    expect(ApplicationForm.fields.program.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(ApplicationForm.fields.applicant_name.type).toBe('text');
    expect(ApplicationForm.fields.email.type).toBe('email');
    expect(ApplicationForm.fields.program.type).toBe('text');
    expect(ApplicationForm.fields.status.type).toBe('select');
    expect(ApplicationForm.fields.test_scores.type).toBe('textarea');
    expect(ApplicationForm.fields.gpa.type).toBe('number');
    expect(ApplicationForm.fields.essays.type).toBe('textarea');
    expect(ApplicationForm.fields.recommendations.type).toBe('number');
    expect(ApplicationForm.fields.decision.type).toBe('select');
    expect(ApplicationForm.fields.application_date.type).toBe('date');
    expect(ApplicationForm.fields.decision_date.type).toBe('date');
    expect(ApplicationForm.fields.notes.type).toBe('textarea');
  });

  it('should have status select with valid options', () => {
    const values = ApplicationForm.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('submitted');
    expect(values).toContain('under_review');
    expect(values).toContain('interview');
    expect(values).toContain('waitlisted');
    expect(values).toContain('accepted');
    expect(values).toContain('rejected');
    expect(values).toContain('enrolled');
  });

  it('should default status to submitted', () => {
    expect(ApplicationForm.fields.status.defaultValue).toBe('submitted');
  });

  it('should have decision select with valid options', () => {
    const values = ApplicationForm.fields.decision.options.map((o: any) => o.value);
    expect(values).toContain('pending');
    expect(values).toContain('admit');
    expect(values).toContain('deny');
    expect(values).toContain('waitlist');
    expect(values).toContain('defer');
  });

  it('should default decision to pending', () => {
    expect(ApplicationForm.fields.decision.defaultValue).toBe('pending');
  });
});

// ─── Campus Event ──────────────────────────────────────────────────────────────

describe('CampusEvent Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(CampusEvent).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(CampusEvent.name).toBe('campus_event');
    expect(CampusEvent.label).toBe('Campus Event');
  });

  it('should use snake_case name', () => {
    expect(CampusEvent.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(CampusEvent.fields).toBeDefined();
    expect(Object.keys(CampusEvent.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(CampusEvent.fields.name.required).toBe(true);
    expect(CampusEvent.fields.event_date.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(CampusEvent.fields.name.type).toBe('text');
    expect(CampusEvent.fields.event_type.type).toBe('select');
    expect(CampusEvent.fields.event_date.type).toBe('date');
    expect(CampusEvent.fields.location.type).toBe('text');
    expect(CampusEvent.fields.target_audience.type).toBe('select');
    expect(CampusEvent.fields.rsvp_count.type).toBe('number');
    expect(CampusEvent.fields.capacity.type).toBe('number');
    expect(CampusEvent.fields.feedback_score.type).toBe('number');
    expect(CampusEvent.fields.description.type).toBe('textarea');
    expect(CampusEvent.fields.organizer_id.type).toBe('lookup');
  });

  it('should have event_type select with valid options', () => {
    const values = CampusEvent.fields.event_type.options.map((o: any) => o.value);
    expect(values).toContain('orientation');
    expect(values).toContain('lecture');
    expect(values).toContain('workshop');
    expect(values).toContain('career_fair');
    expect(values).toContain('social');
    expect(values).toContain('sports');
    expect(values).toContain('graduation');
    expect(values).toContain('open_house');
  });

  it('should have target_audience select with valid options', () => {
    const values = CampusEvent.fields.target_audience.options.map((o: any) => o.value);
    expect(values).toContain('all');
    expect(values).toContain('freshmen');
    expect(values).toContain('upperclassmen');
    expect(values).toContain('graduate');
    expect(values).toContain('alumni');
    expect(values).toContain('faculty');
  });

  it('should default target_audience to all', () => {
    expect(CampusEvent.fields.target_audience.defaultValue).toBe('all');
  });

  it('should default rsvp_count to 0', () => {
    expect(CampusEvent.fields.rsvp_count.defaultValue).toBe(0);
  });

  it('should have organizer_id lookup referencing contact', () => {
    expect(CampusEvent.fields.organizer_id.type).toBe('lookup');
    expect(CampusEvent.fields.organizer_id.reference).toBe('contact');
  });
});
