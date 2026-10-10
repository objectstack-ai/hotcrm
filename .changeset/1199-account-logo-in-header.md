---
'hotcrm': patch
---

An account's page header now shows its company logo

Open an account that has a **Company Logo** uploaded (the **Branding** section
of the form) and the logo now sits beside the title at the top of the page,
the same way it already heads the account's card in **Account Cards**. An
account without a logo shows no picture there: no placeholder and no initials.

`crm_account` declares `imageField: 'logo'`, the object-level picture the
platform draws in every record page header. The platform refuses an
`imageField` that names anything other than an image or avatar field, so the
declaration cannot point at the wrong field and still save.
