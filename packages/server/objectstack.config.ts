/**
 * ObjectStack Configuration for HotCRM
 * 
 * This configuration file defines the ObjectStack kernel setup for HotCRM.
 * It loads all business objects from the various packages and configures
 * the runtime with necessary plugins.
 */

// Import object definitions only
import Account from '@hotcrm/crm/dist/account.object.js';
import Activity from '@hotcrm/crm/dist/activity.object.js';
import Contact from '@hotcrm/crm/dist/contact.object.js';
import Lead from '@hotcrm/crm/dist/lead.object.js';
import Opportunity from '@hotcrm/crm/dist/opportunity.object.js';
import CampaignMember from '@hotcrm/crm/dist/campaign_member.object.js';
import Task from '@hotcrm/crm/dist/task.object.js';
import Note from '@hotcrm/crm/dist/note.object.js';
import EmailTemplate from '@hotcrm/crm/dist/email_template.object.js';
import LandingPage from '@hotcrm/crm/dist/landing_page.object.js';
import Form from '@hotcrm/crm/dist/form.object.js';
import MarketingList from '@hotcrm/crm/dist/marketing_list.object.js';
import Unsubscribe from '@hotcrm/crm/dist/unsubscribe.object.js';

// Products objects
import Quote from '@hotcrm/products/dist/quote.object.js';
import QuoteLineItem from '@hotcrm/products/dist/quote_line_item.object.js';
import ProductBundle from '@hotcrm/products/dist/product_bundle.object.js';
import PriceRule from '@hotcrm/products/dist/price_rule.object.js';
import ApprovalRequest from '@hotcrm/products/dist/approval_request.object.js';
import DiscountSchedule from '@hotcrm/products/dist/discount_schedule.object.js';

// Finance objects
import Contract from '@hotcrm/finance/dist/contract.object.js';

/**
 * Collect all objects
 */
const allObjects = {
  // CRM Objects
  account: Account,
  activity: Activity,
  contact: Contact,
  lead: Lead,
  opportunity: Opportunity,
  campaign_member: CampaignMember,
  task: Task,
  note: Note,
  email_template: EmailTemplate,
  landing_page: LandingPage,
  form: Form,
  marketing_list: MarketingList,
  unsubscribe: Unsubscribe,
  
  // Products Objects
  quote: Quote,
  quote_line_item: QuoteLineItem,
  product_bundle: ProductBundle,
  price_rule: PriceRule,
  approval_request: ApprovalRequest,
  discount_schedule: DiscountSchedule,
  
  // Finance Objects
  contract: Contract,
};

console.log(`[Config] Loaded ${Object.keys(allObjects).length} objects:`, Object.keys(allObjects).join(', '));

/**
 * ObjectStack Configuration
 */
export default {
  // Metadata configuration
  metadata: {
    name: 'HotCRM',
    version: '1.0.0',
    description: 'Enterprise-level CRM system built on @objectstack/spec v0.7.2'
  },

  // Business objects
  objects: allObjects,

  // Plugins configuration  
  // Note: Due to ESM compatibility issues with @objectstack/driver-memory@0.7.2,
  // plugins will be loaded programmatically if needed
  plugins: []
};
