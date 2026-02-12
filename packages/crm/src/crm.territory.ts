import { TerritoryModelSchema, TerritorySchema } from '@objectstack/spec/security';
import type { TerritoryModel, Territory } from '@objectstack/spec/security';

export const SalesTerritoryModel: TerritoryModel = TerritoryModelSchema.parse({
  name: 'sales_territories',
  state: 'planning'
});

// Top-level regions
export const NorthAmerica: Territory = TerritorySchema.parse({
  name: 'north_america',
  label: 'North America',
  modelId: 'sales_territories',
  type: 'geography',
  assignmentRule: "billing_country IN ('US', 'CA', 'MX')",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

export const EMEA: Territory = TerritorySchema.parse({
  name: 'emea',
  label: 'EMEA',
  modelId: 'sales_territories',
  type: 'geography',
  assignmentRule: "billing_region = 'EMEA'",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

export const APAC: Territory = TerritorySchema.parse({
  name: 'apac',
  label: 'APAC',
  modelId: 'sales_territories',
  type: 'geography',
  assignmentRule: "billing_region = 'APAC'",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

// North America sub-territories
export const USEast: Territory = TerritorySchema.parse({
  name: 'us_east',
  label: 'US East',
  modelId: 'sales_territories',
  parent: 'north_america',
  type: 'geography',
  assignmentRule: "billing_country = 'US' AND billing_state IN ('NY', 'MA', 'FL', 'GA', 'VA', 'NC', 'PA', 'NJ', 'CT', 'MD')",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

export const USWest: Territory = TerritorySchema.parse({
  name: 'us_west',
  label: 'US West',
  modelId: 'sales_territories',
  parent: 'north_america',
  type: 'geography',
  assignmentRule: "billing_country = 'US' AND billing_state IN ('CA', 'WA', 'OR', 'NV', 'AZ', 'CO', 'UT', 'HI')",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

export const Canada: Territory = TerritorySchema.parse({
  name: 'canada',
  label: 'Canada',
  modelId: 'sales_territories',
  parent: 'north_america',
  type: 'geography',
  assignmentRule: "billing_country = 'CA'",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

// EMEA sub-territories
export const WesternEurope: Territory = TerritorySchema.parse({
  name: 'western_europe',
  label: 'Western Europe',
  modelId: 'sales_territories',
  parent: 'emea',
  type: 'geography',
  assignmentRule: "billing_country IN ('GB', 'FR', 'DE', 'NL', 'BE', 'ES', 'IT', 'PT')",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

export const MiddleEastAfrica: Territory = TerritorySchema.parse({
  name: 'middle_east_africa',
  label: 'Middle East & Africa',
  modelId: 'sales_territories',
  parent: 'emea',
  type: 'geography',
  assignmentRule: "billing_region = 'MEA'",
  accountAccess: 'read',
  opportunityAccess: 'read',
  caseAccess: 'read'
});

// APAC sub-territories
export const AsiaPacificNorth: Territory = TerritorySchema.parse({
  name: 'apac_north',
  label: 'APAC North',
  modelId: 'sales_territories',
  parent: 'apac',
  type: 'geography',
  assignmentRule: "billing_country IN ('JP', 'KR', 'CN', 'TW')",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});

export const AsiaPacificSouth: Territory = TerritorySchema.parse({
  name: 'apac_south',
  label: 'APAC South',
  modelId: 'sales_territories',
  parent: 'apac',
  type: 'geography',
  assignmentRule: "billing_country IN ('AU', 'NZ', 'SG', 'IN', 'ID', 'TH')",
  accountAccess: 'edit',
  opportunityAccess: 'edit',
  caseAccess: 'read'
});
