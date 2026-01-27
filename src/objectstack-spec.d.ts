// Placeholder type definitions for @objectstack/spec
// This file is generated to support the refactoring to TypeScript-based metadata
// In a real project, this would be installed via npm

declare module '@objectstack/spec/data' {
  export interface FieldSchema {
    name: string;
    type: string;
    label: string;
    required?: boolean;
    defaultValue?: any;
    options?: { label: string; value: string; [key: string]: any }[];
    referenceTo?: string;
    [key: string]: any;
  }

  export interface ObjectSchema {
    name: string;
    label: string;
    labelPlural?: string;
    icon?: string;
    description?: string;
    features?: Record<string, boolean>;
    fields: FieldSchema[];
    relationships?: any[];
    listViews?: any[];
    pageLayout?: any;
    validationRules?: any[];
    [key: string]: any;
  }

  export interface HookSchema {
    name: string;
    object: string;
    events: ('beforeInsert' | 'afterInsert' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete')[];
    handler: (ctx: any) => Promise<void>;
    conditions?: any[];
    [key: string]: any;
  }
}

declare module '@objectstack/spec/ui' {
  export interface DashboardSchema {
    name: string;
    label: string;
    widgets: any[];
  }
}
