import { useState } from 'react';
import Icon from '../components/Icons';
import type { IconName } from '../components/Icons';

interface Section {
  id: string; icon: string; title: string; tag?: string; tagBg?: string; tagColor?: string; tagBorder?: string;
  content: React.ReactNode;
}

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxH3: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '15px', lineHeight: '1.8' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };

function Card({ icon, title, desc, color }: { icon: IconName; title: string; desc: string; color?: string }) {
  return (
    <div className="oto-inset p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={18} />
        <h5 style={{ ...pxH3, fontSize: '10px', color: color || '#4a3020' }}>{title}</h5>
      </div>
      <p className="text-xs leading-relaxed" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>{desc}</p>
    </div>
  );
}

/** 隐藏逻辑提示框（⭐ SVG） */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="oto-window p-3" style={{ borderColor: '#d4b060', background: '#faf6e8' }}>
      <div className="flex items-start gap-2">
        <Icon name="star" size={16} style={{ color: '#8a6820', marginTop: 2, flexShrink: 0 }} />
        <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}>{children}</p>
      </div>
    </div>
  );
}

/** 警告框（⚠️ SVG） */
function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="oto-window p-3" style={{ borderColor: '#c08080', background: '#faf0f0' }}>
      <div className="flex items-start gap-2">
        <Icon name="alert" size={16} style={{ color: '#a03038', marginTop: 2, flexShrink: 0 }} />
        <p style={{ ...pxBody, fontSize: '14px', color: '#6a2028', lineHeight: 1.7 }}>{children}</p>
      </div>
    </div>
  );
}

export default function Guide() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => { setOpenSection(openSection === id ? null : id); };

  const PURPLE = { tagBg: '#ece4f4', tagColor: '#504068', tagBorder: '#b098c0' };
  const YELLOW = { tagBg: '#f8f0e0', tagColor: '#8a6820', tagBorder: '#d4b060' };
  const BLUE   = { tagBg: '#e0e8f8', tagColor: '#203050', tagBorder: '#90a0c8' };
  const RED    = { tagBg: '#f0e0e0', tagColor: '#6a2028', tagBorder: '#c08080' };

  const sections: Section[] = [
      // ──────────── 1. 系统简介 ────────────
    {
      id: 'intro', icon: 'book', title: '系统简介', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="oto-window p-4" style={{ borderColor: 'var(--oto-gold)' }}>
              <div className="flex items-center gap-2 mb-2"><Icon name="target" size={28} /><h4 style={{ ...pxH3, color: '#304868' }}>单核工作法 · 战略层</h4></div>
              <p className="text-sm leading-relaxed" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                <strong style={{ color: '#4a3020' }}>核心理念：</strong>每天只聚焦<strong style={{ color: '#304868' }}>一件最重要的事</strong>。
              </p>
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-dim)' }}>
                <li>早晨设定今日唯一核心任务</li>
                <li>写晨间规划明确当天目标</li>
                <li>全天围绕核心任务展开工作</li>
                <li>晚间回顾完成情况与收获</li>
              </ul>
            </div>
            <div className="oto-window p-4" style={{ borderColor: 'var(--oto-gold)' }}>
              <div className="flex items-center gap-2 mb-2"><Icon name="tomato" size={28} /><h4 style={{ ...pxH3, color: '#8a3030' }}>番茄工作法 · 执行层</h4></div>
              <p className="text-sm leading-relaxed" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                <strong style={{ color: '#4a3020' }}>核心理念：</strong><strong style={{ color: '#8a3030' }}>25 分钟专注 + 5 分钟休息</strong> 为一个番茄周期。
              </p>
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-dim)' }}>
                <li>25 分钟专注工作</li>
                <li>5 分钟短休息放松</li>
                <li>随手清单快速捕捉临时想法</li>
                <li>每 4 个番茄钟后 15 分钟长休息</li>
              </ul>
            </div>
          </div>
          <div className="oto-window p-4 text-center">
            <p style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
              <strong>融合逻辑：</strong>单核回答<strong style={{ color: '#304868' }}>「做什么」</strong>，番茄回答<strong style={{ color: '#8a3030' }}>「怎么做」</strong>。两者配合，让每一天都高效而充实。
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 2. 快速上手 ────────────
    {
      id: 'quickstart', icon: 'graduate', title: '新手教程', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <Tip>注册后侧栏点击「新手教程」可随时进入 8 步引导。完成全部步骤大约需要 5 分钟。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 8 步新手教程</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { n: 1, t: '创建项目' },
              { n: 2, t: '创建任务' },
              { n: 3, t: '确定核心任务' },
              { n: 4, t: '写晨间规划' },
              { n: 5, t: '完成番茄钟' },
              { n: 6, t: '写笔记' },
              { n: 7, t: '完成最后一步' },
              { n: 8, t: '查看最终页面' },
            ].map(({ n, t }) => (
              <div key={n} className="flex items-center gap-2 p-2 oto-inset" style={{ fontSize: '11px' }}>
                <span className="inline-flex items-center justify-center w-5 h-5 font-bold flex-shrink-0" style={{ background: '#504068', color: '#fff', fontSize: '10px' }}>{n}</span>
                <span style={{ ...pxBody, fontSize: '11px', color: '#4a3020' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // ──────────── 11. 连续打卡 ────────────
    {
      id: 'streak', icon: 'star', title: '连续打卡', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <Warn>打卡判断以<strong>凌晨 4 点</strong>为逻辑日起点，不是 0 点。凌晨 3 点完成的操作算前一天，凌晨 5 点算新的一天。</Warn>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 什么算"打卡"？</h4>
          <p className="text-xs mb-2" style={{ ...pxBody, fontSize: '11px', color: 'var(--oto-text-muted)' }}>当天完成以下任意操作即可（共 13 种来源）：</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['番茄钟', '休息', '首次番茄钟', '创建任务', '完成任务', '确定核心任务', '晨间规划', '晚间回顾', '每日计划完成', '写笔记', '创建清单', '完成清单', '抽扭蛋'].map(s => (
              <div key={s} className="p-2 oto-inset text-center" style={{ ...pxSm, fontSize: '12px' }}>{s}</div>
            ))}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 打卡计算逻辑</h4>
          <div className="space-y-2">
            <Tip>连续打卡从今天开始<strong>往回数</strong>。如果今天没有任何正向操作记录，即使昨天做了也白搭。</Tip>
            <Tip>只要当天有<strong>任意一条</strong>正向操作记录，该天就算打卡成功。</Tip>
          </div>
        </div>
      ),
    },

    // ──────────── 3. 工作看板 ────────────
    {
      id: 'dashboard', icon: 'dashboard', title: '工作看板', tag: '功能',
      ...YELLOW,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: 'target' as IconName, title: '单核工作法面板', desc: '显示今日核心任务、晨间规划、晚间回顾。可快速标记计划完成。' },
            { icon: 'tomato' as IconName, title: '番茄工作法面板', desc: '显示今日番茄钟统计、本周进度。快速启动番茄钟。' },
            { icon: 'task' as IconName, title: '任务总览', desc: '今日待办任务列表，按优先级排序。可快速切换任务状态。' },
            { icon: 'clock' as IconName, title: '今日番茄记录', desc: '今天完成的番茄钟时间线，显示关联任务和时段。' },
            { icon: 'bars' as IconName, title: '本周摘要', desc: '本周核心任务完成天数、番茄钟总数、收入概览。' },
            { icon: 'dashboard' as IconName, title: '顶部信息', desc: '实时显示连续打卡天数与日期、时间。' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      ),
    },

    // ──────────── 5. 任务管理 ────────────
    {
      id: 'tasks', icon: 'task', title: '任务管理', tag: '功能',
      ...YELLOW,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'plus' as IconName, title: '新建任务', desc: '设置名称、描述、优先级、所属项目、预估番茄钟数、截止日期。' },
              { icon: 'refresh' as IconName, title: '状态流转与归档', desc: '待办 → 进行中 → 已完成 → 已归档。每步可回退。归档后顶部「已归档」查看。' },
              { icon: 'tomato' as IconName, title: '番茄钟进度', desc: '每个任务显示「已完成/预估」番茄钟数，完成番茄钟时自动累加。' },
              { icon: 'search' as IconName, title: '筛选与搜索', desc: '按状态、优先级、项目筛选。支持关键词搜索。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
          <Tip>任务详情弹窗中点击任务名称或描述可展开/收起完整内容。长内容会自动截断（任务 100 字、评论 60 字）。</Tip>
        </div>
      ),
    },

    // ──────────── 6. 项目管理 ────────────
    {
      id: 'projects', icon: 'folder', title: '项目管理', tag: '功能',
      ...YELLOW,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'plus' as IconName, title: '创建项目', desc: '设置名称、描述和标签颜色（8 种）。颜色在任务列表中快速识别归属。' },
              { icon: 'task' as IconName, title: '任务关联', desc: '创建任务时选择所属项目。项目详情自动聚合所有关联任务。' },
              { icon: 'refresh' as IconName, title: '项目状态', desc: '进行中 → 已完成 → 已归档。可随时切换。' },
              { icon: 'archive' as IconName, title: '归档机制', desc: '手动归档：列表/详情点「归档」按钮。归档后从主列表消失，顶部「已归档」查看。可在弹窗中切换状态。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
          <Tip>项目详情里点击任务卡片可展开任务详情弹窗，查看优先级、状态、番茄钟进度、截止日期等信息。</Tip>
          <Warn>删除项目时<strong>关联的任务不会被删除</strong>，会变为"无项目"状态。</Warn>
        </div>
      ),
    },

    // ──────────── 12. 扭蛋机 ────────────
    {
      id: 'gacha', icon: 'joystick', title: '扭蛋机', tag: '功能',
      ...YELLOW,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'sword' as IconName, title: '抽取规则', desc: '单抽 50 币，十连 500 币。物品池：8 职业 × 4 稀有度 = 32 件。' },
              { icon: 'star' as IconName, title: '每日首免', desc: '每天首次单抽免费（不消耗代币）。十连不享受。', color: '#305830' },
              { icon: 'pity' as IconName, title: '渐进保底', desc: '连续 50 抽未出 SSR 后，每抽 SSR 概率 +2%（4%→6%→…→100%必出）。', color: '#8a6820' },
              { icon: 'gift' as IconName, title: '十连保底', desc: '十连至少包含 1 件 R 级以上物品。' },
              { icon: 'lock' as IconName, title: 'SSR 锁定', desc: '累计 300 抽解锁。可锁定一个 SSR，下次出 SSR 必为该物品。每月 1 次。', color: '#a03038' },
              { icon: 'bars' as IconName, title: '概率公示', desc: 'SSR 2% · SR 8% · R 50% · N 40%。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 月度重置</h4>
          <Warn>每月 1 号图鉴自动重置——当月收集数量清零。SSR 锁定门槛也按月重置（需重新抽满 300 次）。所有抽取记录按月统计，每月 1 号清零。</Warn>
        </div>
      ),
    },

    // ──────────── 13. 藏品室 ────────────
    {
      id: 'showcase', icon: 'building', title: '藏品室', tag: '功能',
      ...YELLOW,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: 'target' as IconName, title: '赏金猎人勋章', desc: '按当月累计代币数评级。阈值：3,000 / 9,800 / 19,800 / 32,800。', color: '#8a6820' },
              { icon: 'tomato' as IconName, title: '番茄大厨怀表', desc: '按当月完成番茄钟数评级。阈值：30 / 60 / 120 / 240 个。', color: '#8a3030' },
              { icon: 'star' as IconName, title: '卡牌大师奖杯', desc: '按当月集齐稀有度种类评级。需集齐该稀有度全部 8 件。', color: '#504868' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 等级说明</h4>
          <div className="flex gap-2">
            {[
              { name: '空', color: '#888', bg: 'transparent' },
              { name: '青铜', color: '#a86838', bg: '#faf2e0' },
              { name: '白银', color: '#c8c8d0', bg: '#f0f0f5' },
              { name: '黄金', color: '#e8b850', bg: '#fcf8e8' },
              { name: '钻石', color: '#5a7090', bg: 'linear-gradient(135deg, #ecf7ff, #e4eeff, #f4e8ff)' },
            ].map(t => (
              <span key={t.name} className="flex-1 text-center py-1 font-bold" style={{ fontSize: '12px', background: t.bg, color: t.color, border: `1px solid ${t.color}` }}>{t.name}</span>
            ))}
          </div>

          <Warn>请务必点击「同步到月度记录」按钮保存当前进度快照。月度重置后，未同步的进度会丢失。</Warn>
        </div>
      ),
    },

    // ──────────── 4. 每日计划 ────────────
    {
      id: 'daily-plan', icon: 'target', title: '每日计划', tag: '战略层',
      ...BLUE,
      content: (
        <div className="space-y-4">
          <div className="oto-window p-4" style={{ borderColor: '#90a0c8' }}>
            <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
              每日计划是单核工作法的核心——<strong style={{ color: '#304868' }}>每天只聚焦一件最重要的事</strong>。
            </p>
            <div className="mt-3 p-3 text-center" style={{ background: '#f8f4f0', fontFamily: 'var(--oto-font-body)', fontSize: '12px', color: '#4a3020', lineHeight: 2.2 }}>
              <div className="md:text-[14px] whitespace-nowrap overflow-x-auto">
                <strong>未计划</strong> → <strong style={{ color: '#687898' }}>已计划</strong> → <strong style={{ color: '#689050' }}>已完成</strong> → <strong style={{ color: '#786890' }}>已回顾</strong>
              </div>
              <span style={{ color: '#a03038' }}>　　　　　↘ 未完成</span><br />
              <span style={{ color: 'var(--oto-text-muted)', fontSize: '12px' }}>
                已计划可回退至未计划 · 已完成/未完成可回退至已计划 · 已回顾可回退至已完成
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'target' as IconName, title: '核心任务选择', desc: '从任务列表中选择今日唯一核心任务。', color: '#304868' },
              { icon: 'sun' as IconName, title: '晨间规划', desc: '填写今天的目标和计划。自动保存。', color: '#8a6820' },
              { icon: 'moon' as IconName, title: '晚间回顾', desc: '填写完成情况和反思。', color: '#504868' },
              { icon: 'check' as IconName, title: '计划完成', desc: '标记为「已完成」或「未完成」，各状态均可回退。', color: '#305830' },
              { icon: 'calendar' as IconName, title: '历史日历', desc: '按月查看历史计划。不同状态用不同颜色标记。', color: '#304868' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
          <Tip>核心任务、晨间规划、晚间回顾、计划完成——这 4 个操作相互独立，可单独完成。</Tip>
        </div>
      ),
    },

    // ──────────── 9. 笔记本 ────────────
    {
      id: 'notebook', icon: 'notebook', title: '笔记本', tag: '战略层',
      ...BLUE,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: 'notebook' as IconName, title: '日记', desc: '记录每天的工作内容和反思。', color: '#304868' },
            { icon: 'bars' as IconName, title: '周记', desc: '每周总结工作成果。', color: '#8a6820' },
            { icon: 'calendar' as IconName, title: '月记', desc: '每月复盘目标完成情况。系统自动关联当月数据。', color: '#504868' },
            { icon: 'search' as IconName, title: '筛选与统计', desc: '按类型、日期筛选。统计面板显示笔记总数和连续写作天数。', color: '#305830' },
            { icon: 'check' as IconName, title: '编辑与删除', desc: '笔记创建后可随时编辑。已删除的笔记无法恢复。', color: '#4a3020' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      ),
    },

    // ──────────── 7. 番茄钟 ────────────
    {
      id: 'pomodoro', icon: 'tomato', title: '番茄钟', tag: '执行层',
      ...RED,
      content: (
        <div className="space-y-4">
          <div className="oto-window p-4" style={{ borderColor: '#c08080' }}>
            <p style={{ ...pxBody, fontWeight: 'bold', color: '#4a3020', marginBottom: 8 }}>番茄钟核心原则：</p>
            <ol className="list-decimal list-inside space-y-1 text-sm" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
              <li>一个番茄钟（25 分钟）不可分割</li>
              <li>番茄钟期间只做一件事</li>
              <li>休息时彻底放松</li>
            </ol>
          </div>

          <h4 style={{ ...pxH3, color: '#8a3030' }}> 模式与时长</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: 'target' as IconName, title: '工作', desc: '25 分钟专注。完成会奖励。' },
              { icon: 'coffee' as IconName, title: '短休息', desc: '5 分钟放松。工作后自动建议。' },
              { icon: 'meditate' as IconName, title: '长休息', desc: '15 分钟恢复。每 4 个工作后自动建议。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>

          <Warn>工作模式<strong>必须绑定任务</strong>。如果没有待办任务，无法开始工作番茄钟。休息模式不需要绑定任务。</Warn>

          <h4 style={{ ...pxH3, color: '#8a3030' }}> 统计与归档</h4>
          <Warn>历史记录页默认<strong>只显示最近 10 条</strong>，超出的自动归档到「已归档」弹窗。归档项可逐条删除（不可恢复），但<strong>不影响统计面板</strong>。</Warn>
        </div>
      ),
    },

    // ──────────── 8. 随手清单 ────────────
    {
      id: 'quick-memos', icon: 'memo', title: '随手清单', tag: '执行层',
      ...RED,
      content: (
        <div className="space-y-3">
          <div className="oto-window p-3">
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>番茄钟期间的临时想法不要当场处理——记到随手清单，休息时再整理。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'plus' as IconName, title: '快速添加', desc: '输入后回车添加。轻量级，无分类无标签。' },
              { icon: 'check' as IconName, title: '勾选完成', desc: '点击复选框标记完成。可随时取消完成。' },
              { icon: 'trash' as IconName, title: '删除与清空', desc: '单项删除或一键清空所有已完成项。' },
              { icon: 'archive' as IconName, title: '自动归档', desc: '已完成区域默认只显示最近 20 条，超出的自动归档到「已归档」弹窗。归档可逐条查看，「归档 X」按钮在总数超 20 时出现。' },
              { icon: 'coins' as IconName, title: '代币奖励', desc: '创建清单 +20、完成清单 +20。' },
              { icon: 'bars' as IconName, title: '计数显示', desc: '底部显示「X 条待办 / Y 条已完成」。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
          <Warn>归档项<strong>逐条删除</strong>（不可恢复），「清空」按钮一键物理删除所有已完成项。</Warn>
        </div>
      ),
    },

    // ──────────── 10. 代币系统 ────────────
    {
      id: 'tokens', icon: 'coins', title: '代币系统', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <Warn>每月 1 号余额自动清零。旧记录不删除，只是不再计入余额。请及时使用代币。</Warn>

          <Tip>所有代币任务（日任务、周任务、番茄钟阶梯、打卡奖励）全部自动发放，完成操作后立即到账，不需要手动领取。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 日任务（12 项，每日限 1 次）</h4>
          <p className="text-xs mb-2" style={{ ...pxBody, fontSize: '11px', color: 'var(--oto-text-muted)' }}>完成对应操作后自动到账，每项每天最多触发一次。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { name: '首次番茄钟', amount: 60, note: '今日第一个工作番茄钟' },
              { name: '休息', amount: 20, note: '完成一个休息时段' },
              { name: '创建任务', amount: 20, note: '新建任意任务' },
              { name: '完成任务', amount: 20, note: '将任务标记为已完成' },
              { name: '确定核心任务', amount: 20, note: '在每日计划中选定核心要事' },
              { name: '晨间规划', amount: 40, note: '填写晨间反思' },
              { name: '晚间回顾', amount: 40, note: '填写晚间回顾' },
              { name: '每日计划完成', amount: 60, note: '将每日计划标记为已完成' },
              { name: '写笔记', amount: 40, note: '新建一篇笔记' },
              { name: '创建清单', amount: 20, note: '新建一条随手清单' },
              { name: '完成清单', amount: 20, note: '勾选完成一条清单' },
              { name: '抽扭蛋', amount: 40, note: '完成一次扭蛋抽取' },
            ].map(t => (
              <div key={t.name} className="flex items-center justify-between p-2 oto-inset" style={{ fontSize: '11px' }}>
                <span style={{ ...pxBody, fontSize: '11px', color: '#4a3020' }}>{t.name}</span>
                <span style={{ ...pxBody, fontSize: '11px', color: '#8a6820', fontWeight: 'bold' }}>+{t.amount}</span>
              </div>
            ))}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 番茄钟阶梯奖励（每次完成工作番茄钟自动发放）</h4>
          <div className="flex gap-3">
            {[
              { tier: '入门', range: '1-4 个/天', amount: 40 },
              { tier: '进阶', range: '5-8 个/天', amount: 50 },
              { tier: '大师', range: '9+ 个/天', amount: 60 },
            ].map(t => (
              <div key={t.tier} className="flex-1 p-3 oto-inset text-center">
                <div style={{ ...pxH3, color: '#4a3020' }}>{t.tier}</div>
                <div style={{ ...pxSm, color: 'var(--oto-text-dim)' }}>{t.range}</div>
                <div style={{ ...pxH3, color: '#8a6820', fontWeight: 'bold' }}>+{t.amount}</div>
              </div>
            ))}
          </div>
          <Tip>阶梯是累进制：第 1-4 个每个 40 币，第 5 个起每个 50 币，第 9 个起每个 60 币。不是"达到阈值后全部按高档算"。第 1 个番茄钟同时触发"首次番茄钟"60 币，合计 100 币。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 周任务（4 项，每周自动结算）</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { name: '完成核心任务 5 天', amount: 400, note: '本周至少 5 天完成核心任务' },
              { name: '番茄钟 40 个', amount: 400, note: '本周累计完成 40 个工作番茄钟' },
              { name: '写日记 3 篇 + 周记 1 篇', amount: 200, note: '本周新建 3 篇日记和 1 篇周记' },
              { name: '连续打卡 7 天', amount: 400, note: '本周每天至少获得 1 次代币' },
            ].map(t => (
              <div key={t.name} className="flex items-center justify-between p-2 oto-inset" style={{ fontSize: '11px' }}>
                <span style={{ ...pxBody, fontSize: '11px', color: '#4a3020' }}>{t.name}</span>
                <span style={{ ...pxBody, fontSize: '11px', color: '#8a6820', fontWeight: 'bold' }}>+{t.amount}</span>
              </div>
            ))}
          </div>
          <Tip>周任务在进度达标时自动发放代币，不需要手动领取。如果自动发放失败（网络问题），代币任务页面会显示"可领取"按钮供手动补领。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 连续打卡奖励（每日自动发放）</h4>
          <Tip>连续打卡奖励 = 连续天数 × 10 币,自动发放(无需手动领取)。详情见「连续打卡」板块。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 每日首免</h4>
          <Tip>每天第一次单抽扭蛋免费（不消耗代币）。十连抽不享受免费。页面刷新后自动识别今日是否已使用。</Tip>
        </div>
      ),
    },

    // ──────────── 14. 设置与账户 ────────────
    {
      id: 'settings', icon: 'gear', title: '设置', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <h4 style={{ ...pxH3, color: '#4a3020' }}> 系统开关</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: '关闭代币系统', desc: '隐藏相关功能侧栏入口。关闭后其他功能不受影响，重新开启后恢复正常。' },
              { title: '关闭操作指南', desc: '隐藏侧栏「操作指南」入口。' },
              { title: '关闭新手教程', desc: '隐藏侧栏「新手教程」入口。已完成的教程步骤不会丢失。' },
            ].map(t => (
              <div key={t.title} className="oto-inset p-3">
                <h5 style={{ ...pxH3, fontSize: '10px', color: '#4a3020' }}>{t.title}</h5>
                <p className="text-xs mt-1" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-dim)' }}>{t.desc}</p>
              </div>
            ))}
          </div>
          <Tip>三个开关只控制侧栏显示/隐藏。关闭后不影响其他功能正常使用，重新开启后恢复正常。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 账户设置</h4>
          <p className="text-xs mb-2" style={{ ...pxBody, fontSize: '11px', color: 'var(--oto-text-muted)' }}>点击入口 → 验证当前密码 → 输入新值 → 保存。</p>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
            {['修改用户名', '修改密码', '忘记密码'].map(t => (
              <div key={t} className="p-2 oto-inset text-center" style={{ ...pxSm, fontSize: '12px' }}>{t}</div>
            ))}
          </div>
          <Tip>修改用户名、密码前必须先验证当前密码。「忘记密码」不需要验证，但需要接收重置邮件（可能进垃圾箱）。</Tip>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 用户反馈</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: 'pin' as IconName, title: '提交反馈', desc: '支持 Bug、建议、疑问、综合四种类型。提交后所有用户可见。' },
              { icon: 'edit' as IconName, title: '评论与@提及', desc: '在「全部反馈」弹窗里，每条反馈可展开评论。支持 @提及用户名。' },
              { icon: 'bars' as IconName, title: '类型筛选', desc: '全部反馈弹窗顶部可按类型筛选，显示各类型数量。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> What's New</h4>
          <Tip>版本更新后首次打开网站会自动弹出「What's New」弹窗，展示最新功能。关闭后不再弹出，可在设置页「版本信息」手动查看。</Tip>
        </div>
      ),
    },

    // ──────────── 15. 每日工作流程 ────────────
    {
      id: 'daily-flow', icon: 'refresh', title: '每日工作流程（推荐）', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-3">
          {[
            { time: <><Icon name="sun" size={14} /> 8:00</>, step: 1, title: '制定今日计划 + 晨间规划', desc: '在「每日计划」选择核心任务，写晨间规划。', c: '#304868', bg: '#e8e4f0' },
            { time: <><Icon name="tomato" size={14} /> 9:00</>, step: 2, title: '启动番茄钟专注工作', desc: '关联核心任务，启动 25 分钟专注。', c: '#8a3030', bg: '#f0e0e0' },
            { time: <><Icon name="coffee" size={14} /> 9:25</>, step: 3, title: '短休息 + 记录想法', desc: '5 分钟休息。有临时想法记到「随手清单」。', c: '#406838', bg: '#e0ece0' },
            { time: <><Icon name="refresh" size={14} /> 循环</>, step: 4, title: '重复番茄周期', desc: '专注→休息→专注。每天建议 4-8 个番茄钟。', c: '#8a6820', bg: '#f4e8d0' },
            { time: <><Icon name="moon" size={14} /> 21:00</>, step: 5, title: '晚间回顾 + 完成计划', desc: '写晚间回顾，标记计划完成。', c: '#504868', bg: '#ece4f0' },
            { time: <><Icon name="notebook" size={14} /> 随时</>, step: 6, title: '写笔记沉淀收获', desc: '在「笔记本」记录日记/周记。', c: '#304868', bg: '#e8e4f0' },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-3 oto-window" style={{ borderLeftWidth: 4, borderLeftColor: s.c }}>
              <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 56 }}>
                <span className="inline-flex items-center justify-center w-7 h-7 font-bold" style={{ background: s.bg, color: s.c, fontSize: '14px' }}>{s.step}</span>
                <span className="mt-1" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{s.time}</span>
              </div>
              <div><h5 style={{ ...pxH3, fontSize: '11px', color: s.c }}>{s.title}</h5><p className="text-xs" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>{s.desc}</p></div>
            </div>
          ))}
          <div className="oto-window p-3 text-center">
            <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020' }}>
              坚持这个流程，你会发现自己越来越专注，效率越来越高。
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 16. 常见问题 ────────────
    {
      id: 'faq', icon: 'question', title: '常见问题', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <h4 style={{ ...pxH3, color: '#4a3020' }}> 番茄钟</h4>
          <div className="space-y-2">
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 番茄钟计时准确吗?</strong><br className="md:hidden" /> A: 准确。页面关闭或后台标签页都能继续计时,以本地时间为准。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 工作模式可以不选任务吗?</strong><br className="md:hidden" /> A: 不行,必须先选择任务才能开始工作番茄钟。</p>
            </div>
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 代币系统</h4>
          <div className="space-y-2">
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 代币会过期吗?</strong><br className="md:hidden" /> A: 会。每月 1 号余额自动清零,旧记录不删除。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 代币任务需要手动领取吗?</strong><br className="md:hidden" /> A: 不需要。日任务/周任务/番茄阶梯/打卡奖励全部自动发放。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 扭蛋概率怎么算?</strong><br className="md:hidden" /> A: SSR 2% / SR 8% / R 50% / N 40%。连续 50 抽未出 SSR 后每抽概率+2%。</p>
            </div>
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 任务与项目</h4>
          <div className="space-y-2">
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 任务状态有哪些?</strong><br className="md:hidden" /> A: 待办 → 进行中 → 已完成 → 已归档。每步可回退。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 删除项目会删除任务吗?</strong><br className="md:hidden" /> A: 不会。任务会变为"无项目"状态。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 归档后能恢复吗?</strong><br className="md:hidden" /> A: 能。已归档任务可回退到待办,项目可切换到进行中/已完成。</p>
            </div>
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 账户与设置</h4>
          <div className="space-y-2">
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 修改用户名/密码需要当前密码吗?</strong><br className="md:hidden" /> A: 需要。修改前会弹窗验证当前密码。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 忘记密码怎么找回?</strong><br className="md:hidden" /> A: 输入注册邮箱,系统发送重置链接。链接可能在垃圾箱。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 设置里的开关关闭后数据还在吗?</strong><br className="md:hidden" /> A: 在。开关只控制侧栏显示/隐藏,不影响任何数据。</p>
            </div>
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 月度重置</h4>
          <div className="space-y-2">
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 每月 1 号重置什么?</strong><br className="md:hidden" /> A: 代币余额、扭蛋图鉴、藏品室等级。笔记/任务/计划不受影响。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 藏品室等级会丢失吗?</strong><br className="md:hidden" /> A: 会。月度重置后等级清零,需手动点击「同步到月度记录」保存快照。</p>
            </div>
            <div className="oto-inset p-3">
              <p style={{ ...pxBody, fontSize: '14px', color: '#4a3020', lineHeight: 1.7 }}><strong>Q: 扭蛋机 SSR 锁定会丢失吗?</strong><br className="md:hidden" /> A: 会。每月需重新抽满 300 次才能再次锁定。</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header */}
      <div className="oto-window rounded-none! p-5 oto-card-stamped" style={{ borderColor: 'var(--oto-gold)', background: 'var(--oto-bg-card)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="book" size={22} /> 操作指南</h2>
            <p style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>从零开始，掌握 MONOPOMO</p>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="oto-window p-3 md:p-4">
        <p style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', marginBottom: '10px' }}>快速跳转：</p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 md:gap-2">
          {sections.map((s) => (
            <button key={s.id}
              onClick={() => { setOpenSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className="flex flex-col items-center gap-1 p-1.5 md:p-2 transition-all hover:brightness-110"
              style={{
                background: openSection === s.id ? (s.tagBg || '#f0e4d4') : 'var(--oto-bg-inset)',
                border: `1px solid ${openSection === s.id ? (s.tagBorder || '#c8a040') : 'var(--oto-border-light)'}`,
                cursor: 'pointer',
              }}>
              <span className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center"
                style={{ background: s.tagBg || '#f0e4d4', color: s.tagColor || '#4a3020' }}>
                <Icon name={s.icon as IconName} size={16} className="md:w-[18px] md:h-[18px]" />
              </span>
              <span style={{
                fontFamily: 'var(--oto-font-body)', fontSize: '10px', fontWeight: openSection === s.id ? 700 : 400,
                color: openSection === s.id ? (s.tagColor || '#4a3020') : 'var(--oto-text-dim)',
                textAlign: 'center', lineHeight: 1.3,
              }} className="md:!text-[11px]">
                {s.title.split('：')[0].split('（')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {sections.map(s => {
          const isOpen = openSection === s.id;
          return (
            <div key={s.id} id={s.id} className="oto-window overflow-hidden" style={{ borderColor: isOpen ? '#8a6a48' : '#c8b898' }}>
              <button onClick={() => toggle(s.id)}
                className="w-full px-3 md:px-5 py-3 md:py-4 flex items-center justify-between text-left hover:brightness-110"
                style={{ background: isOpen ? '#f0e4d4' : 'transparent' }}>
                <div className="flex items-center gap-2 md:gap-3">
                  <Icon name={s.icon as IconName} size={20} className="md:w-7 md:h-7" />
                  <h3 style={{ ...pxH3, fontSize: '13px', color: 'var(--oto-text)' }} className="md:!text-[15px]">{s.title}</h3>
                  {s.tag && <span className="oto-badge text-[10px] px-1! py-0! md:text-xs md:px-2 md:py-0.5" style={{ background: s.tagBg, color: s.tagColor, borderColor: s.tagBorder }}>{s.tag}</span>}
                </div>
                <span className="text-gray-500 text-sm md:text-lg" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>▼</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-4" style={{ borderTop: '2px solid #1a2430' }}>{s.content}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center py-6">
        <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '11px', color: '#a08060', lineHeight: '1.8' }}>
          <Icon name="tomato" size={14} /> 单核定方向，番茄保执行 —— 祝你专注每一天！
        </p>
      </div>
    </div>
  );
}