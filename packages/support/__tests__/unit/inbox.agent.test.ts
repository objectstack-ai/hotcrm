import { describe, it, expect, vi } from 'vitest';

// Mock @objectstack/spec/ai - Agent.create is a metadata declaration helper
vi.mock('@objectstack/spec/ai', () => ({
  Agent: {
    create: (config: any) => config
  }
}));

import { InboxAgent } from '../../src/inbox.agent';

describe('InboxAgent', () => {
  it('should be defined with correct name', () => {
    expect(InboxAgent).toBeDefined();
    expect(InboxAgent.name).toBe('inbox_agent');
  });

  it('should have the correct role', () => {
    expect(InboxAgent.role).toBe('Support Inbox AI Agent');
  });

  it('should have a system prompt', () => {
    expect(InboxAgent.instructions).toBeDefined();
    expect(InboxAgent.instructions.length).toBeGreaterThan(0);
    expect(InboxAgent.instructions).toContain('categorize');
  });

  it('should define all required tools', () => {
    const toolNames = InboxAgent.tools.map((t: any) => t.name);
    expect(toolNames).toContain('categorizeEmail');
    expect(toolNames).toContain('draftReply');
    expect(toolNames).toContain('routeToQueue');
    expect(toolNames).toContain('detectEscalation');
    expect(toolNames).toContain('extractEntities');
    expect(toolNames).toContain('searchKnowledgeBase');
    expect(InboxAgent.tools.length).toBe(6);
  });

  it('should have categorizeEmail tool with required parameters', () => {
    const tool = InboxAgent.tools.find((t: any) => t.name === 'categorizeEmail');
    expect(tool).toBeDefined();
    expect(tool!.parameters.email_id.required).toBe(true);
    expect(tool!.parameters.subject.required).toBe(true);
    expect(tool!.parameters.body.required).toBe(true);
    expect(tool!.parameters.sender.required).toBe(true);
    expect(tool!.action).toBe('email_categorization');
  });

  it('should have draftReply tool with required parameters', () => {
    const tool = InboxAgent.tools.find((t: any) => t.name === 'draftReply');
    expect(tool).toBeDefined();
    expect(tool!.parameters.case_id.required).toBe(true);
    expect(tool!.parameters.email_thread.required).toBe(true);
    expect(tool!.action).toBe('draft_reply');
  });

  it('should configure GPT-4 model with low temperature for consistency', () => {
    expect(InboxAgent.model.provider).toBe('openai');
    expect(InboxAgent.model.model).toBe('gpt-4');
    expect(InboxAgent.model.temperature).toBeLessThanOrEqual(0.5);
  });

  it('should have safety restrictions preventing case deletion', () => {
    expect(InboxAgent.safety.restrictedActions).toContain('delete_case');
    expect(InboxAgent.safety.restrictedActions).toContain('close_case_without_resolution');
  });

  it('should require approval for sending replies', () => {
    expect(InboxAgent.safety.requireApprovalFor).toContain('send_reply');
  });

  it('should have read-only capabilities by default', () => {
    expect(InboxAgent.capabilities.canDraftReplies).toBe(true);
    expect(InboxAgent.capabilities.canSendReplies).toBe(false);
  });

  it('should have content filter enabled', () => {
    expect(InboxAgent.safety.enableContentFilter).toBe(true);
  });

  it('should provide conversation examples', () => {
    expect(InboxAgent.examples).toBeDefined();
    expect(InboxAgent.examples.length).toBeGreaterThan(0);
  });

  it('should enable monitoring', () => {
    expect(InboxAgent.monitoring.trackUsage).toBe(true);
    expect(InboxAgent.monitoring.trackLatency).toBe(true);
    expect(InboxAgent.monitoring.trackAccuracy).toBe(true);
  });
});
