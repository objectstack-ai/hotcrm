import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Offer Creation and Approval Workflow Trigger
 * 
 * Automatically handles:
 * 1. Offer number generation
 * 2. Approval workflow initiation
 * 3. Expiry date calculation
 * 4. Candidate status update
 */
const OfferCreationTrigger: Hook = {
  name: 'OfferCreationTrigger',
  object: 'offer',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const offer = ctx.input;

      // Generate offer number if not provided
      if (!offer.offer_number) {
        offer.offer_number = await generateOfferNumber(ctx);
      }

      // Set default expiry date if not provided (7 days from offer date)
      if (!offer.expiry_date && offer.offer_date) {
        const offerDate = new Date(offer.offer_date);
        const expiryDate = new Date(offerDate);
        expiryDate.setDate(expiryDate.getDate() + 7);
        offer.expiry_date = expiryDate.toISOString().split('T')[0];
      }

      // Set default status
      if (!offer.status) {
        offer.status = 'Draft';
      }

      console.log(`✨ Offer ${offer.offer_number} prepared for candidate ${offer.candidate_id}`);

    } catch (error) {
      console.error('❌ Error in OfferCreationTrigger:', error);
      throw error; // Prevent offer creation if there's an error
    }
  }
};

/**
 * Generate unique offer number
 */
async function generateOfferNumber(ctx: HookContext): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Find latest offer number for this year/month
  const latestOffers = await ctx.ql.find('offer', {
    filters: [
      ['offer_number', 'like', `OFF-${year}${month}%`]
    ],
    sort: 'offer_number desc',
    limit: 1
  });

  let sequence = 1;
  if (latestOffers && latestOffers.length > 0) {
    const lastNumber = latestOffers[0].offer_number;
    const lastSequence = parseInt(lastNumber.split('-')[2] || '0');
    sequence = lastSequence + 1;
  }

  return `OFF-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Offer Status Change Trigger
 * 
 * Handles automation when offer status changes
 */
const OfferStatusChangeTrigger: Hook = {
  name: 'OfferStatusChangeTrigger',
  object: 'offer',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed
      if (!ctx.previous || ctx.previous.status === ctx.input.status) {
        return;
      }

      const offer = ctx.input;
      const oldStatus = ctx.previous.status;
      const newStatus = offer.status;

      console.log(`🔄 Offer ${offer.offer_number} status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle different status transitions
      switch (newStatus) {
        case 'Sent':
          await handleOfferSent(offer, ctx);
          break;
        case 'Accepted':
          await handleOfferAccepted(offer, ctx);
          break;
        case 'Rejected':
          await handleOfferRejected(offer, ctx);
          break;
        case 'Expired':
          await handleOfferExpired(offer, ctx);
          break;
        case 'Withdrawn':
          await handleOfferWithdrawn(offer, ctx);
          break;
      }

      // Log status change
      await logOfferStatusChange(offer, oldStatus, newStatus, ctx);

    } catch (error) {
      console.error('❌ Error in OfferStatusChangeTrigger:', error);
    }
  }
};

/**
 * Handle offer sent
 */
async function handleOfferSent(offer: any, ctx: HookContext): Promise<void> {
  console.log(`📧 Offer ${offer.offer_number} sent to candidate`);
  
  try {
    // Update candidate status
    await ctx.ql.doc.update('candidate', offer.candidate_id, {
      status: 'Offer Sent'
    });

    // Update application status
    await ctx.ql.doc.update('application', offer.application_id, {
      status: 'Offer Sent'
    });

    // Set sent date if not already set
    if (!offer.sent_date) {
      await ctx.ql.doc.update('offer', offer.id, {
        sent_date: new Date().toISOString().split('T')[0]
      });
    }

    console.log(`✅ Candidate and application status updated for offer ${offer.offer_number}`);
    
    // TODO: Send offer email to candidate
    // TODO: Notify hiring manager
    // TODO: Schedule follow-up reminder

  } catch (error) {
    console.error('❌ Failed to process offer sent:', error);
  }
}

/**
 * Handle offer accepted
 */
async function handleOfferAccepted(offer: any, ctx: HookContext): Promise<void> {
  console.log(`🎉 Offer ${offer.offer_number} accepted by candidate`);
  
  try {
    // Update candidate status
    await ctx.ql.doc.update('candidate', offer.candidate_id, {
      status: 'Hired'
    });

    // Update application status
    await ctx.ql.doc.update('application', offer.application_id, {
      status: 'Hired'
    });

    // Set acceptance date if not already set
    if (!offer.acceptance_date) {
      await ctx.ql.doc.update('offer', offer.id, {
        acceptance_date: new Date().toISOString().split('T')[0]
      });
    }

    // Create employee record
    await createEmployeeFromOffer(offer, ctx);

    console.log(`✅ Employee record created from accepted offer ${offer.offer_number}`);
    
    // TODO: Send welcome email
    // TODO: Initiate background check if required
    // TODO: Create onboarding checklist

  } catch (error) {
    console.error('❌ Failed to process offer acceptance:', error);
  }
}

/**
 * Create employee record from accepted offer
 */
async function createEmployeeFromOffer(offer: any, ctx: HookContext): Promise<void> {
  try {
    // Fetch candidate details
    const candidate = await ctx.ql.doc.get('candidate', offer.candidate_id, {
      fields: ['first_name', 'last_name', 'email', 'mobile_phone', 'date_of_birth', 'gender']
    });

    if (!candidate) {
      throw new Error(`Candidate ${offer.candidate_id} not found`);
    }

    // Generate employee number
    const employeeNumber = await generateEmployeeNumber(ctx);

    // Create employee record
    const employee = await ctx.ql.doc.create('employee', {
      employee_number: employeeNumber,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      mobile_phone: candidate.mobile_phone,
      date_of_birth: candidate.date_of_birth,
      gender: candidate.gender,
      hire_date: offer.start_date,
      department_id: offer.department_id,
      position_id: offer.position_id,
      manager_id: offer.hiring_manager_id,
      employment_type: offer.employment_type,
      employment_status: 'Active',
      base_salary: offer.base_salary,
      salary_currency: offer.salary_currency || 'CNY'
    });

    // Link employee to offer
    await ctx.ql.doc.update('offer', offer.id, {
      employee_id: employee.id
    });

    console.log(`👤 Created employee ${employeeNumber} from offer ${offer.offer_number}`);

  } catch (error) {
    console.error('❌ Failed to create employee from offer:', error);
    throw error;
  }
}

/**
 * Generate unique employee number
 */
async function generateEmployeeNumber(ctx: HookContext): Promise<string> {
  const year = new Date().getFullYear();
  
  // Find latest employee number for this year
  const latestEmployees = await ctx.ql.find('employee', {
    filters: [
      ['employee_number', 'like', `EMP${year}%`]
    ],
    sort: 'employee_number desc',
    limit: 1
  });

  let sequence = 1;
  if (latestEmployees && latestEmployees.length > 0) {
    const lastNumber = latestEmployees[0].employee_number;
    const lastSequence = parseInt(lastNumber.substring(7)) || 0;
    sequence = lastSequence + 1;
  }

  return `EMP${year}${String(sequence).padStart(4, '0')}`;
}

/**
 * Handle offer rejected
 */
async function handleOfferRejected(offer: any, ctx: HookContext): Promise<void> {
  console.log(`❌ Offer ${offer.offer_number} rejected by candidate`);
  
  try {
    // Update candidate status
    await ctx.ql.doc.update('candidate', offer.candidate_id, {
      status: 'Offer Rejected'
    });

    // Update application status
    await ctx.ql.doc.update('application', offer.application_id, {
      status: 'Rejected'
    });

    // Set rejection date if not already set
    if (!offer.rejection_date) {
      await ctx.ql.doc.update('offer', offer.id, {
        rejection_date: new Date().toISOString().split('T')[0]
      });
    }

    // TODO: Notify hiring manager
    // TODO: Trigger recruitment to continue with other candidates
    // TODO: Analyze rejection reasons for improvement

  } catch (error) {
    console.error('❌ Failed to process offer rejection:', error);
  }
}

/**
 * Handle offer expired
 */
async function handleOfferExpired(offer: any, ctx: HookContext): Promise<void> {
  console.log(`⏰ Offer ${offer.offer_number} has expired`);
  
  try {
    // Update candidate status
    await ctx.ql.doc.update('candidate', offer.candidate_id, {
      status: 'Offer Expired'
    });

    // TODO: Notify hiring manager
    // TODO: Decide whether to extend or withdraw
    
  } catch (error) {
    console.error('❌ Failed to process offer expiry:', error);
  }
}

/**
 * Handle offer withdrawn
 */
async function handleOfferWithdrawn(offer: any, ctx: HookContext): Promise<void> {
  console.log(`🚫 Offer ${offer.offer_number} has been withdrawn`);
  
  try {
    // Update candidate status
    await ctx.ql.doc.update('candidate', offer.candidate_id, {
      status: 'Offer Withdrawn'
    });

    // TODO: Send notification to candidate (if appropriate)
    // TODO: Log withdrawal reason
    
  } catch (error) {
    console.error('❌ Failed to process offer withdrawal:', error);
  }
}

/**
 * Log offer status change
 */
async function logOfferStatusChange(
  offer: any,
  oldStatus: string,
  newStatus: string,
  ctx: HookContext
): Promise<void> {
  try {
    console.log(`📝 Logging offer status change: ${oldStatus} → ${newStatus} for offer ${offer.offer_number}`);
    
    // TODO: Create activity/audit log when available
  } catch (error) {
    console.error('❌ Failed to log offer status change:', error);
  }
}

/**
 * Offer Approval Workflow Trigger
 * 
 * Manages approval workflow for offers
 */
const OfferApprovalTrigger: Hook = {
  name: 'OfferApprovalTrigger',
  object: 'offer',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const offer = ctx.input;
      const previousOffer = ctx.previous;

      // Check if approval status changed
      if (!previousOffer || previousOffer.approval_status === offer.approval_status) {
        return;
      }

      console.log(`📋 Offer ${offer.offer_number} approval status changed to ${offer.approval_status}`);

      // Handle approval
      if (offer.approval_status === 'Approved' && previousOffer.approval_status !== 'Approved') {
        // Auto-change status to Ready to Send if still in Draft
        if (offer.status === 'Draft') {
          offer.status = 'Approved';
        }
        
        offer.approved_date = new Date().toISOString().split('T')[0];
        offer.approved_by = ctx.session?.userId;
        
        console.log(`✅ Offer ${offer.offer_number} approved by ${ctx.session?.userId}`);
      }

      // Handle rejection
      if (offer.approval_status === 'Rejected') {
        offer.status = 'Draft'; // Send back to draft
        console.log(`❌ Offer ${offer.offer_number} rejected in approval`);
      }

    } catch (error) {
      console.error('❌ Error in OfferApprovalTrigger:', error);
    }
  }
};

export { 
  OfferCreationTrigger, 
  OfferStatusChangeTrigger,
  OfferApprovalTrigger 
};

export default [
  OfferCreationTrigger,
  OfferStatusChangeTrigger,
  OfferApprovalTrigger
];
