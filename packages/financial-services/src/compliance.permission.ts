import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'wealth_account', 'portfolio', 'kyc', 'advisory',
  'transaction_record', 'compliance_check', 'financial_product'
] as const;

const fullAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: true,
  viewAllRecords: true,
  modifyAllRecords: true
};

const advisorAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

const complianceAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: false,
  viewAllRecords: true,
  modifyAllRecords: false
};

const readOnlyAccess = {
  allowCreate: false,
  allowRead: true,
  allowEdit: false,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

/**
 * Financial Services permission sets.
 * Enforces regulatory compliance and data access controls for wealth management.
 */

export const FinancialServicesAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'financial_services_admin',
  label: 'Financial Services Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'wealth_account.total_aum': { readable: true, editable: true },
    'wealth_account.tax_id': { readable: true, editable: true },
    'kyc.risk_rating': { readable: true, editable: true },
    'transaction_record.amount': { readable: true, editable: true }
  },
  systemPermissions: ['manage_financial_settings', 'view_audit_logs', 'manage_compliance']
});

export const WealthAdvisor: PermissionSet = PermissionSetSchema.parse({
  name: 'wealth_advisor',
  label: 'Wealth Advisor',
  isProfile: false,
  objects: {
    wealth_account: advisorAccess,
    portfolio: advisorAccess,
    kyc: readOnlyAccess,
    advisory: { ...advisorAccess, allowCreate: true },
    transaction_record: { ...advisorAccess, allowCreate: true },
    compliance_check: readOnlyAccess,
    financial_product: readOnlyAccess
  },
  fields: {
    'wealth_account.total_aum': { readable: true, editable: false },
    'wealth_account.tax_id': { readable: false, editable: false },
    'kyc.risk_rating': { readable: true, editable: false },
    'transaction_record.amount': { readable: true, editable: true }
  }
});

export const ComplianceOfficer: PermissionSet = PermissionSetSchema.parse({
  name: 'compliance_officer',
  label: 'Compliance Officer',
  isProfile: false,
  objects: {
    wealth_account: { ...complianceAccess, allowCreate: false },
    portfolio: { ...complianceAccess, allowCreate: false },
    kyc: complianceAccess,
    advisory: readOnlyAccess,
    transaction_record: { ...complianceAccess, allowCreate: false },
    compliance_check: complianceAccess,
    financial_product: readOnlyAccess
  },
  fields: {
    'wealth_account.total_aum': { readable: true, editable: false },
    'wealth_account.tax_id': { readable: true, editable: false },
    'kyc.risk_rating': { readable: true, editable: true },
    'transaction_record.amount': { readable: true, editable: false }
  },
  systemPermissions: ['view_audit_logs', 'manage_kyc', 'run_compliance_reports']
});

export const FinancialServicesReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'financial_services_read_only',
  label: 'Financial Services Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess])),
  fields: {
    'wealth_account.total_aum': { readable: true, editable: false },
    'wealth_account.tax_id': { readable: false, editable: false },
    'kyc.risk_rating': { readable: false, editable: false },
    'transaction_record.amount': { readable: false, editable: false }
  }
});
