import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ChatbotConfig = ObjectSchema.create({
  name: 'chatbot_config',
  label: 'Chatbot Configuration',
  pluralLabel: 'Chatbot Configurations',
  icon: 'robot',
  description: 'Configuration for AI-powered chatbots for case deflection and customer self-service',

  fields: {
    name: Field.text({ label: 'Chatbot Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    status: Field.select({
      label: 'Status', required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Retired', value: 'retired' }
      ],
      defaultValue: 'draft'
    }),
    channel: Field.select({
      label: 'Channel', required: true,
      options: [
        { label: '🌐 Web Chat', value: 'web_chat' },
        { label: '📱 Mobile', value: 'mobile' },
        { label: '💬 Slack', value: 'slack' },
        { label: '📧 Email', value: 'email' },
        { label: '📲 SMS', value: 'sms' },
        { label: '🔗 API', value: 'api' }
      ]
    }),
    ai_model: Field.select({
      label: 'AI Model',
      options: [
        { label: 'GPT-4', value: 'gpt_4' },
        { label: 'GPT-3.5', value: 'gpt_3_5' },
        { label: 'Claude', value: 'claude' },
        { label: 'Custom', value: 'custom' }
      ],
      defaultValue: 'gpt_4'
    }),
    knowledge_base_ids: Field.text({ label: 'Knowledge Base IDs', maxLength: 1000, description: 'Comma-separated knowledge article category IDs' }),
    welcome_message: Field.textarea({ label: 'Welcome Message', maxLength: 1000 }),
    fallback_message: Field.textarea({ label: 'Fallback Message', maxLength: 1000, description: 'Message when bot cannot help' }),
    escalation_queue_id: Field.lookup('queue', { label: 'Escalation Queue', description: 'Queue for escalated conversations' }),
    max_turns: Field.number({ label: 'Max Conversation Turns', precision: 0, defaultValue: 20 }),
    confidence_threshold: Field.percent({ label: 'Confidence Threshold', defaultValue: 70, description: 'Minimum confidence to provide an answer' }),
    total_conversations: Field.number({ label: 'Total Conversations', readonly: true, precision: 0, defaultValue: 0 }),
    deflection_rate: Field.percent({ label: 'Deflection Rate', readonly: true, description: 'Percentage of cases deflected' }),
    avg_satisfaction_score: Field.number({ label: 'Avg Satisfaction', readonly: true, precision: 1 }),
    cases_deflected: Field.number({ label: 'Cases Deflected', readonly: true, precision: 0, defaultValue: 0 }),
    cases_escalated: Field.number({ label: 'Cases Escalated', readonly: true, precision: 0, defaultValue: 0 }),
    operating_hours_id: Field.lookup('business_hours', { label: 'Operating Hours' }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});
