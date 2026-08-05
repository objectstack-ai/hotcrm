---
"hotcrm": patch
---

Add an **Export** button to the Cases list view.

The four roles that may export Cases — Sales Rep, Sales Manager, Service Agent and
System Admin — have held a live `allowExport` grant on `crm_case` all along, but no
Cases list view declared `exportOptions`, so the only way to use the grant was to call
the data API directly. The Cases list now offers CSV and Excel from its toolbar, the
same way Accounts, Contacts, Leads and Opportunities already do. Nothing about who may
export changed: the button and the API call the same server-side route, and a role
without the grant is refused either way.

Reports are no longer treated as an export surface in the permission-coverage guards.
A report page renders a chart and a data table and offers no download, so counting it
as one meant a new report could make the suite demand bulk-export rights on an object
whose users had no way to export it.
