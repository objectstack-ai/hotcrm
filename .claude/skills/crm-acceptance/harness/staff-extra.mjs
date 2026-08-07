// 开通 crm-acceptance 走查需要、但不在 demo-staffing.ts 里的两个 persona:
//   service.agent@objectos.ai   (position: service_agent)
//   marketing.user@objectos.ai  (position: marketing_user)
// 密码 demo1234。幂等,可重复运行;结束前重估全部启用的共享规则(与
// scripts/demo-staff.ts 的第 3 步同理:种子行是 isSystem 写入,不触发
// plugin-sharing 的物化钩子)。
//
// 用法:node staff-extra.mjs <port>   (dev server 已在该端口运行,dev-admin 种子可用)

const port = process.argv[2] || '4101';
const BASE = `http://localhost:${port}`;
let cookie = '';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: BASE, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const sc = res.headers.getSetCookie?.() ?? [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const t = await res.text();
  let j = {};
  try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t }; }
  return { status: res.status, json: j };
}

const r = await call('POST', '/api/v1/auth/sign-in/email', { email: 'admin@objectos.ai', password: 'admin123' });
if (r.status !== 200) { console.error('admin sign-in failed', r.status, r.json); process.exit(1); }
console.log('admin sign-in', r.status);

const people = [
  { email: 'service.agent@objectos.ai', name: 'Sam Iker', positions: ['service_agent'] },
  { email: 'marketing.user@objectos.ai', name: 'Mia Landry', positions: ['marketing_user'] },
];

const mem = await call('POST', '/api/v1/data/sys_member/query', { filters: [], top: 5 });
const orgId = mem.json?.records?.[0]?.organization_id;

for (const p of people) {
  const q = await call('POST', '/api/v1/data/sys_user/query', { filters: [['email', '=', p.email]], top: 5 });
  let userId = q.json?.records?.[0]?.id;
  if (!userId) {
    const c = await call('POST', '/api/v1/auth/admin/create-user', {
      email: p.email, password: 'demo1234', name: p.name, mustChangePassword: false,
    });
    userId = c.json?.data?.user?.id;
    console.log('created', p.email, c.status, userId);
  } else console.log('exists', p.email, userId);
  for (const pos of p.positions) {
    const h = await call('POST', '/api/v1/data/sys_user_position/query', {
      filters: [['user_id', '=', userId], ['position', '=', pos]], top: 5,
    });
    if ((h.json?.records ?? []).length === 0) {
      const a = await call('POST', '/api/v1/data/sys_user_position', {
        user_id: userId, position: pos, ...(orgId ? { organization_id: orgId } : {}),
      });
      console.log('  +position', pos, a.status);
    }
  }
}

const rules = await call('POST', '/api/v1/data/sys_sharing_rule/query', { filters: [['active', '=', true]], top: 100 });
for (const rule of rules.json?.records ?? []) {
  const e = await call('POST', `/api/v1/sharing/rules/${rule.id}/evaluate`);
  console.log('rule', rule.name, e.status);
}

for (const p of people) {
  cookie = '';
  const s = await call('POST', '/api/v1/auth/sign-in/email', { email: p.email, password: 'demo1234' });
  console.log('verify sign-in', p.email, s.status);
  if (s.status !== 200) process.exit(1);
}
console.log('done.');
