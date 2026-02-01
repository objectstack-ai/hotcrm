const CampaignPage = {
  name: 'campaign_page',
  object: 'campaign',
  type: 'record',
  label: 'Campaign Layout',
  layout: {
    type: 'tabs',
    sections: [
      {
        label: 'Details',
        columns: 2,
        fields: ['name', 'type', 'status', 'start_date', 'end_date', 'description', 'is_active']
      },
      {
        label: 'Financials',
        columns: 2,
        fields: ['budgeted_cost', 'actual_cost', 'expected_revenue', 'actual_revenue']
      },
      {
        label: 'Campaign Members',
        type: 'related_list',
        object: 'campaign_member',
        columns: ['lead', 'contact', 'status', 'first_responded_date']
      }
    ]
  }
};

export default CampaignPage;
