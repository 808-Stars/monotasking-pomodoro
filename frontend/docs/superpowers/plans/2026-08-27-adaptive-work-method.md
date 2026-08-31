# 单×番自适应工作法 1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为数据报告加入个人基线、可信度、自适应建议、计时事件和七种新的可视化。

**Architecture:** `adaptiveAnalytics.ts` 只负责纯数据计算，`AdaptiveReportCharts.tsx` 只负责 SVG/CSS 表达，`api.ts` 负责分页读取周期数据和 28 日基线。计时器通过独立的 `timerTelemetry.ts` 生成事件载荷并以非阻塞方式写入 Supabase，事件表未部署时报告自动降级。

**Tech Stack:** React 19、TypeScript 6、原生 SVG/CSS、Supabase、Node test runner

**Spec:** `docs/superpowers/specs/2026-08-27-adaptive-work-method-design.md`

## Global Constraints

- 未经用户主动提出“推送”，不得执行 push；本轮也不提交 commit。
- 保持 `localhost:3000` 对应当前项目目录。
- 不新增图表依赖。
- Asia/Shanghai 逻辑日从 04:00 开始。
- 新表未执行迁移时，报告页面必须可用并清楚标记降级数据。

---

### Task 1: 自适应分析核心

**Files:**
- Create: `src/services/adaptiveAnalytics.test.ts`
- Create: `src/services/adaptiveAnalytics.ts`
- Modify: `src/services/reportAnalytics.ts`

**Interfaces:**
- Consumes: `ReportRange`、`ReportSource`、工作/休息会话、任务和计划。
- Produces: `buildAdaptiveReport(range, source): AdaptiveReport`，包含小时窗口、单核纯度、负荷区间、漏斗、估算点、画像和建议。

- [ ] **Step 1: 写失败测试**：用手算固定样本断言单任务纯度为 100、任务切换会降低纯度、Beta 收缩不会让单个样本压过稳定时段、中位数/MAD 不受异常值支配、漏斗单调递减、样本分级边界正确。
- [ ] **Step 2: 运行 `npm test -- --run`**，确认失败原因是模块尚不存在。
- [ ] **Step 3: 最小实现**：实现 `confidenceLevel`、`median`、`madBand`、`monotaskScore`、`buildAdaptiveReport`，所有百分比限制在 0–100。
- [ ] **Step 4: 再次运行测试**，确认新增及既有测试通过。

### Task 2: 计时事件模型与采集

**Files:**
- Create: `supabase/migrations/012_adaptive_work_method.sql`
- Create: `src/services/timerTelemetry.test.ts`
- Create: `src/services/timerTelemetry.ts`
- Modify: `src/services/api.ts`
- Modify: `src/contexts/PomodoroContext.tsx`

**Interfaces:**
- Produces: `TimerEventType`、`buildTimerEvent(...)`、`recordTimerEvent(...)`。
- `focus_timer_events` 使用 `(user_id, run_id, event_type, occurred_at)` 索引和仅本人可访问的 RLS。

- [ ] **Step 1: 写失败测试**：断言工作/休息分类、计划分钟、经过秒数非负、非法事件被拒绝。
- [ ] **Step 2: 运行测试确认 RED**。
- [ ] **Step 3: 新增幂等迁移和纯载荷构造器**。
- [ ] **Step 4: 在开始、暂停、继续、重置、主动结束、自然完成时非阻塞写事件；`run_id` 随本地计时状态恢复。
- [ ] **Step 5: 运行测试确认 GREEN**。

### Task 3: 报告数据扩展与降级

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/services/reportAnalytics.ts`
- Modify: `src/services/reportAnalytics.test.ts`

**Interfaces:**
- `ReportSource` 新增 `historySessions`、`events`，任务新增 `estimated_pomodoros` 和 `completed_pomodoros`。

- [ ] **Step 1: 写失败测试**：断言基线数据不进入当前周期 KPI，事件缺失时仍生成自适应报告。
- [ ] **Step 2: 运行测试确认 RED**。
- [ ] **Step 3: 报告查询并行读取周期数据、28 日基线和事件；事件表缺失返回空数组，其他错误继续抛出。
- [ ] **Step 4: 运行完整测试确认 GREEN**。

### Task 4: 新图表组件

**Files:**
- Create: `src/services/reportChartGeometry.test.ts`
- Create: `src/services/reportChartGeometry.ts`
- Create: `src/components/AdaptiveReportCharts.tsx`

**Interfaces:**
- Produces: `PolarFocusClock`、`MethodRadar`、`LoadControlChart`、`PlanFunnel`、`CalibrationScatter`、`WorkRestTimeline`、`TaskSwitchFlow`。

- [ ] **Step 1: 写失败测试**：断言极坐标、雷达点、散点缩放在空数据和边界值下均返回有限坐标。
- [ ] **Step 2: 运行测试确认 RED**。
- [ ] **Step 3: 实现几何函数与可访问的 SVG/CSS 图表，空数据使用明确占位文案。
- [ ] **Step 4: 运行测试和 TypeScript 构建确认 GREEN**。

### Task 5: 报告页整合

**Files:**
- Modify: `src/pages/Reports.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `ProductivityReport.adaptive` 与 Task 4 图表。

- [ ] **Step 1: 在报告页新增“自适应工作法实验室”，展示可信度、指标解释和行动建议。
- [ ] **Step 2: 将七种图表按宽屏双列、窄屏单列排布，保持现有视觉语言。
- [ ] **Step 3: 更新数据口径文案，区分周期数据、28日基线和事件降级。
- [ ] **Step 4: 运行 `npm test -- --run` 与 `npm run build`。

### Task 6: 本地验收

**Files:**
- No production file changes unless verification exposes a defect.

- [ ] **Step 1: 启动或确认 Vite 运行在 `localhost:3000`。
- [ ] **Step 2: 请求 `/reports`，确认 HTTP 200 和无运行时编译错误。
- [ ] **Step 3: 在浏览器检查登录重定向、报告布局、窄屏溢出和空数据降级。
- [ ] **Step 4: 复核计划逐项覆盖、查看 git diff，并确认未 commit、未 push。

