---
'hotcrm': patch
---

A sales rep can create a lead without first picking themselves as its owner. The **New Lead** form marked **Lead Owner** as required, so clicking **Create** with the field left blank stopped at *"Lead Owner is required"* and nothing was saved. The form no longer requires it. A lead created with the field left blank is owned by the person who created it, as on the **Opportunity**, **Account** and **Contact** New forms. **Lead Owner** stays on the form.
