import { describe, it, expect } from 'vitest';
import { DatasetSchema } from '@objectstack/spec/data';

// Core datasets
import { CurrencyDataset } from '../../../src/currency.dataset';
import { CountryDataset } from '../../../src/country.dataset';
import { IndustryDataset } from '../../../src/industry.dataset';
import { TimezoneDataset } from '../../../src/timezone.dataset';
import { LanguageDataset } from '../../../src/language.dataset';

// CRM datasets
import { AccountDataset } from '../../../../crm/src/account.dataset';
import { ContactDataset } from '../../../../crm/src/contact.dataset';
import { LeadDataset } from '../../../../crm/src/lead.dataset';
import { OpportunityDataset } from '../../../../crm/src/opportunity.dataset';
import { IndustryDataset as CrmIndustryDataset } from '../../../../crm/src/industry.dataset';

// Finance datasets
import { CurrencyDataset as FinanceCurrencyDataset } from '../../../../finance/src/currency.dataset';
import { InvoiceDataset } from '../../../../finance/src/invoice.dataset';
import { PaymentDataset } from '../../../../finance/src/payment.dataset';

// HR datasets
import { EmployeeDataset } from '../../../../hr/src/employee.dataset';
import { DepartmentDataset } from '../../../../hr/src/department.dataset';
import { JobPostingDataset } from '../../../../hr/src/job_posting.dataset';

// Products datasets
import { ProductDataset } from '../../../../products/src/product.dataset';
import { PriceBookDataset } from '../../../../products/src/price_book.dataset';

// Support datasets
import { CaseDataset } from '../../../../support/src/case.dataset';
import { KbArticleDataset } from '../../../../support/src/kb_article.dataset';

// Marketing datasets
import { CampaignDataset } from '../../../../marketing/src/campaign.dataset';
import { CampaignTypeDataset } from '../../../../marketing/src/campaign_type.dataset';
import { EmailTemplateDataset } from '../../../../marketing/src/email_template.dataset';

// Analytics datasets
import { ReportDataset } from '../../../../analytics/src/report.dataset';

// Integration datasets
import { ConnectionDataset } from '../../../../integration/src/connection.dataset';

// Community datasets
import { IdeaDataset } from '../../../../community/src/idea.dataset';
import { TopicDataset } from '../../../../community/src/topic.dataset';

// Healthcare datasets
import { PatientDataset } from '../../../../healthcare/src/patient.dataset';
import { AppointmentDataset } from '../../../../healthcare/src/appointment.dataset';
import { InsuranceDataset } from '../../../../healthcare/src/insurance.dataset';
import { PrescriptionDataset } from '../../../../healthcare/src/prescription.dataset';

// Financial Services datasets
import { WealthAccountDataset } from '../../../../financial-services/src/wealth_account.dataset';
import { PortfolioDataset } from '../../../../financial-services/src/portfolio.dataset';
import { AdvisoryDataset } from '../../../../financial-services/src/advisory.dataset';
import { KycDataset } from '../../../../financial-services/src/kyc.dataset';

// Real Estate datasets
import { PropertyDataset } from '../../../../real-estate/src/property.dataset';
import { ListingDataset } from '../../../../real-estate/src/listing.dataset';
import { ShowingDataset } from '../../../../real-estate/src/showing.dataset';
import { RealEstateOfferDataset } from '../../../../real-estate/src/real_estate_offer.dataset';

// Education datasets
import { CourseDataset } from '../../../../education/src/course.dataset';
import { StudentDataset } from '../../../../education/src/student.dataset';
import { EnrollmentDataset } from '../../../../education/src/enrollment.dataset';
import { ScholarshipDataset } from '../../../../education/src/scholarship.dataset';

/**
 * DatasetSchema Validation Tests
 *
 * Ensures all *.dataset.ts files conform to the DatasetSchema from @objectstack/spec.
 * Each dataset must have: object, externalId, mode, env, records.
 */
describe('DatasetSchema Validation — All Packages', () => {
  const allDatasets = [
    // Core
    { name: 'CurrencyDataset (core)', dataset: CurrencyDataset },
    { name: 'CountryDataset (core)', dataset: CountryDataset },
    { name: 'IndustryDataset (core)', dataset: IndustryDataset },
    { name: 'TimezoneDataset (core)', dataset: TimezoneDataset },
    { name: 'LanguageDataset (core)', dataset: LanguageDataset },
    // CRM
    { name: 'AccountDataset (crm)', dataset: AccountDataset },
    { name: 'ContactDataset (crm)', dataset: ContactDataset },
    { name: 'LeadDataset (crm)', dataset: LeadDataset },
    { name: 'OpportunityDataset (crm)', dataset: OpportunityDataset },
    { name: 'IndustryDataset (crm)', dataset: CrmIndustryDataset },
    // Finance
    { name: 'CurrencyDataset (finance)', dataset: FinanceCurrencyDataset },
    { name: 'InvoiceDataset (finance)', dataset: InvoiceDataset },
    { name: 'PaymentDataset (finance)', dataset: PaymentDataset },
    // HR
    { name: 'EmployeeDataset (hr)', dataset: EmployeeDataset },
    { name: 'DepartmentDataset (hr)', dataset: DepartmentDataset },
    { name: 'JobPostingDataset (hr)', dataset: JobPostingDataset },
    // Products
    { name: 'ProductDataset (products)', dataset: ProductDataset },
    { name: 'PriceBookDataset (products)', dataset: PriceBookDataset },
    // Support
    { name: 'CaseDataset (support)', dataset: CaseDataset },
    { name: 'KbArticleDataset (support)', dataset: KbArticleDataset },
    // Marketing
    { name: 'CampaignDataset (marketing)', dataset: CampaignDataset },
    { name: 'CampaignTypeDataset (marketing)', dataset: CampaignTypeDataset },
    { name: 'EmailTemplateDataset (marketing)', dataset: EmailTemplateDataset },
    // Analytics
    { name: 'ReportDataset (analytics)', dataset: ReportDataset },
    // Integration
    { name: 'ConnectionDataset (integration)', dataset: ConnectionDataset },
    // Community
    { name: 'IdeaDataset (community)', dataset: IdeaDataset },
    { name: 'TopicDataset (community)', dataset: TopicDataset },
    // Healthcare
    { name: 'PatientDataset (healthcare)', dataset: PatientDataset },
    { name: 'AppointmentDataset (healthcare)', dataset: AppointmentDataset },
    { name: 'InsuranceDataset (healthcare)', dataset: InsuranceDataset },
    { name: 'PrescriptionDataset (healthcare)', dataset: PrescriptionDataset },
    // Financial Services
    { name: 'WealthAccountDataset (financial-services)', dataset: WealthAccountDataset },
    { name: 'PortfolioDataset (financial-services)', dataset: PortfolioDataset },
    { name: 'AdvisoryDataset (financial-services)', dataset: AdvisoryDataset },
    { name: 'KycDataset (financial-services)', dataset: KycDataset },
    // Real Estate
    { name: 'PropertyDataset (real-estate)', dataset: PropertyDataset },
    { name: 'ListingDataset (real-estate)', dataset: ListingDataset },
    { name: 'ShowingDataset (real-estate)', dataset: ShowingDataset },
    { name: 'RealEstateOfferDataset (real-estate)', dataset: RealEstateOfferDataset },
    // Education
    { name: 'CourseDataset (education)', dataset: CourseDataset },
    { name: 'StudentDataset (education)', dataset: StudentDataset },
    { name: 'EnrollmentDataset (education)', dataset: EnrollmentDataset },
    { name: 'ScholarshipDataset (education)', dataset: ScholarshipDataset },
  ];

  it.each(allDatasets)('$name should validate against DatasetSchema', ({ dataset }) => {
    expect(() => DatasetSchema.parse(dataset)).not.toThrow();
  });

  it.each(allDatasets)('$name should have at least 1 record', ({ dataset }) => {
    expect(dataset.records.length).toBeGreaterThanOrEqual(1);
  });

  it.each(allDatasets)('$name should have a valid object name', ({ dataset }) => {
    expect(dataset.object).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  describe('Environment configuration', () => {
    const referenceDatasets = allDatasets.filter(({ dataset }) =>
      dataset.mode === 'upsert' || (!dataset.mode && true)
    );

    const demoDatasets = allDatasets.filter(({ dataset }) =>
      dataset.mode === 'ignore'
    );

    it('should have reference datasets available in all environments', () => {
      for (const { name, dataset } of referenceDatasets) {
        if (dataset.mode === 'upsert') {
          expect(dataset.env, `${name} should include prod`).toContain('prod');
          expect(dataset.env, `${name} should include dev`).toContain('dev');
          expect(dataset.env, `${name} should include test`).toContain('test');
        }
      }
    });

    it('should have demo datasets excluded from prod', () => {
      for (const { name, dataset } of demoDatasets) {
        expect(dataset.env, `${name} should NOT include prod`).not.toContain('prod');
      }
    });
  });

  describe('Plugin data registration', () => {
    it('should have 43 total datasets across all packages', () => {
      expect(allDatasets.length).toBe(43);
    });
  });
});
