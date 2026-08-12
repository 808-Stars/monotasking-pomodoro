import type React from 'react';

/* ═══════════════════════════════════════════════════════════════
   Hand-drawn ink style SVG icons for the Octopath theme.
   All 24×24 viewBox, stroke-based, currentColor.

   设计原则：
   1) 一图标一含义 — 同一图标不被两个不同功能复用
   2) 形状精确 — 通过轮廓细节区分相似概念
   3) 比例合理 — 24×24 viewBox 内主元素至少占 16×16
   ═══════════════════════════════════════════════════════════════ */

type IconProps = { size?: number | string; className?: string; style?: React.CSSProperties };

const Svg: React.FC<{ children: React.ReactNode; size?: number | string; className?: string; style?: React.CSSProperties; viewBox?: string; strokeWidth?: number }> =
  ({ children, size = '1em', className, style, viewBox = '0 0 24 24', strokeWidth = 1.6 }) => (
    <svg
      width={size} height={size} viewBox={viewBox}
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: '-0.15em', ...style }}
    >
      {children}
    </svg>
  );

/* ═══════════════════════════════════════════════════════════════
   Section A — 番茄钟 / 时间相关
   ═══════════════════════════════════════════════════════════════ */

// 番茄（完整果实：花萼5裂 + 分瓣 + 高光）— 番茄钟计时器本体
export const IconTomato = (p: IconProps) => <Svg {...p}>
  {/* 果实主体 - 略扁的椭圆 */}
  <path d="M5 14C5 10.5 8 8 12 8s7 2.5 7 6c0 3.8 -3 6 -7 6s-7 -2.2 -7 -6z"/>
  {/* 顶部小凹（茎与果实连接处） */}
  <path d="M10.5 8.5c0.5 -0.4 1.5 -0.4 2 0"/>
  {/* 花萼 - 5 裂绿叶（左上） */}
  <path d="M12 8L9.5 6L8 7L9.5 7.5z"/>
  {/* 花萼 - 5 裂绿叶（右上） */}
  <path d="M12 8L14.5 6L16 7L14.5 7.5z"/>
  {/* 花萼 - 顶部叶 */}
  <path d="M12 8L11 5L12 6L13 5z"/>
  {/* 花萼 - 左侧叶 */}
  <path d="M12 8L7 7L8 8.5L10 8z"/>
  {/* 花萼 - 右侧叶 */}
  <path d="M12 8L17 7L16 8.5L14 8z"/>
  {/* 茎 */}
  <path d="M12 7V3.5"/>
  {/* 分瓣线（4 瓣果实的沟纹） */}
  <path d="M12 11C10 12 9 14 9 16"/>
  <path d="M12 11C14 12 15 14 15 16"/>
  <path d="M12 11.5C10.5 12 10 13.5 10 15" opacity="0.5"/>
  <path d="M12 11.5C13.5 12 14 13.5 14 15" opacity="0.5"/>
  {/* 高光（果实光泽） */}
  <path d="M8 12.5C8.5 11.5 9.3 11 10 10.8" opacity="0.5"/>
</Svg>;

// 沙漏（番茄钟历史记录）— 沙漏形状
export const IconHourglass = (p: IconProps) => <Svg {...p}>
  <path d="M6 3h12"/>
  <path d="M6 21h12"/>
  <path d="M6 3c0 5 6 6 6 9c0 -3 6 -4 6 -9"/>
  <path d="M6 21c0 -5 6 -6 6 -9c0 3 6 4 6 9"/>
  <path d="M11 16l1.5 1.5l1.5 -1.5"/>
</Svg>;

// 咖啡杯（短休息）— 蒸汽+杯+碟
export const IconCoffee = (p: IconProps) => <Svg {...p}>
  <path d="M4 7v9a3 3 0 003 3h7a3 3 0 003 -3V7z"/>
  <path d="M17 10h2a2 2 0 010 4h-2"/>
  <path d="M8 3c0 1 0.5 1.5 0 2.5c-0.5 1 0 1.5 0 2.5"/>
  <path d="M12 3c0 1 0.5 1.5 0 2.5c-0.5 1 0 1.5 0 2.5"/>
  <path d="M3 21h14"/>
</Svg>;

// 莲花（长休息 / 冥想）— 莲瓣+底座
export const IconMeditate = (p: IconProps) => <Svg {...p}>
  <path d="M12 3c-2 3 -2 5 0 8c2 -3 2 -5 0 -8z"/>
  <path d="M9 6c-2.5 2 -2.5 5 0 7c1 -2 1 -5 0 -7z"/>
  <path d="M15 6c2.5 2 2.5 5 0 7c-1 -2 -1 -5 0 -7z"/>
  <path d="M6 18c2 2 4 3 6 3s4 -1 6 -3"/>
  <path d="M4 21c2 -1.5 5 -2 8 -2s6 0.5 8 2"/>
</Svg>;

// 钟表（番茄钟统计）
export const IconClock = (p: IconProps) => <Svg {...p}>
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 7v5l3 3"/>
  <path d="M12 3v0.5M21 12h-0.5M12 21v-0.5M3 12h0.5"/>
</Svg>;

/* ═══════════════════════════════════════════════════════════════
   Section B — 任务 / 项目 / 清单
   ═══════════════════════════════════════════════════════════════ */

// 任务清单（带勾的剪贴板）— 任务管理
export const IconTask = (p: IconProps) => <Svg {...p}>
  <path d="M6 4h10l3 3v13a1 1 0 01-1 1H6a1 1 0 01-1 -1V5a1 1 0 011 -1z"/>
  <path d="M15 4v3h3"/>
  <path d="M9 11l1.5 1.5L13 10"/>
  <path d="M9 16h7"/>
  <path d="M9 19h5"/>
</Svg>;

// 任务线（横线+勾 + 清单样式）— 随手清单
export const IconMemo = (p: IconProps) => <Svg {...p}>
  <rect x="4" y="4" width="16" height="16" rx="1"/>
  <path d="M8 9h8"/>
  <path d="M8 13h8"/>
  <path d="M8 17h5"/>
  <circle cx="6.5" cy="9" r="0.5" fill="currentColor"/>
  <circle cx="6.5" cy="13" r="0.5" fill="currentColor"/>
  <circle cx="6.5" cy="17" r="0.5" fill="currentColor"/>
</Svg>;

// 项目文件夹（带子标签）— 项目管理
export const IconFolder = (p: IconProps) => <Svg {...p}>
  <path d="M3 7a1 1 0 011 -1h5l2 2h8a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1 -1z"/>
  <path d="M3 10h17"/>
  <rect x="7" y="13" width="3" height="2" rx="0.3"/>
  <rect x="12" y="13" width="3" height="2" rx="0.3"/>
</Svg>;

// 笔记本（带书签 + 横线）— 笔记本/日记/回顾
export const IconNotebook = (p: IconProps) => <Svg {...p}>
  <path d="M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2 -2z"/>
  <path d="M5 18a2 2 0 002 2h12"/>
  <path d="M9 8h7M9 12h7M9 16h5"/>
  <path d="M15 3l3 1l-1 3"/>
</Svg>;

// 帆布书（打开的书）— 操作指南
export const IconBook = (p: IconProps) => <Svg {...p}>
  <path d="M4 5h6c1.5 0 2 1 2 2v13"/>
  <path d="M20 5h-6c-1.5 0 -2 1 -2 2v13"/>
  <path d="M4 5v13c2 -1 4 -1 6 0v-13"/>
  <path d="M20 5v13c-2 -1 -4 -1 -6 0v-13"/>
</Svg>;

// 学士帽（教程）— 新手教程
export const IconGraduate = (p: IconProps) => <Svg {...p}>
  <path d="M2 9l10 -4l10 4l-10 4z"/>
  <path d="M6 11v4c0 2 3 3 6 3s6 -1 6 -3v-4"/>
  <path d="M21 9v4"/>
</Svg>;

/* ═══════════════════════════════════════════════════════════════
   Section C — 核心 / 目标 / 每日计划
   ═══════════════════════════════════════════════════════════════ */

// 准星（同心圆+十字）— 核心任务 / 单核
export const IconTarget = (p: IconProps) => <Svg {...p}>
  <circle cx="12" cy="12" r="7"/>
  <circle cx="12" cy="12" r="3"/>
  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
</Svg>;

// 太阳（晨间规划）— 带光线
export const IconSun = (p: IconProps) => <Svg {...p}>
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>
  <path d="M9 9c1 -1 4 -1 6 0" opacity="0.7"/>
</Svg>;

// 月亮（晚间回顾）— 带星星
export const IconMoon = (p: IconProps) => <Svg {...p}>
  <path d="M19 14.5A7.5 7.5 0 019.5 5a8 8 0 109.5 9.5z"/>
  <path d="M16 4l0.5 1.5L18 6l-1.5 0.5L16 8l-0.5 -1.5L14 6l1.5 -0.5z" strokeWidth="1"/>
</Svg>;

/* ═══════════════════════════════════════════════════════════════
   Section D — 数据 / 看板 / 统计
   ═══════════════════════════════════════════════════════════════ */

// 看板（带卡片）— 工作看板
export const IconDashboard = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="4" width="18" height="16" rx="1.5"/>
  <rect x="5" y="6" width="6" height="5" rx="0.5"/>
  <rect x="13" y="6" width="6" height="3" rx="0.5"/>
  <rect x="5" y="13" width="6" height="5" rx="0.5"/>
  <rect x="13" y="11" width="6" height="7" rx="0.5"/>
</Svg>;

// 折线图（统计卡片）— 数据统计
export const IconChart = (p: IconProps) => <Svg {...p}>
  <path d="M3 21h18"/>
  <path d="M5 17l4 -4l3 3l5 -7"/>
  <circle cx="5" cy="17" r="1" fill="currentColor"/>
  <circle cx="9" cy="13" r="1" fill="currentColor"/>
  <circle cx="12" cy="16" r="1" fill="currentColor"/>
  <circle cx="17" cy="9" r="1" fill="currentColor"/>
</Svg>;

// 统计柱状图（概率/计数显示）— 概率公示
export const IconBars = (p: IconProps) => <Svg {...p}>
  <path d="M3 21h18"/>
  <rect x="5" y="14" width="3" height="6"/>
  <rect x="10" y="10" width="3" height="10"/>
  <rect x="15" y="6" width="3" height="14"/>
</Svg>;

/* ═══════════════════════════════════════════════════════════════
   Section E — 日历 / 时间轴
   ═══════════════════════════════════════════════════════════════ */

// 日历（单日/横翻）— 每日计划 / 选定日期
export const IconCalendar = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="5" width="18" height="16" rx="1.5"/>
  <path d="M3 10h18"/>
  <path d="M8 3v4M16 3v4"/>
  <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
</Svg>;

// 月历（月度展开）— 月份记录
export const IconMonth = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="6" width="18" height="15" rx="1.5"/>
  <path d="M3 10h18"/>
  <path d="M8 3v4M16 3v4"/>
  <path d="M7 13h2v2H7zM12 13h2v2h-2zM17 13h0M7 17h2v2H7zM12 17h2v2h-2zM17 17h0"/>
  <rect x="16.5" y="12.5" width="2" height="2" fill="currentColor" stroke="none"/>
  <rect x="16.5" y="16.5" width="2" height="2" fill="currentColor" stroke="none"/>
</Svg>;

/* ═══════════════════════════════════════════════════════════════
   Section F — 通用动作
   ═══════════════════════════════════════════════════════════════ */

// 播放三角（开始 / 继续）— 计时器启动、任务开始
export const IconPlay = (p: IconProps) => <Svg {...p}>
  <path d="M7 5l12 7l-12 7z"/>
</Svg>;

// 暂停（计时器）
export const IconPause = (p: IconProps) => <Svg {...p}>
  <rect x="6" y="5" width="3" height="14"/>
  <rect x="15" y="5" width="3" height="14"/>
</Svg>;

// 勾选圆圈（完成）— 完成/已完成
export const IconCheck = (p: IconProps) => <Svg {...p}>
  <circle cx="12" cy="12" r="9"/>
  <path d="M8 12l3 3l5 -6"/>
</Svg>;

// 左回退箭头（回退/重置）— 撤销操作
export const IconUndo = (p: IconProps) => <Svg {...p}>
  <path d="M4 7h11a6 6 0 010 12H9"/>
  <polyline points="4,7 8,3 8,11"/>
</Svg>;

// 钢笔（编辑）
export const IconEdit = (p: IconProps) => <Svg {...p}>
  <path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3 -3L5 17z"/>
  <path d="M14.5 5.5l3 3"/>
  <path d="M5 17l3 3"/>
</Svg>;

// 垃圾桶
export const IconTrash = (p: IconProps) => <Svg {...p}>
  <path d="M4 7h16"/>
  <path d="M6 7v13a2 2 0 002 2h8a2 2 0 002 -2V7"/>
  <path d="M9 7V4h6v3"/>
  <path d="M10 11v7M14 11v7"/>
</Svg>;

// X 关闭
export const IconClose = (p: IconProps) => <Svg {...p}>
  <path d="M6 6l12 12"/>
  <path d="M18 6L6 18"/>
</Svg>;

// 汉堡菜单
export const IconMenu = (p: IconProps) => <Svg {...p}>
  <path d="M4 7h16M4 12h16M4 17h16"/>
</Svg>;

// 放大镜
export const IconSearch = (p: IconProps) => <Svg {...p}>
  <circle cx="10.5" cy="10.5" r="6"/>
  <path d="M15 15l4 4"/>
</Svg>;

// 加号
export const IconPlus = (p: IconProps) => <Svg {...p}>
  <path d="M12 5v14"/>
  <path d="M5 12h14"/>
</Svg>;

// 减号
export const IconMinus = (p: IconProps) => <Svg {...p}>
  <path d="M5 12h14"/>
</Svg>;

// 五角星（强调/重点）
export const IconStar = (p: IconProps) => <Svg {...p}>
  <path d="M12 3l2.5 6l6.5 0.5l-5 4.5l1.5 6.5L12 17l-5.5 3.5L8 14l-5 -4.5L9.5 9z"/>
</Svg>;

// 警示三角
export const IconAlert = (p: IconProps) => <Svg {...p}>
  <path d="M12 4L2 20h20z"/>
  <path d="M12 10v5"/>
  <circle cx="12" cy="18" r="0.5" fill="currentColor"/>
</Svg>;

// 灯泡（提示）
export const IconBulb = (p: IconProps) => <Svg {...p}>
  <path d="M9 18h6"/>
  <path d="M10 21h4"/>
  <path d="M12 3a6 6 0 00-3 11c0.6 0.5 1 1.2 1 2v1h4v-1c0 -0.8 0.4 -1.5 1 -2a6 6 0 00-3 -11z"/>
  <path d="M10 9c0.5 -1 1.5 -1.5 2 -1.5" opacity="0.7"/>
</Svg>;

// 锁
export const IconLock = (p: IconProps) => <Svg {...p}>
  <rect x="5" y="11" width="14" height="10" rx="1.5"/>
  <path d="M8 11V7a4 4 0 018 0v4"/>
  <circle cx="12" cy="16" r="1.2" fill="currentColor"/>
</Svg>;

// 加载转圈（8 角旋转）
export const IconLoading = (p: IconProps) => <Svg {...p}>
  <path d="M12 3v3"/>
  <path d="M12 18v3"/>
  <path d="M3 12h3"/>
  <path d="M18 12h3"/>
  <path d="M5.6 5.6l2 2"/>
  <path d="M16.4 16.4l2 2"/>
  <path d="M5.6 18.4l2-2"/>
  <path d="M16.4 7.6l2-2"/>
</Svg>;

// 刷新（顺时针箭头）
export const IconRefresh = (p: IconProps) => <Svg {...p}>
  <path d="M21 12a9 9 0 00-15 -6.5"/>
  <polyline points="21,3 21,8 16,8"/>
  <path d="M3 12a9 9 0 0015 6.5"/>
  <polyline points="3,21 3,16 8,16"/>
</Svg>;

// 图钉
export const IconPin = (p: IconProps) => <Svg {...p}>
  <path d="M12 2v8l4 4v2H8v-2l4 -4V2z"/>
  <circle cx="12" cy="2" r="1.2" fill="currentColor"/>
</Svg>;

// 箭头右
export const IconArrowRight = (p: IconProps) => <Svg {...p}>
  <path d="M5 12h14"/>
  <polyline points="13,6 19,12 13,18"/>
</Svg>;

// 箭头左
export const IconArrowLeft = (p: IconProps) => <Svg {...p}>
  <path d="M19 12H5"/>
  <polyline points="11,6 5,12 11,18"/>
</Svg>;

// 向下 V（展开）
export const IconChevronDown = (p: IconProps) => <Svg {...p}>
  <polyline points="6,9 12,15 18,9"/>
</Svg>;

// 向上 V（收起）
export const IconChevronUp = (p: IconProps) => <Svg {...p}>
  <polyline points="6,15 12,9 18,15"/>
</Svg>;

/* ═══════════════════════════════════════════════════════════════
   Section G — 扭蛋 / 藏品室 / 奖励
   ═══════════════════════════════════════════════════════════════ */

// 金币堆（代币）— 代币余额
export const IconCoins = (p: IconProps) => <Svg {...p}>
  <ellipse cx="9" cy="6" rx="6" ry="2.5"/>
  <ellipse cx="15" cy="11" rx="6" ry="2.5"/>
  <ellipse cx="9" cy="16" rx="6" ry="2.5"/>
  <path d="M3 6v4c0 1.4 2.7 2.5 6 2.5"/>
  <path d="M9 11v4c0 1.4 2.7 2.5 6 2.5"/>
  <path d="M15 16v3c0 1.4 -2.7 2.5 -6 2.5"/>
  <path d="M9 8.5l-1 0.5M9 13.5l-1 0.5"/>
</Svg>;

// 摇杆（街机）— 扭蛋机
export const IconJoystick = (p: IconProps) => <Svg {...p}>
  <path d="M4 20h16l1 -5H3z"/>
  <ellipse cx="12" cy="15" rx="3" ry="1.5"/>
  <path d="M12 14V7"/>
  <circle cx="12" cy="4.5" r="2.5"/>
  <path d="M12 7v-2"/>
  <circle cx="6.5" cy="17" r="1.2" fill="currentColor"/>
  <circle cx="17.5" cy="17" r="1.2" fill="currentColor"/>
</Svg>;

// 宝剑（单抽）— 单抽动作
export const IconSword = (p: IconProps) => <Svg {...p}>
  <path d="M14.5 4l5.5 5.5L11 18.5l-1.5 1.5L8 21l-1 -1l1 -1.5l1.5 -1.5z"/>
  <path d="M14.5 4l3 3"/>
  <path d="M8 21l-3 -3"/>
  <path d="M11 18.5l-1 -1"/>
</Svg>;

// 礼物盒（十连抽）— 十连抽动作
export const IconGift = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="9" width="18" height="12" rx="0.5"/>
  <rect x="4" y="6" width="16" height="3" rx="0.3"/>
  <path d="M12 6v15"/>
  <path d="M12 9c-2 -3 -5 -3 -5 0c0 1 1 2 5 2z"/>
  <path d="M12 9c2 -3 5 -3 5 0c0 1 -1 2 -5 2z"/>
</Svg>;

// 八角警长星（保底进度）— 抽取机制-渐进保底
export const IconPity = (p: IconProps) => <Svg {...p}>
  <path d="M12 2l3 6l6.5 0.5l-5 4.5l1.5 6.5L12 16l-6 3.5L7.5 13l-5 -4.5L9 8z"/>
  <circle cx="12" cy="11" r="1" fill="currentColor"/>
  <path d="M12 7v-2" opacity="0.6"/>
</Svg>;

// 奖杯（抽取结果/成就）— 抽取成功、新手全完成
export const IconTrophy = (p: IconProps) => <Svg {...p}>
  <path d="M7 4h10v3a4 4 0 01-4 4h-2a4 4 0 01-4 -4z"/>
  <path d="M7 4V3a1 1 0 011 -1h8a1 1 0 011 1v1"/>
  <path d="M5 4h2v2a3 3 0 01-3 -2z"/>
  <path d="M19 4h-2v2a3 3 0 003 -2z"/>
  <path d="M9 11v2a3 3 0 003 3a3 3 0 003 -3v-2"/>
  <path d="M12 16v3"/>
  <path d="M9 21h6"/>
</Svg>;

// 高脚奖杯（藏品室/卡牌大师）— 藏品室奖杯
export const IconCup = (p: IconProps) => <Svg {...p}>
  <path d="M6 3h12v8a5 5 0 01-5 5h-2a5 5 0 01-5 -5z"/>
  <path d="M6 5h-3v3a3 3 0 003 3"/>
  <path d="M18 5h3v3a3 3 0 01-3 3"/>
  <path d="M12 16v4"/>
  <path d="M9 21h6"/>
  <path d="M5 22h14"/>
  <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
</Svg>;

// 收藏画框（收集图鉴）— 收集图鉴模块
export const IconGallery = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="4" width="18" height="16" rx="1"/>
  <path d="M3 14l5 -5l4 4l3 -3l6 6"/>
  <circle cx="8" cy="9" r="1.5"/>
  <rect x="3" y="4" width="18" height="16" rx="1" strokeDasharray="0" fill="none"/>
</Svg>;

// 牌堆（抽取记录）— 抽取记录
export const IconHistory = (p: IconProps) => <Svg {...p}>
  <path d="M12 8v5l3 2"/>
  <circle cx="12" cy="12" r="9"/>
  <path d="M3 12h2M19 12h2M12 3v2M12 19v2"/>
</Svg>;

// 建筑（藏品室）— 藏品室导航
export const IconBuilding = (p: IconProps) => <Svg {...p}>
  <path d="M3 21h18"/>
  <path d="M5 21V8l7 -4l7 4v13"/>
  <path d="M10 21v-5h4v5"/>
  <path d="M9 11h1v1H9zM14 11h1v1h-1z"/>
  <path d="M9 14h1v1H9zM14 14h1v1h-1z"/>
</Svg>;

// 邮箱 — 收件（保留备用）
export const IconMail = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="6" width="18" height="13" rx="1.5"/>
  <path d="M3 7l9 6l9 -6"/>
  <path d="M3 19l6 -5M21 19l-6 -5"/>
</Svg>;

// 归档箱（带向下箭头盖子）
export const IconArchive = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="4" width="18" height="4" rx="0.5"/>
  <path d="M5 8v11a2 2 0 002 2h10a2 2 0 002 -2V8"/>
  <path d="M10 12h4"/>
  <path d="M12 11v3"/>
  <path d="M9 16l3 2l3 -2"/>
</Svg>;

// 宝箱（备用）
export const IconChest = (p: IconProps) => <Svg {...p}>
  <path d="M3 8h18v10a2 2 0 01-2 2H5a2 2 0 01-2 -2z"/>
  <path d="M3 8V6a2 2 0 012 -2h14a2 2 0 012 2v2"/>
  <path d="M9 8V6a3 3 0 016 0v2"/>
  <rect x="10" y="13" width="4" height="3" rx="0.3"/>
  <path d="M12 8v5"/>
  <circle cx="12" cy="14.5" r="0.5" fill="currentColor"/>
</Svg>;

// 退出/登出（半开门+箭头）— 退出登录
export const IconLogout = (p: IconProps) => <Svg {...p}>
  {/* 门框 */}
  <path d="M9 21H5a2 2 0 01-2 -2V5a2 2 0 012 -2h4"/>
  {/* 向右离开的箭头 */}
  <path d="M16 17l5 -5l-5 -5"/>
  <path d="M21 12H9"/>
</Svg>;

// 日历（带星标记）— SSR 月度重置
export const IconCalendarStar = (p: IconProps) => <Svg {...p}>
  <rect x="3" y="4" width="18" height="18" rx="2"/>
  <path d="M16 2v4M8 2v4M3 10h18"/>
  <path d="M12 16l1.2 2.4 2.4 0.3 -1.7 1.7 0.4 2.4 -2.3 -1.2 -2.3 1.2 0.4 -2.4 -1.7 -1.7 2.4 -0.3z" fill="currentColor"/>
</Svg>;

// ═══════════════════════════════════════════════════════════════
// Icon Map — 一图标一用途
// ═══════════════════════════════════════════════════════════════

const icons = {
  // — 时间 / 番茄钟 —
  tomato:       IconTomato,        // 番茄钟本体
  hourglass:    IconHourglass,     // 番茄钟历史
  coffee:       IconCoffee,        // 短休息
  meditate:     IconMeditate,      // 长休息
  clock:        IconClock,         // 时钟（番茄钟统计）

  // — 任务 / 清单 / 项目 —
  task:         IconTask,          // 任务管理（剪贴板+勾）
  memo:         IconMemo,          // 随手清单（横线列表）
  folder:       IconFolder,        // 项目管理（文件夹+标签）
  notebook:     IconNotebook,      // 笔记本/回顾/日记
  book:         IconBook,          // 操作指南（打开的书）
  graduate:     IconGraduate,      // 新手教程（学士帽）

  // — 核心 / 计划 —
  target:       IconTarget,        // 核心任务/单核（准星）
  sun:          IconSun,           // 晨间规划
  moon:         IconMoon,          // 晚间回顾

  // — 数据 / 看板 —
  dashboard:    IconDashboard,     // 工作看板（卡片布局）
  chart:        IconChart,         // 折线图（统计）
  bars:         IconBars,          // 柱状图（概率/计数）

  // — 日历 —
  calendar:     IconCalendar,      // 单日日历（每日计划）
  month:        IconMonth,         // 月历（月度记录）

  // — 通用动作 —
  play:         IconPlay,          // 开始/继续（计时器、任务）
  pause:        IconPause,         // 暂停（计时器）
  check:        IconCheck,         // 完成（圆圈勾）
  undo:         IconUndo,          // 回退/重置
  edit:         IconEdit,          // 编辑（钢笔）
  trash:        IconTrash,         // 删除（垃圾桶）
  archive:      IconArchive,       // 归档
  close:        IconClose,         // 关闭（X）
  menu:         IconMenu,          // 汉堡菜单
  search:       IconSearch,        // 搜索
  plus:         IconPlus,          // 加号
  minus:        IconMinus,         // 减号
  star:         IconStar,          // 五角星（强调）
  alert:        IconAlert,         // 警示
  bulb:         IconBulb,          // 提示
  lock:         IconLock,          // 锁定
  loading:      IconLoading,       // 加载
  refresh:      IconRefresh,       // 刷新
  pin:          IconPin,           // 图钉
  arrowRight:   IconArrowRight,    // 右箭头
  arrowLeft:    IconArrowLeft,     // 左箭头
  chevronDown:  IconChevronDown,   // 展开
  chevronUp:    IconChevronUp,     // 收起

  // — 扭蛋 / 藏品室 —
  coins:        IconCoins,         // 代币余额（金币堆）
  joystick:     IconJoystick,      // 扭蛋机（摇杆）
  sword:        IconSword,         // 单抽（剑）
  gift:         IconGift,          // 十连抽（礼物盒）
  pity:         IconPity,          // 保底进度（警长星）
  trophy:       IconTrophy,        // 奖杯（抽取结果/成就）
  cup:          IconCup,           // 高脚杯（藏品室/卡牌）
  gallery:      IconGallery,       // 收集图鉴（画框）
  history:      IconHistory,       // 抽取记录（钟表）
  building:     IconBuilding,      // 藏品室（建筑）
  calendarStar: IconCalendarStar,  // SSR 锁定月度重置

  // — 备用 —
  mail:         IconMail,
  chest:        IconChest,
  logout:       IconLogout,        // 退出登录
} as const;

export type IconName = keyof typeof icons;

interface Props extends IconProps { name: IconName; }

export default function Icon({ name, size, className, style }: Props) {
  const C = icons[name];
  if (!C) {
    // 防御性兜底：未知图标名时画一个小方块，避免整个 React 树崩溃
    return (
      <svg width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth={1.6}
        className={className} style={{ display: 'inline-block', verticalAlign: '-0.15em', ...style }}>
        <rect x="6" y="6" width="12" height="12" rx="1" strokeDasharray="2 2" />
      </svg>
    );
  }
  return <C size={size} className={className} style={style} />;
}