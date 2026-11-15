---
"hotcrm": patch
---

Project Delivery: a Closed or Cancelled project no longer takes new timesheets or expenses (#2491). Creating one on such a project, or moving one onto it, is refused with a message naming the project and its status. A draft already on the project stays editable, but cannot be submitted until it is moved to an open project. Completed projects still take late bookings.
