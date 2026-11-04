---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A visitor on the public support form can no longer open a Critical case, and the form reads as written for them (#2368).** Until now the **Contact Support** form at `/forms/support` let anyone pick **Critical**, which escalates the case on arrival and hands it to the Service Manager pool. The form no longer asks for a priority: a web case arrives at **Low** and the service team triages it. Even a submission sent past the form that names Critical is stored at **High** at most, so a web case never escalates by itself. Staff can still open and raise cases at Critical. Above the fields the form now reads "For an urgent outage, call the service hotline." (「紧急故障请拨打服务热线。」), and the name and email fields are labelled **Your name** and **Your email** (「您的姓名」「您的邮箱」) instead of the agent-side **Supplied Name** and **Supplied Email**, in English, Chinese, Spanish and Japanese. The Service Manual and the Cases page describe the form as it now is.
