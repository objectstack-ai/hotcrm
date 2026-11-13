// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from './_guarded-iteration';
type Flow = Automation.Flow;

/**
 * A renamed user re-titles their forecasts (#2435, ruling D).
 *
 * A forecast is titled "Q4 2026 · Nina Reyes": its period label and
 * `owner_name`, a copy of the owner's name the row stores
 * (`forecast.object.ts`). `forecast_owner_name` (`forecast.hook.ts`) writes the
 * copy when a forecast is saved with an owner. This flow is the other half:
 * when a user's name changes, it writes the new name onto that user's
 * forecasts, and the engine computes each one's stored title again.
 *
 * ── Why a flow on `sys_user`, not a hook ──────────────────────────────────
 * The user record is the platform's: an app may not hook another package's
 * object (ADR-0130 R4), and a `record_change` flow on a platform object is the
 * accepted shape (`quote_print_presented` on `sys_attachment`). It is also the
 * way forward the platform's own warning names for a stored value read from
 * another record: a snapshot field, with a flow on the related object that
 * updates the records pointing at it.
 *
 * ── Why `runAs: 'system'`, and what it may touch (AGENTS.md rules 9, 10) ──
 * A forecast is private to its owner, and the person who renames a user (the
 * user themself, an administrator) may not be able to edit every forecast of
 * theirs. A rename made through the sign-in service is a system write with no
 * trigger user at all. So the flow is elevated, and it is nothing else: it
 * writes one column, `owner_name`, on rows it finds by `owner_id`.
 *
 * Every scan pins an organization. `sys_user` is global and carries no
 * `organization_id`, so the flow reads the user's memberships first and scans
 * each of those organizations by its own id. A forecast in an organization the
 * user is not a member of keeps the name it has: that organization does not
 * know the person any more, and an elevated sweep across every organization
 * is exactly what rule 10 forbids.
 *
 * Each row is written by id: a stored title computed from the row's own
 * period cannot be written to many rows by one update (the engine refuses it).
 * The body is guarded, so a row that refuses the write (a legacy row a
 * validation rule now refuses on any edit) keeps its old name and the others
 * still follow; the run history names the row that was skipped.
 */
export const ForecastOwnerRenameFlow: Flow = {
  name: 'forecast_owner_rename',
  label: 'Forecast Owner Renamed',
  description: "When a user's name changes, write the new name onto their forecasts so each forecast's title follows.",
  type: 'record_change',
  status: 'active',
  // Elevated on purpose (see the header): the renaming person may not edit the
  // owner's private forecasts, and a sign-in-service rename has no user at all.
  // The one write is `owner_name`, on rows scanned inside one organization.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (user renamed)',
      config: {
        objectName: 'sys_user',
        triggerType: 'record-after-update',
        // A change of name only: every other write to the user record (a
        // sign-in stamp, an image) leaves the forecasts alone.
        condition: P`has(record.name) && has(previous.name) && record.name != previous.name`,
      },
    },
    {
      id: 'find_memberships',
      type: 'get_record',
      label: "Find the User's Organizations",
      config: {
        objectName: 'sys_member',
        filter: { user_id: cel`record.id` },
        limit: 100,
        outputVariable: 'memberships',
      },
    },
    {
      id: 'loop_memberships',
      type: 'loop',
      label: 'For Each Organization',
      config: {
        collection: cel`memberships`,
        iteratorVariable: 'membership',
        body: guarded('membership', {
          nodes: [
            {
              id: 'find_forecasts',
              type: 'get_record',
              label: "Find the User's Forecasts",
              config: {
                objectName: 'crm_forecast',
                // The organization pin (rule 10): this membership's
                // organization, never a scan by owner alone.
                filter: { owner_id: cel`record.id`, organization_id: cel`membership.organization_id` },
                limit: 500,
                outputVariable: 'ownedForecasts',
              },
            },
            {
              id: 'loop_forecasts',
              type: 'loop',
              label: 'For Each Forecast',
              config: {
                collection: cel`ownedForecasts`,
                iteratorVariable: 'ownedForecast',
                body: guarded('forecast', {
                  nodes: [
                    {
                      id: 'write_owner_name',
                      type: 'update_record',
                      label: 'Write Owner Name',
                      config: {
                        objectName: 'crm_forecast',
                        filter: { id: cel`ownedForecast.id` },
                        // ⛔ One column. Anything else written here would be
                        // written with the elevated context.
                        fields: { owner_name: cel`record.name` },
                      },
                    },
                  ],
                }),
              },
            },
          ],
          edges: [
            { id: 'm1', source: 'find_forecasts', target: 'loop_forecasts', type: 'default' },
          ],
        }),
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'find_memberships', type: 'default' },
    { id: 'e2', source: 'find_memberships', target: 'loop_memberships', type: 'default' },
    { id: 'e3', source: 'loop_memberships', target: 'end', type: 'default' },
  ],
};
