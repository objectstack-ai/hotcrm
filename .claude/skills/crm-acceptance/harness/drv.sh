#!/bin/bash
# 向 driver 发一段 playwright 代码:drv.sh <persona> <<'JS' … JS
# 代码里可用 page/ctx/logs/reqs;return 值须 JSON 可序列化。
#
# persona 首次使用前先登录(React 受控输入不吃 fill,直接页面内 POST 认证):
#   ./drv.sh rep <<'JS'
#   await page.goto('http://localhost:4101/_console/');
#   await page.evaluate(async () => (await fetch('/api/v1/auth/sign-in/email', {
#     method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
#     body: JSON.stringify({email:'na.rep@objectos.ai', password:'demo1234'})})).status);
#   await page.goto('http://localhost:4101/_console/');
#   return page.url();
#   JS
persona="$1"
ctl="${DRV_CTL:-4199}"
code=$(cat)
jq -n --arg p "$persona" --arg c "$code" '{persona:$p,code:$c}' | curl -s -m 120 -X POST "http://localhost:${ctl}" -d @-
