import { z } from 'zod';

export interface FieldConfig {
  label?: string;
  type?: string;
  required?: boolean;
  unique?: boolean;
  searchable?: boolean;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  [key: string]: any;
}

export function defineObjectFromZod(
  name: string,
  schema: z.ZodObject<any>,
  config: {
    label: string;
    labelPlural?: string;
    icon?: string;
    description?: string;
    enable?: Record<string, boolean>;
    fields?: Record<string, Partial<FieldConfig>>; // Overrides
  }
) {
  const fields: Record<string, FieldConfig> = {};
  const shape = schema.shape;

  for (const key in shape) {
    const zodType = shape[key];
    const field: FieldConfig = {};

    // 1. Basic Type Mapping
    parseZodType(zodType, field);

    // 2. Parse Description as Label (Convention)
    if (zodType.description) {
      field.label = zodType.description;
    }

    // 3. Apply Overrides
    if (config.fields && config.fields[key]) {
      Object.assign(field, config.fields[key]);
    }
    
    // snake_case keys convention enforcement could go here
    fields[key] = field;
  }

  return {
    name,
    label: config.label,
    labelPlural: config.labelPlural || config.label,
    icon: config.icon,
    description: config.description,
    enable: config.enable,
    fields
  };
}

function parseZodType(zodType: any, field: FieldConfig) {
  // Handle Optional/Nullable
  if (zodType instanceof z.ZodOptional || zodType instanceof z.ZodNullable) {
    field.required = false;
    parseZodType(zodType.unwrap(), field);
    return;
  } else {
    field.required = true;
  }

  // Handle Default
  if (zodType instanceof z.ZodDefault) {
    if (typeof zodType._def.defaultValue === 'function') {
         field.defaultValue = zodType._def.defaultValue();
    } else {
        field.defaultValue = zodType._def.defaultValue;
    }
    parseZodType(zodType._def.innerType, field);
    return;
  }

  // Base Types
  if (zodType instanceof z.ZodString) {
    field.type = 'text';
  } else if (zodType instanceof z.ZodNumber) {
    field.type = 'number';
  } else if (zodType instanceof z.ZodBoolean) {
    field.type = 'boolean';
  } else if (zodType instanceof z.ZodDate) {
    field.type = 'datetime';
  } else if (zodType instanceof z.ZodEnum) {
    field.type = 'select';
    field.options = (zodType.options as string[]).map((opt) => ({ label: opt, value: opt }));
  }
}
