import { ObjectSchema } from '@objectstack/spec/data';
import { Account } from '../../../src/account.object';
import { Activity } from '../../../src/activity.object';
import { AssignmentRule } from '../../../src/assignment_rule.object';
import { Contact } from '../../../src/contact.object';
import { Lead } from '../../../src/lead.object';
import { Note } from '../../../src/note.object';
import { Opportunity } from '../../../src/opportunity.object';
import { Task } from '../../../src/task.object';
import { OpportunityLineItem } from '../../../src/opportunity_line_item.object';
import { OpportunityContactRole } from '../../../src/opportunity_contact_role.object';
import { Forecast } from '../../../src/forecast.object';
import { ForecastItem } from '../../../src/forecast_item.object';
import { Territory } from '../../../src/territory.object';
import { TerritoryRule } from '../../../src/territory_rule.object';
import { OpportunityTeamMember } from '../../../src/opportunity_team_member.object';
import { Competitor } from '../../../src/competitor.object';

const IDENTIFIER_RE = /^[a-z][a-z0-9_.]+$/;

const CRM_OBJECTS = [
  { name: 'Account', schema: Account },
  { name: 'Activity', schema: Activity },
  { name: 'AssignmentRule', schema: AssignmentRule },
  { name: 'Contact', schema: Contact },
  { name: 'Lead', schema: Lead },
  { name: 'Note', schema: Note },
  { name: 'Opportunity', schema: Opportunity },
  { name: 'Task', schema: Task },
  { name: 'OpportunityLineItem', schema: OpportunityLineItem },
  { name: 'OpportunityContactRole', schema: OpportunityContactRole },
  { name: 'Forecast', schema: Forecast },
  { name: 'ForecastItem', schema: ForecastItem },
  { name: 'Territory', schema: Territory },
  { name: 'TerritoryRule', schema: TerritoryRule },
  { name: 'OpportunityTeamMember', schema: OpportunityTeamMember },
  { name: 'Competitor', schema: Competitor },
];

describe('CRM Package - Spec Compliance', () => {
  describe.each(CRM_OBJECTS)('$name', ({ name, schema }) => {
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
