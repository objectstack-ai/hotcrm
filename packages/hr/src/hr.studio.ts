/**
 * HR Studio Plugin — HR Cloud
 *
 * Provides Studio IDE extensions for the HR Cloud package including
 * onboarding workflows, HR analytics, employee profiles, and org charts.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const hrStudioConfig = {
  id: 'hotcrm.hr',
  name: 'hotcrm-hr-studio',
  version: '1.0.0',
  description: 'Studio extensions for HR Cloud',
  activationEvents: [
    'onObject:employee',
    'onObject:candidate',
    'onObject:application',
    'onObject:interview',
    'onObject:offer',
    'onObject:onboarding',
    'onObject:department',
    'onObject:position'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'hr',
        label: 'HR Cloud',
        order: 30,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'start_onboarding',
        label: 'Start Onboarding',
        location: 'toolbar' as const
      },
      {
        id: 'hr_analytics',
        label: 'HR Analytics',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'employee_profile',
        label: 'Employee Profile',
        location: 'right' as const
      },
      {
        id: 'org_chart',
        label: 'Org Chart',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.hr.startOnboarding', label: 'Start Employee Onboarding' },
      { id: 'hotcrm.hr.showHRAnalytics', label: 'Show HR Analytics Dashboard' },
      { id: 'hotcrm.hr.showEmployeeProfile', label: 'Show Employee Profile' },
      { id: 'hotcrm.hr.showOrgChart', label: 'Show Organization Chart' }
    ]
  }
};

export const HrStudioPlugin = defineStudioPlugin(hrStudioConfig);

export const HrStudioManifest = StudioPluginManifestSchema.parse(hrStudioConfig);

export default HrStudioPlugin;
