// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
type Flow = Automation.Flow;

/**
 * A renamed user re-titles their staffing rows (hotcrm#2568).
 *
 * A project member is titled by `person_name`, a copy of the person's name
 * the row stores (`project_member.object.ts`); `project_member_person_name`
 * (`project_member.hook.ts`) writes it when a row is saved with a person. This
 * flow is the other half: when a user's name changes, it writes the new name
 * onto that user's staffing rows. Same shape, and the same reasons, as
 * `forecast_owner_rename` (`src/sales/flows/forecast-owner-rename.flow.ts`):
 *
 * - A flow on `sys_user`, not a hook: the user record is the platform's, and
 *   an app may not hook another package's object (ADR-0130 R4).
 * - `runAs: 'system'` (AGENTS.md rule 9): the person who renames a user may
 *   not edit every project that user is staffed on, and a rename made through
 *   the sign-in service has no trigger user at all. It writes one column,
 *   `person_name`, on rows it finds by `person`.
 * - Every scan pins an organization (rule 10): `sys_user` carries no
 *   `organization_id`, so the flow reads the user's memberships first and
 *   scans each of those organizations by its own id.
 * - Each row is written by id, in a guarded body, so a row that refuses the
 *   write keeps its old name and the others still follow; the run history
 *   names the row that was skipped.
 */
export const ProjectMemberPersonRenameFlow: Flow = {
  name: 'project_member_person_rename',
  label: 'Project Member Person Renamed',
  description: "When a user's name changes, write the new name onto their staffing rows so each row's title follows.",
  type: 'record_change',
  status: 'active',
  // Elevated on purpose (see the header). The one write is `person_name`, on
  // rows scanned inside one organization.
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
        // sign-in stamp, an image) leaves the staffing alone.
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
              id: 'find_staffing',
              type: 'get_record',
              label: "Find the User's Staffing Rows",
              config: {
                objectName: 'crm_project_member',
                // The organization pin (rule 10): this membership's
                // organization, never a scan by person alone.
                filter: { person: cel`record.id`, organization_id: cel`membership.organization_id` },
                limit: 500,
                outputVariable: 'staffing',
              },
            },
            {
              id: 'loop_staffing',
              type: 'loop',
              label: 'For Each Staffing Row',
              config: {
                collection: cel`staffing`,
                iteratorVariable: 'staffingRow',
                body: guarded('staffing row', {
                  nodes: [
                    {
                      id: 'write_person_name',
                      type: 'update_record',
                      label: 'Write Person Name',
                      config: {
                        objectName: 'crm_project_member',
                        filter: { id: cel`staffingRow.id` },
                        // ⛔ One column. Anything else written here would be
                        // written with the elevated context.
                        fields: { person_name: cel`record.name` },
                      },
                    },
                  ],
                }),
              },
            },
          ],
          edges: [
            { id: 'm1', source: 'find_staffing', target: 'loop_staffing', type: 'default' },
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
