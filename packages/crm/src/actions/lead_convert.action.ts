import { db } from '../db';

/**
 * Lead Conversion Service
 * 
 * Handles the transactional conversion of a Lead into Account, Contact, and Opportunity.
 */
export const LeadConvertAction = {
  name: 'lead_convert',
  label: 'Convert Lead',
  description: 'Converts a qualified lead into a customer account, contact, and optional opportunity.',
  params: {
    lead_id: { type: 'text', required: true },
    owner_id: { type: 'text' },
    create_opportunity: { type: 'boolean', defaultValue: true },
    opportunity_name: { type: 'text' }
  },
  handler: async (ctx: any) => {
    const { lead_id, owner_id, create_opportunity, opportunity_name } = ctx.params;
    const { user } = ctx;
    
    // 1. Fetch Lead
    // Using simple find, in real db we might need query syntax
    const leads = await db.find('lead', { filters: [['_id', '=', lead_id]] });
    if (!leads || leads.length === 0) {
      throw new Error(`Lead not found: ${lead_id}`);
    }
    const lead = leads[0];

    if (lead.status === 'converted') {
      throw new Error('Lead is already converted.');
    }

    const owner = owner_id || lead.owner || user.id;

    // 2. Transact (Simulated Transaction)
    // In a real framework we would use `await db.transaction(async (trx) => { ... })`
    
    const result = {
      account_id: '',
      contact_id: '',
      opportunity_id: null as string | null
    };

    // A. Create Account
    const accountData = {
      name: lead.company,
      owner: owner,
      phone: lead.phone,
      website: lead.website,
      billing_address_city: lead.city,
      billing_address_country: lead.country
      // ... map other fields
    };
    const account = await db.insert('account', accountData);
    result.account_id = account._id;

    // B. Create Contact
    const contactData = {
      first_name: lead.first_name,
      last_name: lead.last_name,
      account: account._id, // Link to new Account
      email: lead.email,
      phone: lead.phone,
      mobile: lead.mobile,
      title: lead.title,
      owner: owner
    };
    const contact = await db.insert('contact', contactData);
    result.contact_id = contact._id;

    // C. Create Opportunity (Optional)
    if (create_opportunity) {
      const oppData = {
        name: opportunity_name || `${lead.company} - Deal`,
        account: account._id,
        primary_contact: contact._id, // Assuming such field exists or we link via role
        stage: 'prospecting',
        close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        amount: lead.annual_revenue ? lead.annual_revenue * 0.1 : 0, // Estimate value
        owner: owner,
        lead_source: lead.lead_source
      };
      const opp = await db.insert('opportunity', oppData);
      result.opportunity_id = opp._id;
    }

    // D. Update Lead
    await db.update('lead', lead_id, {
      status: 'converted',
      is_converted: true,
      converted_date: new Date().toISOString(),
      converted_account_id: result.account_id,
      converted_contact_id: result.contact_id,
      converted_opportunity_id: result.opportunity_id
    });


    console.log(`✅ Lead ${lead_id} converted successfully.`);
    return result;
  }
};

export default LeadConvertAction;
