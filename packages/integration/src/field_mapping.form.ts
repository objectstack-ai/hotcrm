import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Field Mapping Form Definition
 * Layout for creating and editing field mapping records between source and target systems.
 * Sections cover source configuration, target configuration, and mapping options.
 */
export const FieldMappingForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'field_mapping'
  },
  sections: [
    {
      label: 'Source',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'source_object', required: true, helpText: 'Object in the source system' },
        { field: 'source_field', required: true, helpText: 'Field in the source object' }
      ]
    },
    {
      label: 'Target',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'target_object', required: true, helpText: 'Object in the target system' },
        { field: 'target_field', required: true, helpText: 'Field in the target object' }
      ]
    },
    {
      label: 'Mapping Options',
      columns: '2' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'transformation_type', helpText: 'Data transformation to apply during sync' },
        { field: 'default_value', placeholder: 'Value to use when source is empty' },
        { field: 'is_required', helpText: 'Whether this mapping is required for sync to proceed' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(FieldMappingForm);

export default FieldMappingForm;
