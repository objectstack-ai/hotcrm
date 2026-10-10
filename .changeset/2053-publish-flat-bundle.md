---
'hotcrm': patch
---

The marketplace now receives the whole app

HotCRM 4.0.0's marketplace publish carried an empty app: no objects, views,
dashboards, flows or sample data reached the marketplace, so a hosted install
of 4.0.0 had nothing to show. 4.0.1 publishes the whole app, including the
Cases, Knowledge and Service Overview entries in the app's navigation, and the
publish now stops with an error instead of uploading an app that is missing
any of its objects.
