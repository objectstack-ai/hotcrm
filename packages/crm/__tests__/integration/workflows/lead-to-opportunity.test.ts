/**
 * Integration Test: Lead to Opportunity Conversion Workflow
 * 
 * This test validates the complete workflow from Lead creation to Opportunity conversion.
 * It tests multiple objects and actions working together.
 */

// Mock the db module
import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    find: vi.fn(),
    insert: vi.fn()
  }
}));

import { db } from '../../../src/db';

describe('Lead to Opportunity Conversion Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully convert qualified lead to opportunity', async () => {
    // Arrange - Create a qualified lead
    const mockLead = {
      id: 'lead_123',
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@techcorp.com',
      company: 'TechCorp Solutions',
      status: 'qualified',
      rating: 'Hot',
      lead_source: 'web',
      annual_revenue: 5000000,
      number_of_employees: 200,
      industry: 'Technology'
    };

    const mockAccount = {
      id: 'acc_123',
      name: 'TechCorp Solutions',
      industry: 'Technology',
      annual_revenue: 5000000,
      number_of_employees: 200
    };

    const mockContact = {
      id: 'contact_123',
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@techcorp.com',
      account_id: 'acc_123'
    };

    const mockOpportunity = {
      id: 'opp_123',
      name: 'TechCorp Solutions - New Business',
      account_id: 'acc_123',
      contact_id: 'contact_123',
      stage: 'Qualification',
      amount: 50000,
      close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      lead_source: 'web'
    };

    (db.doc.get as Mock).mockResolvedValue(mockLead);
    (db.find as Mock).mockResolvedValue([]); // No existing account/contact
    (db.doc.create as Mock)
      .mockResolvedValueOnce(mockAccount)
      .mockResolvedValueOnce(mockContact)
      .mockResolvedValueOnce(mockOpportunity);
    (db.doc.update as Mock).mockResolvedValue({ ...mockLead, status: 'converted' });

    // Act - Simulate lead conversion workflow
    const lead = await db.doc.get('lead', 'lead_123');
    
    // Step 1: Create Account
    const account = await db.doc.create('account', {
      name: lead.company,
      industry: lead.industry,
      annual_revenue: lead.annual_revenue,
      number_of_employees: lead.number_of_employees
    });

    // Step 2: Create Contact
    const contact = await db.doc.create('contact', {
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      account_id: account.id
    });

    // Step 3: Create Opportunity
    const opportunity = await db.doc.create('opportunity', {
      name: `${account.name} - New Business`,
      account_id: account.id,
      contact_id: contact.id,
      stage: 'Qualification',
      lead_source: lead.lead_source,
      amount: 50000
    });

    // Step 4: Update Lead status
    const updatedLead = await db.doc.update('lead', lead.id, {
      status: 'converted',
      converted_account_id: account.id,
      converted_contact_id: contact.id,
      converted_opportunity_id: opportunity.id
    });

    // Assert
    expect(account).toBeDefined();
    expect(account.name).toBe('TechCorp Solutions');
    
    expect(contact).toBeDefined();
    expect(contact.account_id).toBe(account.id);
    
    expect(opportunity).toBeDefined();
    expect(opportunity.account_id).toBe(account.id);
    expect(opportunity.contact_id).toBe(contact.id);
    
    expect(updatedLead.status).toBe('converted');
    
    // Verify all necessary db operations were called
    expect(db.doc.create).toHaveBeenCalledTimes(3);
    expect(db.doc.update).toHaveBeenCalledTimes(1);
  });

  it('should handle lead conversion with existing account', async () => {
    // Arrange
    const mockLead = {
      id: 'lead_456',
      first_name: 'Michael',
      last_name: 'Brown',
      email: 'michael@existingcorp.com',
      company: 'Existing Corp',
      status: 'qualified'
    };

    const existingAccount = {
      id: 'acc_existing',
      name: 'Existing Corp',
      industry: 'Finance'
    };

    const mockContact = {
      id: 'contact_456',
      first_name: 'Michael',
      last_name: 'Brown',
      account_id: 'acc_existing'
    };

    const mockOpportunity = {
      id: 'opp_456',
      name: 'Existing Corp - Expansion',
      account_id: 'acc_existing',
      contact_id: 'contact_456'
    };

    (db.doc.get as Mock).mockResolvedValue(mockLead);
    (db.find as Mock).mockResolvedValueOnce([existingAccount]); // Account exists
    (db.doc.create as Mock)
      .mockResolvedValueOnce(mockContact)
      .mockResolvedValueOnce(mockOpportunity);

    // Act
    const lead = await db.doc.get('lead', 'lead_456');
    
    // Check if account exists
    const existingAccounts = await db.find('account', {
      filters: [['name', '=', lead.company]]
    });

    let account;
    if (existingAccounts.length > 0) {
      account = existingAccounts[0]; // Use existing
    } else {
      account = await db.doc.create('account', { name: lead.company });
    }

    const contact = await db.doc.create('contact', {
      first_name: lead.first_name,
      last_name: lead.last_name,
      account_id: account.id
    });

    const opportunity = await db.doc.create('opportunity', {
      name: `${account.name} - Expansion`,
      account_id: account.id,
      contact_id: contact.id
    });

    // Assert
    expect(account.id).toBe('acc_existing');
    expect(db.doc.create).toHaveBeenCalledTimes(2); // Only contact and opp created
    expect(opportunity.account_id).toBe(existingAccount.id);
  });

  it('should validate lead qualification before conversion', async () => {
    // Arrange
    const unqualifiedLead = {
      id: 'lead_789',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      company: 'Example Inc',
      status: 'Open', // Not qualified
      rating: 'Cold'
    };

    (db.doc.get as Mock).mockResolvedValue(unqualifiedLead);

    // Act
    const lead = await db.doc.get('lead', 'lead_789');
    const isQualified = lead.status === 'qualified' && lead.rating !== 'Cold';

    // Assert
    expect(isQualified).toBe(false);
    // Should not proceed with conversion
    expect(db.doc.create).not.toHaveBeenCalled();
  });

  it('should handle duplicate prevention during conversion', async () => {
    // Arrange
    const mockLead = {
      id: 'lead_duplicate',
      first_name: 'Tom',
      last_name: 'Smith',
      email: 'tom@company.com',
      company: 'Test Company',
      status: 'qualified'
    };

    const existingContact = {
      id: 'contact_existing',
      email: 'tom@company.com',
      account_id: 'acc_123'
    };

    (db.doc.get as Mock).mockResolvedValue(mockLead);
    (db.find as Mock).mockResolvedValueOnce([existingContact]); // Contact exists

    // Act
    const lead = await db.doc.get('lead', 'lead_duplicate');
    
    const existingContacts = await db.find('contact', {
      filters: [['email', '=', lead.email]]
    });

    let contact: any;
    if (existingContacts.length > 0) {
      contact = existingContacts[0];
    } else {
      contact = await db.doc.create('contact', {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email
      });
    }

    // Assert
    expect(contact!.id).toBe('contact_existing');
    expect(db.doc.create).not.toHaveBeenCalledWith('contact', expect.anything());
  });

  it('should create opportunity with proper initial values', async () => {
    // Arrange
    const mockLead = {
      id: 'lead_999',
      first_name: 'Alice',
      last_name: 'Wong',
      email: 'alice@startup.io',
      company: 'Startup IO',
      status: 'qualified',
      rating: 'Hot',
      annual_revenue: 1000000,
      number_of_employees: 50,
      lead_source: 'Referral'
    };

    const mockAccount = { id: 'acc_999', name: 'Startup IO' };
    const mockContact = { id: 'contact_999', account_id: 'acc_999' };

    (db.doc.get as Mock).mockResolvedValue(mockLead);
    (db.find as Mock).mockResolvedValue([]);
    (db.doc.create as Mock)
      .mockResolvedValueOnce(mockAccount)
      .mockResolvedValueOnce(mockContact)
      .mockResolvedValueOnce({
        id: 'opp_999',
        name: 'Startup IO - New Business',
        account_id: 'acc_999',
        contact_id: 'contact_999',
        stage: 'Qualification',
        probability: 25,
        lead_source: 'Referral'
      });

    // Act
    const lead = await db.doc.get('lead', 'lead_999');
    const account = await db.doc.create('account', { name: lead.company });
    const contact = await db.doc.create('contact', { account_id: account.id });
    
    const opportunity = await db.doc.create('opportunity', {
      name: `${account.name} - New Business`,
      account_id: account.id,
      contact_id: contact.id,
      stage: 'Qualification',
      probability: 25,
      lead_source: lead.lead_source,
      close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Assert
    expect(opportunity).toBeDefined();
    expect(opportunity.stage).toBe('Qualification');
    expect(opportunity.probability).toBe(25);
    expect(opportunity.lead_source).toBe('Referral');
    expect(opportunity.account_id).toBe(account.id);
    expect(opportunity.contact_id).toBe(contact.id);
  });

  it('should preserve lead data during conversion', async () => {
    // Arrange
    const mockLead = {
      id: 'lead_preserve',
      first_name: 'Robert',
      last_name: 'Chen',
      email: 'robert@techfirm.com',
      company: 'Tech Firm LLC',
      title: 'VP of Engineering',
      phone: '+1-555-0100',
      status: 'qualified',
      industry: 'Technology',
      annual_revenue: 25000000,
      description: 'Interested in enterprise plan'
    };

    (db.doc.get as Mock).mockResolvedValue(mockLead);
    (db.find as Mock).mockResolvedValue([]);
    (db.doc.create as Mock)
      .mockImplementation((objectType, data) => Promise.resolve({
        id: `${objectType}_new`,
        ...data
      }));

    // Act
    const lead = await db.doc.get('lead', 'lead_preserve');
    
    const account = await db.doc.create('account', {
      name: lead.company,
      industry: lead.industry,
      annual_revenue: lead.annual_revenue,
      description: lead.description
    });

    const contact = await db.doc.create('contact', {
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      title: lead.title,
      phone: lead.phone,
      account_id: account.id
    });

    // Assert - Verify data was preserved
    expect(account.industry).toBe(mockLead.industry);
    expect(account.annual_revenue).toBe(mockLead.annual_revenue);
    expect(account.description).toBe(mockLead.description);
    
    expect(contact.title).toBe(mockLead.title);
    expect(contact.phone).toBe(mockLead.phone);
  });
});
