// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';

/**
 * Every forecast is editable by the sales managers — and deletable by none of
 * them (#2277, ruling B).
 *
 * The forecast is the manager's deliverable: they read every rep's snapshot
 * and adjust the committed number. `crm_forecast` is `private`, so the
 * object grant alone (`allowEdit: true`) reaches only the rows a manager owns,
 * and `viewAllRecords` widens READ only. Until #2277 the write half came from
 * `modifyAllRecords: true` on the Sales Manager profile — but Modify All is
 * the bypass for edit, delete AND transfer, and the platform grants delete on
 * it without reading `allowDelete`, so the profile's `allowDelete: false` was
 * never enforced (objectstack-ai/objectstack#25707 now refuses that pair at
 * build). This rule is the write half instead: an `edit` share opens update
 * and never delete (ADR-0111 D3), so `allowDelete: false` holds.
 *
 * The condition is a field predicate every row satisfies — every record has an
 * id. A literal `true` is never served as a sharing condition; this is the
 * match-every-row form the platform does serve.
 *
 * `test/forecast-manager-edit-share.test.ts` pins update 200 / delete 403 on a
 * booted stack, with the ablation that removing this rule turns the update red.
 */
export const ForecastManagerSharingRule = {
  name: 'forecast_manager_sharing',
  label: 'Forecasts — Sales Manager Edit',
  object: 'crm_forecast',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: 'sales_manager' },
};
