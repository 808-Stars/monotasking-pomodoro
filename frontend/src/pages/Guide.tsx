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

export default function Guide() {
  const [openSection, setOpenSection] = useState<string | null>('intro');
  const toggle = (id: string) => { setOpenSection(openSection === id ? null : id); };

  // 标签颜色
  const PURPLE = { tagBg: '#ece4f4', tagColor: '#504068', tagBorder: '#b098c0' };
  const YELLOW = { tagBg: '#f8f0e0', tagColor: '#8a6820', tagBorder: '#d4b060' };
  const BLUE   = { tagBg: '#e0e8f8', tagColor: '#203050', tagBorder: '#90a0c8' };
  const RED    = { tagBg: '#f0e0e0', tagColor: '#6a2028', tagBorder: '#c08080' };

  const sections: Section[] = [
    // ──────────── 1. 系统简介 ────────────
    {
      id: 'intro', icon: 'book', title: '系统简介：两种方法的融合', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="oto-window p-4" style={{ borderColor: 'var(--oto-gold)' }}>
              <div className="flex items-center gap-2 mb-2"><Icon name="target" size={28} /><h4 style={{ ...pxH3, color: '#304868' }}>单核工作法 · 战略层</h4></div>
              <p className="text-sm leading-relaxed" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
                <strong style={{ color: '#4a3020' }}>核心理念：</strong>每天只聚焦<strong style={{ color: '#304868' }}>一件最重要的事</strong>。多任务切换会消耗大量注意力资源。
              </p>
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                <li>早晨设定今日唯一核心任务</li><li>写晨间规划明确当天目标</li><li>全天围绕核心任务展开工作</li><li>晚间回顾完成情况与收获</li>
              </ul>
            </div>
            <div className="oto-window p-4" style={{ borderColor: 'var(--oto-gold)' }}>
              <div className="flex items-center gap-2 mb-2"><Icon name="tomato" size={28} /><h4 style={{ ...pxH3, color: '#8a3030' }}>番茄工作法 · 执行层</h4></div>
              <p className="text-sm leading-relaxed" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
                <strong style={{ color: '#4a3020' }}>核心理念：</strong>以 <strong style={{ color: '#8a3030' }}>25 分钟专注 + 5 分钟休息</strong> 为一个番茄周期。
              </p>
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                <li>25 分钟专注工作（一个番茄钟）</li><li>5 分钟短休息放松大脑</li><li>随手清单快速捕捉临时想法</li><li>每 4 个番茄钟后一次 15 分钟长休息</li>
              </ul>
            </div>
          </div>
          <div className="oto-window p-4 text-center">
            <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
              <strong> 融合逻辑：</strong>单核工作法回答<strong style={{ color: '#304868' }}>「做什么」</strong>（战略方向），番茄工作法回答<strong style={{ color: '#8a3030' }}>「怎么做」</strong>（执行节奏）。完成工作还能获得代币，用于扭蛋收集！
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 2. 代币系统 ────────────
    {
      id: 'tokens', icon: 'coins', title: '代币系统：赚取与消费', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <div className="oto-window p-4" style={{ borderColor: '#d4b060' }}>
            <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
              代币通过完成工作任务获得，用于扭蛋抽取。<strong style={{ color: '#8a6820' }}>每月 1 号自动清零</strong>，请及时使用。
            </p>
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 日任务（12 项，每日可完成）</h4>
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
              <div key={t.name} className="flex items-center justify-between p-2 oto-inset" style={{ fontSize: '13px' }}>
                <span style={{ ...pxBody, color: '#4a3020' }}>{t.name}</span>
                <span style={{ ...pxBody, color: '#8a6820', fontWeight: 'bold' }}>+{t.amount}</span>
              </div>
            ))}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 周任务（4 项，每周可完成）</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { name: '完成核心任务 5 天', amount: 200, note: '本周至少 5 天完成核心任务' },
              { name: '番茄钟 40 个', amount: 400, note: '本周累计完成 40 个工作番茄钟' },
              { name: '写日记 3 篇 + 周记 1 篇', amount: 200, note: '本周新建 3 篇日记和 1 篇周记' },
              { name: '连续打卡 7 天', amount: 400, note: '本周每天至少获得 1 次代币' },
            ].map(t => (
              <div key={t.name} className="flex items-center justify-between p-2 oto-inset" style={{ fontSize: '13px' }}>
                <span style={{ ...pxBody, color: '#4a3020' }}>{t.name}</span>
                <span style={{ ...pxBody, color: '#8a6820', fontWeight: 'bold' }}>+{t.amount}</span>
              </div>
            ))}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 番茄钟分级奖励（每次完成工作番茄钟）</h4>
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

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 领取机制</h4>
          <div className="oto-window p-3">
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', lineHeight: 1.8 }}>
              日任务完成后自动创建<strong>待领取</strong>记录（不立即计入余额）。在扭蛋机页面的「代币来源」面板点击「领取」或「一键领取」后才正式到账。
              <br />余额仅统计已领取的代币。<strong style={{ color: '#8a6820' }}>每月 1 号 0 点自动清零。</strong>
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 3. 工作看板 ────────────
    {
      id: 'dashboard', icon: 'dashboard', title: '工作看板：总览与控制中心', tag: '功能说明',
      ...YELLOW,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: 'target' as IconName, title: '单核工作法面板', desc: '显示今日核心任务、晨间规划、晚间回顾。可快速标记计划完成。' },
            { icon: 'tomato' as IconName, title: '番茄工作法面板', desc: '显示今日番茄钟统计、本周进度。快速启动番茄钟。' },
            { icon: 'task' as IconName, title: '任务总览', desc: '今日待办任务列表，按优先级排序。可快速切换任务状态。' },
            { icon: 'clock' as IconName, title: '今日番茄记录', desc: '今天完成的番茄钟时间线，显示关联任务和时段。' },
            { icon: 'bars' as IconName, title: '本周摘要', desc: '本周核心任务完成天数、番茄钟总数、代币收入概览。' },
            { icon: 'graduate' as IconName, title: '新手引导', desc: '首次使用时显示 6 步入门教程，帮助快速上手。' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      ),
    },

    // ──────────── 4. 任务管理 ────────────
    {
      id: 'tasks', icon: 'task', title: '任务管理：创建、追踪与完成', tag: '功能说明',
      ...YELLOW,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: 'plus' as IconName, title: '新建任务', desc: '设置名称、描述、优先级（高/中/低）、所属项目、预估番茄钟数、截止日期。创建可获得 20 代币。' },
            { icon: 'search' as IconName, title: '筛选与搜索', desc: '按状态（待办/进行中/已完成/已归档）、优先级、项目筛选。支持关键词搜索。' },
            { icon: 'refresh' as IconName, title: '状态流转', desc: '待办→进行中→已完成→已归档。每步可回退。完成任务可获得 20 代币。' },
            { icon: 'tomato' as IconName, title: '番茄钟进度', desc: '每个任务显示「已完成/预估」番茄钟数。完成番茄钟时自动累加。' },
            { icon: 'bars' as IconName, title: '表格布局', desc: '任务以卡片形式展示，显示优先级标签、状态标签、项目颜色条。支持拖拽排序（计划中）。' },
            { icon: 'check' as IconName, title: '批量操作', desc: '支持多选任务进行批量状态变更、批量删除、批量移动项目等操作。' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      ),
    },

    // ──────────── 5. 项目管理 ────────────
    {
      id: 'projects', icon: 'folder', title: '项目管理：分组、追踪与归档', tag: '功能说明',
      ...YELLOW,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: 'plus' as IconName, title: '创建项目', desc: '设置项目名称、描述和标签颜色。颜色用于在任务列表中快速识别项目归属。' },
            { icon: 'refresh' as IconName, title: '项目状态', desc: '每个项目有三种状态：待办（进行中）、完成（已结束）、归档（已归档）。可随时切换。' },
            { icon: 'task' as IconName, title: '任务关联', desc: '创建任务时可选择所属项目。项目详情页自动聚合该项目下的所有任务，按优先级和状态排序。' },
            { icon: 'dashboard' as IconName, title: '项目详情面板', desc: '点击项目卡片进入详情页，查看项目描述、关联任务列表、完成进度和统计数据。' },
            { icon: 'star' as IconName, title: '标签颜色', desc: '每个项目可设置独立的标签颜色（红/橙/黄/绿/蓝/紫/灰），在任务卡片和看板中直观区分。' },
            { icon: 'bars' as IconName, title: '项目统计', desc: '自动统计项目内的任务总数、已完成数、完成率。配合番茄钟进度追踪项目投入时间。' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      ),
    },

    // ──────────── 6. 扭蛋机 ────────────
    {
      id: 'gacha', icon: 'joystick', title: '扭蛋机：抽取与收集', tag: '功能说明',
      ...YELLOW,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'sword' as IconName, title: '抽取规则', desc: '单抽 50 代币，十连 500 代币。物品池：8 职业 × 4 稀有度 = 32 件。抽取消耗代币，每月重置。' },
              { icon: 'star' as IconName, title: '每日首免', desc: '每天首次单抽免费（不消耗代币）。十连不影响首免状态。页面刷新后自动识别今日是否已使用。', color: '#305830' },
              { icon: 'pity' as IconName, title: '渐进保底', desc: '连续 50 抽未出 SSR 后，每抽 SSR 概率 +2%（4%→6%→…→100%必出）。出 SSR 后重置为 2%。保底进度每月重置。', color: '#8a6820' },
              { icon: 'gift' as IconName, title: '十连保底', desc: '十连抽至少包含 1 件 R 级以上物品（不会全 N）。若全 N 则末位自动提升为 R+。' },
              { icon: 'lock' as IconName, title: 'SSR 锁定', desc: '本月累计 300 抽解锁。可选择一个 SSR 物品锁定，下次出 SSR 时必为该物品。每月可用一次，跨月过期。', color: '#a03038' },
              { icon: 'bars' as IconName, title: '概率公示', desc: 'SSR 2% · SR 8% · R 50% · N 40%。每种稀有度内 8 件物品等概率。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 图鉴与重置</h4>
          <div className="oto-window p-3">
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', lineHeight: 1.8 }}>
              每月 1 号图鉴自动重置——当月收集的物品数量清零，重新开始收集。<strong>SSR 锁定门槛也按月重置</strong>（本月需重新抽满 300 次才能再次锁定）。
              <br />所有抽取记录（代币余额、累计抽取数）均按月统计，每月 1 号 0 点清零。
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 7. 藏品室 ────────────
    {
      id: 'showcase', icon: 'building', title: '藏品室：成就与收藏', tag: '功能说明',
      ...YELLOW,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: 'target' as IconName, title: '赏金猎人勋章', desc: '按当月累计代币数评级。阈值：3,000 / 9,800 / 19,800 / 32,800。', color: '#8a6820' },
              { icon: 'tomato' as IconName, title: '番茄大厨怀表', desc: '按当月完成番茄钟数评级。阈值：30 / 60 / 120 / 240 个。', color: '#8a3030' },
              { icon: 'star' as IconName, title: '卡牌大师奖杯', desc: '按当月集齐稀有度种类评级。需集齐该稀有度全部 8 件物品。N→R→SR→SSR 累进。', color: '#504868' },
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

          <h4 style={{ ...pxH3, color: '#4a3020' }}> 同步与历史</h4>
          <div className="oto-window p-3">
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', lineHeight: 1.8 }}>
              当月实时进度通过「本月实时进度」栏展示。<strong style={{ color: '#a03038' }}>请务必点击「同步到月度记录」按钮</strong>将当前进度保存为历史快照，否则进度可能丢失。
              <br />历史记录以日历形式展示每日代币数、番茄钟数和抽取稀有度。可切换年份查看历史快照。
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 8. 单核工作法：每日计划 ────────────
    {
      id: 'single-core', icon: 'target', title: '单核工作法：每日计划详解', tag: '战略层',
      ...BLUE,
      content: (
        <div className="space-y-4">
          <div className="oto-window p-4" style={{ borderColor: '#90a0c8' }}>
            <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
              每日计划是单核工作法的核心——<strong style={{ color: '#304868' }}>每天只聚焦一件最重要的事</strong>。状态流转如下：
            </p>
            <div className="mt-3 p-3 text-center" style={{ background: '#f8f4f0', fontFamily: 'var(--oto-font-body)', fontSize: '14px', color: '#4a3020', lineHeight: 2.2 }}>
              <strong>未计划</strong> → <strong style={{ color: '#687898' }}>已计划</strong> → <strong style={{ color: '#689050' }}>已完成</strong> → <strong style={{ color: '#786890' }}>已回顾</strong><br />
              <span style={{ color: '#a03038' }}>　　　　　↘ 未完成</span><br />
              <span style={{ color: 'var(--oto-text-muted)', fontSize: '12px' }}>
                已计划可回退至未计划 · 已完成/未完成可回退至已计划 · 已回顾可回退至已完成
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'target' as IconName, title: '核心任务选择', desc: '从任务列表中选择今日唯一核心任务。未设置时显示「暂不设置」。确定核心任务可获得 20 代币。', color: '#304868' },
              { icon: 'sun' as IconName, title: '晨间规划', desc: '填写今天的目标、计划和安排。填写可获得 40 代币。自动保存（800ms 防抖）。', color: '#8a6820' },
              { icon: 'moon' as IconName, title: '晚间回顾', desc: '填写完成情况、收获和反思。填写可获得 40 代币。', color: '#504868' },
              { icon: 'check' as IconName, title: '状态流转', desc: '未计划→已计划（开始计划）→已完成（完成计划，+60 代币）/未完成（标记未完成）→已回顾。各状态均可回退。', color: '#305830' },
              { icon: 'calendar' as IconName, title: '历史计划日历', desc: '按月查看历史计划。颜色标记不同状态（已计划/已完成/未完成/已回顾）。未计划日期显示为空。', color: '#304868' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
        </div>
      ),
    },

    // ──────────── 9. 笔记本 ────────────
    {
      id: 'notebook', icon: 'notebook', title: '笔记本：记录与回顾', tag: '战略层',
      ...BLUE,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: 'notebook' as IconName, title: '日记（每日回顾）', desc: '记录每天的工作内容、心情和反思。写日记可获得 40 代币。支持富文本编辑和标签分类。', color: '#304868' },
            { icon: 'bars' as IconName, title: '周记（每周总结）', desc: '每周总结工作成果和改进方向。写周记可获得 40 代币。系统会自动聚合本周的日记内容作为参考。', color: '#8a6820' },
            { icon: 'calendar' as IconName, title: '月记（月度复盘）', desc: '每月复盘目标完成情况和成长轨迹。系统自动关联当月的核心任务完成率和番茄钟数据。', color: '#504868' },
            { icon: 'search' as IconName, title: '筛选与统计', desc: '按类型（日记/周记/月记）、日期范围筛选。统计面板显示笔记总数、本月新增、连续写作天数。', color: '#305830' },
            { icon: 'check' as IconName, title: '编辑与删除', desc: '笔记创建后可随时编辑和修改。支持单项删除和批量删除。已删除的笔记无法恢复。', color: '#4a3020' },
            { icon: 'bulb' as IconName, title: '内容模板', desc: '提供日记/周记/月记的写作模板参考。引导填写「今日亮点」「明日计划」「反思改进」等结构化内容。', color: '#8a3030' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      ),
    },

    // ──────────── 10. 番茄工作法：番茄钟 ────────────
    {
      id: 'pomodoro', icon: 'tomato', title: '番茄工作法：番茄钟详解', tag: '执行层',
      ...RED,
      content: (
        <div className="space-y-4">
          <div className="oto-window p-4" style={{ borderColor: '#c08080' }}>
            <p style={{ ...pxBody, fontWeight: 'bold', color: '#4a3020', marginBottom: 8 }}>番茄钟核心原则：</p>
            <ol className="list-decimal list-inside space-y-1 text-sm" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
              <li>一个番茄钟（25 分钟）不可分割</li><li>番茄钟期间只做一件事</li><li>休息时彻底放松，不想工作</li><li>被打断则标记作废</li><li>完成即奖励，形成正反馈循环</li>
            </ol>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'refresh' as IconName, title: '模式切换', desc: '工作（25 分钟）/ 短休息（5 分钟）/ 长休息（15 分钟）。完成工作番茄钟后自动提示休息。' },
              { icon: 'clock' as IconName, title: '时间线显示', desc: '开始时间 → 结束时间，倒计时进度条。暂停时显示 --:--:--，继续后重新计算结束时间。' },
              { icon: 'task' as IconName, title: '关联任务', desc: '启动番茄钟前选择关联任务。完成后自动累加该任务的番茄钟进度。下拉框旁有 ↻ 刷新按钮。' },
              { icon: 'bars' as IconName, title: '统计面板', desc: '今日/本周/本月/总计番茄钟数。历史记录页可按时间筛选和删除。' },
              { icon: 'forward' as IconName, title: '快进按钮', desc: '开发者模式下可用。快进视为完整时长完成，发放代币奖励，但不播放音效。' },
              { icon: 'star' as IconName, title: '代币奖励', desc: '每完成一个工作番茄钟获得代币（分级：1-4个 40 币 / 5-8个 50 币 / 9+个 60 币）。每日首次完成额外 60 币。', color: '#8a6820' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
        </div>
      ),
    },

    // ──────────── 11. 随手清单 ────────────
    {
      id: 'quick-memos', icon: 'memo', title: '随手清单：快速捕捉想法', tag: '执行层',
      ...RED,
      content: (
        <div className="space-y-3">
          <div className="oto-window p-3"><p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>番茄钟期间的临时想法不要当场处理——记到随手清单，休息时再整理。创建和完成清单各可获得 20 代币。</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'plus' as IconName, title: '快速添加', desc: '输入内容后回车或点击添加按钮。轻量级设计，无分类无标签。' },
              { icon: 'check' as IconName, title: '勾选完成', desc: '点击左侧复选框标记完成。已完成项带删除线，可随时取消完成。' },
              { icon: 'trash' as IconName, title: '删除与清空', desc: '单项删除或一键清空所有已完成项。' },
              { icon: 'bars' as IconName, title: '计数显示', desc: '底部显示「X 条待办 / Y 条已完成」。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
        </div>
      ),
    },

    // ──────────── 12. 账号与数据 ────────────
    {
      id: 'account', icon: 'lock', title: '账号与数据管理', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: 'plus' as IconName, title: '注册与登录', desc: '用户名限 3-30 位字母数字下划线，密码至少 6 位。登录后自动获取 Token，无需重复登录。' },
              { icon: 'lock' as IconName, title: '数据隔离', desc: '每个账号的数据完全独立——任务、番茄钟、代币、扭蛋记录互不干扰。多人共用同一系统时各自独立。' },
              { icon: 'refresh' as IconName, title: '月度自动重置', desc: '每月 1 号 0 点：代币余额清零、扭蛋图鉴重置、SSR 锁定过期、藏品室进入新月份。请及时同步藏品室快照。' },
              { icon: 'logout' as IconName, title: '退出登录', desc: '侧边栏底部点击「退出登录」。退出后需重新输入密码，开发者模式设置也随账号独立保存。' },
            ].map(item => <Card key={item.title} {...item} />)}
          </div>
          <div className="oto-window p-3">
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', lineHeight: 1.8 }}>
              <strong style={{ color: '#a03038' }}>重要提醒：</strong>月度重置是不可逆的。上月未同步的藏品室进度、未使用的代币都会丢失。建议每月最后一天点击「同步到月度记录」保存快照。
            </p>
          </div>
        </div>
      ),
    },

    // ──────────── 13. 每日工作流程 ────────────
    {
      id: 'daily-flow', icon: 'refresh', title: '每日工作流程（推荐）', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-3">
          {[
            { time: <><Icon name="sun" size={14} /> 8:00</>, step: 1, title: '制定今日计划 + 晨间规划', desc: '在「每日计划」页面选择核心任务，写晨间规划。明确今天最重要的那件事。', c: '#304868', bg: '#e8e4f0' },
            { time: <><Icon name="tomato" size={14} /> 9:00</>, step: 2, title: '启动番茄钟专注工作', desc: '在「番茄钟」页面关联核心任务，启动 25 分钟专注。完成可获得 40~60 代币奖励。', c: '#8a3030', bg: '#f0e0e0' },
            { time: <><Icon name="coffee" size={14} /> 9:25</>, step: 3, title: '短休息 + 记录想法', desc: '5 分钟休息。有临时想法随手记到「随手清单」，不打断专注流。', c: '#406838', bg: '#e0ece0' },
            { time: <><Icon name="refresh" size={14} /> 循环</>, step: 4, title: '重复番茄周期', desc: '专注→休息→专注，每天建议 4~8 个番茄钟。每完成一个番茄钟自动获得代币。', c: '#8a6820', bg: '#f4e8d0' },
            { time: <><Icon name="moon" size={14} /> 21:00</>, step: 5, title: '晚间回顾 + 完成计划', desc: '在「每日计划」写晚间回顾，标记计划为「已完成」或「未完成」。可获得 40+60 代币。', c: '#504868', bg: '#ece4f0' },
            { time: <><Icon name="notebook" size={14} /> 随时</>, step: 6, title: '写笔记沉淀收获', desc: '在「笔记本」记录日回顾/周回顾，沉淀经验和反思。可获得 40 代币。', c: '#304868', bg: '#e8e4f0' },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-3 oto-window" style={{ borderLeftWidth: 4, borderLeftColor: s.c }}>
              <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 56 }}>
                <span className="inline-flex items-center justify-center w-7 h-7 font-bold" style={{ background: s.bg, color: s.c, fontSize: '14px' }}>{s.step}</span>
                <span className="mt-1" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{s.time}</span>
              </div>
              <div><h5 style={{ ...pxH3, fontSize: '11px', color: s.c }}>{s.title}</h5><p className="text-xs" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>{s.desc}</p></div>
            </div>
          ))}
        </div>
      ),
    },

    // ──────────── 14. 最佳实践 ────────────
    {
      id: 'tips', icon: 'bulb', title: '最佳实践与技巧', tag: '系统',
      ...PURPLE,
      content: (
        <div className="space-y-3">
          {[
            { i: 'target' as IconName, t: '核心任务太大怎么办？', d: '拆成更小的子任务。核心任务应该是「今天能完成」的粒度。如果太大，先设定今天的第一个里程碑。' },
            { i: 'tomato' as IconName, t: '番茄钟期间收到消息？', d: '非紧急消息记到随手清单，等休息时处理。紧急事务中断番茄钟并标记作废。培养「延迟响应」的习惯。' },
            { i: 'bars' as IconName, t: '如何量化进步？', d: '关注番茄钟数量趋势和核心任务完成率。藏品室的勋章/怀表/奖杯是你的可视化成就系统。' },
            { i: 'clock' as IconName, t: '最佳番茄钟时段', d: '多数人精力高峰在上午 8-11 点。建议把核心任务安排在最清醒的时段。' },
            { i: 'refresh' as IconName, t: '番茄钟被打断怎么办？', d: '内部打断：记到随手清单。外部打断：非紧急说「等一下」，紧急则标记作废。' },
            { i: 'notebook' as IconName, t: '坚持写笔记的秘诀', d: '不要追求完美——一句话也可以是一条好笔记。日记关注执行、周记关注趋势。' },
            { i: 'coins' as IconName, t: '代币最大化策略', d: '每天完成全部 12 项日任务（400 币）+ 6 个番茄钟（260 币）+ 周任务，月收入约 24,200 币，足够集齐全部 SSR。', color: '#8a6820' },
            { i: 'joystick' as IconName, t: '扭蛋策略建议', d: '每天先用免费单抽，再决定是否追加。300 抽后善用 SSR 锁定锁定目标。每月初集中抽取比零散更高效。', color: '#8a6820' },
          ].map(item => (
            <div key={item.t} className="flex gap-3 p-3 oto-window">
              <Icon name={item.i} size={28} className="flex-shrink-0" />
              <div><h5 style={{ ...pxH3, fontSize: '10px', color: item.color || '#4a3020' }}>{item.t}</h5><p className="text-xs leading-relaxed" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>{item.d}</p></div>
            </div>
          ))}
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
            <p style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>从零开始，掌握单核 × 番茄工作法</p>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="oto-window p-4">
        <p style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', marginBottom: '10px' }}>快速跳转：</p>
        <div className="grid grid-cols-7 gap-2">
          {sections.map((s) => (
            <button key={s.id}
              onClick={() => { setOpenSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className="flex flex-col items-center gap-1.5 p-3 transition-all hover:brightness-110"
              style={{
                background: openSection === s.id ? (s.tagBg || '#f0e4d4') : 'var(--oto-bg-inset)',
                border: `1px solid ${openSection === s.id ? (s.tagBorder || '#c8a040') : 'var(--oto-border-light)'}`,
                cursor: 'pointer',
              }}>
              <span className="w-8 h-8 flex items-center justify-center"
                style={{ background: s.tagBg || '#f0e4d4', color: s.tagColor || '#4a3020' }}>
                <Icon name={s.icon as IconName} size={18} />
              </span>
              <span style={{
                fontFamily: 'var(--oto-font-body)', fontSize: '11px', fontWeight: openSection === s.id ? 700 : 400,
                color: openSection === s.id ? (s.tagColor || '#4a3020') : 'var(--oto-text-dim)',
                textAlign: 'center', lineHeight: 1.3,
              }}>
                {s.title.split('：')[0]}
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
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:brightness-110"
                style={{ background: isOpen ? '#f0e4d4' : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <Icon name={s.icon as IconName} size={28} />
                  <h3 style={{ ...pxH3, color: 'var(--oto-text)' }}>{s.title}</h3>
                  {s.tag && <span className="oto-badge" style={{ background: s.tagBg, color: s.tagColor, borderColor: s.tagBorder }}>{s.tag}</span>}
                </div>
                <span className="text-gray-500 text-lg" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>▼</span>
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
