import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Contact = ObjectSchema.create({
  name: 'contact',
  label: 'Contact',
  pluralLabel: 'Contacts',
  icon: 'user',
  description: 'Individual contact management',

  fields: {
    first_name: Field.text({
      label: 'First Name',
      maxLength: 40
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      maxLength: 80
    }),
    salutation: Field.select({
      label: 'Salutation',
      options: [
        {
          "label": "Mr.",
          "value": "mr."
        },
        {
          "label": "Ms.",
          "value": "ms."
        },
        {
          "label": "Dr.",
          "value": "dr."
        },
        {
          "label": "Prof.",
          "value": "prof."
        }
      ]
    }),
    account_id: Field.lookup('account', { label: 'Account Id', deleteBehavior: 'cascade' }),
    title: Field.text({
      label: 'Title',
      maxLength: 128
    }),
    department: Field.text({
      label: 'Department',
      maxLength: 80
    }),
    level: Field.select({
      label: 'Level',
      options: [
        {
          "label": "C-Level",
          "value": "c_level"
        },
        {
          "label": "VP",
          "value": "vp"
        },
        {
          "label": "Director",
          "value": "director"
        },
        {
          "label": "Manager",
          "value": "manager"
        },
        {
          "label": "Individual Contributor",
          "value": "individual_contributor"
        }
      ]
    }),
    email: Field.email({
      label: 'Email',
      unique: true
    }),
    phone: Field.phone({ label: 'Phone' }),
    mobile_phone: Field.phone({ label: 'Mobile' }),
    fax: Field.phone({ label: 'Fax' }),
    is_decision_maker: Field.boolean({
      label: 'Decision Maker',
      description: 'Whether this contact is a primary decision maker',
      defaultValue: false
    }),
    influence_level: Field.select({
      label: 'Influence Level',
      options: [
        {
          "label": "High - Final Decision Maker",
          "value": "high"
        },
        {
          "label": "Medium - Key Influencer",
          "value": "medium"
        },
        {
          "label": "Low - General Participant",
          "value": "low"
        }
      ]
    }),
    relationship_strength: Field.select({
      label: 'Relationship Strength',
      defaultValue: 'unknown',
      options: [
        {
          "label": "Strong - Strategic Partner",
          "value": "strong"
        },
        {
          "label": "Medium - Good Relationship",
          "value": "medium"
        },
        {
          "label": "Weak - Initial Contact",
          "value": "weak"
        },
        {
          "label": "Unknown",
          "value": "unknown"
        }
      ]
    }),
    preferred_contact: Field.select({
      label: 'Preferred Contact Method',
      options: [
        {
          "label": "Email",
          "value": "email"
        },
        {
          "label": "Phone",
          "value": "phone"
        },
        {
          "label": "Mobile",
          "value": "mobile"
        },
        {
          "label": "WeChat",
          "value": "wechat"
        }
      ]
    }),
    last_contact_date: Field.date({
      label: 'Last Contact Date',
      readonly: true
    }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true
  },
});