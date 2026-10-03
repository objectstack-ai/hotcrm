---
'hotcrm': patch
---

The shipped contact import template now imports all 50 of its rows

`assets/import-templates/contacts.csv` writes `HR` in its **Department** column.
The import matches a picklist cell against an option's code exactly and its
label case-insensitively, so `HR` matched neither the code `hr` nor the label
**Human Resources**, and six of the template's fifty rows failed with
`Department: "HR" is not a known option`. The contact import mapping
(`crm_contact_import`) now translates `HR` to **Human Resources**, the same way
it already translates foreign lead-source words such as *Trade Show*.

The template file itself is unchanged. A dry run and a real import of it now
both report 50 rows and no errors.
