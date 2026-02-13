import { describe, it, expect } from 'vitest';
import {
  sendNotification,
  handleSlashCommand,
  postChannelMessage,
  handleSlackEvent,
} from '../../../src/connectors/slack.action';

// ─── sendNotification ──────────────────────────────────────────────────────────

describe('sendNotification', () => {
  it('should send a notification to a channel', async () => {
    const result = await sendNotification({ channel: '#general', message: 'Hello!' });
    expect(result.ok).toBe(true);
    expect(result.ts).toBeDefined();
    expect(result.channel).toBe('#general');
  });

  it('should accept optional blocks and thread_ts', async () => {
    const result = await sendNotification({
      channel: '#alerts',
      message: 'Alert!',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Alert!' } }],
      thread_ts: '1234567890.000001',
    });
    expect(result.ok).toBe(true);
  });

  it('should throw when channel is missing', async () => {
    await expect(
      sendNotification({ channel: '', message: 'Hello!' })
    ).rejects.toThrow('channel and message are required');
  });

  it('should throw when message is missing', async () => {
    await expect(
      sendNotification({ channel: '#general', message: '' })
    ).rejects.toThrow('channel and message are required');
  });
});

// ─── handleSlashCommand ────────────────────────────────────────────────────────

describe('handleSlashCommand', () => {
  it('should process a slash command', async () => {
    const result = await handleSlashCommand({
      command: '/crm',
      text: 'search deals',
      user_id: 'U123',
      channel_id: 'C456',
      response_url: 'https://hooks.slack.com/response',
    });
    expect(result.response_type).toBe('ephemeral');
    expect(result.text).toContain('/crm');
    expect(result.text).toContain('search deals');
  });

  it('should throw when command is missing', async () => {
    await expect(
      handleSlashCommand({
        command: '',
        text: 'test',
        user_id: 'U123',
        channel_id: 'C456',
        response_url: 'https://hooks.slack.com/response',
      })
    ).rejects.toThrow('command is required');
  });
});

// ─── postChannelMessage ────────────────────────────────────────────────────────

describe('postChannelMessage', () => {
  it('should post a message to a channel', async () => {
    const result = await postChannelMessage({
      channel: '#deals',
      text: 'New deal closed!',
    });
    expect(result.ok).toBe(true);
    expect(result.ts).toBeDefined();
    expect(result.message.text).toBe('New deal closed!');
  });

  it('should accept optional attachments and unfurl_links', async () => {
    const result = await postChannelMessage({
      channel: '#deals',
      text: 'Deal update',
      attachments: [{ color: '#36a64f', text: 'Details' }],
      unfurl_links: false,
    });
    expect(result.ok).toBe(true);
  });

  it('should throw when channel is missing', async () => {
    await expect(
      postChannelMessage({ channel: '', text: 'Hello' })
    ).rejects.toThrow('channel and text are required');
  });

  it('should throw when text is missing', async () => {
    await expect(
      postChannelMessage({ channel: '#general', text: '' })
    ).rejects.toThrow('channel and text are required');
  });
});

// ─── handleSlackEvent ──────────────────────────────────────────────────────────

describe('handleSlackEvent', () => {
  it('should process a message event', async () => {
    const result = await handleSlackEvent({
      type: 'message',
      event: { text: 'Hello', user: 'U123' },
      team_id: 'T123',
      event_id: 'Ev123',
    });
    expect(result.processed).toBe(true);
    expect(result.event_type).toBe('message');
    expect(result.actions_taken).toContain('message_logged');
  });

  it('should process a reaction_added event', async () => {
    const result = await handleSlackEvent({
      type: 'reaction_added',
      event: { reaction: '+1', user: 'U123' },
      team_id: 'T123',
      event_id: 'Ev456',
    });
    expect(result.actions_taken).toContain('reaction_tracked');
  });

  it('should process a member_joined_channel event', async () => {
    const result = await handleSlackEvent({
      type: 'member_joined_channel',
      event: { user: 'U123', channel: 'C456' },
      team_id: 'T123',
      event_id: 'Ev789',
    });
    expect(result.actions_taken).toContain('membership_updated');
  });

  it('should return empty actions for unknown event types', async () => {
    const result = await handleSlackEvent({
      type: 'unknown_event',
      event: {},
      team_id: 'T123',
      event_id: 'Ev000',
    });
    expect(result.processed).toBe(true);
    expect(result.actions_taken).toHaveLength(0);
  });

  it('should throw when type is missing', async () => {
    await expect(
      handleSlackEvent({ type: '', event: {}, team_id: 'T123', event_id: 'Ev000' })
    ).rejects.toThrow('type and event are required');
  });

  it('should throw when event is missing', async () => {
    await expect(
      handleSlackEvent({ type: 'message', event: null as any, team_id: 'T123', event_id: 'Ev000' })
    ).rejects.toThrow('type and event are required');
  });
});
