import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from './packages/crm/src/plugin';
import { FinancePlugin } from './packages/finance/src/plugin';
import { MarketingPlugin } from './packages/marketing/src/plugin';
import { ProductsPlugin } from './packages/products/src/plugin';
import { SupportPlugin } from './packages/support/src/plugin';
import { HRPlugin } from './packages/hr/src/plugin';
// import { ConsolePlugin } from '@object-ui/console';

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

  // Register all Business Plugins
  plugins: [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin,
    HRPlugin,
    // new ConsolePlugin(),
  ],
  // Uses 'as any' because defineStack schema doesn't include runtime plugins
  // like ConsolePlugin — consistent with objectstack.shared.ts pattern.
} as any);
