import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Topic Form Definition
 * Layout for creating and editing Topic records.
 * Leverages FormView features: collapsible sections, widget, placeholder, helpText.
 */
export const TopicForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'topic'
  },
  sections: [
    {
      label: 'Topic Info',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'title', required: true, placeholder: 'Enter a descriptive topic title' },
        { field: 'category', required: true, helpText: 'Select the most relevant category' },
        { field: 'tags' }
      ]
    },
    {
      label: 'Content',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'body', required: true, widget: 'richtext', placeholder: 'Write your topic content here' }
      ]
    },
    {
      label: 'Settings',
      columns: '2' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'is_pinned' },
        { field: 'is_locked' },
        { field: 'allow_replies' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(TopicForm);

export default TopicForm;
