import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from './packages/crm/dist/plugin.js';
import { FinancePlugin } from './packages/finance/dist/plugin.js';
import { MarketingPlugin } from './packages/marketing/dist/plugin.js';
import { ProductsPlugin } from './packages/products/dist/plugin.js';
import { SupportPlugin } from './packages/support/dist/plugin.js';
import { HRPlugin } from './packages/hr/dist/plugin.js';
import { AnalyticsPlugin } from './packages/analytics/dist/plugin.js';
import { IntegrationPlugin } from './packages/integration/dist/plugin.js';
import { CommunityPlugin } from './packages/community/dist/plugin.js';
import { HealthcarePlugin } from './packages/healthcare/dist/plugin.js';
import { RealEstatePlugin } from './packages/real-estate/dist/plugin.js';
import { EducationPlugin } from './packages/education/dist/plugin.js';
import { FinancialServicesPlugin } from './packages/financial-services/dist/plugin.js';
import { ConsolePlugin } from '@object-ui/console';

// Core system reference datasets (not part of any plugin)
import { CurrencyDataset } from './packages/core/dist/currency.dataset.js';
import { CountryDataset } from './packages/core/dist/country.dataset.js';
import { IndustryDataset } from './packages/core/dist/industry.dataset.js';
import { TimezoneDataset } from './packages/core/dist/timezone.dataset.js';
import { LanguageDataset } from './packages/core/dist/language.dataset.js';

/**
 * HotCRM Application Configuration
 * 
 * Aggregates all business plugins into a single runtime application.
 * This replaces the deprecated @hotcrm/server package.
 * 
 * Note: @hotcrm/ai is a utility library and doesn't need to be registered as a plugin.
 * 
 * ConsolePlugin is embedded in the plugins array so that the CLI `serve`
 * command loads the Console UI automatically — no custom server.ts needed.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.app',
    namespace: 'hotcrm',
    version: '1.0.0',
    type: 'app',
    name: 'HotCRM Enterprise',
    description: 'AI-Native Enterprise CRM with Sales, Marketing, Products, Finance, Service, and HR clouds',
  },

  // Internationalization (i18n) configuration
  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-CN', 'ja-JP'],
    fallbackLocale: 'en',
    fileOrganization: 'per_locale',
  },

  // Empty objects array triggers auto-loading of ObjectQL and the memory driver,
  // which is required by the AppPlugin at startup.
  // Business objects are defined inside each plugin's objects[] property.
  objects: [],

  // Core system reference data (currencies, countries, industries, timezones, languages)
  // Plugin-specific seed data is registered in each plugin's data[] field.
  data: [
    CurrencyDataset,
    CountryDataset,
    IndustryDataset,
    TimezoneDataset,
    LanguageDataset,
  ],

  // Register all Business Plugins
  // Core clouds (6)
  plugins: [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin,
    HRPlugin,
    // Cross-functional clouds (3)
    AnalyticsPlugin,
    IntegrationPlugin,
    CommunityPlugin,
    // Vertical industry solutions (4)
    HealthcarePlugin,
    RealEstatePlugin,
    EducationPlugin,
    FinancialServicesPlugin,
    new ConsolePlugin(),
  ],
  // Uses 'as any' because defineStack schema doesn't include runtime plugins
  // like ConsolePlugin — consistent with objectstack.shared.ts pattern.
} as any);
