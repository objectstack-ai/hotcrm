---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Marketing: a person who opted out of email is refused in the same words wherever the enrollment was tried, in Chinese, Japanese and Spanish (#2774).** Before, the one rule "a person who opted out of email is not added to a campaign" read three ways in Simplified Chinese: the lead's field was labelled `拒收邮件` and the contact's `拒绝邮件`, the Campaign Members panel's **New** answered `张伟已拒收邮件，因此这个线索没有加入营销活动。` while **Add to Campaign** answered `张伟 已退订邮件，因此该线索没有被加入营销活动。`, and the **Enroll Members** result counted people skipped for `退订邮件`. Now the field is `拒收邮件` on both the lead and the contact, both doors answer `张伟已拒收邮件，因此这个线索没有加入营销活动。` (and the matching sentence for a contact), and the result counts people skipped `因拒收邮件或没有邮箱地址`. `已退订` stays the campaign member's status only. Japanese and Spanish had the same split between the two doors and now answer one sentence each (`…はメール配信停止を選んでいるため、…` and `… se ha excluido de los correos, por lo que …`); Spanish also words the skipped count the same way. The English wording is unchanged, and so is what gets refused. The in-app marketing manual and the Chinese docs pages name the field `拒收邮件` throughout, and the Campaign Members docs page no longer says the refusal is shown in English in every language: it has been translated since #2507.
