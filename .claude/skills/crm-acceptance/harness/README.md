# 走查驱动脚手架

三个文件,全部对着**已在跑**的 dev server 工作(不 build、不改库结构):

```
node staff-extra.mjs <port>          # 开通 service.agent / marketing.user + 重估共享规则
node driver.mjs <app-port> [ctl]     # 常驻 Playwright driver,控制端默认 4199
./drv.sh <persona> <<'JS' … JS      # 向 driver 发一段 playwright 代码,stdin 传入
```

driver 特性:

- 每个 persona 名字一个独立浏览器上下文(cookie 隔离),首次使用时自动创建;
  登录方式见 drv.sh 顶部注释(页面内 fetch POST 认证接口,规避 React 受控输入)。
- 注入四个变量:`page`(Playwright Page)、`ctx`、`logs`(console error/pageerror
  环形缓冲)、`reqs`(最近 300 条 /api/ 请求 {m,u,s})。
- 截图存到调用方 cwd 的 `shots/` 下,命名 `<persona>-NN-desc.png`。
- Playwright 版本与预装浏览器不匹配时,driver 用 `PLAYWRIGHT_CHROMIUM_PATH`
  环境变量(默认 `/opt/pw-browsers/chromium`)指定 executablePath。

并发约定:五角色可五个子 agent 并发,但**一个 persona 上下文只归一个 agent**;
若主会话占用 `admin`,子 agent 用 `admin2` 之类的新名字自行登录。
