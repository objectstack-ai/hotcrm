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
          "value": "Mr."
        },
        {
          "label": "Ms.",
          "value": "Ms."
        },
        {
          "label": "Dr.",
          "value": "Dr."
        },
        {
          "label": "Prof.",
          "value": "Prof."
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
          "value": "C-level"
        },
        {
          "label": "VP",
          "value": "VP"
        },
        {
          "label": "Director",
          "value": "Director"
        },
        {
          "label": "Manager",
          "value": "Manager"
        },
        {
          "label": "Individual Contributor",
          "value": "Individual Contributor"
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
          "value": "High"
        },
        {
          "label": "Medium - Key Influencer",
          "value": "Medium"
        },
        {
          "label": "Low - General Participant",
          "value": "Low"
        }
      ]
    }),
    relationship_strength: Field.select({
      label: 'Relationship Strength',
      defaultValue: 'Unknown',
      options: [
        {
          "label": "Strong - Strategic Partner",
          "value": "Strong"
        },
        {
          "label": "Medium - Good Relationship",
          "value": "Medium"
        },
        {
          "label": "Weak - Initial Contact",
          "value": "Weak"
        },
        {
          "label": "Unknown",
          "value": "Unknown"
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
          "value": "Mobile"
        },
        {
          "label": "WeChat",
          "value": "WeChat"
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