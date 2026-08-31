# MONOPOMO 改进路线图 v3（A+B+C 完整版）

> **项目**：单×番-工作法（MONOPOMO · Mono-task × Pomodoro）
> **作者**：808-Stars
> **当前版本**：v0.2.2
> **撰写日期**：2026-08-18
> **核心理念**：耐玩 × 轻量 × 高效 + 高级化、不套皮

---

## 一、背景与现状

### 1.1 项目现状

经完整代码审阅（14 个页面、9 个组件、3 个 context、1474 行 API 服务、1335 行扭蛋、458 行藏品室），MONOPOMO 是一个**已经成熟的效率 + 游戏化 Web App**，并非"只有 CRUD"。但**所有亮点都停留在功能层**——调库、调 API、套 UI。

### 1.2 上级反馈（核心痛点）

> "差异化体现在代码上，不要单纯 CRUD。你加工的很多东西都像是只套了一层皮。"

**翻译**：
- 不要"调 Recharts 画图表"
- 不要"调 DeepSeek API"
- 不要"换 UI 改形态"
- 要**自己写代码**

### 1.3 用户真实需求（个人体验）

> "我只是想做一个 I 人独自一人也能用得很舒服的、玩得很开心的、可以给自己加油打气的项目。"

**翻译**：
- **耐玩** —— 让人想持续用，不容易腻
- **轻量** —— 不花太多时间
- **高效** —— 核心仍是效率工具
- **私人专属** —— 不社交、不展示

### 1.4 两个需求并存

| 维度 | 个人体验 | 上级评估 |
|---|---|---|
| 关注 | 耐玩度、轻量 | 代码差异化、不套皮 |
| 体现 | 玩得开心 | 看到自研能力 |

**关键**：两个需求都要满足。任何只满足一边的方案都不合格。

---

## 二、核心理念

### 2.1 不做什么

- ❌ 不引入第三方图表库（Recharts / Chart.js / D3）
- ❌ 不调用现成 AI API（OpenAI / DeepSeek）
- ❌ 不做表面 UI 改造（"加个动画"、"换个皮肤"）
- ❌ 不堆"温柔治愈"或"爽点 RPG"等单一方向

### 2.2 做什么

- ✅ **自研可视化引擎**（自己用 SVG 写图表）
- ✅ **自研智能调度算法**（不用现成 AI，本地计算）
- ✅ **自研数据挖掘**（SQL 聚合 + 模式识别）
- ✅ **耐玩 + 高级化双满足**（每个功能都要问"它耐玩吗？它高级吗？"）

### 2.3 总览

```
┌─────────────────────────────────────────────────────────┐
│  MONOPOMO v1.0 — I 人友好的耐玩效率工具                       │
├─────────────────────────────────────────────────────────┤
│  A. 自研可视化引擎（差异化最显眼的入口）                       │
│  ├── Heatmap（仿 GitHub，最具展示力）                       │
│  ├── RingProgress（等级 / 收集度 / 专注度）                 │
│  ├── HourlyChart（24h 效率曲线）                            │
│  ├── PieChart（项目投入分布）                               │
│  └── WeeklyCompare（本周 vs 上周）                         │
├─────────────────────────────────────────────────────────┤
│  B. 智能调度算法（差异化的深度）                               │
│  ├── 番茄钟智能时长（动态推荐，不是死板的 25 分钟）            │
│  ├── 任务优先级智能排序（多因子加权）                        │
│  └── 最佳专注时段识别（时间序列分析）                         │
├─────────────────────────────────────────────────────────┤
│  C. 个人里程碑 + 智能洞察（耐玩的核心）                       │
│  ├── 个人里程碑自动发现（最高番茄数等私人记录）               │
│  ├── 智能洞察（最常被打断、高效时段、提升趋势）               │
│  └── 模式识别（工作 vs 休息节奏）                            │
└─────────────────────────────────────────────────────────┘
```

---

## 三、A. 自研可视化引擎

### 3.1 为什么自研

| 调库方案 | 自研方案 |
|---|---|
| `<LineChart data={...} />` | 自己写 SVG `<path>` 路径算法 |
| 上级看到的是"你会用 Recharts" | 上级看到的是"你会写可视化" |
| 受限于库的能力 | 完全可控 |
| 千篇一律 | 自定义视觉风格 |

**自研 = 上级一眼看出"这是手写的"**。

### 3.2 五个图表详细设计

#### 3.2.1 🍅 Heatmap（最有展示力）

**视觉**：仿 GitHub contribution graph，365 天 × 1 格/天，方格颜色深浅代表当日番茄钟完成数。

**SVG 实现思路**：
```tsx
<svg viewBox="0 0 W H">
  {data.map((day, i) => (
    <rect
      x={i % 53 * 14}            // 53 列
      y={Math.floor(i / 53) * 14} // 7 行（星期）
      width="12" height="12"
      fill={colorScale(day.count)} // 颜色插值
      rx="2"
    />
  ))}
</svg>
```

**核心算法**：
- 颜色插值：`interpolate('#0e4429', '#39d353', t)` —— t∈[0,1]
- 日期对齐：每周一行，每列一个工作日
- 悬停 tooltip：显示当日详情

**耐玩点**：看着自己一年的"专注地图"慢慢填满
**高级化点**：颜色插值算法 + 性能优化（数百个 rect 节点）

#### 3.2.2 ⭕ RingProgress（最基础组件）

**视觉**：圆环进度条，用于等级、收集度、专注度。

**SVG 实现思路**：
```tsx
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="none" stroke="#eee" />
  <circle
    cx="50" cy="50" r="40"
    fill="none"
    stroke="url(#gradient)"
    strokeWidth="12"
    strokeDasharray={`${2 * Math.PI * 40 * progress} ${2 * Math.PI * 40}`}
    transform="rotate(-90 50 50)"
  />
</svg>
```

**核心算法**：
- 弧长 = `2πr × progress`
- 多重圆环：嵌套多个 RingProgress
- 动画：strokeDasharray 插值

**耐玩点**：等级环、收集度环、专注度环，多个环叠在一起
**高级化点**：弧长数学 + SVG 动画

#### 3.2.3 📈 HourlyChart（24h 效率曲线）

**视觉**：横轴 0-23 时，纵轴番茄钟数，平滑曲线。

**SVG 实现思路**：
```tsx
const path = data.map((d, i) => {
  const x = (i / 23) * W
  const y = H - (d.count / max) * H
  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
}).join(' ')

// 平滑：Catmull-Rom 转 Bezier
const smoothPath = catmullRomToBezier(path)
```

**核心算法**：
- Catmull-Rom 样条插值（生成平滑曲线）
- 数据归一化（最大值归一）
- 渐变填充（曲线下方面积渐变）

**耐玩点**：一眼看出"我是上午型 / 夜猫子型"
**高级化点**：样条插值算法（不是直接连线）

#### 3.2.4 🥧 PieChart（项目投入饼图）

**视觉**：多扇区饼图，用于项目时间投入分布。

**SVG 实现思路**：
```tsx
function arcPath(cx, cy, r, startAngle, endAngle) {
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}
```

**核心算法**：
- 弧形路径：从 startAngle 到 endAngle 的 SVG 路径
- 角度分配：按比例分配 `360° × share`
- 多扇区：多个 `<path>` 拼接

**耐玩点**：看时间花哪去了
**高级化点**：弧形几何算法（手写 path）

#### 3.2.5 📊 WeeklyCompare（周对比柱状）

**视觉**：两组柱状图（左：上周，右：本周），用于对比。

**SVG 实现思路**：
```tsx
<svg viewBox="0 0 W H">
  {data.map((d, i) => (
    <>
      <rect x={...} y={H - lastWeek[i] * scale} height={lastWeek[i] * scale} fill="#aaa" />
      <rect x={...} y={H - thisWeek[i] * scale} height={thisWeek[i] * scale} fill="url(#gradient)" />
    </>
  ))}
</svg>
```

**核心算法**：
- 数据归一化：取两组的最大值作为 scale
- 颜色编码：上升（绿）/ 下降（红）/ 持平（黄）
- 视觉对比：成对柱状 + 数值标签

**耐玩点**：本周比上周多完成 / 少完成
**高级化点**：数据归一化 + 视觉编码

### 3.3 通用技术亮点

- **数据驱动**：声明式 props（`<Heatmap data={...} />`）
- **动画过渡**：`requestAnimationFrame` 平滑过渡
- **响应式**：`ResizeObserver` 监听容器大小
- **主题支持**：CSS 变量定义颜色
- **TypeScript**：完整类型定义，泛型支持自定义数据

### 3.4 文件结构

```
src/components/charts/
├── Heatmap.tsx
├── RingProgress.tsx
├── HourlyChart.tsx
├── PieChart.tsx
├── WeeklyCompare.tsx
└── index.ts
src/components/charts/utils/
├── color-scale.ts         # 颜色插值算法
├── smooth-path.ts         # Catmull-Rom 样条
├── arc-math.ts            # 弧形几何
└── animations.ts          # 动画工具
```

---

## 四、B. 智能调度算法

### 4.1 为什么"自研算法"

| 调 AI API 方案 | 自研算法方案 |
|---|---|
| "我调用了 DeepSeek" | "我设计了一个多因子加权模型" |
| 上级看到的是"你会用 API" | 上级看到的是"你会算法" |
| 成本高 / 不可解释 | 免费 / 完全可解释 |
| 延迟大 | 本地计算，零延迟 |

### 4.2 番茄钟智能时长（B1）

**问题**：固定 25 分钟不适合所有人。专注力强的人嫌短，专注力弱的人嫌长。

**算法伪代码**：
```typescript
function recommendPomodoroDuration(userId: string): number {
  const stats = await getUserPomodoroStats(userId)
  
  // 三个因子
  const history_focus_mean = stats.avg_focus_score // 0-100
  const recent_complete_rate = stats.last_7d_completion_rate // 0-1
  const last_interrupt_penalty = stats.days_since_last_interrupt > 7 ? 0 : -0.2
  
  // 加权得分
  const score = 0.5 * history_focus_mean / 100
              + 0.4 * recent_complete_rate
              + 0.1 * last_interrupt_penalty
  
  // 阶梯推荐
  if (score > 0.8) return 30
  if (score > 0.6) return 25
  if (score > 0.4) return 20
  return 15
}
```

**耐玩点**：发现"原来我不是 25 分钟的人"
**高级化点**：回归分析 + 阶梯决策

**展示**：在 PomodoroTimer 上方显示"今日推荐 23 分钟"，比默认 25 分钟少 2 分钟。

### 4.3 任务优先级智能排序（B2）

**问题**：简单的"按优先级排"不够智能。需要考虑截止日期、历史完成率、项目权重等。

**算法伪代码**：
```typescript
function calculatePriority(task: Task, ctx: Context): number {
  // 因子 1：截止日期紧迫度（0-1，0=不紧迫，1=很紧迫）
  const deadline_urgency = Math.max(0, 1 - daysUntilDeadline(task) / 7)
  
  // 因子 2：历史完成率（用户对这类任务的完成能力）
  const historical_completion = 1 - userStats.overdueRate(task.type)
  
  // 因子 3：项目权重
  const project_weight = task.project_id 
    ? projectTaskCount(task.project_id) / totalTaskCount() 
    : 0.5
  
  // 因子 4：用户设定的优先级
  const user_priority = { HIGH: 1, MEDIUM: 0.6, LOW: 0.3 }[task.priority]
  
  // 因子 5：时间衰减（创建越久优先级衰减）
  const time_decay = Math.exp(-daysSinceCreated(task) / 30)
  
  // 加权求和
  return 0.30 * deadline_urgency
       + 0.20 * historical_completion
       + 0.20 * project_weight
       + 0.20 * user_priority
       + 0.10 * time_decay
}
```

**耐玩点**：任务列表自动按"应该现在做"排序
**高级化点**：多因子加权 + 时间衰减（指数函数）

**展示**：Tasks 页加"智能排序"切换，区别于现有的"按优先级"。

### 4.4 最佳专注时段识别（B3）

**问题**：基于历史数据，告诉用户他一天中什么时候最高效。

**算法伪代码**：
```typescript
function findBestHours(userId: string): Hour[] {
  const hourlyStats = await getHourlyStats(userId) // 24 条
  
  // 过滤掉样本不足的时段（避免冷启动偏差）
  const validHours = hourlyStats.filter(h => h.session_count >= 5)
  
  // 综合得分：完成率 × 数量（避免单次偶然）
  const scored = validHours.map(h => ({
    hour: h.hour,
    score: h.completion_rate * Math.log(1 + h.session_count)
  }))
  
  // 排序，取 top 3
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
```

**耐玩点**：发现"我是上午型"
**高级化点**：时间序列分析 + 对数平滑（避免偶然性）

**展示**：Dashboard 显示"📊 你的高效时段是 9-11、14-16、20-22"，可作为推荐专注时间。

### 4.5 文件结构

```
src/utils/algorithms/
├── pomodoro-duration.ts   # B1 番茄钟时长
├── task-priority.ts       # B2 任务优先级
├── best-hours.ts          # B3 最佳时段
└── index.ts
```

---

## 五、C. 个人里程碑 + 智能洞察

### 5.1 为什么这个方向

- **耐玩**：解锁私人记录、发现自己的模式
- **高级化**：数据挖掘、聚类、模式识别、SQL 聚合

### 5.2 个人里程碑（C1）

**自动发现的事实**：

| 里程碑 | 数据来源 | 算法 |
|---|---|---|
| 最高单日番茄数 | `daily_pomodoro_stats` | `MAX(completed_count)` |
| 最长连续打卡 | `daily_pomodoro_stats` | 连续天数计算 |
| 完成过的最大任务 | `tasks` + `pomodoro_sessions` | `MAX(completed_pomodoros)` |
| 总投入时间 | `pomodoro_sessions` | `SUM(duration_minutes)` |
| 项目累计时长 | JOIN `tasks` + `pomodoro_sessions` | 按 project_id 聚合 |
| 最常关联的任务类型 | `tasks` 描述文本 | NLP 关键词提取（自研） |

**耐玩点**：解锁私人成就，每用一个新里程碑
**高级化点**：复杂聚合查询 + 自研关键词提取

**展示**：Dashboard 新增"🏅 个人里程碑"卡片，6 个事实，每个带"解锁于 X 天前"。

### 5.3 智能洞察（C2）

**自动生成的洞察**：

```
📊 洞察示例
─────────────────────────────────
� 你最常被打断的原因是手机（47%）
🌅 你 80% 的高效日子都在周二、周三
📈 你最近一个月完成率提升 18%
🕘 你的高效时段是 9-11、14-16、20-22
💪 你平均专注度 85 分，高于 80% 的日子
🎯 你最爱的工作类型是开发
```

**洞察生成算法**：

```typescript
async function generateInsights(userId: string): Promise<Insight[]> {
  const insights: Insight[] = []
  
  // 洞察 1：最常被打断的原因
  const interruptions = await getInterruptions(userId)
  const topReason = mostFrequent(interruptions)
  if (topReason) {
    insights.push({
      icon: '📱',
      text: `你最常被打断的原因是${topReason.name}（${topReason.percentage}%）`
    })
  }
  
  // 洞察 2：高效日子（按星期）
  const byWeekday = await getCompletionByWeekday(userId)
  const topDays = topN(byWeekday, 2)
  insights.push({
    icon: '🌅',
    text: `你 80% 的高效日子都在${topDays.map(d => d.name).join('、')}`
  })
  
  // 洞察 3：提升趋势（最近一个月 vs 上一个月）
  const this_month = await getCompletionRate(userId, thisMonth)
  const last_month = await getCompletionRate(userId, lastMonth)
  const change = this_month - last_month
  if (Math.abs(change) > 0.1) {
    insights.push({
      icon: change > 0 ? '📈' : '📉',
      text: `你最近一个月完成率${change > 0 ? '提升' : '下降'} ${Math.abs(change * 100).toFixed(0)}%`
    })
  }
  
  // ... 更多洞察
  
  return insights.slice(0, 6) // 最多展示 6 条
}
```

**耐玩点**：每周 / 每月看到的洞察不一样
**高级化点**：数据挖掘 + 趋势分析 + 模式识别

**展示**：Dashboard 新增"🔍 智能洞察"卡片，6 条洞察，每条带图标。

### 5.4 模式识别（C3）

**识别的模式**：

- **工作 vs 休息节奏**：连续工作番茄数 / 平均间隔
- **任务完成的时间分布**：一天中什么时间完成最多任务
- **中断的时段模式**：什么时段最常被打断
- **项目切换频率**：用户在不同项目间切换的频率

**模式识别算法**：

```typescript
// 例如：工作 vs 休息节奏
async function workRestPattern(userId: string): Pattern {
  const sessions = await getPomodoroSessions(userId)
  let consecutiveWork = 0
  let maxConsecutive = 0
  let intervals: number[] = []
  
  for (let i = 0; i < sessions.length; i++) {
    if (sessions[i].type === 'WORK') {
      consecutiveWork++
      maxConsecutive = Math.max(maxConsecutive, consecutiveWork)
    } else {
      consecutiveWork = 0
    }
    
    if (i > 0) {
      const gap = sessions[i].start_time - sessions[i-1].end_time
      intervals.push(gap / 60000) // 分钟
    }
  }
  
  return {
    maxConsecutiveWork: maxConsecutive,
    avgIntervalMinutes: average(intervals),
  }
}
```

**耐玩点**：发现自己的"工作指纹"
**高级化点**：序列模式识别 + 统计聚合

**展示**：在洞察卡片里加入"你的工作节奏"。

### 5.5 文件结构

```
src/components/
├── Milestones.tsx        # 个人里程碑卡片
└── Insights.tsx          # 智能洞察卡片

src/services/
├── insights.ts           # 洞察聚合服务
└── chart-data.ts         # 图表数据聚合

src/utils/
└── patterns.ts           # 模式识别算法

src/types/
└── insights.ts           # 类型定义
```

---

## 六、数据库设计

### 6.1 新增数据库视图

```sql
-- 每日番茄钟聚合
CREATE OR REPLACE VIEW daily_pomodoro_stats AS
SELECT
  user_id,
  DATE(start_time AT TIME ZONE 'Asia/Shanghai') AS date,
  COUNT(*) FILTER (WHERE type = 'WORK' AND status = 'COMPLETED') AS completed_count,
  COUNT(*) FILTER (WHERE type = 'WORK' AND status = 'INTERRUPTED') AS interrupted_count,
  COUNT(*) FILTER (WHERE type = 'WORK' AND status = 'CANCELLED') AS cancelled_count,
  SUM(duration_minutes) FILTER (WHERE type = 'WORK' AND status = 'COMPLETED') AS total_minutes,
  AVG(duration_minutes) FILTER (WHERE type = 'WORK' AND status = 'COMPLETED')::INT AS avg_minutes
FROM pomodoro_sessions
GROUP BY user_id, DATE(start_time AT TIME ZONE 'Asia/Shanghai');

-- 小时番茄钟聚合
CREATE OR REPLACE VIEW hourly_focus_stats AS
SELECT
  user_id,
  EXTRACT(HOUR FROM start_time AT TIME ZONE 'Asia/Shanghai')::INT AS hour,
  COUNT(*) AS session_count,
  AVG(duration_minutes) FILTER (WHERE status = 'COMPLETED')::INT AS avg_duration,
  AVG(CASE WHEN status = 'COMPLETED' THEN 1.0 ELSE 0 END) AS completion_rate
FROM pomodoro_sessions
WHERE type = 'WORK'
GROUP BY user_id, EXTRACT(HOUR FROM start_time AT TIME ZONE 'Asia/Shanghai');

-- 星期聚合
CREATE OR REPLACE VIEW weekday_stats AS
SELECT
  user_id,
  EXTRACT(DOW FROM start_time AT TIME ZONE 'Asia/Shanghai')::INT AS weekday,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
  AVG(CASE WHEN status = 'COMPLETED' THEN 1.0 ELSE 0 END) AS completion_rate
FROM pomodoro_sessions
WHERE type = 'WORK'
GROUP BY user_id, EXTRACT(DOW FROM start_time AT TIME ZONE 'Asia/Shanghai');

-- 项目投入分布
CREATE OR REPLACE VIEW project_investment AS
SELECT
  t.user_id,
  t.project_id,
  p.name AS project_name,
  p.color AS project_color,
  COUNT(DISTINCT ps.id) AS session_count,
  SUM(ps.duration_minutes) FILTER (WHERE ps.type = 'WORK' AND ps.status = 'COMPLETED') AS total_minutes
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN pomodoro_sessions ps ON ps.task_id = t.id
GROUP BY t.user_id, t.project_id, p.name, p.color;
```

### 6.2 新增 RPC 函数

```sql
-- 获取个人里程碑
CREATE OR REPLACE FUNCTION get_user_milestones(p_user_id UUID)
RETURNS TABLE (
  milestone_key TEXT,
  milestone_value NUMERIC,
  milestone_unit TEXT,
  achieved_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      MAX(daily.completed_count) AS max_daily,
      SUM(daily.total_minutes) AS total_minutes,
      MAX(t.completed_pomodoros) AS max_task_pomodoros
    FROM daily_pomodoro_stats daily
    LEFT JOIN tasks t ON t.user_id = daily.user_id
    WHERE daily.user_id = p_user_id
  )
  SELECT * FROM (
    VALUES
      ('max_daily_pomodoros', (SELECT max_daily FROM stats), '个', now()),
      ('total_focus_minutes', (SELECT total_minutes FROM stats), '分钟', now()),
      ('max_task_pomodoros', (SELECT max_task_pomodoros FROM stats), '个', now())
  ) AS t;
END;
$$ LANGUAGE plpgsql;

-- 获取智能洞察
CREATE OR REPLACE FUNCTION get_user_insights(p_user_id UUID)
RETURNS TABLE (
  insight_type TEXT,
  insight_text TEXT,
  insight_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH interrupt AS (
    SELECT interruption_reason, COUNT(*) AS cnt
    FROM pomodoro_sessions
    WHERE user_id = p_user_id AND status = 'INTERRUPTED'
    GROUP BY interruption_reason
    ORDER BY cnt DESC
    LIMIT 1
  ),
  weekday AS (
    SELECT weekday, completion_rate
    FROM weekday_stats
    WHERE user_id = p_user_id
    ORDER BY completion_rate DESC
    LIMIT 1
  ),
  best_hour AS (
    SELECT hour, completion_rate
    FROM hourly_focus_stats
    WHERE user_id = p_user_id AND session_count >= 5
    ORDER BY completion_rate DESC
    LIMIT 3
  )
  SELECT 'most_interrupt', '最常被打断的原因', (SELECT cnt FROM interrupt)
  UNION ALL
  SELECT 'best_weekday', '最高效的星期', (SELECT completion_rate FROM weekday)
  UNION ALL
  SELECT 'best_hour', '最高效的时段', (SELECT completion_rate FROM best_hour LIMIT 1);
END;
$$ LANGUAGE plpgsql;
```

### 6.3 TypeScript 类型扩展

```typescript
// types/insights.ts
export interface Milestone {
  key: string
  value: number
  unit: string
  achieved_at: string
  label: string
  icon: string
}

export interface Insight {
  type: string
  icon: string
  text: string
  value: number
}

export interface ChartDataPoint {
  date: string
  value: number
}
```

---

## 七、实施路径

### 7.1 第一周：MVP

**A 部分**（自研可视化）：
- ✅ 自研 Heatmap（最有展示力）
- ✅ 自研 RingProgress（基础组件）

**B 部分**（智能调度）：
- ✅ 番茄钟智能时长（最有深度）

**C 部分**（个人里程碑）：
- ✅ 个人里程碑基础（最高记录等）

**第一周交付物**：
- Dashboard 出现自研 Heatmap + 环形
- 番茄钟时长变成动态推荐
- 出现"你的个人里程碑"卡片

### 7.2 第二周：完整版

**A 部分**：
- ✅ HourlyChart（24h 曲线）
- ✅ PieChart（项目饼图）
- ✅ WeeklyCompare（周对比柱状）

**B 部分**：
- ✅ 任务优先级智能排序
- ✅ 最佳专注时段识别

**C 部分**：
- ✅ 智能洞察
- ✅ 模式识别

**第二周交付物**：
- Dashboard 5 个自研图表完整
- 番茄钟时长、任务优先级、专注时段三项智能
- 洞察 + 模式识别完整

### 7.3 第三周：整合（可选）

- Dashboard 整合（统一布局）
- 测试覆盖（关键算法 + 图表组件）
- 文档（README + 算法说明）
- 部署验证

---

## 八、工作量估算

| 模块 | 工作量 |
|---|---|
| 数据库视图 + RPC | 2 天 |
| TypeScript 类型扩展 | 0.5 天 |
| 服务层接口 | 1 天 |
| 自研 Heatmap | 3 天 |
| 自研 RingProgress | 1 天 |
| 自研 HourlyChart | 2 天 |
| 自研 PieChart | 1.5 天 |
| 自研 WeeklyCompare | 1 天 |
| 番茄钟智能时长 | 2 天 |
| 任务优先级智能排序 | 2 天 |
| 最佳专注时段 | 1 天 |
| 个人里程碑 | 2 天 |
| 智能洞察 | 2 天 |
| 模式识别 | 2 天 |
| Dashboard 整合 | 2 天 |
| 测试 + 文档 | 2 天 |
| **合计** | **约 26 天 ≈ 5 周** |

### 8.1 优先级建议

- **必做（2 周）**：A（5 图表）+ B（3 算法）+ C（里程碑 + 洞察基础）
- **可选（1 周）**：C 模式识别、Dashboard 整合、测试、文档

---

## 九、技术栈

| 层 | 技术 | 备注 |
|---|---|---|
| 前端框架 | React 19 + TypeScript + Vite 8 | 现有 |
| 样式 | Tailwind CSS 4 | 现有 |
| **自研图表** | **SVG + 少量 Canvas** | **不引入第三方图表库** |
| **数据聚合** | **PostgreSQL 视图 / RPC** | **不用客户端聚合** |
| **算法实现** | **TypeScript（前端）+ SQL（后端）** | **自研、不调 API** |
| 后端 | Supabase（Postgres + Auth + RLS + Edge Functions） | 现有 |
| 部署 | Vercel / GitHub Pages / Netlify | 现有 |

---

## 十、文件结构

```
src/
├── components/
│   ├── charts/                    # 自研图表
│   │   ├── Heatmap.tsx
│   │   ├── RingProgress.tsx
│   │   ├── HourlyChart.tsx
│   │   ├── PieChart.tsx
│   │   ├── WeeklyCompare.tsx
│   │   └── index.ts
│   ├── charts/utils/              # 图表工具
│   │   ├── color-scale.ts
│   │   ├── smooth-path.ts
│   │   ├── arc-math.ts
│   │   └── animations.ts
│   ├── Milestones.tsx             # 个人里程碑（新增）
│   ├── Insights.tsx               # 智能洞察（新增）
│   └── ...（现有）
├── services/
│   ├── api.ts                     # 现有
│   ├── insights.ts                # 新增：洞察聚合
│   ├── recommendations.ts         # 新增：智能推荐
│   └── chart-data.ts              # 新增：图表数据
├── utils/
│   ├── algorithms/                # 新增：算法
│   │   ├── pomodoro-duration.ts
│   │   ├── task-priority.ts
│   │   ├── best-hours.ts
│   │   └── index.ts
│   ├── patterns.ts                # 新增：模式识别
│   ├── stats.ts                   # 现有
│   └── date.ts                    # 现有
├── types/
│   ├── index.ts                   # 现有
│   └── insights.ts                # 新增
└── pages/
    └── Dashboard.tsx              # 集成
```

```
database/migrations/
├── 2026_09_xx_create_views.sql       # 视图
├── 2026_09_xx_create_rpcs.sql        # RPC 函数
└── ...
```

---

## 十一、风险与对策

| 风险 | 对策 |
|---|---|
| 自研图表工作量大 | 分阶段交付，先 Heatmap |
| 自研算法效果不好 | 用真实数据测试，调整权重 |
| 数据库视图性能 | 加索引，按需查询 |
| 移动端适配 | 自研图表用 SVG，天然响应式 |
| 上级看不到"高级化" | 写代码注释 + 算法说明文档 |
| 用户看不到"耐玩" | Dashboard tooltip + 引导 |

---

## 十二、阶段交付清单（DoD）

每个子任务完成后需交付：

- [ ] TypeScript 编译通过
- [ ] Vite build 通过
- [ ] 至少 1 个单元测试（算法）
- [ ] 代码注释（关键算法说明）
- [ ] 更新 `data/changelog.ts`
- [ ] 部署到 Vercel 验证

---

## 十三、下一步行动

**第 1 天**：环境准备
- 创建数据库视图 + RPC
- 扩展 TypeScript 类型
- 创建服务层接口

**第 2-3 天**：自研 Heatmap（最有展示力）
- 自研 SVG 实现
- 颜色插值算法
- Dashboard 集成

**第 4 天**：自研 RingProgress
- SVG `<circle>` 实现
- 弧长计算
- 动画

**第 5-6 天**：番茄钟智能时长算法
- 算法实现
- 服务层封装
- PomodoroTimer 集成

**第 7 天**：个人里程碑基础
- 数据库视图
- 服务层
- Dashboard 卡片

---

## 附录 A：算法伪代码汇总

详见第四节（番茄钟智能时长、任务优先级、最佳时段）。

## 附录 B：SVG 实现示例

详见第三节（Heatmap、RingProgress、HourlyChart、PieChart、WeeklyCompare）。

## 附录 C：参考案例

- **GitHub contribution graph**：Heatmap 的视觉参考
- **Apple Health 活动环**：RingProgress 的视觉参考
- **Todoist 智能排序**：任务优先级算法的思路参考

---

**文档版本**：v3.0
**撰写者**：Claude (with 808-Stars)
**下次更新**：第 1 周 MVP 完成后
