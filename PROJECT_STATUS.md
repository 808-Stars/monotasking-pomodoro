# MONOPOMO 项目全局现状

> 项目名称：MONOPOMO / 单×番-工作法
>
> 文档性质：当前版本的项目状态、能力边界、风险和交付判断
>
> 依据：当前本地代码、数据库脚本、部署配置、构建结果以及项目记忆资料

## 1. 项目定位

MONOPOMO 是一个面向个人使用的生产力工具，将两套工作方法结合在一起：

- Monotasking：每天聚焦一个核心任务。
- Pomodoro：通过番茄钟进行专注工作。

项目不是单纯的待办事项 CRUD，而是将任务、专注、每日计划、复盘、奖励和长期数据反馈组合成一个轻量的个人工作系统。整体产品方向是“耐玩、轻量、高效”，同时保留一定的游戏化反馈。

## 2. 当前技术架构

### 前端

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Lucide 图标
- Supabase JavaScript Client
- 浏览器端 `localStorage` 保存部分计时状态和本地偏好

### 后端与数据服务

- Supabase Auth：用户认证
- Supabase Postgres：业务数据存储
- Supabase RLS：用户数据隔离
- Supabase RPC：扭蛋等部分原子业务逻辑

### 部署方向

- 当前部署目标：Cloudflare Pages
- 云数据库：Supabase
- 代码仓库：GitHub
- GitHub 更新后由 Cloudflare Pages 自动构建部署

项目中仍保留部分旧的 Vercel/Netlify 相关资料，文档与当前 Cloudflare Pages 部署状态并未完全统一。

## 3. 当前主要功能

### 任务与项目

- 创建、编辑、完成和删除任务
- 任务状态管理
- 项目归类
- 项目进度和任务数量展示
- 进行中任务筛选

### 工作台

- 今日计划
- 今日核心任务
- 任务完成进度
- 番茄钟数据
- 连续打卡或活动状态
- 项目和奖励相关信息

### 番茄钟

- 专注计时
- 休息计时
- 会话记录
- 计时状态恢复
- 番茄钟历史和统计

### 每日计划与复盘

- 每日计划
- 日历视图
- 每日复盘
- 快速备忘录
- 历史记录查询

### 扭蛋机与奖励系统

- 单抽和十连
- R、SR、SSR 等稀有度
- SSR 保底
- SSR 目标锁定
- 每日任务和每周任务
- 代币余额
- 代币流水
- 抽取历史
- 展示柜和月度快照

### 用户功能

- 注册、登录和密码重置
- 引导流程
- 个人设置
- 用户反馈
- 反馈评论

## 4. 当前代码与数据结构状态

当前项目已经从此前的多份副本、旧后端和测试目录中清理出一份相对集中的前端 + 数据库结构。项目核心代码位于：

- `frontend/`：React 前端、Supabase 服务封装、页面和组件
- `database/`：数据库 schema、种子数据和测试用户数据
- `frontend/supabase/migrations/`：Supabase migration

当前目录中仍可能存在以下开发环境产物：

- `frontend/node_modules/`
- `frontend/dist/`
- `frontend/.env`
- `frontend/.netlify/`
- Git 元数据

这些内容不适合作为干净的源码发行包长期保留，尤其是 `.env` 和构建产物应确认是否已被 `.gitignore` 正确排除。

## 5. 已完成程度判断

### 已基本完成

- 核心前端功能已经形成闭环。
- Supabase 认证和主要数据读写已经接入。
- 生产构建可以成功完成。
- 项目具备部署到 Cloudflare Pages 的条件。
- 基本的用户数据隔离设计已经存在。
- 扭蛋、奖励、番茄钟、任务和复盘等模块已具备可使用形态。

### 尚未达到的程度

当前更准确的定位是：

> 已经可以运行和部署的生产候选版本，但仍需要完成安全、性能、文档和发布工程检查，才能称为成熟的生产发行包。

目前不建议把“构建成功”直接等同于“生产质量已经完全达标”。

## 6. 当前最重要的问题

### 6.1 性能问题具有系统性

工作台、扭蛋机以及多个历史页面都存在潜在慢加载。

主要原因：

- 页面初始化请求数量过多。
- 连续打卡按天串行查询。
- 历史记录全量读取。
- 统计使用多个独立查询。
- 复盘存在重复请求风险。
- 设置反馈评论存在 N+1 查询。
- 全局计时 Context 在非相关页面也加载任务。

详细方案见：[PERFORMANCE_OPTIMIZATION_PLAN.md](./PERFORMANCE_OPTIMIZATION_PLAN.md)。

### 6.2 扭蛋和奖励逻辑需要继续做服务端安全审计

当前扭蛋 RPC 使用 `SECURITY DEFINER`，必须确保：

- 用户身份从 `auth.uid()` 获取。
- 不信任前端传入的用户 ID。
- 日期和月份由服务端计算或严格校验。
- 抽取数量只能为允许的值。
- 函数拥有安全的 `search_path` 和最小权限。

代币奖励也不应允许客户端通过直接插入流水记录来伪造。奖励发放应通过受控 RPC 或 Edge Function 完成。

### 6.3 十连概率和原子性需要重点验证

十连抽的正确性不应只依赖前端显示。需要验证：

- 十连是否真正执行十次抽取。
- 概率是否由物品权重正确计算。
- 保底是否在十连过程中按预期生效。
- SSR 目标锁定是否影响正确的抽取位置。
- 余额扣除和抽取记录是否在同一事务中完成。
- 并发点击是否可能重复扣费或重复发奖。
- 前端展示概率是否与数据库实际概率一致。

这些规则应以数据库函数或服务端逻辑为最终依据，并通过边界测试和大量模拟抽样验证。

### 6.4 缺少完整的自动化测试体系

当前项目已验证生产构建，但没有发现完整的前端测试和后端测试体系。至少需要补充：

- 扭蛋概率和十连规则测试。
- SSR 保底与目标锁定测试。
- 代币扣除和余额不足测试。
- 并发抽取测试。
- 连续打卡跨日测试。
- RLS 用户隔离测试。
- 关键页面加载和错误状态测试。

### 6.5 项目文档与当前部署状态不完全一致

需要统一以下内容：

- Cloudflare Pages 部署说明。
- Supabase 项目初始化步骤。
- 环境变量名称和示例。
- 数据库 migration 执行顺序。
- 生产构建命令。
- GitHub 到 Cloudflare Pages 的自动部署流程。
- 生产环境故障排查方法。

建议增加或完善：

- 根目录 `README.md`
- `frontend/.env.example`
- 数据库初始化说明
- 发布检查清单
- 安全与回滚说明

### 6.6 依赖和构建产物管理需要确认

生产发行包不应包含：

- `node_modules`
- `dist`
- 本地环境文件
- Netlify/Vercel 临时目录
- 编辑器或系统缓存
- 测试账号敏感信息

应通过 `.gitignore` 排除，并确认 Git 历史中没有提交真实密钥、Supabase 服务端密钥或旧开发密钥。如果密钥曾经出现在历史记录中，应立即轮换。

## 7. 当前性能优化优先级

### 第一优先级：立即处理

1. 消除连续打卡的串行逐日查询。
2. 删除扭蛋机重复余额请求。
3. 增加进行中 Promise 缓存。
4. 给所有历史列表增加默认分页或 limit。
5. 将设置页评论改为展开时加载。
6. 让 Dashboard 和扭蛋机先显示核心内容。

### 第二优先级：短期完成

1. 创建工作台汇总 RPC。
2. 创建扭蛋汇总 RPC。
3. 合并番茄钟统计查询。
4. 优化复盘的重复加载。
5. 限制全局 Pomodoro Context 的查询范围。

### 第三优先级：结构性升级

1. 增加数据库组合索引。
2. 引入每日活动汇总表。
3. 引入月度统计表。
4. 建立性能监控和慢查询记录。
5. 建立自动化回归测试。

## 8. 数据库索引建议

最终应结合真实查询计划验证，重点考虑：

```sql
create index if not exists idx_token_records_user_created
  on public.token_records (user_id, created_at desc);

create index if not exists idx_token_records_user_source_created
  on public.token_records (user_id, source, created_at desc);

create index if not exists idx_gacha_records_user_created
  on public.gacha_records (user_id, created_at desc);

create index if not exists idx_pomodoro_sessions_user_start
  on public.pomodoro_sessions (user_id, start_time desc);

create index if not exists idx_reviews_user_date
  on public.reviews (user_id, date desc);

create index if not exists idx_daily_plans_user_date
  on public.daily_plans (user_id, date desc);

create index if not exists idx_tasks_user_status_created
  on public.tasks (user_id, status, created_at desc);
```

不要在未确认查询模式前盲目添加大量索引。索引越多，写入、更新和数据库维护成本越高。

## 9. 生产发布前检查清单

### 代码与构建

- [ ] `npm run build` 成功。
- [ ] 没有 TypeScript 构建错误。
- [ ] 没有未处理的 Promise rejection。
- [ ] 关键页面有加载、空状态和错误状态。
- [ ] 移动端布局已验证。

### 数据库与安全

- [ ] 所有用户表启用并验证 RLS。
- [ ] RPC 使用 `auth.uid()`，不信任前端用户 ID。
- [ ] 扭蛋扣费、抽取和写入记录处于同一事务。
- [ ] 客户端不能伪造代币奖励。
- [ ] 没有真实密钥被提交到仓库。
- [ ] 生产密钥已经轮换并分别配置。

### 性能

- [ ] 关键页面首屏请求数量已记录。
- [ ] 历史列表已分页。
- [ ] 没有串行逐日网络请求。
- [ ] 没有明显 N+1 查询。
- [ ] 慢查询已通过索引或 RPC 优化。
- [ ] 次要模块不会阻塞核心内容。

### 部署

- [ ] Cloudflare Pages 构建命令正确。
- [ ] 输出目录正确。
- [ ] 环境变量已在 Cloudflare Pages 配置。
- [ ] Supabase URL 和 anon key 指向生产项目。
- [ ] SPA 路由刷新不会返回 404。
- [ ] 生产环境 OAuth、密码重置和邮件链接可用。

## 10. 最终判断

MONOPOMO 当前已经是一个功能较完整、可以实际部署和使用的个人生产力应用，核心产品方向和功能闭环已经形成。

但从工程质量角度看，它仍属于“可运行的生产候选版本”，不是已经完成所有生产化工作的最终发行包。当前最需要补齐的不是新的大功能，而是：

1. 扭蛋与奖励系统的服务端安全和规则验证。
2. 多页面的请求数量、串行查询和全量读取问题。
3. 数据库索引与聚合查询。
4. 自动化测试。
5. 当前部署文档、环境变量和发布流程。

完成以上项目后，MONOPOMO 才更适合被视为稳定、可持续维护和可对外交付的生产版本。

## 11. 本轮本地修复记录

本轮已在本地完成并通过前端构建验证的改动：

- 增加用户隔离的进行中 Promise 缓存，避免同一数据并发重复请求。
- 缓存清理增加竞态保护，旧请求完成后不会重新写回已失效缓存。
- 登录、登出和账号切换时清理认证相关缓存。
- 工作台采用核心数据和次要数据分离加载。
- 扭蛋机采用首屏汇总和后台历史/任务加载。
- 复盘页面避免筛选数据和全量数据重复请求。
- 设置页反馈评论改为展开时加载，去除初始化 N+1 查询。
- 限制任务、项目、番茄钟、每日计划、备忘录和扭蛋历史的默认读取数量。
- 全局番茄钟 Context 只读取进行中任务。
- 番茄钟统计改为单次汇总 RPC。
- 每日计划历史改为按月查询，单次最多返回 31 条。
- 项目归档列表复用项目任务计数，移除逐项目任务查询。
- 藏品室实时进度改为 `get_showcase_current()` 汇总 RPC，移除前端多表组合读取。
- 扭蛋入口增加服务端身份、日期和抽取次数校验。
- 代币奖励统一进入受控 RPC，并增加来源、金额、业务记录和去重校验。
- 增加缓存、扭蛋次数校验和失败重试测试。
- 增加主要统计查询的组合索引 migration。

本轮新增的 Supabase migration：

```text
002_get_user_streak.sql
003_dashboard_summary.sql
004_dashboard_progressive_loading.sql
005_gacha_summary.sql
006_harden_gacha_and_rewards.sql
007_performance_indexes.sql
008_pomodoro_stats.sql
009_showcase_summary.sql
```

仍建议在真实 Supabase 数据上继续验证 RPC 的执行计划、RLS 结果、时区边界和高并发抽取行为；历史明细目前采用有界读取，后续可再增加“加载更多”游标分页。
