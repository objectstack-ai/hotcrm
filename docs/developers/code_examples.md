# HotCRM Code Examples

> Examples that match the current single-app HotCRM repository.

HotCRM metadata is registered from `src/` through [`objectstack.config.ts`](../../objectstack.config.ts). File names use the ObjectStack suffix convention: `.object.ts`, `.hook.ts`, `.actions.ts`, `.flow.ts`, `.skill.ts`, `.view.ts`, `.page.ts`, `.dashboard.ts`, and `.report.ts`.

## Define An Object

File: `src/objects/example.object.ts`

```typescript
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Warranty = ObjectSchema.create({
  name: 'crm_warranty',
  label: 'Warranty',
  pluralLabel: 'Warranties',
  icon: 'shield',
  description: 'Product warranty tracking',

  fields: {
    warranty_number: Field.autonumber({
      label: 'Warranty Number',
      format: 'WR-{000000}',
    }),
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      required: true,
    }),
    crm_product: Field.lookup('crm_product', {
      label: 'Product',
      required: true,
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active', default: true },
        { label: 'Expiring Soon', value: 'expiring_soon' },
        { label: 'Expired', value: 'expired' },
      ],
    }),
    start_date: Field.date({ label: 'Start Date', required: true }),
    end_date: Field.date({ label: 'End Date', required: true }),
  },

  enable: {
    searchable: true,
    apiEnabled: true,
    trackHistory: true,
  },
});
```

Conventions:

- Object names use the `crm_` prefix.
- Lookup targets use object names such as `crm_account`.
- Current objects live in `src/objects/*.object.ts`.
- Export new objects from `src/objects/index.ts`.

## Add A Hook

File: `src/objects/example.hook.ts`

```typescript
import type { Hook } from '@objectstack/spec/data';

const warrantyHook: Hook = {
  name: 'crm_warranty_status_hook',
  object: 'crm_warranty',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx) => {
    const doc = ctx.input.doc as Record<string, unknown>;

    if (doc.start_date && doc.end_date) {
      const start = new Date(String(doc.start_date));
      const end = new Date(String(doc.end_date));
      if (end <= start) {
        throw new Error('Warranty end date must be after start date.');
      }
    }
  },
};

export default warrantyHook;
```

Register it by importing it in `src/hooks/index.ts` and adding it to the `entries` array. `objectstack.config.ts` already passes `allHooks` into `defineStack()`.

## Add An Action

File: `src/actions/example.actions.ts`

```typescript
import type { Action } from '@objectstack/spec/ui';

export const AddLeadsToCampaignAction: Action = {
  name: 'add_leads_to_campaign',
  label: 'Add to Campaign',
  objectName: 'crm_lead',
  icon: 'send',
  type: 'modal',
  target: 'add_leads_to_campaign',
  locations: ['list_toolbar'],
  params: [
    {
      name: 'campaign',
      label: 'Campaign',
      type: 'lookup',
      required: true,
    },
  ],
  body: {
    language: 'js',
    capabilities: ['api.write'],
    timeoutMs: 10000,
    source: `
      const ids = Array.isArray(input.selectedIds) ? input.selectedIds : [];
      const campaignId = input.campaign;
      if (!campaignId) throw new Error('Campaign is required');

      for (const leadId of ids) {
        await ctx.api.object('crm_campaign_member').insert({
          crm_campaign: campaignId,
          crm_lead: leadId,
          status: 'sent',
        });
      }

      return { count: ids.length };
    `,
  },
  successMessage: 'Leads added to campaign.',
  refreshAfter: true,
};
```

Export actions from `src/actions/index.ts` so `objectstack.config.ts` can register them.

## Add A Flow

File: `src/flows/example.flow.ts`

```typescript
import type * as Automation from '@objectstack/spec/automation';

type Flow = Automation.Flow;

export const WarrantyExpirationFlow: Flow = {
  name: 'warranty_expiration',
  label: 'Warranty Expiration',
  type: 'record_change',
  status: 'active',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Warranty updated',
      config: { objectName: 'crm_warranty', triggerType: 'record-after-update' },
    },
    {
      id: 'check_expired',
      type: 'decision',
      label: 'Expired?',
      config: { condition: 'record.end_date < TODAY()' },
    },
    {
      id: 'mark_expired',
      type: 'update_record',
      label: 'Mark expired',
      config: {
        objectName: 'crm_warranty',
        filter: { id: '{record.id}' },
        fields: { status: 'expired' },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'check_expired', type: 'default' },
    { id: 'e2', source: 'check_expired', target: 'mark_expired', type: 'conditional', condition: 'record.end_date < TODAY()' },
    { id: 'e3', source: 'mark_expired', target: 'end', type: 'default' },
  ],
};
```

Export flows from `src/flows/index.ts`. Record-change flows require the `triggers` capability, which is already declared in `objectstack.config.ts`.

## Add An AI Skill

File: `src/skills/example.skill.ts`

```typescript
import { defineSkill } from '@objectstack/spec';

export const WarrantySummarySkill = defineSkill({
  name: 'warranty_summary',
  label: 'Warranty Summary',
  description: 'Summarizes active warranties and renewal risk for an account.',
  instructions: `When asked about warranties, fetch the current records,
summarize status, identify expired or soon-expiring warranties, and
recommend the next action.`,
  tools: ['describe_object', 'query_records'],
  triggerPhrases: ['summarize warranties', 'warranty risk'],
});
```

Register the skill in `src/skills/index.ts`. There is no agent to attach it to —
the AI surface is skills-only ([#512](https://github.com/objectstack-ai/hotcrm/pull/512)),
and a skill binds to the platform assistant through its `surface` affinity.

**Every name in `tools` must resolve to something that actually runs.** The
runtime silently drops a tool it cannot resolve, so an invented name leaves the
model with instructions describing a capability it does not have — the defect
[#493](https://github.com/objectstack-ai/hotcrm/issues/493) catalogued. Two
sources resolve, and only two:

- **Platform data tools** — `describe_object`, `list_objects`, `query_records`,
  `get_record`, `aggregate_data`.
- **`action_<name>`** — materialised from an Action that opts in with
  `ai: { exposed: true, description }` (ADR-0011, default off) *and* has a
  headless path. See `ConvertLeadAction` in `src/actions/lead.actions.ts`.

Authoring a `defineTool` record does **not** create a third source: `ToolSchema`
is a read-only projection for Studio discovery with no `implementation` field
and no executor. Reasoning — scoring, drafting, forecasting — belongs in
`instructions`, not in a tool (ADR-0109). `test/skills-integrity.test.ts`
enforces all of this at PR time.

Note there is no `permissions` key on a skill — `SkillSchema` has no such field,
so one is silently stripped ([#511](https://github.com/objectstack-ai/hotcrm/pull/511)).
Gate access on the Actions the skill calls instead.

## Common Registration Points

| New metadata | Add file under | Export from |
| --- | --- | --- |
| Object | `src/objects/` | `src/objects/index.ts` |
| Hook | `src/objects/` | `src/hooks/index.ts` |
| Action | `src/actions/` | `src/actions/index.ts` |
| Flow | `src/flows/` | `src/flows/index.ts` |
| Skill | `src/skills/` | `src/skills/index.ts` |
| View | `src/views/` | `src/views/index.ts` |
| Page | `src/pages/` | `src/pages/index.ts` |
| Dashboard | `src/dashboards/` | `src/dashboards/index.ts` |
| Report | `src/reports/` | `src/reports/index.ts` |

## Verification

After changing metadata:

```bash
pnpm validate
pnpm typecheck
pnpm test
```

For the full pipeline:

```bash
pnpm verify
```
