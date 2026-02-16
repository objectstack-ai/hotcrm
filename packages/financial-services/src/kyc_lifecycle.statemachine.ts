// State machine configuration for KYC lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * KYC Lifecycle State Machine
 * Manages the complete lifecycle of KYC verification from submission through verification to expiry and re-verification.
 */
export const KycLifecycleStateMachine = {
  name: 'kyc_lifecycle',
  label: 'KYC Lifecycle State Machine',
  object: 'kyc',
  description: 'Manages KYC states from initial submission through verification, expiry, and re-verification',

  initial: 'pending',

  states: [
    {
      name: 'pending',
      label: 'Pending',
      description: 'KYC application has been submitted and awaits review',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'pending' },
        { type: 'fieldUpdate', field: 'submitted_date', value: 'NOW()' },
        {
          type: 'emailAlert',
          template: 'kyc_submission_confirmation',
          recipients: ['${wealth_account.email}'],
        },
        {
          type: 'taskCreation',
          subject: 'Review KYC submission: ${wealth_account.client_name}',
          assignee: '${assigned_reviewer}',
          dueDate: 'TODAY() + 5',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'under_review',
          event: 'start_review',
          guard: 'assigned_reviewer != NULL',
          description: 'Compliance officer begins reviewing KYC documents',
          actions: [
            { type: 'fieldUpdate', field: 'review_start_date', value: 'NOW()' },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'KYC application rejected due to incomplete or invalid documents',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'under_review',
      label: 'Under Review',
      description: 'KYC documents are being reviewed by compliance',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'under_review' },
      ],
      transitions: [
        {
          to: 'verified',
          event: 'verify',
          guard: 'document_type != NULL AND risk_rating != NULL',
          description: 'KYC verification completed successfully',
          actions: [
            { type: 'fieldUpdate', field: 'verification_date', value: 'NOW()' },
            { type: 'fieldUpdate', field: 'verified_by', value: '${currentUser.id}' },
            {
              type: 'emailAlert',
              template: 'kyc_verified_notification',
              recipients: ['${wealth_account.email}', '${wealth_account.advisor_id.email}'],
            },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'KYC verification failed during review',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
        {
          to: 'pending',
          event: 'request_info',
          description: 'Additional information or documents required from client',
          actions: [
            {
              type: 'emailAlert',
              template: 'kyc_additional_info_request',
              recipients: ['${wealth_account.email}'],
            },
          ],
        },
      ],
    },
    {
      name: 'verified',
      label: 'Verified',
      description: 'KYC verification has been completed and approved',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'verified' },
      ],
      transitions: [
        {
          to: 'expired',
          event: 'expire',
          description: 'KYC verification has passed its expiry date',
          actions: [
            { type: 'fieldUpdate', field: 'expired_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'kyc_expiry_notification',
              recipients: ['${wealth_account.email}', '${wealth_account.advisor_id.email}'],
            },
          ],
        },
        {
          to: 're_verification',
          event: 'trigger_review',
          description: 'Triggered re-verification due to risk event or regulatory change',
        },
      ],
    },
    {
      name: 'expired',
      label: 'Expired',
      description: 'KYC verification has expired and requires renewal',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'expired' },
        {
          type: 'taskCreation',
          subject: 'KYC renewal required: ${wealth_account.client_name}',
          assignee: '${wealth_account.advisor_id}',
          dueDate: 'TODAY() + 30',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 're_verification',
          event: 'renew',
          description: 'Client initiates KYC renewal process',
        },
      ],
    },
    {
      name: 're_verification',
      label: 'Re-Verification',
      description: 'KYC is undergoing re-verification process',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 're_verification' },
        {
          type: 'taskCreation',
          subject: 'KYC re-verification: ${wealth_account.client_name}',
          assignee: '${assigned_reviewer}',
          dueDate: 'TODAY() + 10',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'verified',
          event: 'verify',
          guard: 'document_type != NULL AND risk_rating != NULL',
          description: 'Re-verification completed successfully',
          actions: [
            { type: 'fieldUpdate', field: 'verification_date', value: 'NOW()' },
            { type: 'fieldUpdate', field: 'verified_by', value: '${currentUser.id}' },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Re-verification failed',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'rejected',
      label: 'Rejected',
      description: 'KYC verification was rejected',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'rejected' },
        { type: 'fieldUpdate', field: 'rejected_date', value: 'NOW()' },
        {
          type: 'emailAlert',
          template: 'kyc_rejection_notification',
          recipients: ['${wealth_account.email}'],
        },
      ],
      transitions: [
        {
          to: 'pending',
          event: 'resubmit',
          guard: 'DAYS_BETWEEN(rejected_date, NOW()) <= 180',
          description: 'Client resubmits KYC with corrected documents',
        },
      ],
    },
  ],

  globalGuards: {
    hasAccount: 'wealth_account != NULL',
    isNotRejected: 'status != "rejected"',
  },

  events: {
    start_review: 'Begin compliance review of KYC documents',
    verify: 'Approve KYC verification',
    reject: 'Reject KYC application',
    request_info: 'Request additional information from client',
    expire: 'Mark KYC as expired',
    trigger_review: 'Trigger re-verification due to risk event',
    renew: 'Initiate KYC renewal process',
    resubmit: 'Resubmit rejected KYC application',
  },
};

// Spec-validated state machine definition
export const ValidatedKycLifecycleStateMachine = StateMachineSchema.parse({
  id: 'kyc_lifecycle',
  initial: 'pending',
  states: {
    pending: { type: 'atomic' },
    under_review: { type: 'atomic' },
    verified: { type: 'atomic' },
    expired: { type: 'atomic' },
    re_verification: { type: 'atomic' },
    rejected: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default KycLifecycleStateMachine;
