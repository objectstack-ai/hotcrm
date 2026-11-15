// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the Sales hooks' refusal sentences (#2496).
 *
 * Keyed `hooks.<hook>.refusals.<CODE>[.reasons.<REASON>].message`, one entry
 * per sentence the hook's `refusals` catalogue declares; the English sentence
 * is the declared message itself. `test/hook-refusal-catalogue.test.ts` holds
 * every declared sentence to a translation here, with only declared holes.
 */
export const hooks: NonNullable<TranslationData['hooks']> = {
  account_protection: {
    refusals: {
      VALIDATION_FAILED: {
        message: '网站必须以 http:// 或 https:// 开头。',
        reasons: {
          annual_revenue: {
            message: '年营收必须大于或等于 0。',
          },
          converted_from_lead: {
            message: '来源线索只能由“转化线索”在创建客户时填写。请留空；这个客户会作为新客户提交审批。',
          },
        },
      },
      DELETE_RESTRICTED: {
        message: '无法删除客户：仍有 1 个商机（无论是否已关闭）引用它。请先删除这个商机，或把客户标记为不活跃，以代替删除。',
        reasons: {
          opportunities: {
            message: '无法删除客户：仍有 {{count}} 个商机（无论是否已关闭）引用它。请先删除这些商机，或把客户标记为不活跃，以代替删除。',
          },
          contract: {
            message: '无法删除客户：仍有 1 份已激活的合同引用它。请先终止或转移这份合同。',
          },
          contracts: {
            message: '无法删除客户：仍有 {{count}} 份已激活的合同引用它。请先终止或转移这些合同。',
          },
        },
      },
    },
  },
  contact_integrity: {
    refusals: {
      DUPLICATE_VALUE: {
        message: '已有另一个联系人使用邮箱 {{email}}。',
        reasons: {
          named: {
            message: '已有另一个联系人（{{contact}}）使用邮箱 {{email}}。',
          },
        },
      },
      DELETE_RESTRICTED: {
        message: '联系人{{contact}}仍被{{opportunities}} 个未结商机、{{quotes}} 个未结报价单和{{contracts}} 份有效合同引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请关闭每个未结商机，或为其指定其他主要联系人；为每个未结报价单指定其他联系人，或将其拒绝；为每份合同指定其他主要联系人（合同结束后仍保留其主要联系人）。',
        reasons: {
          opportunities: {
            message: '联系人{{contact}}仍被{{opportunities}} 个未结商机引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请关闭每个未结商机，或为其指定其他主要联系人。',
          },
          quotes: {
            message: '联系人{{contact}}仍被{{quotes}} 个未结报价单引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请为每个未结报价单指定其他联系人，或将其拒绝。',
          },
          contracts: {
            message: '联系人{{contact}}仍被{{contracts}} 份有效合同引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请为每份合同指定其他主要联系人（合同结束后仍保留其主要联系人）。',
          },
          opportunities_quotes: {
            message: '联系人{{contact}}仍被{{opportunities}} 个未结商机和{{quotes}} 个未结报价单引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请关闭每个未结商机，或为其指定其他主要联系人；为每个未结报价单指定其他联系人，或将其拒绝。',
          },
          opportunities_contracts: {
            message: '联系人{{contact}}仍被{{opportunities}} 个未结商机和{{contracts}} 份有效合同引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请关闭每个未结商机，或为其指定其他主要联系人；为每份合同指定其他主要联系人（合同结束后仍保留其主要联系人）。',
          },
          quotes_contracts: {
            message: '联系人{{contact}}仍被{{quotes}} 个未结报价单和{{contracts}} 份有效合同引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请为每个未结报价单指定其他联系人，或将其拒绝；为每份合同指定其他主要联系人（合同结束后仍保留其主要联系人）。',
          },
          all: {
            message: '联系人{{contact}}仍被{{opportunities}} 个未结商机、{{quotes}} 个未结报价单和{{contracts}} 份有效合同引用，因此不能删除；它所属的客户也不能删除，因为删除客户会同时删除其联系人。要释放这个联系人，请关闭每个未结商机，或为其指定其他主要联系人；为每个未结报价单指定其他联系人，或将其拒绝；为每份合同指定其他主要联系人（合同结束后仍保留其主要联系人）。',
          },
        },
      },
    },
  },
  contract_validation: {
    refusals: {
      VALIDATION_FAILED: {
        message: '合同期限（{{term}} 个月）与日期范围不符（从 {{start}} 到 {{end}} 为 {{calc}} 个月）。',
      },
      RECORD_LOCKED: {
        message: '已激活合同的结束日期不能提前（{{from}} → {{to}}）。请改用终止或变更流程。',
      },
    },
  },
  event_do_not_call_guard: {
    refusals: {
      FORBIDDEN: {
        message: '这个线索已标记为“禁止致电”，因此不能为其安排电话。如果电话已经打过，请记录为已举行；也可以改为预约会议，或先在记录上取消“禁止致电”。',
        reasons: {
          contact: {
            message: '这个联系人已标记为“禁止致电”，因此不能为其安排电话。如果电话已经打过，请记录为已举行；也可以改为预约会议，或先在记录上取消“禁止致电”。',
          },
        },
      },
    },
  },
  task_completion: {
    refusals: {
      VALIDATION_FAILED: {
        message: '提醒时间（{{reminder}}）晚于截止日期（{{due}}）；提醒应在截止之前触发。',
      },
    },
  },
  task_do_not_call_guard: {
    refusals: {
      FORBIDDEN: {
        message: '这个线索已标记为“禁止致电”，因此不能为其安排电话任务。如果电话已经打过，请记录一条已完成的电话；也可以选择非电话的任务类型，或先在记录上取消“禁止致电”。',
        reasons: {
          contact: {
            message: '这个联系人已标记为“禁止致电”，因此不能为其安排电话任务。如果电话已经打过，请记录一条已完成的电话；也可以选择非电话的任务类型，或先在记录上取消“禁止致电”。',
          },
        },
      },
    },
  },
  opportunity_lifecycle: {
    refusals: {
      RECORD_LOCKED: {
        message: '这个商机的状态变更需要审批：请改为设置“申请变更状态”（以及赢单或丢单原因）。申请获批后阶段才会生效。',
        reasons: {
          qualification_stage: {
            message: '这个商机需要先通过立项审批：请勾选“申请立项审批”。获批后才能修改阶段。',
          },
          qualification_requested_status: {
            message: '这个商机需要先通过立项审批：请勾选“申请立项审批”。获批后才能修改申请变更状态。',
          },
          qualification_both: {
            message: '这个商机需要先通过立项审批：请勾选“申请立项审批”。获批后才能修改阶段和申请变更状态。',
          },
          large_create: {
            message: '金额达到 {{amount}} 及以上的商机需要通过大额商机审批才能设为成交。请在未结阶段创建以提交审批，获批后即可设为成交。只有管理员可以直接创建已成交的商机。',
          },
          large_pending: {
            message: '金额达到 {{amount}} 及以上的商机需要通过大额商机审批才能设为成交，而它的审批状态是“审批中”。请求获批后即可设为成交。',
          },
          large_rejected: {
            message: '金额达到 {{amount}} 及以上的商机需要通过大额商机审批才能设为成交，而它的审批状态是“已驳回”。请修改商机并保存以重新提交审批，获批后即可设为成交。',
          },
          large_unsent: {
            message: '金额达到 {{amount}} 及以上的商机需要通过大额商机审批才能设为成交，而它的审批状态是“无需审批”。请先保存商机（不要关闭）以提交审批，获批后即可设为成交。',
          },
          closed_won: {
            message: '商机{{name}}已关闭（成交）；只能修改它的描述和下一步。',
          },
          closed_lost: {
            message: '商机{{name}}已关闭（失败）；只能修改它的描述和下一步。',
          },
        },
      },
    },
  },
  opportunity_account_capability: {
    refusals: {
      VALIDATION_FAILED: {
        message: '不能在这个客户下新建商机：它的商务能力是“仅结算”，只能用于开票和收款，不能再登记新业务。请选择其他客户，或先把这个客户的商务能力改为“完整”。',
      },
    },
  },
  lead_automation: {
    refusals: {
      RECORD_LOCKED: {
        message: '已转化线索{{lead}}只能修改描述和备注。请在转化生成的记录上修改。',
        reasons: {
          convert_pending: {
            message: '无法转化线索{{lead}}：它的转化仍在等待审批。审批人批准后才能转化，线索上的“转化审批”字段会显示进度。',
          },
          convert_rejected: {
            message: '无法转化线索{{lead}}：它的转化已被驳回。审批人批准后才能转化，线索上的“转化审批”字段会显示进度。',
          },
        },
      },
    },
  },
};
