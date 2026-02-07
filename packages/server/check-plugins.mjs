import CRM from '@hotcrm/crm';
import Finance from '@hotcrm/finance';

console.log('CRM Plugin:', CRM.CRMPlugin?.name, CRM.CRMPlugin?.version);
console.log('Finance Plugin:', Finance.FinancePlugin?.name, Finance.FinancePlugin?.version);
console.log('CRM Plugin has init?', typeof CRM.CRMPlugin?.init);
console.log('CRM Plugin objects count:', Object.keys(CRM.CRMPlugin?.objects || {}).length);
