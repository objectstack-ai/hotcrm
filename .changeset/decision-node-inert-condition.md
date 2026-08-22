---
'hotcrm': patch
---

`decision` 节点不再声明永不生效的 `config.condition`,分支判断统一由出边(out-edge)承担。

`@objectstack/service-automation` 只在三个位置求值流程条件:`start` 节点的
`config.condition`(`AutomationEngine.execute`)、`decision` 节点的**复数**
`config.conditions[]`(决策节点执行器读取 `config?.conditions ?? []`)、以及每条
出边的 `condition`(`AutomationEngine.traverseNext`)。`decision` 节点上的**单数**
`config.condition` 不在其中——`@objectstack/spec` 的 `DecisionConfigSchema` 只声明了
`conditions` 一个键,而 `decision` 不发布 descriptor `configSchema`,因此引擎针对未声明
配置键的拒绝检查(#4277)会整类豁免它。也就是说,这个键在任何一层都不会报错,只是静静地
不被读取。

本仓库有 8 个 `decision` 节点(分布在 `campaign_enrollment`、`contract_renewal`、
`forecast_snapshot`、`opportunity_stagnation` 四个流程中)正是这样声明的。行为一直
正确,只因为同一个谓词被完整复制到了出边上,而没有任何机制强制这份复制保持同步:单独
修改节点上的那份,流程的走向不会有任何变化,没有报错、没有告警、没有测试——偏偏节点上
那份才是读代码的人最可能去改的,因为它读起来才像"这个决策"。这属于"声明 ≠ 生效"
(#634 / #621 / #633)家族,但机制不同:它既不是运行时中断,也不是静默跳过,而是
惰性元数据。

修复方式是让**出边成为唯一的谓词站点**,而不是把谓词搬到节点上。后者(改用引擎支持的
`config.conditions[]`,让出边跟随其 label)在真实引擎上实测会**失效为放行**:本仓库
8 个站点里有 7 个是单出边的"跳过"闸门(如"已经提醒过就不再提醒"),假分支无处可去。
一旦节点声明了 `conditions[]` 并去掉出边上冗余的谓词,条件为假时执行器返回
`branchLabel: 'default'`,而 `traverseNext` 找不到任何带该 label 或标记 `isDefault`
的出边,便按设计回退为**求值全部出边**(避免运行中的实例因元数据错误而中断);此时那条
仅存的出边已不带条件,于是无条件执行——闸门被静默反转,流程恰好做了决策刚刚否定的事。
要让该形态安全,每个闸门都得额外造一个空节点作为 `isDefault` 汇点,属于用变通换架构。
出边形态没有这个失效模式(未匹配的边直接不走),也无需臆造节点,而且本来就是仓库 17 个
`decision` 节点中 9 个已在使用的形态。

新增 `test/flow-decision-authority.test.ts` 固化该不变量:静态扫描全部流程(含 `loop`
体内嵌套的节点)禁止 `decision` 节点携带单数 `config.condition`、要求每个 `decision`
确实基于某个谓词分支;并在真实引擎上跑两个可执行证明——把与出边相反的谓词植入真实流程
`opportunity_stagnation` 的节点后走向完全不变(证明其惰性),以及无 `isDefault` 汇点的
节点权威形态确实失效为放行(记录选择出边形态的实测依据)。

`test/flow-variable-conditions.test.ts` 的"guard the guard"断言原先要求至少存在一个
节点级 `config.condition` 站点,而该断言只有在缺陷存在时才成立,与该文件自己的注释
(称本仓库已不再声明节点副本)相互矛盾;现改为断言此类站点为空。

用户可见行为没有变化:这些流程的走向此前就完全由出边决定,本次改动删除的是从未被读取
的元数据。

Refs #650.
