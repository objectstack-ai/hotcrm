import CRMPlugin1 from '@hotcrm/crm';
import * as CRMModule from '@hotcrm/crm';

console.log('Default import:', CRMPlugin1);
console.log('Namespace import:', CRMModule);
console.log('CRMPlugin from namespace:', CRMModule.CRMPlugin);
console.log('default from namespace:', CRMModule.default);
