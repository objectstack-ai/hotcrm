import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '../../../src/db';
import { CampaignROIHook } from '../../../src/hooks/roi.hook';

describe('CampaignROIHook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should increase campaign revenue when opportunity is won', async () => {
    const ctx = {
      result: {
        _id: 'opp_1',
        campaign_id: 'campaign_1',
        stage_name: 'closed_won',
        amount: 50000
      },
      previous: {
        _id: 'opp_1',
        campaign_id: 'campaign_1',
        stage_name: 'negotiation',
        amount: 50000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_1', actual_revenue: 10000 }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    expect(db.find).toHaveBeenCalledWith('campaign', {
      filters: [['_id', '=', 'campaign_1']]
    });
    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_1', {
      actual_revenue: 60000
    });
  });

  it('should decrease campaign revenue when opportunity moves out of won', async () => {
    const ctx = {
      result: {
        _id: 'opp_2',
        campaign_id: 'campaign_2',
        stage_name: 'closed_lost',
        amount: 30000
      },
      previous: {
        _id: 'opp_2',
        campaign_id: 'campaign_2',
        stage_name: 'closed_won',
        amount: 30000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_2', actual_revenue: 80000 }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_2', {
      actual_revenue: 50000
    });
  });

  it('should adjust campaign revenue when won amount changes', async () => {
    const ctx = {
      result: {
        _id: 'opp_3',
        campaign_id: 'campaign_3',
        stage_name: 'closed_won',
        amount: 70000
      },
      previous: {
        _id: 'opp_3',
        campaign_id: 'campaign_3',
        stage_name: 'closed_won',
        amount: 50000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_3', actual_revenue: 100000 }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    // Delta = 70000 - 50000 = 20000; 100000 + 20000 = 120000
    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_3', {
      actual_revenue: 120000
    });
  });

  it('should not process when opportunity has no campaign_id', async () => {
    const ctx = {
      result: {
        _id: 'opp_4',
        stage_name: 'closed_won',
        amount: 50000
      },
      previous: {
        _id: 'opp_4',
        stage_name: 'negotiation',
        amount: 50000
      }
    };

    await CampaignROIHook.handler(ctx as any);

    expect(db.find).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should not process when stage did not change and amount is same', async () => {
    const ctx = {
      result: {
        _id: 'opp_5',
        campaign_id: 'campaign_5',
        stage_name: 'negotiation',
        amount: 50000
      },
      previous: {
        _id: 'opp_5',
        campaign_id: 'campaign_5',
        stage_name: 'negotiation',
        amount: 50000
      }
    };

    await CampaignROIHook.handler(ctx as any);

    expect(db.find).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should handle campaign with no existing revenue (zero)', async () => {
    const ctx = {
      result: {
        _id: 'opp_6',
        campaign_id: 'campaign_6',
        stage_name: 'closed_won',
        amount: 25000
      },
      previous: {
        _id: 'opp_6',
        campaign_id: 'campaign_6',
        stage_name: 'prospecting',
        amount: 25000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_6' }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_6', {
      actual_revenue: 25000
    });
  });

  it('should not update when campaign is not found', async () => {
    const ctx = {
      result: {
        _id: 'opp_7',
        campaign_id: 'campaign_7',
        stage_name: 'closed_won',
        amount: 10000
      },
      previous: {
        _id: 'opp_7',
        campaign_id: 'campaign_7',
        stage_name: 'negotiation',
        amount: 10000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([]);

    await CampaignROIHook.handler(ctx as any);

    expect(db.find).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should handle zero amount on won opportunity', async () => {
    const ctx = {
      result: {
        _id: 'opp_8',
        campaign_id: 'campaign_8',
        stage_name: 'closed_won',
        amount: 0
      },
      previous: {
        _id: 'opp_8',
        campaign_id: 'campaign_8',
        stage_name: 'negotiation',
        amount: 0
      }
    };

    // delta = 0, so no update should happen
    await CampaignROIHook.handler(ctx as any);

    expect(db.find).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should handle missing amount as zero when won', async () => {
    const ctx = {
      result: {
        _id: 'opp_9',
        campaign_id: 'campaign_9',
        stage_name: 'closed_won'
      },
      previous: {
        _id: 'opp_9',
        campaign_id: 'campaign_9',
        stage_name: 'negotiation'
      }
    };

    // amount is undefined → defaults to 0, delta = 0
    await CampaignROIHook.handler(ctx as any);

    expect(db.find).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should handle no previous state (new record)', async () => {
    const ctx = {
      result: {
        _id: 'opp_10',
        campaign_id: 'campaign_10',
        stage_name: 'closed_won',
        amount: 30000
      }
    };

    // wasWon = undefined?.stage_name === 'closed_won' → false
    // isWon = true, !wasWon = true → delta = 30000
    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_10', actual_revenue: 5000 }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_10', {
      actual_revenue: 35000
    });
  });

  it('should reduce revenue by old amount when moved out of won', async () => {
    const ctx = {
      result: {
        _id: 'opp_11',
        campaign_id: 'campaign_11',
        stage_name: 'closed_lost',
        amount: 99999 // current amount doesn't matter for lost
      },
      previous: {
        _id: 'opp_11',
        campaign_id: 'campaign_11',
        stage_name: 'closed_won',
        amount: 40000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_11', actual_revenue: 100000 }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    // delta = -(oldOpp.amount) = -40000
    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_11', {
      actual_revenue: 60000
    });
  });

  it('should handle amount decrease while still won', async () => {
    const ctx = {
      result: {
        _id: 'opp_12',
        campaign_id: 'campaign_12',
        stage_name: 'closed_won',
        amount: 30000
      },
      previous: {
        _id: 'opp_12',
        campaign_id: 'campaign_12',
        stage_name: 'closed_won',
        amount: 50000
      }
    };

    (db.find as Mock).mockResolvedValueOnce([
      { _id: 'campaign_12', actual_revenue: 100000 }
    ]);
    (db.update as Mock).mockResolvedValueOnce({});

    await CampaignROIHook.handler(ctx as any);

    // delta = 30000 - 50000 = -20000; 100000 + (-20000) = 80000
    expect(db.update).toHaveBeenCalledWith('campaign', 'campaign_12', {
      actual_revenue: 80000
    });
  });
});
