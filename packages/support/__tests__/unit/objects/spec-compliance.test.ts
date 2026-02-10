import { ObjectSchema } from '@objectstack/spec/data';
import { AgentSkill } from '../../../src/agent_skill.object';
import { BusinessHours } from '../../../src/business_hours.object';
import { Case } from '../../../src/case.object';
import { CaseComment } from '../../../src/case_comment.object';
import { EmailToCase } from '../../../src/email_to_case.object';
import { EscalationRule } from '../../../src/escalation_rule.object';
import { ForumPost } from '../../../src/forum_post.object';
import { ForumTopic } from '../../../src/forum_topic.object';
import { Holiday } from '../../../src/holiday.object';
import { HolidayCalendar } from '../../../src/holiday_calendar.object';
import { KnowledgeArticle } from '../../../src/knowledge_article.object';
import { PortalUser } from '../../../src/portal_user.object';
import { Queue } from '../../../src/queue.object';
import { QueueMember } from '../../../src/queue_member.object';
import { RoutingRule } from '../../../src/routing_rule.object';
import { Skill } from '../../../src/skill.object';
import { SLAMilestone } from '../../../src/sla_milestone.object';
import { SLAPolicy } from '../../../src/sla_policy.object';
import { SLATemplate } from '../../../src/sla_template.object';
import { SocialMediaCase } from '../../../src/social_media_case.object';
import { WebToCase } from '../../../src/web_to_case.object';

const IDENTIFIER_RE = /^[a-z][a-z0-9_.]+$/;

const OBJECTS = [
  { name: 'Case', schema: Case },
  { name: 'Queue', schema: Queue },
  { name: 'KnowledgeArticle', schema: KnowledgeArticle },
  { name: 'SLATemplate', schema: SLATemplate },
  { name: 'SLAPolicy', schema: SLAPolicy },
  { name: 'Skill', schema: Skill },
  { name: 'CaseComment', schema: CaseComment },
  { name: 'EscalationRule', schema: EscalationRule },
  { name: 'RoutingRule', schema: RoutingRule },
  { name: 'WebToCase', schema: WebToCase },
  { name: 'EmailToCase', schema: EmailToCase },
  { name: 'ForumTopic', schema: ForumTopic },
  { name: 'ForumPost', schema: ForumPost },
  { name: 'Holiday', schema: Holiday },
  { name: 'HolidayCalendar', schema: HolidayCalendar },
  { name: 'BusinessHours', schema: BusinessHours },
  { name: 'SLAMilestone', schema: SLAMilestone },
  { name: 'AgentSkill', schema: AgentSkill },
  { name: 'SocialMediaCase', schema: SocialMediaCase },
  { name: 'PortalUser', schema: PortalUser },
  { name: 'QueueMember', schema: QueueMember },
];

describe('Support Package - Spec Compliance', () => {
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
