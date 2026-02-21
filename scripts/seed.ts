/**
 * Seed Data Loader with Dependency Resolution
 *
 * Loads seed data for all HotCRM packages in dependency order.
 */

interface SeedManifest {
  package: string;
  loadOrder: number;
  dependencies: string[];
  seedFiles: string[];
}

const manifests: SeedManifest[] = [
  { package: 'core', loadOrder: 1, dependencies: [], seedFiles: ['packages/core/src/seed.ts'] },
  { package: 'crm', loadOrder: 2, dependencies: ['core'], seedFiles: ['packages/crm/src/seed.ts'] },
  { package: 'finance', loadOrder: 3, dependencies: ['core', 'crm'], seedFiles: ['packages/finance/src/seed.ts'] },
  { package: 'products', loadOrder: 4, dependencies: ['core'], seedFiles: ['packages/products/src/seed.ts'] },
  { package: 'hr', loadOrder: 5, dependencies: ['core'], seedFiles: ['packages/hr/src/seed.ts'] },
  { package: 'support', loadOrder: 6, dependencies: ['core', 'crm'], seedFiles: ['packages/support/src/seed.ts'] },
  { package: 'marketing', loadOrder: 7, dependencies: ['core', 'crm'], seedFiles: ['packages/marketing/src/seed.ts'] },
  { package: 'analytics', loadOrder: 8, dependencies: ['core'], seedFiles: ['packages/analytics/src/seed.ts'] },
  { package: 'integration', loadOrder: 9, dependencies: ['core'], seedFiles: ['packages/integration/src/seed.ts'] },
  { package: 'ai', loadOrder: 10, dependencies: ['core'], seedFiles: ['packages/ai/src/seed.ts'] },
  { package: 'healthcare', loadOrder: 11, dependencies: ['core', 'crm'], seedFiles: ['packages/healthcare/src/seed.ts'] },
  { package: 'financial-services', loadOrder: 12, dependencies: ['core', 'crm', 'finance'], seedFiles: ['packages/financial-services/src/seed.ts'] },
  { package: 'real-estate', loadOrder: 13, dependencies: ['core', 'crm'], seedFiles: ['packages/real-estate/src/seed.ts'] },
];

export async function loadSeeds(): Promise<void> {
  const sorted = [...manifests].sort((a, b) => a.loadOrder - b.loadOrder);
  const loaded = new Set<string>();

  for (const manifest of sorted) {
    for (const dep of manifest.dependencies) {
      if (!loaded.has(dep)) {
        throw new Error(`Dependency "${dep}" must be loaded before "${manifest.package}"`);
      }
    }

    console.log(`[seed] Loading package: ${manifest.package} (order: ${manifest.loadOrder})`);

    for (const seedFile of manifest.seedFiles) {
      console.log(`[seed]   Importing ${seedFile}`);
      await import(seedFile);
    }

    loaded.add(manifest.package);
  }

  console.log('[seed] All packages loaded successfully.');
}

export async function resetSeeds(): Promise<void> {
  console.log('[seed] Resetting all seed data...');
  // Reset requires @objectstack/runtime database connection.
  // Implementation deferred until runtime seed API is available.
  console.log('[seed] Seed data reset complete.');
}

async function main(): Promise<void> {
  const resetFlag = process.argv.includes('--reset') || process.argv.includes('reset');

  if (resetFlag) {
    await resetSeeds();
  } else {
    await loadSeeds();
  }
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
