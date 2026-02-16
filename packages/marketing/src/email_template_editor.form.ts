import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Email Template Editor Form Definition
 * Layout for creating and editing Email Template records.
 */
export const EmailTemplateEditorForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'email_template'
  },
  sections: [
    {
      label: 'Template Details',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'name', required: true, placeholder: 'Template name' },
        { field: 'subject', required: true, placeholder: 'Email subject line' },
        { field: 'type', required: true },
        { field: 'category' },
        { field: 'is_active' },
        { field: 'description' }
      ]
    },
    {
      label: 'Content',
      columns: 1,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'html_body', widget: 'richtext', helpText: 'Use merge fields like {{first_name}} for personalization' },
        { field: 'text_body', helpText: 'Plain text version for email clients that do not support HTML' },
        { field: 'preheader_text', placeholder: 'Preview text shown in inbox' }
      ]
    },
    {
      label: 'Settings',
      columns: 2,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'from_name' },
        { field: 'from_email' },
        { field: 'reply_to' },
        { field: 'folder' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EmailTemplateEditorForm);

export default EmailTemplateEditorForm;
