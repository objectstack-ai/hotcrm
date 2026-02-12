import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * HR Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Human Capital Management plugin
 * for cross-package discovery and AI agent tooling.
 */
export const HRCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'hr',
  version: '1.0.0',
  capabilities: [
    { name: 'organizational_structure', description: 'Department, position, and employee hierarchy' },
    { name: 'talent_acquisition', description: 'Recruitment, candidate management, and hiring pipeline' },
    { name: 'onboarding', description: 'Employee onboarding checklists and progress tracking' },
    { name: 'performance_management', description: 'Performance reviews, goals, and OKRs' },
    { name: 'learning_development', description: 'Training programs and certification tracking' },
    { name: 'time_attendance', description: 'Time off requests, attendance, and leave management' },
    { name: 'payroll', description: 'Payroll calculation and compensation management' },
  ],
});
