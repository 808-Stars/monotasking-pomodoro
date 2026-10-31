# 单×番规则Wiki维护说明

本地入口：`http://127.0.0.1:5178/wiki.html`。复用Demo现有开发服务，未启动服务时不能只用文件双击打开此React入口。

## 内容与权威来源

- 权威正文是资料库的`01_JRPG设计/游戏总设计.md`，Wiki是人工整理的阅读快照，不是另一份总书。
- 本轮内容整理日期为2026-10-31；`content/index.ts`的`wikiContentDate`统一显示此日期，不承诺自动更新。
- `content/gettingStarted.ts`、`combat.ts`、`builds.ts`、`camp.ts`、`dungeons.ts`、`tavern.ts`分别维护六类内容。
- `content/helpers.ts`提供文章与段落构造，`types.ts`约束结构。文章必须有稳定ID、来源章节、明确状态、真实正文和有效关联链接。
- 规则状态与工程实现状态是两回事；不能因为演出可看就写成技能结算或云端已经完成。未核对代码时用“实现状态未核对”。
- 候选技能不列成默认正式技能，历史怪物／旧矩阵不用于凑齐内容。源稿有冲突时保留具体提示，不由Wiki维护者擅自改规则。
- 净身药配方仍引用未定义的解毒药，已单独标为冲突；药品展示价值、部分AI与炼玉细则保留待定。

## 文件分工

| 位置 | 维护内容 |
| --- | --- |
| `wiki.html`、`main.tsx` | 独立网页入口，不导入游戏或存档模块 |
| `content/categories.ts` | 分类名称、说明与排序 |
| `wikiIndex.ts` | URL解析、词条地址、正文／别名搜索，不操作浏览器和存储 |
| `WikiApp.tsx` | 独立页面组装、浏览器标题与章节定位 |
| `components/` | 左侧分类树、首页、词条、搜索与右目录 |
| `wiki.css` | 仅从Wiki入口加载的阅读主题，不与战斗共用全局样式 |
| `../../tests/wiki-*.test.ts` | 词条契约、路由／搜索及静态渲染用例 |

## 链接与数据更新

词条：`/jrpg/wiki.html?entry=break`；章节：`/jrpg/wiki.html?entry=break#two-rounds`；分类：`/jrpg/wiki.html?category=combat`；搜索：`/jrpg/wiki.html?search=PP`。

正常页面跳转保留原生前进／后退、新标签与复制地址行为，不要求服务器路由重写。搜索和文章只通过React文本渲染，不接受任意HTML。剧透放入`spoiler`块，默认折叠且不加入搜索正文；摘要和章节标题也不得直接泄露结局。

修改规则快照时先读对应总书完整章节，再更新有交叉影响的词条、相关链接与`facts`。表格、公式和结构化事实应保持一致；`facts`为测试依据，不取代可读正文。修改ID时同时处理所有关联词条、内联链接和阅读路径，不为旧ID默默重建第二篇。

本页不读写localStorage、IndexedDB或真实存档；没有登录、编辑、评论、统计上报和云端部署。

## 运行验证范围

以下是维护命令说明。任务首轮先说明类型、对象、范围与影响，按项目授权执行；同一任务追加复验须明确批准。Wiki文案更新只跑词条与链接相关核验，不借机操作存档或修改战斗规则。

在Demo工程目录执行Wiki定向测试：

```powershell
node --experimental-strip-types --test tests/wiki-index.test.ts tests/wiki-content.test.ts tests/wiki-render.test.ts
```

经批准后可执行`npm run build`检查类型与多页构建；该命令会更新可重新生成的`dist`，不修改存档。既有代码导致的构建阻塞需单独报告，不扩大为无关修改。

若新增浏览器验证，应按当前任务的核验轮次获得相应授权；覆盖分类、搜索、旧称、深链接、剧透、后退、长表格与不同窗口宽度；不进入真实挑战、不改库存。不得在用户只授权实现时自动执行或重复测试。


本次同步覆盖V15候选边界、新学习设计与旧实现差异、消费解锁／仓库背包、当前PP名及五敌人形象；游戏机制与用户存档没有因Wiki文案同步改动。
