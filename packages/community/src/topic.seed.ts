/**
 * Topic Seed Data
 * Sample forum topics across community categories
 */

export const TopicSeedData = [
  { title: 'Welcome to the HotCRM Community!', body: 'Introduce yourself and share how you are using HotCRM. We love hearing from our users and are excited to have you here!', category: 'announcements', author_name: 'Community Team', status: 'pinned', view_count: 8420, reply_count: 156, is_pinned: true, created_date: '2025-01-05' },
  { title: 'How do I create a custom report with cross-object filters?', body: 'I want to build a report that shows accounts without any open opportunities. I tried using standard filters but cannot find a cross-object option. Any guidance?', category: 'questions', author_name: 'Maria Gonzalez', status: 'open', view_count: 1230, reply_count: 8, is_pinned: false, created_date: '2025-05-18' },
  { title: 'Tip: Use keyboard shortcuts to speed up navigation', body: 'Did you know you can press Cmd+K to open the global search, or Shift+N to create a new record from any page? Check out Settings → Keyboard Shortcuts for the full list.', category: 'tips', author_name: 'Kevin Brooks', status: 'open', view_count: 2940, reply_count: 22, is_pinned: false, created_date: '2025-04-02' },
  { title: 'Idea: Native integration with Jira for engineering teams', body: 'It would be great if HotCRM offered a built-in Jira connector so support cases could automatically create Jira tickets and sync status updates bidirectionally.', category: 'ideas', author_name: 'Sarah Chen', status: 'open', view_count: 1870, reply_count: 35, is_pinned: false, created_date: '2025-03-12' },
  { title: 'Resolved: Email deliverability issues on May 25', body: 'We identified and resolved an issue that caused delayed email delivery for some campaigns between 08:00 and 11:00 UTC on May 25. All systems are now operating normally.', category: 'announcements', author_name: 'Community Team', status: 'closed', view_count: 3610, reply_count: 12, is_pinned: false, created_date: '2025-05-25' },
];

export default TopicSeedData;
