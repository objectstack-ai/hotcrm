import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * System Settings Page Layout
 * App page for system administrators to manage user preferences, notifications, and system configuration.
 */
export const SettingsPage = {
  name: 'settings',
  type: 'app' as const,
  kind: 'full' as const,
  label: 'System Settings',
  assignedProfiles: ['admin', 'system_admin'],
  template: 'default',
  isDefault: false,

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'preferences',
      components: [
        {
          type: 'page:card' as const,
          label: 'User Preferences',
          properties: {}
        }
      ]
    },
    {
      name: 'notifications',
      components: [
        {
          type: 'page:card' as const,
          label: 'Notification Settings',
          properties: {}
        }
      ]
    },
    {
      name: 'system',
      components: [
        {
          type: 'page:card' as const,
          label: 'System Configuration',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(SettingsPage);

export default SettingsPage;
