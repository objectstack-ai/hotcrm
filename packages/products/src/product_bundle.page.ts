const ProductBundlePage = {
  name: 'product_bundle_page',
  object: 'product_bundle',
  type: 'record',
  label: 'Bundle Configuration',
  layout: {
    type: 'tabs',
    sections: [
      {
        label: 'Bundle Info',
        columns: 2,
        fields: ['name', 'bundle_code', 'status', 'bundle_type', 'pricing_method']
      },
      {
        label: 'Components',
        type: 'related_list',
        object: 'product_bundle_component',
        columns: ['product', 'quantity', 'optional', 'price_override']
      }
    ]
  }
};

export default ProductBundlePage;
