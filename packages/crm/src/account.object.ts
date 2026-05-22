import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Account = ObjectSchema.create({
  name: 'account',
  label: 'Account',
  pluralLabel: 'Accounts',
  icon: 'building',
  description: 'Enterprise customer and organization management',

  fields: {
    name: Field.text({
      label: 'Account Name',
      required: true,
      unique: true,
      maxLength: 255
    }),
    account_number: Field.text({
      label: 'Account Number',
      unique: true,
      maxLength: 40
    }),
    type: Field.select({
      label: 'Account Type',
      options: [
        {
          "label": "Prospect",
          "value": "prospect"
        },
        {
          "label": "Customer",
          "value": "customer"
        },
        {
          "label": "Partner",
          "value": "partner"
        },
        {
          "label": "Competitor",
          "value": "competitor"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    industry: Field.select({
      label: 'Industry',
      options: [
        {
          "label": "Technology",
          "value": "technology"
        },
        {
          "label": "Finance",
          "value": "finance"
        },
        {
          "label": "Manufacturing",
          "value": "manufacturing"
        },
        {
          "label": "Retail",
          "value": "retail"
        },
        {
          "label": "Healthcare",
          "value": "healthcare"
        },
        {
          "label": "Education",
          "value": "education"
        },
        {
          "label": "Real Estate",
          "value": "realestate"
        },
        {
          "label": "Energy",
          "value": "energy"
        },
        {
          "label": "Consulting",
          "value": "consulting"
        },
        {
          "label": "Other",
          "value": "other"
        },
        { label: "Financial Services", value: "financial_services" },
        { label: "Media & Entertainment", value: "media_entertainment" }
      ]
    }),
    annual_revenue: Field.currency({
      label: 'Annual Revenue',
      precision: 2
    }),
    number_of_employees: Field.number({ label: 'Number of Employees' }),
    rating: Field.select({
      label: 'Rating',
      options: [
        {
          "label": "Hot 🔥",
          "value": "hot"
        },
        {
          "label": "Warm ⭐",
          "value": "warm"
        },
        {
          "label": "Cold ❄️",
          "value": "cold"
        }
      ]
    }),
    phone: Field.phone({ label: 'Phone' }),
    fax: Field.phone({ label: 'Fax' }),
    website: Field.url({ label: 'Website' }),
    email: Field.email({ label: 'Email' }),
    billing_street: Field.textarea({
      label: 'Billing Street',
    }),
    billing_city: Field.text({
      label: 'Billing City',
      maxLength: 40
    }),
    billing_state: Field.text({
      label: 'Billing State/Province',
      maxLength: 40
    }),
    billing_postal_code: Field.text({
      label: 'Billing Postal Code',
      maxLength: 20
    }),
    billing_country: Field.text({
      label: 'Billing Country',
      maxLength: 40
    }),
    shipping_street: Field.textarea({
      label: 'Shipping Street',
    }),
    shipping_city: Field.text({
      label: 'Shipping City',
      maxLength: 40
    }),
    shipping_state: Field.text({
      label: 'Shipping State/Province',
      maxLength: 40
    }),
    shipping_postal_code: Field.text({
      label: 'Shipping Postal Code',
      maxLength: 20
    }),
    shipping_country: Field.text({
      label: 'Shipping Country',
      maxLength: 40
    }),
    customer_status: Field.select({
      label: 'Customer Status',
      defaultValue: 'prospect',
      options: [
        {
          "label": "Prospect",
          "value": "prospect"
        },
        {
          "label": "Active Customer",
          "value": "active_customer"
        },
        {
          "label": "Churned",
          "value": "churned"
        },
        {
          "label": "On Hold",
          "value": "on_hold"
        },
        { label: "Active", value: "active" }
      ]
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    sla_tier: Field.select({
      label: 'SLA Tier',
      description: 'Service level agreement tier',
      options: [
        {
          "label": "Platinum",
          "value": "platinum"
        },
        {
          "label": "Gold",
          "value": "gold"
        },
        {
          "label": "Silver",
          "value": "silver"
        },
        {
          "label": "Standard",
          "value": "standard"
        }
      ]
    }),
    health_score: Field.number({
      label: 'Health Score',
      description: 'Customer health score (0-100)',
      min: 0,
      max: 100,
      precision: 0
    }),
    next_renewal_date: Field.date({ label: 'Next Renewal Date' }),
    contract_value: Field.currency({
      label: 'Contract Value',
      description: 'Total value of all active contracts',
      readonly: true,
      precision: 2
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true,
      defaultValue: '$currentUser'
    }),
    parent_id: Field.lookup('account', { label: 'Parent Account' }),
    total_opportunities: Field.summary({
      label: 'Total Opportunities',
      summaryOperations: {
        object: 'opportunity',
        field: 'id',
        function: 'count'
      }
    }),
    total_open_opportunities_amount: Field.summary({
      label: 'Total Open Opportunities Amount',
      summaryOperations: {
        object: 'opportunity',
        field: 'amount',
        function: 'sum'
      }
    }),
    headquarters_location: Field.location({ label: 'Headquarters Location' }),
    billing_address: Field.address({ label: 'Billing Address' }),
    shipping_address: Field.address({ label: 'Shipping Address' })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});