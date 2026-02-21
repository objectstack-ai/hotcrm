import type { Reaction, Mention, FieldChangeEntry } from '@objectstack/spec/data';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';

/**
 * HR Feed Configuration
 * Activity feed configurations for Employee, Job Application, Performance Review
 */

// --- Feed Item Configurations ---

export const EmployeeOnboardingFeedItem = {
  id: 'hr-fi-001',
  type: 'record_create' as const,
  actor: { type: 'user' as const, id: 'u-hr-mgr-01', name: 'Patricia Wells' },
  object: 'employee',
  recordId: 'emp-0301',
  body: 'New employee onboarded: Software Engineer, Engineering Department. Start date: 2027-04-14.',
  visibility: 'public' as const,
  createdAt: '2027-04-10T09:00:00Z',
};

export const JobApplicationCommentFeedItem = {
  id: 'hr-fi-002',
  type: 'comment' as const,
  actor: { type: 'user' as const, id: 'u-recruiter-01', name: 'David Liu' },
  object: 'job_application',
  recordId: 'ja-0145',
  body: 'Candidate passed technical interview with strong results. Recommending advancement to final round.',
  visibility: 'public' as const,
  createdAt: '2027-04-11T14:30:00Z',
};

export const PerformanceReviewApprovalFeedItem = {
  id: 'hr-fi-003',
  type: 'approval' as const,
  actor: { type: 'user' as const, id: 'u-director-01', name: 'Karen Mitchell' },
  object: 'performance_review',
  recordId: 'pr-0078',
  body: 'Q1 performance review approved. Overall rating: Exceeds Expectations.',
  visibility: 'public' as const,
  createdAt: '2027-04-12T16:00:00Z',
};

export const EmployeePromotionFeedItem = {
  id: 'hr-fi-004',
  type: 'field_change' as const,
  actor: { type: 'user' as const, id: 'u-hr-mgr-01', name: 'Patricia Wells' },
  object: 'employee',
  recordId: 'emp-0187',
  body: 'Employee promoted from Senior Engineer to Staff Engineer effective 2027-05-01.',
  visibility: 'public' as const,
  createdAt: '2027-04-13T10:00:00Z',
};

export const JobApplicationTaskFeedItem = {
  id: 'hr-fi-005',
  type: 'task' as const,
  actor: { type: 'user' as const, id: 'u-recruiter-01', name: 'David Liu' },
  object: 'job_application',
  recordId: 'ja-0150',
  body: 'Created task: Schedule final interview panel with hiring manager and VP of Engineering.',
  visibility: 'public' as const,
  createdAt: '2027-04-14T11:15:00Z',
};

// --- Reaction Configurations ---

export const CelebrationReaction = {
  emoji: '🎉',
  userIds: ['u-hr-mgr-01', 'u-director-01', 'u-recruiter-01'],
  count: 3,
} satisfies Reaction;

export const ThumbsUpReaction = {
  emoji: '👍',
  userIds: ['u-recruiter-01', 'u-hr-mgr-01'],
  count: 2,
} satisfies Reaction;

export const StarReaction = {
  emoji: '⭐',
  userIds: ['u-director-01'],
  count: 1,
} satisfies Reaction;

// --- Mention Configurations ---

export const HiringManagerMention = {
  type: 'user' as const,
  id: 'u-director-01',
  name: 'Karen Mitchell',
  offset: 0,
  length: 15,
} satisfies Mention;

export const RecruiterMention = {
  type: 'user' as const,
  id: 'u-recruiter-01',
  name: 'David Liu',
  offset: 20,
  length: 9,
} satisfies Mention;

// --- Record Subscriptions ---

export const EmployeeManagerSubscription = {
  object: 'employee',
  recordId: 'emp-0301',
  userId: 'u-hr-mgr-01',
  events: ['all'],
  createdAt: '2027-04-10T09:00:00Z',
};

export const JobApplicationRecruiterSubscription = {
  object: 'job_application',
  recordId: 'ja-0145',
  userId: 'u-recruiter-01',
  events: ['comment', 'field_change', 'approval'],
  createdAt: '2027-03-01T08:00:00Z',
};

export const PerformanceReviewDirectorSubscription = {
  object: 'performance_review',
  recordId: 'pr-0078',
  userId: 'u-director-01',
  events: ['approval', 'comment'],
  createdAt: '2027-04-01T08:00:00Z',
};

// --- Field Change Entries ---

export const EmployeeTitleChange = {
  field: 'job_title',
  oldValue: 'Senior Engineer',
  newValue: 'Staff Engineer',
} satisfies FieldChangeEntry;

export const EmployeeDepartmentChange = {
  field: 'department',
  oldValue: 'Engineering',
  newValue: 'Platform Engineering',
} satisfies FieldChangeEntry;

export const JobApplicationStageChange = {
  field: 'stage',
  oldValue: 'technical_interview',
  newValue: 'final_round',
} satisfies FieldChangeEntry;

// --- Schema Validation ---

FeedItemSchema.parse(EmployeeOnboardingFeedItem);
FeedItemSchema.parse(JobApplicationCommentFeedItem);
FeedItemSchema.parse(PerformanceReviewApprovalFeedItem);
FeedItemSchema.parse(EmployeePromotionFeedItem);
FeedItemSchema.parse(JobApplicationTaskFeedItem);

ReactionSchema.parse(CelebrationReaction);
ReactionSchema.parse(ThumbsUpReaction);
ReactionSchema.parse(StarReaction);

MentionSchema.parse(HiringManagerMention);
MentionSchema.parse(RecruiterMention);

RecordSubscriptionSchema.parse(EmployeeManagerSubscription);
RecordSubscriptionSchema.parse(JobApplicationRecruiterSubscription);
RecordSubscriptionSchema.parse(PerformanceReviewDirectorSubscription);

FieldChangeEntrySchema.parse(EmployeeTitleChange);
FieldChangeEntrySchema.parse(EmployeeDepartmentChange);
FieldChangeEntrySchema.parse(JobApplicationStageChange);

// --- Aggregate Export ---

export const HrFeedConfig = {
  feedItems: [
    EmployeeOnboardingFeedItem,
    JobApplicationCommentFeedItem,
    PerformanceReviewApprovalFeedItem,
    EmployeePromotionFeedItem,
    JobApplicationTaskFeedItem,
  ],
  reactions: [CelebrationReaction, ThumbsUpReaction, StarReaction],
  mentions: [HiringManagerMention, RecruiterMention],
  subscriptions: [EmployeeManagerSubscription, JobApplicationRecruiterSubscription, PerformanceReviewDirectorSubscription],
  fieldChanges: [EmployeeTitleChange, EmployeeDepartmentChange, JobApplicationStageChange],
};

export default HrFeedConfig;
