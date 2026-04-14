import { ObjectSchema, Field } from '@objectstack/spec/data';

export const HipaaAudit = ObjectSchema.create({
  name: 'hipaa_audit',
  label: 'HIPAA Audit',
  icon: 'shield-check',
  fields: {
    user_id: Field.lookup('users', { label: 'User', required: true }),
    action: Field.select({
      label: 'Action',
      required: true,
      options: [
        { label: 'View', value: 'view' },
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Export', value: 'export' },
        { label: 'Print', value: 'print' }
      ]
    }),
    record_type: Field.text({ label: 'Record Type', required: true }),
    record_id: Field.text({ label: 'Record ID', required: true }),
    timestamp: Field.datetime({ label: 'Timestamp', required: true }),
    ip_address: Field.text({ label: 'IP Address' }),
    access_reason: Field.textarea({ label: 'Access Reason' }),
    risk_level: Field.select({
      label: 'Risk Level',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' }
      ],
      defaultValue: 'low'
    })
  }
});
