import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '../../../src/db';
import {
  CampaignMemberEngagementTrigger,
  CampaignMemberLeadScoringTrigger,
  CampaignMemberStatsTrigger,
  CampaignMemberBounceHandlerTrigger,
  calculateEngagementScore
} from '../../../src/hooks/campaign_member.hook';

describe('CampaignMemberEngagementTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should set first_opened_date when status changes to Opened', async () => {
    const member = { status: 'Opened', number_of_opens: 0 } as any;
    const ctx = {
      input: { doc: member },
      previous: { status: 'Sent' }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(member.first_opened_date).toBeDefined();
    expect(member.number_of_opens).toBe(1);
  });

  it('should not overwrite first_opened_date on subsequent opens', async () => {
    const originalDate = '2025-01-01T00:00:00.000Z';
    const member = {
      status: 'Opened',
      first_opened_date: originalDate,
      number_of_opens: 1
    } as any;
    const ctx = {
      input: { doc: member },
      previous: { status: 'Sent' }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(member.first_opened_date).toBe(originalDate);
    expect(member.number_of_opens).toBe(2);
  });

  it('should set first_clicked_date and first_opened_date when status changes to Clicked', async () => {
    const member = { status: 'Clicked', number_of_opens: 0, number_of_clicks: 0 } as any;
    const ctx = {
      input: { doc: member },
      previous: { status: 'Sent' }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(member.first_opened_date).toBeDefined();
    expect(member.first_clicked_date).toBeDefined();
    expect(member.number_of_opens).toBe(1);
    expect(member.number_of_clicks).toBe(1);
  });

  it('should set first_responded_date and has_responded when status changes to Responded', async () => {
    const member = { status: 'Responded', number_of_opens: 0, number_of_clicks: 0 } as any;
    const ctx = {
      input: { doc: member },
      previous: { status: 'Clicked' }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(member.first_opened_date).toBeDefined();
    expect(member.first_clicked_date).toBeDefined();
    expect(member.first_responded_date).toBeDefined();
    expect(member.has_responded).toBe(true);
    expect(member.number_of_opens).toBe(1);
    expect(member.number_of_clicks).toBe(1);
  });

  it('should not process when status did not change', async () => {
    const member = { status: 'Opened', number_of_opens: 1 } as any;
    const ctx = {
      input: { doc: member },
      previous: { status: 'Opened' }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    // number_of_opens should remain unchanged
    expect(member.number_of_opens).toBe(1);
  });

  it('should not process when there is no previous state', async () => {
    const member = { status: 'Opened', number_of_opens: 0 } as any;
    const ctx = {
      input: { doc: member }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(member.number_of_opens).toBe(0);
    expect(member.first_opened_date).toBeUndefined();
  });

  it('should not overwrite existing first_clicked_date on Responded status', async () => {
    const originalClickedDate = '2025-01-02T00:00:00.000Z';
    const member = {
      status: 'Responded',
      first_opened_date: '2025-01-01T00:00:00.000Z',
      first_clicked_date: originalClickedDate,
      number_of_opens: 2,
      number_of_clicks: 1
    } as any;
    const ctx = {
      input: { doc: member },
      previous: { status: 'Clicked' }
    };

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(member.first_clicked_date).toBe(originalClickedDate);
    expect(member.first_responded_date).toBeDefined();
    expect(member.has_responded).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      input: { doc: null },
      previous: { status: 'Sent' }
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignMemberEngagementTrigger.handler(ctx as any);

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Error in CampaignMemberEngagementTrigger:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});

describe('CampaignMemberLeadScoringTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should log score increment of +5 for Opened status on a lead', async () => {
    const member = { status: 'Opened', lead: 'lead_1' };
    const ctx = {
      result: member,
      previous: { status: 'Sent' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('score updated by 5 points')
    );
    logSpy.mockRestore();
  });

  it('should log score increment of +10 for Clicked status', async () => {
    const member = { status: 'Clicked', lead: 'lead_2' };
    const ctx = {
      result: member,
      previous: { status: 'Opened' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('score updated by 10 points')
    );
    logSpy.mockRestore();
  });

  it('should log score increment of +20 for Responded status', async () => {
    const member = { status: 'Responded', contact: 'contact_1' };
    const ctx = {
      result: member,
      previous: { status: 'Clicked' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('score updated by 20 points')
    );
    logSpy.mockRestore();
  });

  it('should log score decrement of -10 for Unsubscribed status', async () => {
    const member = { status: 'Unsubscribed', lead: 'lead_3' };
    const ctx = {
      result: member,
      previous: { status: 'Opened' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('score updated by -10 points')
    );
    logSpy.mockRestore();
  });

  it('should not process when status did not change', async () => {
    const member = { status: 'Opened', lead: 'lead_1' };
    const ctx = {
      result: member,
      previous: { status: 'Opened' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('score updated')
    );
    logSpy.mockRestore();
  });

  it('should not process when there is no previous state', async () => {
    const member = { status: 'Opened', lead: 'lead_1' };
    const ctx = {
      result: member
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('score updated')
    );
    logSpy.mockRestore();
  });

  it('should warn when member has no Lead or Contact', async () => {
    const member = { status: 'Opened' };
    const ctx = {
      result: member,
      previous: { status: 'Sent' }
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no Lead or Contact')
    );
    warnSpy.mockRestore();
  });

  it('should use contact when lead is not present', async () => {
    const member = { status: 'Responded', contact: 'contact_5' };
    const ctx = {
      result: member,
      previous: { status: 'Clicked' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('contact contact_5 score updated by 20 points')
    );
    logSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      result: null,
      previous: { status: 'Sent' }
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignMemberLeadScoringTrigger.handler(ctx as any);

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Error in CampaignMemberLeadScoringTrigger:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});

describe('CampaignMemberStatsTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call updateCampaignMetrics with correct campaignId from result', async () => {
    const member = { campaign: 'campaign_1', status: 'Opened' };
    const mockFind = vi.fn().mockResolvedValueOnce([
      { status: 'Opened' },
      { status: 'Sent' },
      { status: 'Clicked' }
    ]);
    const mockUpdate = vi.fn().mockResolvedValueOnce({});

    const ctx = {
      result: member,
      ql: {
        find: mockFind,
        update: mockUpdate
      }
    };

    await CampaignMemberStatsTrigger.handler(ctx as any);

    expect(mockFind).toHaveBeenCalledWith('campaign_member', {
      filters: [['campaign', '=', 'campaign_1']]
    });
    expect(mockUpdate).toHaveBeenCalledWith('campaign', 'campaign_1', expect.objectContaining({
      total_members: 3,
      total_opened: 2,
      total_clicked: 1,
      total_responded: 0
    }));
  });

  it('should use previous campaign id when result has no campaign', async () => {
    const member = {} as any;
    const mockFind = vi.fn().mockResolvedValueOnce([{ status: 'Sent' }]);
    const mockUpdate = vi.fn().mockResolvedValueOnce({});

    const ctx = {
      result: member,
      previous: { campaign: 'campaign_2' },
      ql: {
        find: mockFind,
        update: mockUpdate
      }
    };

    await CampaignMemberStatsTrigger.handler(ctx as any);

    expect(mockFind).toHaveBeenCalledWith('campaign_member', {
      filters: [['campaign', '=', 'campaign_2']]
    });
  });

  it('should return early when no campaignId is found', async () => {
    const member = {} as any;
    const ctx = {
      result: member
    };

    // Should not throw
    await CampaignMemberStatsTrigger.handler(ctx as any);
  });

  it('should calculate correct engagement rates', async () => {
    const member = { campaign: 'campaign_3' };
    const mockFind = vi.fn().mockResolvedValueOnce([
      { status: 'Responded' },
      { status: 'Clicked' },
      { status: 'Opened' },
      { status: 'Sent' },
      { status: 'Unsubscribed' }
    ]);
    const mockUpdate = vi.fn().mockResolvedValueOnce({});

    const ctx = {
      result: member,
      ql: {
        find: mockFind,
        update: mockUpdate
      }
    };

    await CampaignMemberStatsTrigger.handler(ctx as any);

    expect(mockUpdate).toHaveBeenCalledWith('campaign', 'campaign_3', expect.objectContaining({
      total_members: 5,
      total_opened: 3, // Opened + Clicked + Responded
      total_clicked: 2, // Clicked + Responded
      total_responded: 1,
      total_unsubscribed: 1,
      open_rate: 60,
      response_rate: 20,
      unsubscribe_rate: 20
    }));
  });

  it('should handle empty members list', async () => {
    const member = { campaign: 'campaign_4' };
    const mockFind = vi.fn().mockResolvedValueOnce([]);
    const mockUpdate = vi.fn();

    const ctx = {
      result: member,
      ql: {
        find: mockFind,
        update: mockUpdate
      }
    };

    await CampaignMemberStatsTrigger.handler(ctx as any);

    // Should not call update when no members found
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const member = { campaign: 'campaign_5' };
    const mockFind = vi.fn().mockRejectedValueOnce(new Error('DB error'));

    const ctx = {
      result: member,
      ql: { find: mockFind }
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignMemberStatsTrigger.handler(ctx as any);

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Error updating campaign metrics:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});

describe('CampaignMemberBounceHandlerTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should detect hard bounce with "permanent" reason', async () => {
    const member = {
      id: 'mem_1',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: 'Permanent failure - mailbox not found',
      lead: 'lead_1',
      campaign: 'campaign_1'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hard bounce detected')
    );
    logSpy.mockRestore();
  });

  it('should detect hard bounce with "invalid" reason', async () => {
    const member = {
      id: 'mem_2',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: 'Invalid email address',
      contact: 'contact_1',
      campaign: 'campaign_1'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hard bounce detected')
    );
    logSpy.mockRestore();
  });

  it('should detect hard bounce with "not found" reason', async () => {
    const member = {
      id: 'mem_3',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: 'User not found',
      lead: 'lead_2',
      campaign: 'campaign_1'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hard bounce detected')
    );
    logSpy.mockRestore();
  });

  it('should detect hard bounce with "does not exist" reason', async () => {
    const member = {
      id: 'mem_4',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: 'Mailbox does not exist',
      lead: 'lead_3',
      campaign: 'campaign_1'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hard bounce detected')
    );
    logSpy.mockRestore();
  });

  it('should detect soft bounce when reason does not match hard bounce keywords', async () => {
    const member = {
      id: 'mem_5',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: 'Mailbox full - try again later',
      lead: 'lead_4',
      campaign: 'campaign_1'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Soft bounce detected')
    );
    logSpy.mockRestore();
  });

  it('should not process when bounce date was already set', async () => {
    const member = {
      id: 'mem_6',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: 'Permanent failure',
      lead: 'lead_5'
    };
    const ctx = {
      input: { doc: member },
      previous: { email_bounced_date: '2025-05-01' }
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('bounced')
    );
    logSpy.mockRestore();
  });

  it('should not process when no bounce date is set', async () => {
    const member = {
      id: 'mem_7',
      lead: 'lead_6'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('bounced')
    );
    logSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      input: { doc: null },
      previous: {}
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Error in CampaignMemberBounceHandlerTrigger:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should handle empty bounce reason as soft bounce', async () => {
    const member = {
      id: 'mem_8',
      email_bounced_date: '2025-06-01',
      email_bounced_reason: '',
      lead: 'lead_7',
      campaign: 'campaign_1'
    };
    const ctx = {
      input: { doc: member },
      previous: {}
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await CampaignMemberBounceHandlerTrigger.handler(ctx as any);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Soft bounce detected')
    );
    logSpy.mockRestore();
  });
});

describe('calculateEngagementScore', () => {
  it('should return base score of 10 for new member with no status', async () => {
    expect(calculateEngagementScore({})).toBe(10);
  });

  it('should return 20 for Sent status', () => {
    expect(calculateEngagementScore({ status: 'Sent' })).toBe(20);
  });

  it('should return 40 for Opened status', () => {
    expect(calculateEngagementScore({ status: 'Opened' })).toBe(40);
  });

  it('should return 70 for Clicked status', () => {
    expect(calculateEngagementScore({ status: 'Clicked' })).toBe(70);
  });

  it('should cap at 100 for Responded status', () => {
    // 10 base + 100 = 110, capped at 100
    expect(calculateEngagementScore({ status: 'Responded' })).toBe(100);
  });

  it('should return 0 for Unsubscribed status', () => {
    expect(calculateEngagementScore({ status: 'Unsubscribed' })).toBe(0);
  });

  it('should add bonus for multiple opens', () => {
    // 10 base + 30 (Opened) + 10 (3-1=2 extra opens * 5) = 50
    expect(calculateEngagementScore({ status: 'Opened', number_of_opens: 3 })).toBe(50);
  });

  it('should cap open bonus at 20', () => {
    // 10 base + 30 (Opened) + 20 (capped) = 60
    expect(calculateEngagementScore({ status: 'Opened', number_of_opens: 10 })).toBe(60);
  });

  it('should add bonus for multiple clicks', () => {
    // 10 base + 60 (Clicked) + 20 (3-1=2 extra clicks * 10) = 90
    expect(calculateEngagementScore({ status: 'Clicked', number_of_clicks: 3 })).toBe(90);
  });

  it('should cap total score at 100', () => {
    // 10 base + 60 (Clicked) + 20 (open bonus capped) + 30 (click bonus capped) = 120 → capped at 100
    expect(calculateEngagementScore({
      status: 'Clicked',
      number_of_opens: 10,
      number_of_clicks: 10
    })).toBe(100);
  });
});
