---
'hotcrm': patch
---

Every HotCRM permission set carries a one-sentence description of who holds it

**Setup → Permission Sets now tells HotCRM's sets apart (#2294).** Each of HotCRM's permission sets
carries one business sentence saying who holds it, what it opens and what it withholds, so an
administrator picking a set for a new user can tell a sales rep from a sales manager from the list.
For example, *Sales Representative* reads "Sales reps: work their own book of leads, accounts,
opportunities, quotes and activities and read the catalogues, but delete no customer record.", and
*CRM User* and *Guest (Public Forms)* replace their earlier multi-line paragraphs with one sentence
of the same meaning. Nothing about what a set grants has changed.

ObjectStack 18.1.0 could not translate permission sets when this was written; the 18.2.0 upgrade in
this release translates their names and descriptions in Chinese, Japanese and Spanish. The sets the platform itself ships (such as *Administrator — Full
Access* and *Organization Administrator*) are described by the platform, not by HotCRM.
