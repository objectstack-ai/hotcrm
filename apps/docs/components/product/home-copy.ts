/**
 * The homepage's own sections (#2608, parts 4–8). The headline, the chain and
 * the six apps are the shared block in `lib/product/`; this file holds only
 * what the homepage says beyond it. Every sentence states what ships today.
 * ⛔ No customer logos, user counts, testimonials or prices: none exist.
 */

type Link = { label: string; href: string };

export type HomeCopy = {
  docs: string;
  run: string;
  github: string;
  scenarios: { title: string; intro: string; items: { title: string; text: string; href: string }[] };
  ai: { title: string; points: { title: string; text: string; link: Link }[] };
  boundaries: { title: string; text: string; link: Link };
  open: { title: string; points: string[]; link: Link; runTitle: string; runAfter: string };
  partners: { title: string; text: string; links: Link[]; builtOn: string };
};

const en: HomeCopy = {
  docs: 'Docs',
  run: 'Run it locally in three commands',
  github: 'GitHub',
  scenarios: {
    title: 'Three sample scenarios',
    intro: 'Each walks one kind of business end to end, and marks plainly what is not shipped.',
    items: [
      { title: 'A product sale', text: 'Lead, opportunity, quote, order, contract, invoice and payment.', href: '/docs/getting-started/scenario-product-sale' },
      { title: 'Project services', text: 'The contract and its collection plan, then the project with its budget, timesheets and expenses.', href: '/docs/getting-started/scenario-project-services' },
      { title: 'A subscription', text: 'A contract with its terms and renewal, one collection step per period, and the renewal deal.', href: '/docs/getting-started/scenario-subscription' },
    ],
  },
  ai: {
    title: 'AI and agents',
    points: [
      {
        title: 'The business definition is data',
        text: 'Objects, fields, rules and screens are metadata in a Git repository. An AI coding agent changes them, and the tables, the API and the screens follow.',
        link: { label: 'Customize and extend', href: '/docs/developers/customize-and-extend' },
      },
      {
        title: 'Your agent works with your permissions',
        text: 'Every object is open over MCP. An agent signs in as a person and can do what that person can do, nothing more.',
        link: { label: 'Connect your agent', href: '/docs/ai-copilot/connect-your-agent' },
      },
      {
        title: 'No built-in assistant',
        text: 'The community edition runs no assistant of its own: you connect yours. HotCRM ships eight skills for the platform assistant, where an environment runs one, and opens nine actions to agents, among them Convert Lead and Submit for Reimbursement. An action that cannot be undone, or sends to an approver, asks the person first.',
        link: { label: 'Actions open to agents', href: '/docs/ai-copilot/agent-actions' },
      },
    ],
  },
  boundaries: {
    title: 'What it is not',
    text: 'HotCRM keeps no general ledger, calculates no tax and runs no payroll. It records orders, invoices, payments and expenses, and works beside your finance software, which stays the books.',
    link: { label: 'Boundary with finance software', href: '/docs/sales/billing-handoff' },
  },
  open: {
    title: 'Open source, and yours to run',
    points: [
      'HotCRM and ObjectStack, the platform under it, are both Apache-2.0.',
      'Run it on your own servers, or install it into an ObjectStack environment from the marketplace.',
      'Switch off the modules you do not use. Nothing is deleted, and switching one back on brings it back as it was.',
    ],
    link: { label: 'Enable and disable modules', href: '/docs/administration/modules' },
    runTitle: 'Run it locally',
    runAfter: 'Then open http://localhost:4001. The first start loads the demo data.',
  },
  partners: {
    title: 'For implementation partners and developers',
    text: "A partner fits HotCRM to a customer in a clone of the repository: configuration first, then changes made with a coding agent and checked by pnpm verify, delivered as the customer's own deployment.",
    links: [
      { label: 'Developers', href: '/docs/developers' },
      { label: 'Customize and extend', href: '/docs/developers/customize-and-extend' },
    ],
    builtOn: 'Built on ObjectStack',
  },
};

const zhHans: HomeCopy = {
  docs: '文档',
  run: '三条命令在本地运行',
  github: 'GitHub',
  scenarios: {
    title: '三个示例场景',
    intro: '每个场景从头到尾走一种业务，并明确标出哪些还没有提供。',
    items: [
      { title: '一次产品销售', text: '线索、商机、报价、订单、合同、发票和回款。', href: '/docs/getting-started/scenario-product-sale' },
      { title: '项目服务', text: '合同及其回款计划，然后是带预算、工时单和费用的项目。', href: '/docs/getting-started/scenario-project-services' },
      { title: '一份订阅', text: '带条款和续约的合同、每个周期一步的回款计划，以及续约商机。', href: '/docs/getting-started/scenario-subscription' },
    ],
  },
  ai: {
    title: 'AI 与智能体',
    points: [
      {
        title: '业务定义就是数据',
        text: '对象、字段、规则和界面都是 Git 仓库里的元数据。AI 编码智能体修改它们，数据表、API 和界面随之改变。',
        link: { label: '定制与扩展', href: '/docs/developers/customize-and-extend' },
      },
      {
        title: '你的智能体用你的权限办事',
        text: '每个对象都通过 MCP 开放。智能体以某个人的身份登录，能做的就是这个人能做的，不多也不少。',
        link: { label: '接入你的智能体', href: '/docs/ai-copilot/connect-your-agent' },
      },
      {
        title: '没有内置助手',
        text: '社区版不自带助手：接入你自己的智能体。HotCRM 为平台助手提供八项技能（在环境运行平台助手时使用），并向智能体开放九个动作，例如转化线索和提交报销。不可撤销或会送去审批的动作，先征得本人确认。',
        link: { label: '对智能体开放的动作', href: '/docs/ai-copilot/agent-actions' },
      },
    ],
  },
  boundaries: {
    title: '它不做什么',
    text: 'HotCRM 不设总账、不算税、不算工资。它记录订单、发票、回款和费用，与你的财务软件并行工作，账仍然记在财务软件里。',
    link: { label: '与财务软件的边界', href: '/docs/sales/billing-handoff' },
  },
  open: {
    title: '开源，由你来运行',
    points: [
      'HotCRM 和它底下的平台 ObjectStack 都以 Apache-2.0 许可证发布。',
      '可以部署在你自己的服务器上，也可以从应用市场安装到一个 ObjectStack 环境里。',
      '用不到的模块可以停用。不会删除任何东西，重新启用后一切照旧。',
    ],
    link: { label: '启用和停用模块', href: '/docs/administration/modules' },
    runTitle: '在本地运行',
    runAfter: '然后打开 http://localhost:4001。首次启动会加载演示数据。',
  },
  partners: {
    title: '面向实施伙伴和开发者',
    text: '实施伙伴在仓库的克隆里为客户调整 HotCRM：先做配置，再借助编码智能体改动并用 pnpm verify 检查，最后作为客户自己的部署交付。',
    links: [
      { label: '开发者', href: '/docs/developers' },
      { label: '定制与扩展', href: '/docs/developers/customize-and-extend' },
    ],
    builtOn: '基于 ObjectStack 构建',
  },
};

const zhHant: HomeCopy = {
  docs: '文件',
  run: '三條命令在本機執行',
  github: 'GitHub',
  scenarios: {
    title: '三個示例情境',
    intro: '每個情境從頭到尾走一種業務，並明確標出哪些還沒有提供。',
    items: [
      { title: '一次產品銷售', text: '線索、商機、報價、訂單、合約、發票和回款。', href: '/docs/getting-started/scenario-product-sale' },
      { title: '項目服務', text: '合約及其回款計劃，然後是帶預算、工時單和費用的項目。', href: '/docs/getting-started/scenario-project-services' },
      { title: '一份訂閱', text: '帶條款和續約的合約、每個週期一步的回款計劃，以及續約商機。', href: '/docs/getting-started/scenario-subscription' },
    ],
  },
  ai: {
    title: 'AI 與智能體',
    points: [
      {
        title: '業務定義就是資料',
        text: '物件、欄位、規則和介面都是 Git 儲存庫裡的中繼資料。AI 程式碼智能體修改它們，資料表、API 和介面隨之改變。',
        link: { label: '客製化與擴展', href: '/docs/developers/customize-and-extend' },
      },
      {
        title: '你的智能體用你的權限辦事',
        text: '每個物件都透過 MCP 開放。智能體以某個人的身分登入，能做的就是這個人能做的，不多也不少。',
        link: { label: '接入你的智能體', href: '/docs/ai-copilot/connect-your-agent' },
      },
      {
        title: '沒有內建助手',
        text: '社群版不自帶助手：接入你自己的智能體。HotCRM 為平台助手提供八項技能（在環境執行平台助手時使用），並向智能體開放九個動作，例如 Convert Lead 和 Submit for Reimbursement。不可撤銷或會送去審批的動作，先徵得本人確認。',
        link: { label: '對智能體開放的動作', href: '/docs/ai-copilot/agent-actions' },
      },
    ],
  },
  boundaries: {
    title: '它不做什麼',
    text: 'HotCRM 不設總帳、不算稅、不算薪資。它記錄訂單、發票、回款和費用，與你的財務軟體並行運作，帳仍然記在財務軟體裡。',
    link: { label: '與財務軟體的邊界', href: '/docs/sales/billing-handoff' },
  },
  open: {
    title: '開源，由你來執行',
    points: [
      'HotCRM 和它底下的平台 ObjectStack 都以 Apache-2.0 授權條款發布。',
      '可以部署在你自己的伺服器上，也可以從應用市集安裝到一個 ObjectStack 環境裡。',
      '用不到的模組可以停用。不會刪除任何東西，重新啟用後一切照舊。',
    ],
    link: { label: '啟用和停用模組', href: '/docs/administration/modules' },
    runTitle: '在本機執行',
    runAfter: '然後開啟 http://localhost:4001。首次啟動會載入示範資料。',
  },
  partners: {
    title: '面向實施夥伴和開發者',
    text: '實施夥伴在儲存庫的克隆裡為客戶調整 HotCRM：先做設定，再藉助程式碼智能體改動並用 pnpm verify 檢查，最後作為客戶自己的部署交付。',
    links: [
      { label: '開發者', href: '/docs/developers' },
      { label: '客製化與擴展', href: '/docs/developers/customize-and-extend' },
    ],
    builtOn: '基於 ObjectStack 建構',
  },
};

export const homeCopy: Record<string, HomeCopy> = { en, 'zh-Hans': zhHans, 'zh-Hant': zhHant };
