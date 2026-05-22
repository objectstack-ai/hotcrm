/**
 * Topic Seed Data
 * Sample forum topics across community categories
 */

export const TopicSeedData = [
  { title: 'Welcome to the HotCRM Community!', body: 'Introduce yourself and share how you are using HotCRM. We love hearing from our users and are excited to have you here!', category_id: 'announcements', status: 'pinned', view_count: 8420, reply_count: 156, is_pinned: true },
  { title: 'How do I create a custom report with cross-object filters?', body: 'I want to build a report that shows accounts without any open opportunities. I tried using standard filters but cannot find a cross-object option. Any guidance?', category_id: 'questions', status: 'open', view_count: 1230, reply_count: 8, is_pinned: false },
  { title: 'Tip: Use keyboard shortcuts to speed up navigation', body: 'Did you know you can press Cmd+K to open the global search, or Shift+N to create a new record from any page? Check out Settings → Keyboard Shortcuts for the full list.', category_id: 'tips', status: 'open', view_count: 2940, reply_count: 22, is_pinned: false },
  { title: 'Idea: Native integration with Jira for engineering teams', body: 'It would be great if HotCRM offered a built-in Jira connector so support cases could automatically create Jira tickets and sync status updates bidirectionally.', category_id: 'ideas', status: 'open', view_count: 1870, reply_count: 35, is_pinned: false },
  { title: 'Resolved: Email deliverability issues on May 25', body: 'We identified and resolved an issue that caused delayed email delivery for some campaigns between 08:00 and 11:00 UTC on May 25. All systems are now operating normally.', category_id: 'announcements', status: 'closed', view_count: 3610, reply_count: 12, is_pinned: false }
];

export default TopicSeedData;
