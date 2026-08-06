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
  // `script` — the body runs on the server. A `type: 'modal'` action has no
  // server dispatch at all (the renderer just opens its `target`), so a `body`
  // on one never executes: the runtime refuses it over REST with
  // `400 … a client-side action with no server dispatch`.
  type: 'script',
  locations: ['list_toolbar'],
  params: [
    // Field-backed param: `field` + `objectOverride` make the console resolve
    // the widget from crm_campaign_member.crm_campaign (a lookup → crm_campaign),
    // rendering a RECORD PICKER. A bare `{ type: 'lookup' }` with no field can't
    // resolve a target object and silently falls back to a paste-the-ID textbox.
    // The value key is the field name (`crm_campaign`) because the param omits
    // an explicit `name` — that is the key the body reads below.
    {
      field: 'crm_campaign',
      objectOverride: 'crm_campaign_member',
      label: 'Campaign',
      required: true,
    },
    // NOTE: `_selectedIds` is NOT declared here. See "Bulk actions" below.
  ],
  body: {
    language: 'js',
    capabilities: ['api.write'],
    timeoutMs: 10000,
    source: `
      // \`input\` IS the action's params bag. An aggregate bulk dispatch puts
      // the whole selection under the built-in \`_selectedIds\` (leading
      // underscore) and sends no recordId; a single-record dispatch sends a
      // recordId and no selection.
      const selected = Array.isArray(input._selectedIds) ? input._selectedIds : [];
      const ids = selected.length ? selected : (ctx.recordId ? [ctx.recordId] : []);
      if (!ids.length) throw new Error('No lead selected');

      const campaignId = input.crm_campaign;
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

### Bulk actions: how a multi-row selection reaches the body

An action does not decide on its own whether it runs once per selected row or
once for the whole selection. **The list view does**, and the two declarations
are different dispatch contracts — not two spellings of one thing. Declare the
one whose shape your body is written for.

| View declaration | Dispatches | Each call carries | Body reads |
|:---|:---|:---|:---|
| `bulkActions: ['add_leads_to_campaign']` (bare string) | once **per selected row** — N rows, N requests | that row's `recordId`, **no** selection array | `ctx.recordId` |
| `bulkActionDefs: [{ name: 'add_leads_to_campaign', operation: 'custom', execution: 'aggregate' }]` | **once** for the whole selection | every selected id in `params._selectedIds`, **no** `recordId` | `input._selectedIds` |

The body above handles both, which is why it reads `_selectedIds` first and
falls back to `ctx.recordId`. Wire it up in the view:

```typescript
// src/views/example.view.ts — inside the `list` block
bulkActionDefs: [
  { name: 'add_leads_to_campaign', operation: 'custom', execution: 'aggregate' },
],
```

`execution: 'aggregate'` is required on an `operation: 'custom'` def and is not
boilerplate. A custom def without it has no dispatcher: the button ticks green
once per row and does nothing. The spec rejects that shape at parse time rather
than letting it ship.

Two more rules the shipped code depends on:

- **Do not declare `_selectedIds` in `params[]`.** It is a *built-in* key
  (`ACTION_PARAM_BUILTIN_KEYS` in `@objectstack/spec`, alongside `recordId` and
  `objectName`), injected by the grid renderer and admitted by the params gate
  without a declaration. Declaring it is not a supported authoring move.
- **An aggregate run is all-or-nothing.** The selection bar has no per-row
  retry, so a body that cannot cover the whole selection must throw rather than
  return a partial count the bar will toast as success.

> ⚠️ **The underscore is load-bearing. `selectedIds` without it is not a
> synonym — nothing can ever deliver it.**
>
> - as a **top-level** request key → never merged into the params bag, so the
>   body reads `undefined` and your own "nothing selected" guard fires;
> - under **`params.`** → refused by the strict params gate (ADR-0104) with
>   `400 Unknown action param "selectedIds" — not declared on this action`.
>
> Both refusals are correct, and together they look exactly like "the platform
> has no multi-select channel". It does; the key is `_selectedIds`. This cost
> two release candidates in this repo (#508): three rounds of review probed the
> no-underscore spelling, read the two 400s as proof of a missing capability,
> and shipped the bulk button removed. See objectstack-ai/objectstack#5568.

The live reference implementation is `mass_update_stage` —
`src/actions/opportunity.actions.ts` (the body) plus the `bulkActionDefs` entry
in `src/views/opportunity.view.ts` (the declaration), pinned end to end in
`test/bulk-action-dispatch.test.ts` and `test/action-sandbox.test.ts`. Read
those two files together: a body reading `_selectedIds` with no aggregate def in
the view is just as dead as the misspelling, because nothing injects the key.

`create_campaign` in `src/actions/lead.actions.ts` is the other contract — bare
string, per-record fan-out — and reads `ctx.recordId` only.

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

- **Platform-provided tools** — the registry the platform serves, not a list to
  guess at. The ones a CRM skill wants are `describe_object`, `list_objects`,
  `query_records`, `query_data`, `get_record`, `aggregate_data`,
  `search_knowledge` and `visualize_data`. From 17.0 the authoritative set is
  exported as `PLATFORM_PROVIDED_TOOL_NAMES` from `@objectstack/spec/system`;
  before 17.0 it is transcribed into `test/skills-integrity.test.ts`. Note
  `search_knowledge` retrieves over a *declared knowledge source*, and there is
  currently nowhere in a skills-only app to declare one.
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

Likewise, `triggerPhrases` was removed in 17.0 because the runtime never used
it. Describe a skill's intended requests in its `description` and
`instructions`, and use `triggerConditions` only when routing needs an
explicit context predicate.

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
