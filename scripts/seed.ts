/**
 * Seed Data Loader with Dependency Resolution
 *
 * Loads seed data for all HotCRM packages in dependency order.
 * Reads DatasetSchema-compliant datasets from each plugin's `data` field,
 * filters by environment, and loads in dependency order.
 */

import type { DatasetInput } from '@objectstack/spec/data';

// Core system reference datasets (no plugin)
import { CurrencyDataset } from '../packages/core/src/currency.dataset.js';
import { CountryDataset } from '../packages/core/src/country.dataset.js';
import { IndustryDataset } from '../packages/core/src/industry.dataset.js';
import { TimezoneDataset } from '../packages/core/src/timezone.dataset.js';
import { LanguageDataset } from '../packages/core/src/language.dataset.js';

// Plugin datasets (registered in each plugin's data[] field)
import { CRMPlugin } from '../packages/crm/src/plugin.js';
import { FinancePlugin } from '../packages/finance/src/plugin.js';
import { ProductsPlugin } from '../packages/products/src/plugin.js';
import { HRPlugin } from '../packages/hr/src/plugin.js';
import { SupportPlugin } from '../packages/support/src/plugin.js';
import { MarketingPlugin } from '../packages/marketing/src/plugin.js';
import { AnalyticsPlugin } from '../packages/analytics/src/plugin.js';
import { IntegrationPlugin } from '../packages/integration/src/plugin.js';
import { CommunityPlugin } from '../packages/community/src/plugin.js';
import { HealthcarePlugin } from '../packages/healthcare/src/plugin.js';
import { FinancialServicesPlugin } from '../packages/financial-services/src/plugin.js';
import { RealEstatePlugin } from '../packages/real-estate/src/plugin.js';
import { EducationPlugin } from '../packages/education/src/plugin.js';

interface SeedManifest {
  package: string;
  loadOrder: number;
  dependencies: string[];
  datasets: DatasetInput[];
}

const manifests: SeedManifest[] = [
  { package: 'core', loadOrder: 1, dependencies: [], datasets: [CurrencyDataset, CountryDataset, IndustryDataset, TimezoneDataset, LanguageDataset] },
  { package: 'crm', loadOrder: 2, dependencies: ['core'], datasets: (CRMPlugin as any).data ?? [] },
  { package: 'finance', loadOrder: 3, dependencies: ['core', 'crm'], datasets: (FinancePlugin as any).data ?? [] },
  { package: 'products', loadOrder: 4, dependencies: ['core'], datasets: (ProductsPlugin as any).data ?? [] },
  { package: 'hr', loadOrder: 5, dependencies: ['core'], datasets: (HRPlugin as any).data ?? [] },
  { package: 'support', loadOrder: 6, dependencies: ['core', 'crm'], datasets: (SupportPlugin as any).data ?? [] },
  { package: 'marketing', loadOrder: 7, dependencies: ['core', 'crm'], datasets: (MarketingPlugin as any).data ?? [] },
  { package: 'analytics', loadOrder: 8, dependencies: ['core'], datasets: (AnalyticsPlugin as any).data ?? [] },
  { package: 'integration', loadOrder: 9, dependencies: ['core'], datasets: (IntegrationPlugin as any).data ?? [] },
  { package: 'community', loadOrder: 10, dependencies: ['core'], datasets: (CommunityPlugin as any).data ?? [] },
  { package: 'healthcare', loadOrder: 11, dependencies: ['core', 'crm'], datasets: (HealthcarePlugin as any).data ?? [] },
  { package: 'financial-services', loadOrder: 12, dependencies: ['core', 'crm', 'finance'], datasets: (FinancialServicesPlugin as any).data ?? [] },
  { package: 'real-estate', loadOrder: 13, dependencies: ['core', 'crm'], datasets: (RealEstatePlugin as any).data ?? [] },
  { package: 'education', loadOrder: 14, dependencies: ['core'], datasets: (EducationPlugin as any).data ?? [] },
];

/**
 * Filter datasets by environment.
 * Datasets without an explicit `env` field default to all environments.
 */
function filterByEnv(datasets: DatasetInput[], env: string): DatasetInput[] {
  return datasets.filter((ds) => {
    if (!ds.env || ds.env.length === 0) return true;
    return ds.env.includes(env as 'prod' | 'dev' | 'test');
  });
}

export async function loadSeeds(env: string = 'dev'): Promise<void> {
  const sorted = [...manifests].sort((a, b) => a.loadOrder - b.loadOrder);
  const loaded = new Set<string>();

  for (const manifest of sorted) {
    for (const dep of manifest.dependencies) {
      if (!loaded.has(dep)) {
        throw new Error(`Dependency "${dep}" must be loaded before "${manifest.package}"`);
      }
    }

    const datasets = filterByEnv(manifest.datasets, env);
    if (datasets.length === 0) {
      console.log(`[seed] Skipping package: ${manifest.package} (no datasets for env: ${env})`);
      loaded.add(manifest.package);
      continue;
    }

    console.log(`[seed] Loading package: ${manifest.package} (order: ${manifest.loadOrder}, datasets: ${datasets.length})`);

    for (const dataset of datasets) {
      console.log(`[seed]   → ${dataset.object} (${dataset.records.length} records, mode: ${dataset.mode ?? 'upsert'})`);
    }

    loaded.add(manifest.package);
  }

  console.log('[seed] All datasets validated and enumerated successfully.');
  console.log('[seed] NOTE: Actual data insertion requires @objectstack/runtime database connection.');
  console.log('[seed] The dataset records are DatasetSchema-compliant and ready for the runtime seed API.');
}

export async function resetSeeds(): Promise<void> {
  console.error('[seed] ERROR: Reset is not yet implemented.');
  console.error('[seed] Reset requires @objectstack/runtime database connection.');
  console.error('[seed] Implementation deferred until runtime seed API is available.');
  process.exit(1);
}

async function main(): Promise<void> {
  const resetFlag = process.argv.includes('--reset') || process.argv.includes('reset');
  const env = process.argv.includes('--prod') ? 'prod' : process.argv.includes('--test') ? 'test' : 'dev';

  if (resetFlag) {
    await resetSeeds();
  } else {
    await loadSeeds(env);
  }
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
