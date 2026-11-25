---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Marketing: a campaign that is not open for enrollment is refused in the same sentence at every door, in Chinese and Japanese (#2778).** Before, a Chinese or Japanese user read one refusal when creating a member with **New** on a campaign's member list, through import or through the API, and a differently worded one from **Add to Campaign** and **Enroll Members**: in Chinese `春季发布未开放报名，或已不存在：只有“规划中”或“进行中”的营销活动可以加入成员。没有人被加入。` against `春季发布 不在可加入成员的状态，或已不存在：只有处于「规划中」或「进行中」的营销活动可以加入成员。没有任何人被加入。`, and in Japanese `…は参加受付中ではないか、…誰も追加されていません。` against `… はメンバー登録を受け付けていないか、…誰も登録されていません。` Now all three read as the first of each pair: the same words and no space after the campaign's name, and in Chinese the same quotes around the two statuses. **Enroll Members** names the campaign as `这个营销活动` / `このキャンペーン`, as it runs on one campaign. English and Spanish already matched and are unchanged, and so is which campaigns are refused. The Chinese marketing manual's line about **Enroll Members** now uses the same word for a campaign that is no longer open.
