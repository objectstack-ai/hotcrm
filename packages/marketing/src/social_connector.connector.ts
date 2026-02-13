import type { Connector } from '@objectstack/spec/automation';
import { ConnectorSchema } from '@objectstack/spec/automation';

export const SocialConnector = {
  id: 'social_connector',
  name: 'Social Media Connector',
  description: 'Integrates with social media platforms for campaign tracking, post publishing, and mention monitoring.',
  version: '1.0.0',
  icon: 'share-2',
  category: 'social',
  baseUrl: 'https://api.social-platform.com/v2',
  authentication: {
    type: 'oauth2',
    fields: [
      {
        name: 'client_id',
        label: 'Client ID',
        type: 'text',
        description: 'OAuth2 application client ID from the social platform',
        required: true,
        placeholder: 'your-client-id',
      },
      {
        name: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        description: 'OAuth2 application client secret',
        required: true,
        placeholder: 'your-client-secret',
      },
    ],
    oauth2: {
      authorizationUrl: 'https://api.social-platform.com/oauth/authorize',
      tokenUrl: 'https://api.social-platform.com/oauth/token',
      scopes: [
        'read:posts',
        'write:posts',
        'read:analytics',
        'read:mentions',
      ],
      clientIdField: 'client_id',
      clientSecretField: 'client_secret',
    },
    test: {
      url: '/me',
      method: 'GET',
    },
  },
  operations: [
    {
      id: 'get_posts',
      name: 'Get Posts',
      description: 'Retrieve posts from connected social media accounts.',
      type: 'read',
      inputSchema: [
        { name: 'account_id', label: 'Account ID', type: 'string', required: true },
        { name: 'since', label: 'Since Date', type: 'date', required: false },
        { name: 'limit', label: 'Limit', type: 'number', required: false },
      ],
      supportsPagination: true,
      supportsFiltering: true,
    },
    {
      id: 'publish_post',
      name: 'Publish Post',
      description: 'Publish a new post to a connected social media account.',
      type: 'write',
      inputSchema: [
        { name: 'account_id', label: 'Account ID', type: 'string', required: true },
        { name: 'content', label: 'Content', type: 'string', required: true },
        { name: 'media_url', label: 'Media URL', type: 'string', required: false },
        { name: 'schedule_at', label: 'Schedule At', type: 'string', required: false },
      ],
      supportsPagination: false,
      supportsFiltering: false,
    },
    {
      id: 'get_analytics',
      name: 'Get Analytics',
      description: 'Retrieve engagement analytics for posts and campaigns.',
      type: 'read',
      inputSchema: [
        { name: 'account_id', label: 'Account ID', type: 'string', required: true },
        { name: 'post_id', label: 'Post ID', type: 'string', required: false },
        { name: 'date_from', label: 'Date From', type: 'date', required: false },
        { name: 'date_to', label: 'Date To', type: 'date', required: false },
      ],
      supportsPagination: true,
      supportsFiltering: true,
    },
    {
      id: 'search_mentions',
      name: 'Search Mentions',
      description: 'Search for brand mentions and keywords across social platforms.',
      type: 'search',
      inputSchema: [
        { name: 'query', label: 'Search Query', type: 'string', required: true },
        { name: 'platform', label: 'Platform', type: 'string', required: false },
        { name: 'sentiment', label: 'Sentiment', type: 'string', required: false },
      ],
      supportsPagination: true,
      supportsFiltering: true,
    },
  ],
  triggers: [
    {
      id: 'new_mention',
      name: 'New Mention',
      description: 'Fires when a new brand mention is detected on social media.',
      type: 'polling',
      pollingIntervalMs: 60000,
    },
  ],
  rateLimit: {
    requestsPerSecond: 5,
    requestsPerMinute: 100,
  },
  author: 'HotCRM',
  documentation: 'https://docs.hotcrm.com/connectors/social',
  tags: ['social-media', 'campaign', 'analytics', 'mentions'],
  verified: true,
} satisfies Connector;

ConnectorSchema.parse(SocialConnector);

export default SocialConnector;
