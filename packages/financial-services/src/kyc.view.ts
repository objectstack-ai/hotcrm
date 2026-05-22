import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * KYC Status List Views
 * Views for monitoring KYC verification status and compliance.
 */

// All KYC Records View
export const AllKycView = {
  list: {
    type: 'grid' as const,
    name: 'all_kyc',
    label: 'All KYC Records',
    columns: [
      { field: 'wealth_account', width: 200, sortable: true, link: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'risk_rating', width: 120, sortable: true },
      { field: 'verification_date', width: 140, sortable: true },
      { field: 'expiry_date', width: 140, sortable: true },
      { field: 'verified_by', width: 150 },
      { field: 'document_type', width: 130 }
    ],
    sort: [{ field: 'verification_date', order: 'desc' as const }],
    bulkActions: ['export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// Pending Verification View
export const PendingVerificationView = {
  list: {
    type: 'grid' as const,
    name: 'pending_kyc',
    label: 'Pending Verification',
    filter: [{ field: 'status', operator: '=', value: 'pending' }],
    columns: [
      { field: 'wealth_account', width: 200, link: true },
      { field: 'risk_rating', width: 120 },
      { field: 'submitted_date', width: 140 },
      { field: 'document_type', width: 130 },
      { field: 'assigned_reviewer', width: 150 }
    ],
    sort: [{ field: 'submitted_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'submitted_date < LAST_30_DAYS' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

// Expired KYC View
export const ExpiredKycView = {
  list: {
    type: 'grid' as const,
    name: 'expired_kyc',
    label: 'Expired',
    filter: [{ field: 'status', operator: '=', value: 'expired' }],
    columns: [
      { field: 'wealth_account', width: 200, link: true },
      { field: 'expiry_date', width: 140 },
      { field: 'risk_rating', width: 120 },
      { field: 'verified_by', width: 150 },
      { field: 'last_review_date', width: 140 }
    ],
    sort: [{ field: 'expiry_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'status == "expired"' }, style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } }
    ]
  }
} satisfies View;

// High Risk KYC View
export const HighRiskKycView = {
  list: {
    type: 'grid' as const,
    name: 'high_risk_kyc',
    label: 'High Risk',
    filter: [{ field: 'risk_rating', operator: '=', value: 'high' }],
    columns: [
      { field: 'wealth_account', width: 200, link: true },
      { field: 'status', width: 120 },
      { field: 'risk_rating', width: 120 },
      { field: 'verification_date', width: 140 },
      { field: 'expiry_date', width: 140 },
      { field: 'notes', width: 200 }
    ],
    sort: [{ field: 'verification_date', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'risk_rating == "high"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllKycView);
ViewSchema.parse(PendingVerificationView);
ViewSchema.parse(ExpiredKycView);
ViewSchema.parse(HighRiskKycView);

export const KycListViews = {
  all: AllKycView,
  pending: PendingVerificationView,
  expired: ExpiredKycView,
  highRisk: HighRiskKycView
};

export default KycListViews;
