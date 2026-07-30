---
'hotcrm': patch
---

Analytics repairs (#492): chart axes read real measure names instead of
placeholders, report time windows roll at runtime instead of being frozen at
authoring time, the sales quota widget reads real forecast data through a new
`forecast` dataset, the service case table renders again, and the unreferenced
cube layer is deleted. Guarded by a new analytics metadata test file.
