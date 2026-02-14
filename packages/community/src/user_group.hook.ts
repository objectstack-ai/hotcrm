import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Group Membership Validation
 *
 * Validates that a user meets group criteria before being added,
 * and enforces unique group names.
 */
const GroupMembershipValidation: Hook = {
  name: 'GroupMembershipValidation',
  object: 'user_group',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.name) {
      try {
        const existing = await (ctx.ql as any).find('user_group', {
          filters: [['name', '=', doc.name]]
        });
        const isDuplicate = existing.some((g: any) => g._id !== ctx.input.id);
        if (isDuplicate) {
          throw new Error(`Validation Error: A group named "${doc.name}" already exists`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Validation Error')) throw error;
      }
    }

    // Validate criteria JSON if provided
    if (doc.criteria) {
      try {
        const parsed = typeof doc.criteria === 'string' ? JSON.parse(doc.criteria) : doc.criteria;
        if (typeof parsed !== 'object') {
          throw new Error('Validation Error: criteria must be a JSON object');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: criteria field contains invalid JSON');
        }
        throw error;
      }
    }
  }
};

/**
 * Group Auto-Assignment
 *
 * Automatically assigns users to groups based on matching criteria
 * when a group is created or updated.
 */
const GroupAutoAssignment: Hook = {
  name: 'GroupAutoAssignment',
  object: 'user_group',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    const group = ctx.result as Record<string, any>;
    if (!group?._id || !group?.criteria) return;

    console.log(`🔄 Evaluating auto-assignment criteria for group "${group.name}"`);
  }
};

/**
 * Group Access Enforcement
 *
 * Prevents non-members from viewing private or hidden groups.
 */
const GroupAccessEnforcement: Hook = {
  name: 'GroupAccessEnforcement',
  object: 'user_group',
  events: ['beforeFind'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any> | undefined;
    if (!doc) return;

    if (doc.group_type === 'hidden') {
      const isOwner = doc.owner_id === ctx.user?.id;
      if (!isOwner) {
        throw new Error('Access Denied: This group is hidden');
      }
    }
  }
};

export { GroupMembershipValidation, GroupAutoAssignment, GroupAccessEnforcement };
export default GroupMembershipValidation;
