---
'hotcrm': minor
---

**Every CRM notification now arrives in the recipient's own language.** The 19 `notify`
nodes across the sales, service and revenue flows stop sending a fixed English title and
body and reference a `sys_email_template` bundle instead — 19 templates, four locales
each (`en-US`, `zh-CN`, `ja-JP`, `es-ES`), 76 rows — supplying their record values as
render inputs. The delivery path resolves the template per recipient **after fan-out**,
off that person's own `sys_user.locale`, so one alert addressed to a Chinese-speaking rep
and a Japanese-speaking manager reaches each of them in their own language instead of
reaching both in English.

Wording is unchanged: every string is the text its node already sent, and no notification
says anything new. Administrators can now edit and re-translate this copy in Studio as
`sys_email_template` rows, rather than needing a code change for a typo.
