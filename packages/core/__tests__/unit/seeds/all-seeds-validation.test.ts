import { describe, it, expect } from 'vitest';
import { validateSeedData } from '../../../src/seed_validation';

// CRM Package Seeds
import { AccountSeedData } from '../../../../crm/src/account.seed';
import { ContactSeedData } from '../../../../crm/src/contact.seed';
import { LeadSeedData } from '../../../../crm/src/lead.seed';
import { OpportunitySeedData } from '../../../../crm/src/opportunity.seed';
import { IndustrySeedData } from '../../../../crm/src/industry.seed';

// Finance Package Seeds
import { CurrencySeedData } from '../../../../finance/src/currency.seed';
import { InvoiceSeedData } from '../../../../finance/src/invoice.seed';
import { PaymentSeedData } from '../../../../finance/src/payment.seed';

// HR Package Seeds
import { EmployeeSeedData } from '../../../../hr/src/employee.seed';
import { DepartmentSeedData } from '../../../../hr/src/department.seed';
import { JobPostingSeedData } from '../../../../hr/src/job_posting.seed';

// Marketing Package Seeds
import { CampaignSeedData } from '../../../../marketing/src/campaign.seed';
import { CampaignTypeSeedData } from '../../../../marketing/src/campaign_type.seed';
import { EmailTemplateSeedData } from '../../../../marketing/src/email_template.seed';

// Products Package Seeds
import { ProductSeedData } from '../../../../products/src/product.seed';
import { PriceBookSeedData } from '../../../../products/src/price_book.seed';

// Support Package Seeds
import { CaseSeedData } from '../../../../support/src/case.seed';
import { KbArticleSeedData } from '../../../../support/src/kb_article.seed';

// Analytics Package Seeds
import { ReportSeedData } from '../../../../analytics/src/report.seed';

// Integration Package Seeds
import { ConnectionSeedData } from '../../../../integration/src/connection.seed';

// Community Package Seeds
import { IdeaSeedData } from '../../../../community/src/idea.seed';
import { TopicSeedData } from '../../../../community/src/topic.seed';

// Healthcare Package Seeds
import { PatientSeedData } from '../../../../healthcare/src/patient.seed';
import { AppointmentSeedData } from '../../../../healthcare/src/appointment.seed';
import { InsuranceSeedData } from '../../../../healthcare/src/insurance.seed';
import { PrescriptionSeedData } from '../../../../healthcare/src/prescription.seed';

// Financial Services Package Seeds
import { WealthAccountSeedData } from '../../../../financial-services/src/wealth_account.seed';
import { PortfolioSeedData } from '../../../../financial-services/src/portfolio.seed';
import { AdvisorySeedData } from '../../../../financial-services/src/advisory.seed';
import { KycSeedData } from '../../../../financial-services/src/kyc.seed';

// Real Estate Package Seeds
import { PropertySeedData } from '../../../../real-estate/src/property.seed';
import { ListingSeedData } from '../../../../real-estate/src/listing.seed';
import { ShowingSeedData } from '../../../../real-estate/src/showing.seed';
import { RealEstateOfferSeedData } from '../../../../real-estate/src/real_estate_offer.seed';

// Education Package Seeds
import { CourseSeedData } from '../../../../education/src/course.seed';
import { StudentSeedData } from '../../../../education/src/student.seed';
import { EnrollmentSeedData } from '../../../../education/src/enrollment.seed';
import { ScholarshipSeedData } from '../../../../education/src/scholarship.seed';

// Core Package Seeds
import { SystemSeedData } from '../../../src/system.seed';

describe('Seed Data Validation — All Packages', () => {
  describe('CRM Package Seeds', () => {
    it('AccountSeedData should be valid', () => {
      const result = validateSeedData(AccountSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('ContactSeedData should be valid', () => {
      const result = validateSeedData(ContactSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('LeadSeedData should be valid', () => {
      const result = validateSeedData(LeadSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('OpportunitySeedData should be valid', () => {
      const result = validateSeedData(OpportunitySeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('IndustrySeedData should be valid', () => {
      const result = validateSeedData(IndustrySeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Finance Package Seeds', () => {
    it('CurrencySeedData should be valid', () => {
      const result = validateSeedData(CurrencySeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('InvoiceSeedData should be valid', () => {
      const result = validateSeedData(InvoiceSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('PaymentSeedData should be valid', () => {
      const result = validateSeedData(PaymentSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('HR Package Seeds', () => {
    it('EmployeeSeedData should be valid', () => {
      const result = validateSeedData(EmployeeSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('DepartmentSeedData should be valid', () => {
      const result = validateSeedData(DepartmentSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('JobPostingSeedData should be valid', () => {
      const result = validateSeedData(JobPostingSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Marketing Package Seeds', () => {
    it('CampaignSeedData should be valid', () => {
      const result = validateSeedData(CampaignSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('CampaignTypeSeedData should be valid', () => {
      const result = validateSeedData(CampaignTypeSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('EmailTemplateSeedData should be valid', () => {
      const result = validateSeedData(EmailTemplateSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Products Package Seeds', () => {
    it('ProductSeedData should be valid', () => {
      const result = validateSeedData(ProductSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('PriceBookSeedData should be valid', () => {
      const result = validateSeedData(PriceBookSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Support Package Seeds', () => {
    it('CaseSeedData should be valid', () => {
      const result = validateSeedData(CaseSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('KbArticleSeedData should be valid', () => {
      const result = validateSeedData(KbArticleSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Analytics Package Seeds', () => {
    it('ReportSeedData should be valid', () => {
      const result = validateSeedData(ReportSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration Package Seeds', () => {
    it('ConnectionSeedData should be valid', () => {
      const result = validateSeedData(ConnectionSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Community Package Seeds', () => {
    it('IdeaSeedData should be valid', () => {
      const result = validateSeedData(IdeaSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('TopicSeedData should be valid', () => {
      const result = validateSeedData(TopicSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Healthcare Package Seeds', () => {
    it('PatientSeedData should be valid', () => {
      const result = validateSeedData(PatientSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('AppointmentSeedData should be valid', () => {
      const result = validateSeedData(AppointmentSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('InsuranceSeedData should be valid', () => {
      const result = validateSeedData(InsuranceSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('PrescriptionSeedData should be valid', () => {
      const result = validateSeedData(PrescriptionSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Financial Services Package Seeds', () => {
    it('WealthAccountSeedData should be valid', () => {
      const result = validateSeedData(WealthAccountSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('PortfolioSeedData should be valid', () => {
      const result = validateSeedData(PortfolioSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('AdvisorySeedData should be valid', () => {
      const result = validateSeedData(AdvisorySeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('KycSeedData should be valid', () => {
      const result = validateSeedData(KycSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Real Estate Package Seeds', () => {
    it('PropertySeedData should be valid', () => {
      const result = validateSeedData(PropertySeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('ListingSeedData should be valid', () => {
      const result = validateSeedData(ListingSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('ShowingSeedData should be valid', () => {
      const result = validateSeedData(ShowingSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('RealEstateOfferSeedData should be valid', () => {
      const result = validateSeedData(RealEstateOfferSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Education Package Seeds', () => {
    it('CourseSeedData should be valid', () => {
      const result = validateSeedData(CourseSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('StudentSeedData should be valid', () => {
      const result = validateSeedData(StudentSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('EnrollmentSeedData should be valid', () => {
      const result = validateSeedData(EnrollmentSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('ScholarshipSeedData should be valid', () => {
      const result = validateSeedData(ScholarshipSeedData, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Core Package Seeds', () => {
    it('SystemSeedData.currencies should be valid', () => {
      const result = validateSeedData(SystemSeedData.currencies, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('SystemSeedData.countries should be valid', () => {
      const result = validateSeedData(SystemSeedData.countries, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('SystemSeedData.industries should be valid', () => {
      const result = validateSeedData(SystemSeedData.industries, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('SystemSeedData.timezones should be valid', () => {
      const result = validateSeedData(SystemSeedData.timezones, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('SystemSeedData.languages should be valid', () => {
      const result = validateSeedData(SystemSeedData.languages, { minRecords: 1 });
      expect(result.valid).toBe(true);
      expect(result.recordCount).toBeGreaterThanOrEqual(1);
    });
  });
});
