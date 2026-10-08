---
'hotcrm': patch
---

Converting a lead now marks its campaign memberships as Converted on the standard SQL database too: before, the campaign counted the converted lead, but every one of that lead's campaign members stayed Sent or Responded.
