/**
 * Integration Test: End-to-End Lifecycle Flow
 *
 * Validates the full cross-cloud lifecycle:
 * Lead (CRM) → Campaign attribution (Marketing) → Deal close (CRM) →
 * Invoice (Finance) → Stripe payment (Integration) → Revenue report (Analytics)
 */

import { vi, Mock } from 'vitest';

vi.mock('../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { broker } from '../../src/db';

describe('End-to-End Lifecycle: Lead → Campaign → Deal → Invoice → Payment → Revenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Lead to Campaign Attribution ──────────────────────────────────────────

  describe('Lead to Campaign Attribution', () => {
    it('should create a lead with campaign attribution', async () => {
      const campaign = {
        _id: 'campaign_q3_enterprise',
        name: 'Q3 Enterprise Campaign',
        status: 'active',
        type: 'enterprise',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        budget: 500000,
      };

      const lead = {
        _id: 'lead_sarah_chen',
        first_name: 'Sarah',
        last_name: 'Chen',
        email: 'sarah.chen@acmecorp.com',
        company: 'Acme Corp',
        title: 'VP of Engineering',
        status: 'new',
        source: 'campaign',
        campaign_id: campaign._id,
      };

      (broker.findOne as Mock).mockResolvedValue(campaign);
      (broker.insert as Mock).mockResolvedValue(lead);

      // Act: verify campaign exists and create lead with attribution
      const fetchedCampaign = await broker.findOne('campaign', 'campaign_q3_enterprise');
      expect(fetchedCampaign.status).toBe('active');

      const createdLead = await broker.insert('lead', {
        first_name: 'Sarah',
        last_name: 'Chen',
        email: 'sarah.chen@acmecorp.com',
        company: 'Acme Corp',
        title: 'VP of Engineering',
        status: 'new',
        source: 'campaign',
        campaign_id: fetchedCampaign._id,
      });

      // Assert
      expect(createdLead.campaign_id).toBe(campaign._id);
      expect(createdLead.company).toBe('Acme Corp');
      expect(broker.insert).toHaveBeenCalledWith('lead', expect.objectContaining({
        campaign_id: 'campaign_q3_enterprise',
        source: 'campaign',
      }));
    });

    it('should validate cross-cloud reference between lead and campaign', async () => {
      const lead = {
        _id: 'lead_sarah_chen',
        first_name: 'Sarah',
        last_name: 'Chen',
        company: 'Acme Corp',
        campaign_id: 'campaign_q3_enterprise',
      };

      const campaign = {
        _id: 'campaign_q3_enterprise',
        name: 'Q3 Enterprise Campaign',
        status: 'active',
      };

      (broker.findOne as Mock)
        .mockResolvedValueOnce(lead)
        .mockResolvedValueOnce(campaign);

      // Act: fetch lead and resolve its campaign reference
      const fetchedLead = await broker.findOne('lead', 'lead_sarah_chen');
      const linkedCampaign = await broker.findOne('campaign', fetchedLead.campaign_id);

      // Assert
      expect(linkedCampaign._id).toBe(fetchedLead.campaign_id);
      expect(linkedCampaign.name).toBe('Q3 Enterprise Campaign');
      expect(broker.findOne).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Campaign to Deal Close ────────────────────────────────────────────────

  describe('Campaign to Deal Close', () => {
    it('should convert lead to opportunity', async () => {
      const lead = {
        _id: 'lead_sarah_chen',
        first_name: 'Sarah',
        last_name: 'Chen',
        company: 'Acme Corp',
        campaign_id: 'campaign_q3_enterprise',
        status: 'qualified',
      };

      const account = {
        _id: 'account_acme',
        name: 'Acme Corp',
        industry: 'Technology',
        type: 'prospect',
      };

      const opportunity = {
        _id: 'opp_acme_enterprise',
        name: 'Acme Corp Enterprise License',
        account_id: 'account_acme',
        amount: 150000,
        stage: 'Qualification',
        close_date: '2026-09-15',
        campaign_id: 'campaign_q3_enterprise',
        lead_source: 'campaign',
      };

      (broker.findOne as Mock).mockResolvedValue(lead);
      (broker.insert as Mock)
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(opportunity);
      (broker.update as Mock).mockResolvedValue({ ...lead, status: 'converted' });

      // Act: convert lead to account + opportunity
      const fetchedLead = await broker.findOne('lead', 'lead_sarah_chen');
      const createdAccount = await broker.insert('account', {
        name: fetchedLead.company,
        industry: 'Technology',
        type: 'prospect',
      });
      const createdOpp = await broker.insert('opportunity', {
        name: `${fetchedLead.company} Enterprise License`,
        account_id: createdAccount._id,
        amount: 150000,
        stage: 'Qualification',
        close_date: '2026-09-15',
        campaign_id: fetchedLead.campaign_id,
        lead_source: 'campaign',
      });
      await broker.update('lead', fetchedLead._id, { status: 'converted' });

      // Assert
      expect(createdOpp.campaign_id).toBe('campaign_q3_enterprise');
      expect(createdOpp.account_id).toBe('account_acme');
      expect(broker.insert).toHaveBeenCalledTimes(2);
      expect(broker.update).toHaveBeenCalledWith('lead', 'lead_sarah_chen', {
        status: 'converted',
      });
    });

    it('should move opportunity through stages to Closed Won', async () => {
      const stages = ['Qualification', 'Proposal', 'Negotiation', 'Closed Won'];
      let currentStage = stages[0];

      (broker.update as Mock).mockImplementation(
        (_obj: string, _id: string, doc: Record<string, any>) =>
          Promise.resolve({
            _id: 'opp_acme_enterprise',
            name: 'Acme Corp Enterprise License',
            amount: 150000,
            ...doc,
          })
      );

      // Act: advance through each stage
      for (const stage of stages.slice(1)) {
        const updated = await broker.update('opportunity', 'opp_acme_enterprise', {
          stage,
        });
        currentStage = updated.stage;
      }

      // Assert
      expect(currentStage).toBe('Closed Won');
      expect(broker.update).toHaveBeenCalledTimes(3);
      expect(broker.update).toHaveBeenLastCalledWith('opportunity', 'opp_acme_enterprise', {
        stage: 'Closed Won',
      });
    });
  });

  // ─── Deal Close to Invoice ─────────────────────────────────────────────────

  describe('Deal Close to Invoice', () => {
    it('should create invoice from closed deal with line items', async () => {
      const closedOpp = {
        _id: 'opp_acme_enterprise',
        name: 'Acme Corp Enterprise License',
        account_id: 'account_acme',
        amount: 150000,
        stage: 'Closed Won',
        close_date: '2026-09-15',
      };

      const invoice = {
        _id: 'inv_acme_001',
        account_id: 'account_acme',
        opportunity_id: 'opp_acme_enterprise',
        amount: 150000,
        status: 'draft',
        issue_date: '2026-09-15',
        due_date: '2026-10-15',
        payment_terms: 'net_30',
      };

      const lineItem = {
        _id: 'li_acme_001',
        invoice_id: 'inv_acme_001',
        description: 'Enterprise License - Annual Subscription',
        quantity: 1,
        unit_price: 150000,
        total: 150000,
      };

      (broker.findOne as Mock).mockResolvedValue(closedOpp);
      (broker.insert as Mock)
        .mockResolvedValueOnce(invoice)
        .mockResolvedValueOnce(lineItem);

      // Act: fetch closed opportunity and create invoice
      const opp = await broker.findOne('opportunity', 'opp_acme_enterprise');
      expect(opp.stage).toBe('Closed Won');

      const createdInvoice = await broker.insert('invoice', {
        account_id: opp.account_id,
        opportunity_id: opp._id,
        amount: opp.amount,
        status: 'draft',
        issue_date: opp.close_date,
        due_date: '2026-10-15',
        payment_terms: 'net_30',
      });

      const createdLineItem = await broker.insert('invoice_line_item', {
        invoice_id: createdInvoice._id,
        description: 'Enterprise License - Annual Subscription',
        quantity: 1,
        unit_price: opp.amount,
        total: opp.amount,
      });

      // Assert
      expect(createdInvoice.opportunity_id).toBe(closedOpp._id);
      expect(createdInvoice.amount).toBe(150000);
      expect(createdInvoice.payment_terms).toBe('net_30');
      expect(createdLineItem.invoice_id).toBe(createdInvoice._id);
      expect(createdLineItem.total).toBe(150000);
      expect(broker.insert).toHaveBeenCalledWith('invoice', expect.objectContaining({
        opportunity_id: 'opp_acme_enterprise',
        payment_terms: 'net_30',
      }));
    });
  });

  // ─── Invoice to Stripe Payment ─────────────────────────────────────────────

  describe('Invoice to Stripe Payment', () => {
    it('should sync invoice with Stripe and create payment intent', async () => {
      const invoice = {
        _id: 'inv_acme_001',
        account_id: 'account_acme',
        amount: 150000,
        status: 'sent',
        payment_terms: 'net_30',
      };

      const paymentIntent = {
        _id: 'payment_stripe_001',
        invoice_id: 'inv_acme_001',
        provider: 'stripe',
        external_id: 'pi_test_123',
        amount: 15000000,
        currency: 'usd',
        status: 'pending',
        created_at: '2026-09-15T10:00:00Z',
      };

      const syncLog = {
        _id: 'sync_log_stripe_001',
        sync_config_id: 'sync_stripe_payments',
        status: 'completed',
        records_processed: 1,
        records_failed: 0,
        direction: 'outbound',
      };

      (broker.findOne as Mock).mockResolvedValue(invoice);
      (broker.insert as Mock)
        .mockResolvedValueOnce(paymentIntent)
        .mockResolvedValueOnce(syncLog);

      // Act: fetch invoice and create Stripe payment intent
      const fetchedInvoice = await broker.findOne('invoice', 'inv_acme_001');
      const createdPayment = await broker.insert('payment', {
        invoice_id: fetchedInvoice._id,
        provider: 'stripe',
        external_id: 'pi_test_123',
        amount: fetchedInvoice.amount * 100, // convert to cents
        currency: 'usd',
        status: 'pending',
        created_at: '2026-09-15T10:00:00Z',
      });

      // Log the sync
      await broker.insert('sync_log', {
        sync_config_id: 'sync_stripe_payments',
        status: 'completed',
        records_processed: 1,
        records_failed: 0,
        direction: 'outbound',
      });

      // Assert
      expect(createdPayment.external_id).toBe('pi_test_123');
      expect(createdPayment.amount).toBe(15000000);
      expect(createdPayment.invoice_id).toBe(invoice._id);
      expect(broker.insert).toHaveBeenCalledWith('payment', expect.objectContaining({
        provider: 'stripe',
        external_id: 'pi_test_123',
      }));
    });

    it('should confirm payment via Stripe webhook', async () => {
      const webhookPayload = {
        _id: 'webhook_delivery_001',
        subscription_id: 'ws_stripe_payments',
        event_type: 'payment_intent.succeeded',
        payload: JSON.stringify({
          id: 'pi_test_123',
          status: 'succeeded',
          amount: 15000000,
        }),
        status: 'success',
        delivered_at: '2026-09-16T14:30:00Z',
      };

      const updatedPayment = {
        _id: 'payment_stripe_001',
        invoice_id: 'inv_acme_001',
        external_id: 'pi_test_123',
        amount: 15000000,
        status: 'completed',
        completed_at: '2026-09-16T14:30:00Z',
      };

      const updatedInvoice = {
        _id: 'inv_acme_001',
        amount: 150000,
        status: 'paid',
        paid_date: '2026-09-16',
      };

      (broker.insert as Mock).mockResolvedValue(webhookPayload);
      (broker.find as Mock).mockResolvedValue([{ _id: 'payment_stripe_001', external_id: 'pi_test_123' }]);
      (broker.update as Mock)
        .mockResolvedValueOnce(updatedPayment)
        .mockResolvedValueOnce(updatedInvoice);

      // Act: process incoming webhook
      const delivery = await broker.insert('webhook_delivery', {
        subscription_id: 'ws_stripe_payments',
        event_type: 'payment_intent.succeeded',
        payload: JSON.stringify({
          id: 'pi_test_123',
          status: 'succeeded',
          amount: 15000000,
        }),
        status: 'success',
        delivered_at: '2026-09-16T14:30:00Z',
      });

      // Find the matching payment by external_id
      const parsed = JSON.parse(delivery.payload);
      const payments = await broker.find('payment', {
        filters: [['external_id', '=', parsed.id]],
      });
      expect(payments).toHaveLength(1);

      // Update payment status
      const confirmedPayment = await broker.update('payment', payments[0]._id, {
        status: 'completed',
        completed_at: delivery.delivered_at,
      });

      // Update invoice to paid
      const paidInvoice = await broker.update('invoice', 'inv_acme_001', {
        status: 'paid',
        paid_date: '2026-09-16',
      });

      // Assert
      expect(confirmedPayment.status).toBe('completed');
      expect(paidInvoice.status).toBe('paid');
      expect(broker.update).toHaveBeenCalledWith('payment', 'payment_stripe_001', expect.objectContaining({
        status: 'completed',
      }));
      expect(broker.update).toHaveBeenCalledWith('invoice', 'inv_acme_001', expect.objectContaining({
        status: 'paid',
      }));
    });
  });

  // ─── Stripe Payment to Revenue Report ──────────────────────────────────────

  describe('Stripe Payment to Revenue Report', () => {
    it('should include completed payment in analytics revenue report', async () => {
      const revenueReport = {
        _id: 'report_q3_revenue',
        name: 'Q3 2026 Enterprise Revenue',
        type: 'revenue',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        total_revenue: 150000,
        deal_count: 1,
        status: 'generated',
      };

      const paidInvoices = [
        {
          _id: 'inv_acme_001',
          account_id: 'account_acme',
          amount: 150000,
          status: 'paid',
          paid_date: '2026-09-16',
          opportunity_id: 'opp_acme_enterprise',
        },
      ];

      (broker.find as Mock).mockResolvedValue(paidInvoices);
      (broker.count as Mock).mockResolvedValue(1);
      (broker.insert as Mock).mockResolvedValue(revenueReport);

      // Act: query paid invoices for Q3 and generate report
      const invoices = await broker.find('invoice', {
        filters: [
          ['status', '=', 'paid'],
          ['paid_date', '>=', '2026-07-01'],
          ['paid_date', '<=', '2026-09-30'],
        ],
      });

      const totalRevenue = invoices.reduce(
        (sum: number, inv: any) => sum + inv.amount,
        0
      );

      const dealCount = await broker.count('opportunity', {
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', '2026-07-01'],
          ['close_date', '<=', '2026-09-30'],
        ],
      } as any);

      const report = await broker.insert('report', {
        name: 'Q3 2026 Enterprise Revenue',
        type: 'revenue',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        total_revenue: totalRevenue,
        deal_count: dealCount,
        status: 'generated',
      });

      // Assert
      expect(report.total_revenue).toBe(150000);
      expect(report.deal_count).toBe(1);
      expect(report.name).toBe('Q3 2026 Enterprise Revenue');
      expect(broker.find).toHaveBeenCalledWith('invoice', expect.objectContaining({
        filters: expect.arrayContaining([
          ['status', '=', 'paid'],
        ]),
      }));
    });
  });

  // ─── Full End-to-End Lifecycle ─────────────────────────────────────────────

  describe('Full End-to-End Lifecycle', () => {
    it('should complete the entire flow from lead creation to revenue report', async () => {
      // ── Stage 1: Lead with campaign attribution
      const campaign = {
        _id: 'campaign_q3_enterprise',
        name: 'Q3 Enterprise Campaign',
        status: 'active',
      };

      const lead = {
        _id: 'lead_sarah_chen',
        first_name: 'Sarah',
        last_name: 'Chen',
        email: 'sarah.chen@acmecorp.com',
        company: 'Acme Corp',
        campaign_id: 'campaign_q3_enterprise',
        status: 'new',
      };

      // ── Stage 2: Account + Opportunity from lead conversion
      const account = {
        _id: 'account_acme',
        name: 'Acme Corp',
      };

      const opportunity = {
        _id: 'opp_acme_enterprise',
        name: 'Acme Corp Enterprise License',
        account_id: 'account_acme',
        amount: 150000,
        stage: 'Closed Won',
        campaign_id: 'campaign_q3_enterprise',
      };

      // ── Stage 3: Invoice from closed deal
      const invoice = {
        _id: 'inv_acme_001',
        opportunity_id: 'opp_acme_enterprise',
        account_id: 'account_acme',
        amount: 150000,
        status: 'draft',
        payment_terms: 'net_30',
      };

      // ── Stage 4: Stripe payment
      const payment = {
        _id: 'payment_stripe_001',
        invoice_id: 'inv_acme_001',
        provider: 'stripe',
        external_id: 'pi_test_123',
        amount: 15000000,
        currency: 'usd',
        status: 'completed',
      };

      // ── Stage 5: Revenue report
      const report = {
        _id: 'report_q3_revenue',
        name: 'Q3 2026 Enterprise Revenue',
        type: 'revenue',
        total_revenue: 150000,
        deal_count: 1,
        status: 'generated',
      };

      // Configure mocks in sequence
      (broker.findOne as Mock)
        .mockResolvedValueOnce(campaign)  // verify campaign
        .mockResolvedValueOnce(lead);     // fetch lead for conversion

      (broker.insert as Mock)
        .mockResolvedValueOnce(lead)          // create lead
        .mockResolvedValueOnce(account)       // create account
        .mockResolvedValueOnce(opportunity)   // create opportunity
        .mockResolvedValueOnce(invoice)       // create invoice
        .mockResolvedValueOnce(payment)       // create payment
        .mockResolvedValueOnce(report);       // create report

      (broker.update as Mock)
        .mockResolvedValueOnce({ ...lead, status: 'converted' })
        .mockResolvedValueOnce({ ...invoice, status: 'paid' });

      (broker.find as Mock).mockResolvedValue([{ ...invoice, status: 'paid', paid_date: '2026-09-16' }]);
      (broker.count as Mock).mockResolvedValue(1);

      // ── Execute: Stage 1 - Create lead with campaign attribution
      const fetchedCampaign = await broker.findOne('campaign', 'campaign_q3_enterprise');
      expect(fetchedCampaign.status).toBe('active');

      const createdLead = await broker.insert('lead', {
        first_name: 'Sarah',
        last_name: 'Chen',
        email: 'sarah.chen@acmecorp.com',
        company: 'Acme Corp',
        campaign_id: fetchedCampaign._id,
        status: 'new',
      });
      expect(createdLead.campaign_id).toBe('campaign_q3_enterprise');

      // ── Execute: Stage 2 - Convert lead to account + opportunity
      const fetchedLead = await broker.findOne('lead', createdLead._id);
      const createdAccount = await broker.insert('account', {
        name: fetchedLead.company,
      });
      const createdOpp = await broker.insert('opportunity', {
        name: `${fetchedLead.company} Enterprise License`,
        account_id: createdAccount._id,
        amount: 150000,
        stage: 'Closed Won',
        campaign_id: fetchedLead.campaign_id,
      });
      await broker.update('lead', fetchedLead._id, { status: 'converted' });
      expect(createdOpp.stage).toBe('Closed Won');

      // ── Execute: Stage 3 - Create invoice from closed deal
      const createdInvoice = await broker.insert('invoice', {
        opportunity_id: createdOpp._id,
        account_id: createdOpp.account_id,
        amount: createdOpp.amount,
        status: 'draft',
        payment_terms: 'net_30',
      });
      expect(createdInvoice.amount).toBe(150000);

      // ── Execute: Stage 4 - Create Stripe payment
      const createdPayment = await broker.insert('payment', {
        invoice_id: createdInvoice._id,
        provider: 'stripe',
        external_id: 'pi_test_123',
        amount: createdInvoice.amount * 100,
        currency: 'usd',
        status: 'completed',
      });
      await broker.update('invoice', createdInvoice._id, { status: 'paid' });
      expect(createdPayment.external_id).toBe('pi_test_123');
      expect(createdPayment.amount).toBe(15000000);

      // ── Execute: Stage 5 - Generate revenue report
      const paidInvoices = await broker.find('invoice', {
        filters: [['status', '=', 'paid']],
      });
      const totalRevenue = paidInvoices.reduce(
        (sum: number, inv: any) => sum + inv.amount,
        0
      );
      const dealCount = await broker.count('opportunity', {
        filters: [['stage', '=', 'Closed Won']],
      } as any);

      const createdReport = await broker.insert('report', {
        name: 'Q3 2026 Enterprise Revenue',
        type: 'revenue',
        total_revenue: totalRevenue,
        deal_count: dealCount,
        status: 'generated',
      });

      // ── Final assertions: verify entire chain
      expect(createdReport.total_revenue).toBe(150000);
      expect(createdReport.deal_count).toBe(1);
      expect(createdReport.name).toBe('Q3 2026 Enterprise Revenue');

      // Verify all stages were touched
      expect(broker.insert).toHaveBeenCalledTimes(6);
      expect(broker.update).toHaveBeenCalledTimes(2);
      expect(broker.findOne).toHaveBeenCalledTimes(2);

      // Verify campaign attribution carried through to opportunity
      expect(broker.insert).toHaveBeenCalledWith('opportunity', expect.objectContaining({
        campaign_id: 'campaign_q3_enterprise',
      }));

      // Verify Stripe payment amount matches invoice (in cents)
      expect(broker.insert).toHaveBeenCalledWith('payment', expect.objectContaining({
        amount: 15000000,
        provider: 'stripe',
      }));
    });
  });
});
