import { ObjectSchema } from '@objectstack/spec/data';
import { Application } from '../../../src/application.object';
import { Attendance } from '../../../src/attendance.object';
import { Candidate } from '../../../src/candidate.object';
import { Certification } from '../../../src/certification.object';
import { Department } from '../../../src/department.object';
import { Employee } from '../../../src/employee.object';
import { Goal } from '../../../src/goal.object';
import { Interview } from '../../../src/interview.object';
import { Offer } from '../../../src/offer.object';
import { Onboarding } from '../../../src/onboarding.object';
import { Payroll } from '../../../src/payroll.object';
import { PerformanceReview } from '../../../src/performance_review.object';
import { Position } from '../../../src/position.object';
import { Recruitment } from '../../../src/recruitment.object';
import { TimeOff } from '../../../src/time_off.object';
import { Training } from '../../../src/training.object';

const IDENTIFIER_RE = /^[a-z][a-z0-9_.]+$/;

const OBJECTS = [
  { name: 'Application', schema: Application },
  { name: 'Attendance', schema: Attendance },
  { name: 'Candidate', schema: Candidate },
  { name: 'Certification', schema: Certification },
  { name: 'Department', schema: Department },
  { name: 'Employee', schema: Employee },
  { name: 'Goal', schema: Goal },
  { name: 'Interview', schema: Interview },
  { name: 'Offer', schema: Offer },
  { name: 'Onboarding', schema: Onboarding },
  { name: 'Payroll', schema: Payroll },
  { name: 'PerformanceReview', schema: PerformanceReview },
  { name: 'Position', schema: Position },
  { name: 'Recruitment', schema: Recruitment },
  { name: 'TimeOff', schema: TimeOff },
  { name: 'Training', schema: Training },
];

describe('HR Package - Spec Compliance', () => {
  describe.each(OBJECTS)('$name', ({ name, schema }) => {
    it('should pass ObjectSchema.parse() validation', () => {
      expect(() => ObjectSchema.parse(schema)).not.toThrow();
    });

    it('should have snake_case object name', () => {
      expect(schema.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should have all select option values as valid identifiers', () => {
      const fields = schema.fields as Record<string, any>;
      for (const [fieldName, field] of Object.entries(fields)) {
        if (field.options && Array.isArray(field.options)) {
          for (const opt of field.options) {
            expect(opt.value).toMatch(IDENTIFIER_RE);
          }
        }
      }
    });

    it('should not have unknown properties in enable', () => {
      if (!schema.enable) return;
      const parsed = ObjectSchema.parse(schema);
      const originalKeys = Object.keys(schema.enable);
      const parsedKeys = Object.keys((parsed as any).enable || {});
      const unknownKeys = originalKeys.filter(k => !parsedKeys.includes(k));
      expect(unknownKeys).toEqual([]);
    });
  });
});
