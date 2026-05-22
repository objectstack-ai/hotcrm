/**
 * HotCRM root stack — flat `defineStack` configuration.
 *
 * Mirrors `framework/examples/app-crm/objectstack.config.ts`:
 *  - Top-level `objects` / `actions` / `hooks` / `pages` / `views` / ... arrays
 *  - `requires: [...]` declares platform capabilities (auth, ui, ai, ...).
 *    The CLI auto-loads matching service plugins (no manual `new XPlugin()`).
 *  - No `plugins: []` array → avoids the nested-plugin ownership collision
 *    introduced by `@objectstack/objectql` 4.2's recursive `registerApp`.
 *
 * Metadata sources:
 *  - Business objects / actions / triggers / workflows / apps / data / i18n
 *    come from each `packages/<pkg>/dist/plugin.js` (the existing bundle).
 *  - Pages, views, dashboards, forms, flows, permissions, reports, agents
 *    are discovered from `packages/<pkg>/dist/**\/*.<suffix>.js` by
 *    `objectstack.aggregator.ts`.
 */

import { defineStack } from '@objectstack/spec';
import { ConsolePlugin } from '@object-ui/console';

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

// Core system reference datasets (not owned by any plugin)
import { CurrencyDataset } from './packages/core/dist/currency.dataset.js';
import { CountryDataset } from './packages/core/dist/country.dataset.js';
import { IndustryDataset } from './packages/core/dist/industry.dataset.js';
import { TimezoneDataset } from './packages/core/dist/timezone.dataset.js';
import { LanguageDataset } from './packages/core/dist/language.dataset.js';

import { aggregatePackageMetadata } from './objectstack.aggregator.js';

// ─── Aggregate every business plugin's bundle into flat arrays ───────────
const BUSINESS_PLUGINS = [
  CRMPlugin, FinancePlugin, MarketingPlugin, ProductsPlugin,
  SupportPlugin, HRPlugin, AnalyticsPlugin, IntegrationPlugin,
  CommunityPlugin, HealthcarePlugin, RealEstatePlugin,
  EducationPlugin, FinancialServicesPlugin,
];

const flatten = <T>(
  field: 'objects' | 'actions' | 'triggers' | 'workflows',
): T[] => {
  const out: T[] = [];
  for (const p of BUSINESS_PLUGINS as Array<Record<string, unknown>>) {
    const value = p[field];
    if (!value || typeof value !== 'object') continue;
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      // Some action maps nest a second level (e.g. `account_ai: { ... }`).
      // Hoist nested action groups so each named action becomes a top-level
      // entry the runtime can validate independently.
      if (
        field === 'actions' &&
        v && typeof v === 'object' && !Array.isArray(v) &&
        !('name' in (v as object))
      ) {
        for (const [nestedKey, nested] of Object.entries(
          v as Record<string, unknown>,
        )) {
          if (!nested || typeof nested !== 'object') continue;
          out.push({ ...(nested as object), name: (nested as { name?: string }).name ?? nestedKey } as T);
        }
      } else if (v && typeof v === 'object') {
        // Use the map key as the canonical snake_case name — the legacy
        // map-based plugin registration treated the key as the source of
        // truth for the registered entity name (preserving snake_case).
        out.push({ ...(v as object), name: key } as T);
      }
    }
  }
  return out;
};

// Map legacy/loose workflow action shapes to the strict v4.2 spec.
const VALID_ACTION_TYPES = new Set([
  'field_update', 'email_alert', 'http_call', 'connector_action',
  'task_creation', 'push_notification', 'custom_script',
]);
const TYPE_ALIASES: Record<string, string> = {
  customAction: 'custom_script',
  custom_action: 'custom_script',
  fieldUpdate: 'field_update',
  emailAlert: 'email_alert',
  httpCall: 'http_call',
  connectorAction: 'connector_action',
  taskCreation: 'task_creation',
  pushNotification: 'push_notification',
  customScript: 'custom_script',
};

function normalizeWorkflowAction(
  raw: Record<string, unknown>,
  workflowName: string,
  index: number,
): Record<string, unknown> | null {
  const a: Record<string, unknown> = { ...raw };
  const rawType = String(a.type ?? '');
  const type = TYPE_ALIASES[rawType] ?? rawType;
  if (!VALID_ACTION_TYPES.has(type)) return null;
  a.type = type;
  if (typeof a.name !== 'string' || !a.name) {
    a.name = `${workflowName}_action_${index + 1}`;
  }
  switch (type) {
    case 'field_update':
      if (a.value === undefined && a.formula !== undefined) a.value = a.formula;
      if (a.value === undefined) a.value = null;
      break;
    case 'http_call':
      if (a.body !== undefined && typeof a.body !== 'string') {
        try { a.body = JSON.stringify(a.body); } catch { a.body = String(a.body); }
      }
      break;
    case 'task_creation':
      if (typeof a.taskObject !== 'string' || !a.taskObject) a.taskObject = 'task';
      if (typeof a.subject !== 'string') a.subject = a.subject != null ? String(a.subject) : workflowName;
      break;
    case 'push_notification':
      if (typeof a.body !== 'string') a.body = a.body != null ? String(a.body) : '';
      if (typeof a.title !== 'string') a.title = a.title != null ? String(a.title) : workflowName;
      if (!Array.isArray(a.recipients)) a.recipients = [];
      break;
    case 'custom_script':
      if (typeof a.code !== 'string') a.code = String(a.code ?? '');
      break;
    case 'connector_action':
      if (typeof a.connectorId !== 'string') a.connectorId = String(a.connectorId ?? '');
      if (typeof a.actionId !== 'string') a.actionId = String(a.actionId ?? '');
      if (!a.input || typeof a.input !== 'object') a.input = {};
      break;
    case 'email_alert':
      if (!Array.isArray(a.recipients)) a.recipients = [];
      if (typeof a.template !== 'string') a.template = String(a.template ?? '');
      break;
  }
  return a;
}

function normalizeWorkflow(w: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...w };
  const name = String(out.name ?? 'workflow');
  if (Array.isArray(out.actions)) {
    out.actions = (out.actions as unknown[])
      .map((a, i) => (a && typeof a === 'object'
        ? normalizeWorkflowAction(a as Record<string, unknown>, name, i)
        : null))
      .filter((a): a is Record<string, unknown> => a !== null);
  }
  if (Array.isArray(out.timeTriggers)) {
    out.timeTriggers = (out.timeTriggers as unknown[]).map((t) => {
      if (!t || typeof t !== 'object') return t;
      const tt = { ...(t as Record<string, unknown>) };
      if (Array.isArray(tt.actions)) {
        tt.actions = (tt.actions as unknown[])
          .map((a, i) => (a && typeof a === 'object'
            ? normalizeWorkflowAction(a as Record<string, unknown>, name, i)
            : null))
          .filter((a): a is Record<string, unknown> => a !== null);
      }
      return tt;
    });
  }
  return out;
}

function normalizeHook(h: Record<string, unknown>): Record<string, unknown> | null {
  // Spec requires `object: string` and `events: array`.
  const obj = h.object;
  const events = h.events;
  if (typeof obj !== 'string' || !obj) return null;
  if (!Array.isArray(events) || events.length === 0) return null;
  return h;
}

const flattenArray = <T>(field: 'apps' | 'data' | 'translations'): T[] => {
  const out: T[] = [];
  for (const p of BUSINESS_PLUGINS as Array<Record<string, unknown>>) {
    const value = p[field];
    if (Array.isArray(value)) out.push(...(value as T[]));
  }
  return out;
};

// ─── Filesystem-discovered metadata (pages/views/dashboards/...) ─────────
const discovered = await aggregatePackageMetadata();

export default defineStack({
  manifest: {
    id: 'com.hotcrm.app',
    namespace: 'hotcrm',
    version: '1.0.0',
    type: 'app',
    name: 'HotCRM Enterprise',
    description:
      'AI-Native Enterprise CRM with Sales, Marketing, Products, Finance, Service, and HR clouds',
  },

  // Platform capabilities — the CLI resolves each to a built-in service
  // plugin and auto-loads it. Foundational tier (queue/job/cache/settings/
  // email/storage) is auto-injected for non-`minimal` presets.
  requires: [
    'ai',
    'automation',
    'analytics',
    'auth',
    'ui',
    'i18n',
    'approvals',
    'sharing',
  ],

  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-CN', 'ja-JP'],
    fallbackLocale: 'en',
    fileOrganization: 'per_locale',
  },

  objects: flatten('objects'),
  actions: flatten('actions'),
  hooks: flatten<Record<string, unknown>>('triggers')
    .map(normalizeHook)
    .filter((h): h is Record<string, unknown> => h !== null),
  workflows: flatten<Record<string, unknown>>('workflows').map(normalizeWorkflow),

  apps: flattenArray('apps'),
  translations: flattenArray('translations'),

  data: (() => {
    const objectNames = new Set(
      flatten<{ name: string }>('objects').map((o) => o.name),
    );
    const all = [
      CurrencyDataset,
      CountryDataset,
      IndustryDataset,
      TimezoneDataset,
      LanguageDataset,
      ...flattenArray<Record<string, unknown>>('data'),
    ];
    // Drop datasets that reference objects not present in the flattened
    // object catalog (orphan reference datasets like `country`, `currency`
    // that were previously provided by a system plugin).
    return all.filter((d) =>
      typeof d?.object === 'string' && objectNames.has(d.object as string),
    );
  })(),

  // Filesystem-discovered metadata
  pages: discovered.pages as never,
  views: discovered.views as never,
  dashboards: discovered.dashboards as never,
  flows: discovered.flows as never,
  permissions: discovered.permissions as never,
  reports: discovered.reports as never,
  agents: discovered.agents as never,

  // Third-party UI plugins not auto-loaded by `requires:` capabilities.
  // ConsolePlugin mounts `@object-ui/console` at /console.
  plugins: [new ConsolePlugin()],
} as never);
