import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:offer');

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
      const offer = ctx.input.doc as Record<string, any>;

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
        offer.status = 'draft';
      }

      logger.info(`Offer ${offer.offer_number} prepared for candidate ${offer.candidate_id}`);

    } catch (error) {
      logger.error('Error in OfferCreationTrigger:', error);
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
  const latestOffers = await (ctx.ql as any).find('offer', {
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
      if (!ctx.previous || (ctx.previous as Record<string, any>).status === (ctx.result as Record<string, any>).status) {
        return;
      }

      const offer = ctx.result as Record<string, any>;
      const oldStatus = (ctx.previous as Record<string, any>).status;
      const newStatus = offer.status;

      logger.info(`Offer ${offer.offer_number} status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle different status transitions
      switch (newStatus) {
        case 'sent':
          await handleOfferSent(offer, ctx);
          break;
        case 'accepted':
          await handleOfferAccepted(offer, ctx);
          break;
        case 'rejected':
          await handleOfferRejected(offer, ctx);
          break;
        case 'expired':
          await handleOfferExpired(offer, ctx);
          break;
        case 'Withdrawn':
          await handleOfferWithdrawn(offer, ctx);
          break;
      }

      // Log status change
      await logOfferStatusChange(offer, oldStatus, newStatus, ctx);

    } catch (error) {
      logger.error('Error in OfferStatusChangeTrigger:', error);
    }
  }
};

/**
 * Handle offer sent
 */
async function handleOfferSent(offer: Record<string, any>, ctx: HookContext): Promise<void> {
  logger.info(`Offer ${offer.offer_number} sent to candidate`);
  
  try {
    // Update candidate status
    await (ctx.ql as any).doc.update('candidate', offer.candidate_id, {
      status: 'Offer Sent'
    });

    // Update application status
    await (ctx.ql as any).doc.update('application', offer.application_id, {
      status: 'Offer Sent'
    });

    // Set sent date if not already set
    if (!offer.sent_date) {
      await (ctx.ql as any).doc.update('offer', offer.id, {
        sent_date: new Date().toISOString().split('T')[0]
      });
    }

    logger.info(`Candidate and application status updated for offer ${offer.offer_number}`);
    
    logger.debug(`[offer.hook] Offer sent pending for ${offer.offer_number}: send offer email to candidate, notify hiring manager, and schedule follow-up reminder`);

  } catch (error) {
    logger.error('Failed to process offer sent:', error);
  }
}

/**
 * Handle offer accepted
 */
async function handleOfferAccepted(offer: Record<string, any>, ctx: HookContext): Promise<void> {
  logger.info(`Offer ${offer.offer_number} accepted by candidate`);
  
  try {
    // Update candidate status
    await (ctx.ql as any).doc.update('candidate', offer.candidate_id, {
      status: 'hired'
    });

    // Update application status
    await (ctx.ql as any).doc.update('application', offer.application_id, {
      status: 'hired'
    });

    // Set acceptance date if not already set
    if (!offer.acceptance_date) {
      await (ctx.ql as any).doc.update('offer', offer.id, {
        acceptance_date: new Date().toISOString().split('T')[0]
      });
    }

    // Create employee record
    await createEmployeeFromOffer(offer, ctx);

    logger.info(`Employee record created from accepted offer ${offer.offer_number}`);
    
    logger.debug(`[offer.hook] Offer acceptance pending for ${offer.offer_number}: send welcome email, initiate background check, and create onboarding checklist`);

  } catch (error) {
    logger.error('Failed to process offer acceptance:', error);
  }
}

/**
 * Create employee record from accepted offer
 */
async function createEmployeeFromOffer(offer: Record<string, any>, ctx: HookContext): Promise<void> {
  try {
    // Fetch candidate details
    const candidate = await (ctx.ql as any).doc.get('candidate', offer.candidate_id, {
      fields: ['first_name', 'last_name', 'email', 'mobile_phone', 'date_of_birth', 'gender']
    });

    if (!candidate) {
      throw new Error(`Candidate ${offer.candidate_id} not found`);
    }

    // Generate employee number
    const employeeNumber = await generateEmployeeNumber(ctx);

    // Create employee record
    const employee = await (ctx.ql as any).doc.create('employee', {
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
      employment_status: 'active',
      base_salary: offer.base_salary,
      salary_currency: offer.salary_currency || 'CNY'
    });

    // Link employee to offer
    await (ctx.ql as any).doc.update('offer', offer.id, {
      employee_id: employee.id
    });

    logger.info(`Created employee ${employeeNumber} from offer ${offer.offer_number}`);

  } catch (error) {
    logger.error('Failed to create employee from offer:', error);
    throw error;
  }
}

/**
 * Generate unique employee number
 */
async function generateEmployeeNumber(ctx: HookContext): Promise<string> {
  const year = new Date().getFullYear();
  
  // Find latest employee number for this year
  const latestEmployees = await (ctx.ql as any).find('employee', {
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
async function handleOfferRejected(offer: Record<string, any>, ctx: HookContext): Promise<void> {
  logger.info(`Offer ${offer.offer_number} rejected by candidate`);
  
  try {
    // Update candidate status
    await (ctx.ql as any).doc.update('candidate', offer.candidate_id, {
      status: 'Offer Rejected'
    });

    // Update application status
    await (ctx.ql as any).doc.update('application', offer.application_id, {
      status: 'rejected'
    });

    // Set rejection date if not already set
    if (!offer.rejection_date) {
      await (ctx.ql as any).doc.update('offer', offer.id, {
        rejection_date: new Date().toISOString().split('T')[0]
      });
    }

    logger.debug(`[offer.hook] Offer rejection pending for ${offer.offer_number}: notify hiring manager, continue with other candidates, and analyze rejection reasons`);

  } catch (error) {
    logger.error('Failed to process offer rejection:', error);
  }
}

/**
 * Handle offer expired
 */
async function handleOfferExpired(offer: Record<string, any>, ctx: HookContext): Promise<void> {
  logger.info(`⏰ Offer ${offer.offer_number} has expired`);
  
  try {
    // Update candidate status
    await (ctx.ql as any).doc.update('candidate', offer.candidate_id, {
      status: 'Offer Expired'
    });

    logger.debug(`[offer.hook] Offer expiry pending for ${offer.offer_number}: notify hiring manager and decide whether to extend or withdraw`);
    
  } catch (error) {
    logger.error('Failed to process offer expiry:', error);
  }
}

/**
 * Handle offer withdrawn
 */
async function handleOfferWithdrawn(offer: Record<string, any>, ctx: HookContext): Promise<void> {
  logger.info(`Offer ${offer.offer_number} has been withdrawn`);
  
  try {
    // Update candidate status
    await (ctx.ql as any).doc.update('candidate', offer.candidate_id, {
      status: 'Offer Withdrawn'
    });

    logger.debug(`[offer.hook] Offer withdrawal pending for ${offer.offer_number}: send notification to candidate and log withdrawal reason`);
    
  } catch (error) {
    logger.error('Failed to process offer withdrawal:', error);
  }
}

/**
 * Log offer status change
 */
async function logOfferStatusChange(
  offer: Record<string, any>,
  oldStatus: string,
  newStatus: string,
  ctx: HookContext
): Promise<void> {
  try {
    logger.info(`Logging offer status change: ${oldStatus} → ${newStatus} for offer ${offer.offer_number}`);
    
    logger.debug(`[offer.hook] Audit log pending: record status change ${oldStatus} → ${newStatus} for offer ${offer.offer_number}`);
  } catch (error) {
    logger.error('Failed to log offer status change:', error);
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
      const offer = ctx.input.doc as Record<string, any>;
      const previousOffer = ctx.previous as Record<string, any> | undefined;

      // Check if approval status changed
      if (!previousOffer || previousOffer.approval_status === offer.approval_status) {
        return;
      }

      logger.info(`Offer ${offer.offer_number} approval status changed to ${offer.approval_status}`);

      // Handle approval
      if (offer.approval_status === 'approved' && previousOffer.approval_status !== 'approved') {
        // Auto-change status to Ready to Send if still in Draft
        if (offer.status === 'draft') {
          offer.status = 'approved';
        }
        
        offer.approved_date = new Date().toISOString().split('T')[0];
        offer.approved_by = ctx.session?.userId;
        
        logger.info(`Offer ${offer.offer_number} approved by ${ctx.session?.userId}`);
      }

      // Handle rejection
      if (offer.approval_status === 'rejected') {
        offer.status = 'draft'; // Send back to draft
        logger.info(`Offer ${offer.offer_number} rejected in approval`);
      }

    } catch (error) {
      logger.error('Error in OfferApprovalTrigger:', error);
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
] as Hook[];
