import { describe, it, expect } from 'vitest';
import { Community } from '../../../src/community.object';
import { Topic } from '../../../src/topic.object';
import { Reply } from '../../../src/reply.object';
import { Idea } from '../../../src/idea.object';
import { Badge } from '../../../src/badge.object';
import { ForumCategory } from '../../../src/forum_category.object';
import { CommunityEvent } from '../../../src/community_event.object';
import { UserGroup } from '../../../src/user_group.object';

// ─── Community ─────────────────────────────────────────────────────────────────

describe('Community Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Community).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Community.name).toBe('community');
    expect(Community.label).toBe('Community');
  });

  it('should use snake_case name', () => {
    expect(Community.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Community.fields).toBeDefined();
    expect(Object.keys(Community.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Community.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Community.fields.name.type).toBe('text');
    expect(Community.fields.description.type).toBe('textarea');
    expect(Community.fields.domain.type).toBe('text');
    expect(Community.fields.theme.type).toBe('select');
    expect(Community.fields.status.type).toBe('select');
    expect(Community.fields.max_members.type).toBe('number');
  });

  it('should have theme select with 3 options', () => {
    const values = Community.fields.theme.options.map((o: any) => o.value);
    expect(values).toContain('default');
    expect(values).toContain('dark');
    expect(values).toContain('branded');
  });

  it('should have status select with valid options', () => {
    const values = Community.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
    expect(values).toContain('maintenance');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(Community.fields.owner_id.type).toBe('lookup');
    expect(Community.fields.owner_id.reference).toBe('users');
  });
});

// ─── Topic ─────────────────────────────────────────────────────────────────────

describe('Topic Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Topic).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Topic.name).toBe('topic');
    expect(Topic.label).toBe('Topic');
  });

  it('should use snake_case name', () => {
    expect(Topic.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Topic.fields).toBeDefined();
    expect(Object.keys(Topic.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Topic.fields.title.required).toBe(true);
    expect(Topic.fields.body.required).toBe(true);
    expect(Topic.fields.category_id.required).toBe(true);
    expect(Topic.fields.author_id.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Topic.fields.title.type).toBe('text');
    expect(Topic.fields.body.type).toBe('textarea');
    expect(Topic.fields.status.type).toBe('select');
    expect(Topic.fields.is_pinned.type).toBe('boolean');
    expect(Topic.fields.is_locked.type).toBe('boolean');
    expect(Topic.fields.view_count.type).toBe('number');
    expect(Topic.fields.reply_count.type).toBe('number');
    expect(Topic.fields.last_activity_at.type).toBe('datetime');
  });

  it('should have status select with valid options', () => {
    const values = Topic.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('open');
    expect(values).toContain('closed');
    expect(values).toContain('pinned');
    expect(values).toContain('archived');
  });

  it('should have category_id lookup referencing forum_category', () => {
    expect(Topic.fields.category_id.type).toBe('lookup');
    expect(Topic.fields.category_id.reference).toBe('forum_category');
  });

  it('should have author_id lookup referencing users', () => {
    expect(Topic.fields.author_id.type).toBe('lookup');
    expect(Topic.fields.author_id.reference).toBe('users');
  });

  it('should default view_count and reply_count to 0', () => {
    expect(Topic.fields.view_count.defaultValue).toBe(0);
    expect(Topic.fields.reply_count.defaultValue).toBe(0);
  });
});

// ─── Reply ─────────────────────────────────────────────────────────────────────

describe('Reply Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Reply).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Reply.name).toBe('reply');
    expect(Reply.label).toBe('Reply');
  });

  it('should use snake_case name', () => {
    expect(Reply.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Reply.fields).toBeDefined();
    expect(Object.keys(Reply.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Reply.fields.topic_id.required).toBe(true);
    expect(Reply.fields.body.required).toBe(true);
    expect(Reply.fields.author_id.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Reply.fields.body.type).toBe('textarea');
    expect(Reply.fields.is_accepted_answer.type).toBe('boolean');
    expect(Reply.fields.upvotes.type).toBe('number');
    expect(Reply.fields.downvotes.type).toBe('number');
    expect(Reply.fields.is_flagged.type).toBe('boolean');
    expect(Reply.fields.flag_reason.type).toBe('text');
  });

  it('should have topic_id lookup referencing topic', () => {
    expect(Reply.fields.topic_id.type).toBe('lookup');
    expect(Reply.fields.topic_id.reference).toBe('topic');
  });

  it('should have parent_reply_id lookup referencing reply', () => {
    expect(Reply.fields.parent_reply_id.type).toBe('lookup');
    expect(Reply.fields.parent_reply_id.reference).toBe('reply');
  });

  it('should default vote counts to 0', () => {
    expect(Reply.fields.upvotes.defaultValue).toBe(0);
    expect(Reply.fields.downvotes.defaultValue).toBe(0);
  });
});

// ─── Idea ──────────────────────────────────────────────────────────────────────

describe('Idea Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Idea).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Idea.name).toBe('idea');
    expect(Idea.label).toBe('Idea');
  });

  it('should use snake_case name', () => {
    expect(Idea.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Idea.fields).toBeDefined();
    expect(Object.keys(Idea.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Idea.fields.title.required).toBe(true);
    expect(Idea.fields.description.required).toBe(true);
    expect(Idea.fields.author_id.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Idea.fields.title.type).toBe('text');
    expect(Idea.fields.description.type).toBe('textarea');
    expect(Idea.fields.category.type).toBe('select');
    expect(Idea.fields.status.type).toBe('select');
    expect(Idea.fields.vote_count.type).toBe('number');
    expect(Idea.fields.priority_score.type).toBe('number');
  });

  it('should have category select with valid options', () => {
    const values = Idea.fields.category.options.map((o: any) => o.value);
    expect(values).toContain('feature');
    expect(values).toContain('improvement');
    expect(values).toContain('bug_fix');
    expect(values).toContain('integration');
  });

  it('should have status select with full workflow options', () => {
    const values = Idea.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('submitted');
    expect(values).toContain('under_review');
    expect(values).toContain('planned');
    expect(values).toContain('in_progress');
    expect(values).toContain('released');
    expect(values).toContain('declined');
  });

  it('should default status to submitted', () => {
    expect(Idea.fields.status.defaultValue).toBe('submitted');
  });

  it('should have author_id lookup referencing users', () => {
    expect(Idea.fields.author_id.type).toBe('lookup');
    expect(Idea.fields.author_id.reference).toBe('users');
  });
});

// ─── Badge ─────────────────────────────────────────────────────────────────────

describe('Badge Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Badge).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Badge.name).toBe('badge');
    expect(Badge.label).toBe('Badge');
  });

  it('should use snake_case name', () => {
    expect(Badge.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Badge.fields).toBeDefined();
    expect(Object.keys(Badge.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Badge.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Badge.fields.name.type).toBe('text');
    expect(Badge.fields.description.type).toBe('textarea');
    expect(Badge.fields.icon.type).toBe('text');
    expect(Badge.fields.criteria.type).toBe('textarea');
    expect(Badge.fields.points_value.type).toBe('number');
    expect(Badge.fields.is_automatic.type).toBe('boolean');
    expect(Badge.fields.badge_type.type).toBe('select');
    expect(Badge.fields.rarity.type).toBe('select');
  });

  it('should have badge_type select with valid options', () => {
    const values = Badge.fields.badge_type.options.map((o: any) => o.value);
    expect(values).toContain('achievement');
    expect(values).toContain('milestone');
    expect(values).toContain('special');
    expect(values).toContain('seasonal');
  });

  it('should have rarity select with valid options', () => {
    const values = Badge.fields.rarity.options.map((o: any) => o.value);
    expect(values).toContain('common');
    expect(values).toContain('uncommon');
    expect(values).toContain('rare');
    expect(values).toContain('legendary');
  });

  it('should default rarity to common', () => {
    expect(Badge.fields.rarity.defaultValue).toBe('common');
  });
});

// ─── ForumCategory ─────────────────────────────────────────────────────────────

describe('ForumCategory Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(ForumCategory).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(ForumCategory.name).toBe('forum_category');
    expect(ForumCategory.label).toBe('Forum Category');
  });

  it('should use snake_case name', () => {
    expect(ForumCategory.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(ForumCategory.fields).toBeDefined();
    expect(Object.keys(ForumCategory.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(ForumCategory.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(ForumCategory.fields.name.type).toBe('text');
    expect(ForumCategory.fields.description.type).toBe('textarea');
    expect(ForumCategory.fields.sort_order.type).toBe('number');
    expect(ForumCategory.fields.icon.type).toBe('text');
    expect(ForumCategory.fields.is_archived.type).toBe('boolean');
    expect(ForumCategory.fields.topic_count.type).toBe('number');
    expect(ForumCategory.fields.post_count.type).toBe('number');
  });

  it('should have parent_category_id self-referencing lookup', () => {
    expect(ForumCategory.fields.parent_category_id.type).toBe('lookup');
    expect(ForumCategory.fields.parent_category_id.reference).toBe('forum_category');
  });

  it('should default counters to 0', () => {
    expect(ForumCategory.fields.topic_count.defaultValue).toBe(0);
    expect(ForumCategory.fields.post_count.defaultValue).toBe(0);
  });
});

// ─── CommunityEvent ────────────────────────────────────────────────────────────

describe('CommunityEvent Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(CommunityEvent).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(CommunityEvent.name).toBe('community_event');
    expect(CommunityEvent.label).toBe('Community Event');
  });

  it('should use snake_case name', () => {
    expect(CommunityEvent.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(CommunityEvent.fields).toBeDefined();
    expect(Object.keys(CommunityEvent.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(CommunityEvent.fields.title.required).toBe(true);
    expect(CommunityEvent.fields.start_date.required).toBe(true);
    expect(CommunityEvent.fields.organizer_id.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(CommunityEvent.fields.title.type).toBe('text');
    expect(CommunityEvent.fields.description.type).toBe('textarea');
    expect(CommunityEvent.fields.event_type.type).toBe('select');
    expect(CommunityEvent.fields.start_date.type).toBe('datetime');
    expect(CommunityEvent.fields.end_date.type).toBe('datetime');
    expect(CommunityEvent.fields.is_virtual.type).toBe('boolean');
    expect(CommunityEvent.fields.capacity.type).toBe('number');
    expect(CommunityEvent.fields.rsvp_count.type).toBe('number');
    expect(CommunityEvent.fields.recording_url.type).toBe('url');
  });

  it('should have event_type select with valid options', () => {
    const values = CommunityEvent.fields.event_type.options.map((o: any) => o.value);
    expect(values).toContain('webinar');
    expect(values).toContain('meetup');
    expect(values).toContain('workshop');
    expect(values).toContain('hackathon');
    expect(values).toContain('ama');
  });

  it('should have organizer_id lookup referencing users', () => {
    expect(CommunityEvent.fields.organizer_id.type).toBe('lookup');
    expect(CommunityEvent.fields.organizer_id.reference).toBe('users');
  });

  it('should default is_virtual to true', () => {
    expect(CommunityEvent.fields.is_virtual.defaultValue).toBe(true);
  });
});

// ─── UserGroup ─────────────────────────────────────────────────────────────────

describe('UserGroup Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(UserGroup).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(UserGroup.name).toBe('user_group');
    expect(UserGroup.label).toBe('User Group');
  });

  it('should use snake_case name', () => {
    expect(UserGroup.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(UserGroup.fields).toBeDefined();
    expect(Object.keys(UserGroup.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(UserGroup.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(UserGroup.fields.name.type).toBe('text');
    expect(UserGroup.fields.description.type).toBe('textarea');
    expect(UserGroup.fields.group_type.type).toBe('select');
    expect(UserGroup.fields.criteria.type).toBe('textarea');
    expect(UserGroup.fields.member_count.type).toBe('number');
    expect(UserGroup.fields.access_level.type).toBe('select');
  });

  it('should have group_type select with valid options', () => {
    const values = UserGroup.fields.group_type.options.map((o: any) => o.value);
    expect(values).toContain('public');
    expect(values).toContain('private');
    expect(values).toContain('hidden');
  });

  it('should have access_level select with valid options', () => {
    const values = UserGroup.fields.access_level.options.map((o: any) => o.value);
    expect(values).toContain('basic');
    expect(values).toContain('contributor');
    expect(values).toContain('moderator');
    expect(values).toContain('admin');
  });

  it('should default group_type to public', () => {
    expect(UserGroup.fields.group_type.defaultValue).toBe('public');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(UserGroup.fields.owner_id.type).toBe('lookup');
    expect(UserGroup.fields.owner_id.reference).toBe('users');
  });
});
