// 常驻 Playwright driver:HTTP 控制端,POST {persona, code} → 在该 persona 的
// 独立浏览器上下文里执行 code(异步函数体,注入 page/ctx/logs/reqs)。
// 用法:node driver.mjs <app-port> [ctl-port]   (默认 ctl 4199)
// 客户端见 drv.sh。截图请存 cwd 的 shots/ 下。

import { createRequire } from 'module';
import http from 'http';
import path from 'path';

const APP_PORT = process.argv[2] || '4101';
const CTL_PORT = Number(process.argv[3] || 4199);
const APP = `http://localhost:${APP_PORT}`;

// 用 hotcrm 自己的 playwright 依赖;预装浏览器与依赖版本不匹配时,
// 用 executablePath 指向系统 Chromium(Claude 远程环境为 /opt/pw-browsers/chromium)。
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const browser = await chromium.launch({ headless: true, executablePath }).catch(() =>
  chromium.launch({ headless: true }));

const contexts = new Map(); // persona -> {ctx, page, logs, reqs}

async function getPage(persona = 'admin') {
  if (!contexts.has(persona)) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 500)); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 500)}`));
    const reqs = [];
    page.on('requestfinished', async (r) => {
      try {
        const resp = await r.response();
        if (r.url().includes('/api/')) reqs.push({ m: r.method(), u: r.url().replace(APP, ''), s: resp?.status() });
      } catch { /* ignore */ }
      if (reqs.length > 300) reqs.splice(0, reqs.length - 300);
    });
    page.on('requestfailed', (r) => {
      if (r.url().includes('/api/')) reqs.push({ m: r.method(), u: r.url().replace(APP, ''), s: 'FAILED', e: r.failure()?.errorText });
    });
    contexts.set(persona, { ctx, page, logs, reqs });
  }
  return contexts.get(persona);
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    try {
      const { persona, code } = JSON.parse(body || '{}');
      const h = await getPage(persona);
      const fn = new Function('page', 'ctx', 'logs', 'reqs', 'browser', 'contexts', `return (async()=>{ ${code} })()`);
      const out = await fn(h.page, h.ctx, h.logs, h.reqs, browser, contexts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: out ?? null }).slice(0, 100000));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String((e && e.message) || e).slice(0, 2000) }));
    }
  });
});
server.listen(CTL_PORT, () => console.log(`driver ready on ${CTL_PORT}, app ${APP}`));
